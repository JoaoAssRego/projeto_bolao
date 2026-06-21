# Bolão da Copa ⚽

PWA (foco em celular) para um bolão da Copa do Mundo 2026, para ~10 amigos. Sem login tradicional, resultados lançados manualmente pelo admin. Regras e decisões em [ESPECIFICACAO.md](ESPECIFICACAO.md).

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres) · deploy estático (Vercel/Netlify).

---

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase (~2 min)
1. Acesse <https://supabase.com> → **New project** (plano Free).
2. Escolha um nome e uma senha de banco (guarde-a). Aguarde provisionar.
3. Em **Project Settings → API**, copie:
   - **Project URL**
   - **anon public key**

### 2. Criar as tabelas
1. No Supabase, abra **SQL Editor → New query**.
2. Cole TODO o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique **Run**.
   - Isso cria as tabelas, as políticas e já semeia o esqueleto do mata-mata.
   - Pode rodar de novo sem problema (é idempotente).

### 3. Conectar o app
1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env      # no Windows PowerShell: copy .env.example .env
   ```
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do passo 1.

### 4. Rodar localmente
```bash
npm install
npm run dev
```
Abra o endereço que aparecer (ex: <http://localhost:5173>) no celular ou no navegador.

### 5. Virar admin (uma vez só)
1. Abra o app, escolha **"Sou novo aqui"** e cadastre o SEU nome.
2. No Supabase → **Table Editor → participants**, ache seu registro e marque **`is_admin` = true**.
3. Recarregue o app: a aba **Admin 🛠️** aparece para você.

### 6. Publicar (deploy grátis)
- **Vercel:** importe o repositório, defina as duas variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e faça deploy. Build command `npm run build`, output `dist`.
- **Netlify:** mesmo esquema (build `npm run build`, publish `dist`).
- Mande o link no grupo. Cada amigo abre, faz **"Sou novo aqui"** e palpita. Dá para **instalar** como app pelo menu do navegador ("Adicionar à tela inicial").

---

## Como o admin opera durante a Copa
Aba **Admin**:
- **Resultados** — lança o placar de cada jogo. Em mata-mata empatado, escolhe quem avançou nos pênaltis. O ranking recalcula sozinho.
- **Confrontos** — preenche os times do mata-mata conforme o chaveamento sai e ajusta data/hora (horário de Brasília).
- **Novo jogo** — adiciona os jogos de fase de grupos que ainda faltam (ou qualquer jogo avulso).

## Regras do bolão (resumo)
- Palpite de placar. **10** pts placar exato · **5** pts acerto de resultado · **0** pts erro.
- Mata-mata: pênaltis não contam para o placar; os 5 pts vão para quem favoreceu o time que avançou.
- Palpite **trava no início do jogo**; quem não palpitou leva 0. Palpites ficam ocultos até travar, depois todos veem.
- Desempate: mais cravadas → mais acertos de resultado → posição compartilhada.

## ⚠️ Notas importantes
- **Segurança "na confiança":** o app fala direto com o banco pela anon key. A regra de ocultar palpites é aplicada no app, não blindada no servidor — um amigo técnico consegue espiar via DevTools. Risco aceito para o grupo de amigos.
- **Datas semeadas são aproximadas:** os horários do mata-mata no `schema.sql` são placeholders. Confira a tabela oficial da FIFA e ajuste em **Admin → Confrontos**.
- **Ícone:** usa um SVG simples. Dá para trocar por um PNG/arte própria depois em `public/`.
