# Bolão da Copa ⚽

PWA (foco em celular) para um bolão da Copa do Mundo 2026, para ~10 amigos. Sem login tradicional. Resultados lançados manualmente pelo admin — ou preenchidos automaticamente via API gratuita (ver [Sincronismo automático](#sincronismo-automático-de-resultados-opcional)). Regras e decisões em [ESPECIFICACAO.md](ESPECIFICACAO.md).

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

> **Banco já existente?** Se você criou o projeto antes do login por senha, rode também [`supabase/migrations/0003_login_senha.sql`](supabase/migrations/0003_login_senha.sql) no SQL Editor (adiciona a coluna de senha). Setups novos já vêm com tudo pelo `schema.sql`.

### 5. Virar admin (uma vez só)
1. Abra o app, escolha **"Sou novo aqui"** e cadastre o SEU nome **e uma senha**.
2. No Supabase → **Table Editor → participants**, ache seu registro e marque **`is_admin` = true**.
3. Recarregue o app: a aba **Admin 🛠️** aparece para você.

### 6. Publicar (deploy grátis)
- **Vercel:** importe o repositório, defina as duas variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e faça deploy. Build command `npm run build`, output `dist`.
- **Netlify:** mesmo esquema (build `npm run build`, publish `dist`).
- Mande o link no grupo. Cada amigo abre, faz **"Sou novo aqui"** (nome + senha) e palpita. Quem já estava cadastrado antes da senha usa **"Já participo"**, toca no nome e **define a senha no primeiro acesso**. Dá para **instalar** como app pelo menu do navegador ("Adicionar à tela inicial").

---

## Sincronismo automático de resultados (opcional)

Puxa os jogos da Copa **sozinho** da API gratuita [football-data.org](https://www.football-data.org): **cria os jogos que ainda faltam** (grupos + mata-mata) com times e horário, e preenche o **placar depois que cada jogo termina** (não é ao vivo). O lançamento manual continua valendo e **tem prioridade**: a API nunca sobrescreve um placar que o admin corrigiu à mão.

Como funciona: uma **Edge Function** no Supabase chama a API e mantém a tabela `matches` em dia (cria/atualiza jogos e grava placares); o **pg_cron** dispara a função a cada 30 min. O app continua só lendo do banco.

Só são criados jogos que **ainda não começaram** — jogos já ocorridos antes do bolão entrar no ar ficam de fora (não dá pra apostar no passado).

### Passos
1. **Token grátis:** crie conta em <https://www.football-data.org/client/register> e copie seu token.
2. **Migração:** no **SQL Editor**, rode [`supabase/migrations/0002_sync_api.sql`](supabase/migrations/0002_sync_api.sql) (adiciona as colunas de apoio ao sync).
3. **Deploy da função** (precisa da [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase link --project-ref SEU-REF
   supabase secrets set FOOTBALL_DATA_TOKEN=seu_token
   supabase functions deploy sync-resultados
   ```
4. **Teste manual** (opcional): `supabase functions invoke sync-resultados` — deve responder um JSON com `criados`, `vinculados` e `placaresAtualizados`.
5. **Agende:** edite [`supabase/sync_cron.sql`](supabase/sync_cron.sql) trocando `<SEU-REF>` e `<SUA-ANON-KEY>`, e rode no SQL Editor.

### Bom saber
- **Mata-mata:** o placar gravado é o do tempo normal/prorrogação (pênaltis **não** entram no placar); "quem avançou" usa o vencedor geral (inclui pênaltis) — igualzinho à regra do bolão.
- **Confrontos do mata-mata:** assim que a API conhece os times de cada chave, ela preenche sozinha no esqueleto semeado (sem duplicar). Você ainda pode ajustar à mão em **Admin → Confrontos** se preferir.
- **Nomes:** os jogos criados saem em português via um mapa PT↔EN dentro de [`supabase/functions/sync-resultados/index.ts`](supabase/functions/sync-resultados/index.ts) (constantes `TEAMS` e `PT_DISPLAY`). Time fora do mapa aparece com o nome em inglês — é só acrescentar ao mapa.
- **Retorno da função:** o `invoke` devolve um JSON com `criados`, `vinculados`, `placaresAtualizados`, `preservadosManuais` e `ignoradosPassados` — útil pra conferir o que rolou.
- **Selo:** resultados vindos da API aparecem com 🔄 (no card do jogo e no painel de Resultados).

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
- **Login por senha:** a senha vira um hash SHA-256 (com sal fixo) no próprio navegador; o banco guarda só o hash e ele nunca é enviado de volta aos outros clientes. É um "cadeado social" para o grupo, não autenticação de verdade (sem e-mail, sem recuperação de senha). Esqueceu a senha? O admin limpa o campo `password_hash` do participante no Table Editor e a pessoa define uma nova no próximo acesso.
- **Datas semeadas são aproximadas:** os horários do mata-mata no `schema.sql` são placeholders. Confira a tabela oficial da FIFA e ajuste em **Admin → Confrontos**.
- **Ícone:** usa um SVG simples. Dá para trocar por um PNG/arte própria depois em `public/`.
