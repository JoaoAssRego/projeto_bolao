# MatchPool ⚽

A mobile-first PWA for running a friends' football score-prediction pool (currently built around the 2026 World Cup, for ~10 friends). No traditional login. Match results are entered manually by the admin — or filled in automatically via a free API (see [Automatic result sync](#automatic-result-sync-optional)). Rules and product decisions live in [ESPECIFICACAO.md](ESPECIFICACAO.md).

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres) · static deploy (Vercel/Netlify).

---

## Getting it up and running

### 1. Create the Supabase project (~2 min)

1. Go to <https://supabase.com> → **New project** (Free plan).
2. Pick a name and a database password (save it). Wait for provisioning.
3. Under **Project Settings → API**, copy:
   - **Project URL**
   - **anon public key**

### 2. Create the tables

1. In Supabase, open **SQL Editor → New query**.
2. Paste the ENTIRE contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - This creates the tables, the policies, and seeds the knockout-stage bracket skeleton.
   - Safe to run again — it's idempotent.

### 3. Connect the app

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env      # on Windows PowerShell: copy .env.example .env
   ```
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the values from step 1.

### 4. Run locally

```bash
npm install
npm run dev
```

Open the address that shows up (e.g. <http://localhost:5173>) on your phone or in a browser.

> **Already have a database?** If you created the project before password login was added, also run [`supabase/migrations/0003_login_senha.sql`](supabase/migrations/0003_login_senha.sql) in the SQL Editor (adds the password column). New setups already get everything from `schema.sql`.

### 5. Become admin (one-time)

1. Open the app, choose **"I'm new here"** and register YOUR name **and a password**.
2. In Supabase → **Table Editor → participants**, find your row and set **`is_admin` = true**.
3. Reload the app: the **Admin 🛠️** tab now appears for you.

### 6. Deploy (free)

- **Vercel:** import the repo, set the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and deploy. Build command `npm run build`, output `dist`.
- **Netlify:** same setup (build `npm run build`, publish `dist`).
- Share the link with the group. Each friend opens it, taps **"I'm new here"** (name + password) and starts predicting. Anyone who was already registered before passwords existed uses **"I already play"**, taps their name and **sets a password on first access**. It can be **installed** as an app from the browser menu ("Add to Home Screen").

---

## Automatic result sync (optional)

Pulls matches from the free [football-data.org](https://www.football-data.org) API **on its own**: **creates the matches that are still missing** (group stage + knockout) with teams and kickoff time, and **fills in the score once each match ends** (it doesn't show a live partial score — the screen only switches from "waiting for result" to the final result once the API confirms `FINISHED`). Manual entry still works and **takes priority**: the API never overwrites a score the admin corrected by hand.

How it works: a single **Edge Function** (`sync-resultados`) calls the API and keeps the `matches` table up to date (creates/links matches and records the final score, including extra time/penalties — it re-checks the match on every run, with no timeout, until the API returns `FINISHED`); **pg_cron** triggers the function every 2 minutes. The app only ever reads from the database.

Only matches that **haven't started yet** are created — matches that already happened before the pool went live are skipped (no betting on the past).

> A second function (`sync-ao-vivo`) used to update the live partial score during the match, but it was retired: the app never displayed that partial score on screen, and it depended on `sync-resultados` having already run successfully (adding fragility with no real benefit). Running just `sync-resultados`, more frequently, achieves the same result without losing any functionality.

### Steps

1. **Free token:** create an account at <https://www.football-data.org/client/register> and copy your token.
2. **Migrations:** in the **SQL Editor**, run in order [`supabase/migrations/0002_sync_api.sql`](supabase/migrations/0002_sync_api.sql), [`supabase/migrations/0009_sync_observability_cron.sql`](supabase/migrations/0009_sync_observability_cron.sql) (support columns, the `sync_logs` table, a `cron_secret` in the Vault, and the `pg_cron` schedule already built in) and [`supabase/migrations/0013_retire_sync_ao_vivo.sql`](supabase/migrations/0013_retire_sync_ao_vivo.sql) (removes the `sync-ao-vivo` cron job and leaves `sync-resultados` running every 2 minutes).
3. **Grab the generated secret** (migration `0009` creates a random value in the Vault):
   ```sql
   select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';
   ```
4. **Deploy the function** (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase link --project-ref YOUR-REF
   supabase secrets set FOOTBALL_DATA_TOKEN=your_token
   supabase secrets set CRON_SECRET=<value copied from step 3>
   supabase functions deploy sync-resultados --no-verify-jwt
   ```
   `--no-verify-jwt` is needed because the function now does its own authorization check (the `x-cron-secret` header for pg_cron, or a logged-in admin session for the manual button in Admin) instead of just relying on a valid anon key.
5. **Manual test** (optional): `supabase functions invoke sync-resultados` — should respond with a JSON payload containing `criados`, `vinculados` and `placaresAtualizados`.

### Good to know

- **Knockout stage:** the score recorded is from regular time/extra time (penalties **don't** count toward the score); "who advanced" uses the overall winner (including penalties) — exactly matching the pool's rule.
- **Knockout matchups:** as soon as the API knows the teams for each bracket slot, it fills them in on its own in the seeded skeleton (no duplicates). You can still adjust it by hand in **Admin → Matchups** if you prefer.
- **Team names:** created matches come out in Portuguese via a PT↔EN map inside [`supabase/functions/sync-resultados/index.ts`](supabase/functions/sync-resultados/index.ts) (the `TEAMS` and `PT_DISPLAY` constants). A team missing from the map shows up in English — just add it to the map.
- **Function response:** `invoke` returns a JSON payload with `criados`, `vinculados`, `placaresAtualizados`, `preservadosManuais` and `ignoradosPassados` — handy for checking what happened.
- **Badge:** results coming from the API show a 🔄 badge (on the match card and in the Results admin panel).
- **Sync diagnostics:** `select * from sync_logs order by created_at desc limit 20;` shows the run history (success/error/skipped) for each function — useful as a heartbeat: if it stops growing, the cron stopped firing. `select * from cron.job_run_details order by start_time desc limit 20;` shows whether `pg_cron` is dispatching the calls (though it doesn't guarantee the HTTP call succeeded — only that it was queued).

## Push notifications (optional)

Sends a Web Push reminder when a match a participant hasn't predicted yet is within 15 minutes of locking — works even with the app closed, as long as they've installed the PWA and granted notification permission (the "Enable prediction reminders" card on the Matches screen).

How it works: the `send-lembrete-push` Edge Function runs every 5 minutes via `pg_cron`, checks matches locking soon, cross-references who hasn't predicted yet and has a saved push subscription, and sends via `web-push` (VAPID protocol). Each participant only gets one reminder per match (the `push_reminders_sent` table prevents duplicates).

### Steps

1. **Migration:** in the **SQL Editor**, run [`supabase/migrations/0010_push_notifications.sql`](supabase/migrations/0010_push_notifications.sql) (the `push_subscriptions`/`push_reminders_sent` tables and the `pg_cron` schedule).
2. **VAPID key pair** (one-time):
   ```bash
   npx web-push generate-vapid-keys
   ```
3. **Secrets and deploy** (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=<public key>
   supabase secrets set VAPID_PRIVATE_KEY=<private key>
   supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
   supabase functions deploy send-lembrete-push --no-verify-jwt
   ```
4. **Frontend:** add `VITE_VAPID_PUBLIC_KEY=<public key>` to your local `.env` and to Vercel's environment variables, then run `npm run build`/redeploy.

### Good to know

- Without `VITE_VAPID_PUBLIC_KEY` configured, the opt-in card simply doesn't show up — the feature stays invisible until setup is complete.
- The opt-in only shows for people who've installed the PWA (standalone mode) — on iOS this also requires iOS 16.4+.
- Diagnostics: `select * from sync_logs where function_name = 'send-lembrete-push' order by created_at desc limit 20;`.

## How the admin operates during the tournament

**Admin** tab:

- **Results** — enters the score for each match. In a drawn knockout match, picks who advanced on penalties. The leaderboard recalculates automatically.
- **Matchups** — fills in the knockout-stage teams as the bracket is revealed and adjusts date/time (Brasília time).
- **New match** — adds group-stage matches that are still missing (or any standalone match).

## Pool rules (summary)

- Score prediction. **10** pts exact score · **7** pts correct goal difference or draw · **5** pts correct outcome · **0** pts wrong.
- Knockout stage: penalties don't count toward the score; the 5 pts go to whoever favored the team that advanced. Predicting a draw earns 7 pts.
- A prediction **locks when the match kicks off**; anyone who hasn't predicted gets 0. Predictions stay hidden until they lock, then everyone can see them.
- Tiebreaker: most exact scores → most correct outcomes → shared position.

## ⚠️ Important notes

- **"Trust-based" security:** the app talks directly to the database via the anon key. The rule hiding predictions is enforced in the app, not on the server — a technically savvy friend could peek via DevTools. An accepted risk for a group of friends.
- **Password login:** the password becomes a SHA-256 hash (with a fixed salt) in the browser itself; the database only stores the hash, and it's never sent back to other clients. It's a "social lock" for the group, not real authentication (no email, no password recovery). Forgot your password? The admin clears the participant's `password_hash` field in the Table Editor and the person sets a new one on their next visit.
- **Seeded dates are approximate:** the knockout-stage times in `schema.sql` are placeholders. Check the official FIFA schedule and adjust them in **Admin → Matchups**.
- **Icon:** uses a simple SVG. It can be swapped for a PNG/custom artwork later in `public/`.
