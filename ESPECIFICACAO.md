# Bolão — Especificação (entendimento compartilhado)

> Documento atualizado em 2026-06-28. Reflete o estado atual do produto após a fase de grupos da Copa 2026.

## Visão geral

PWA focada em celular para um Bolão do Mundo de 2026, com ~30 participantes ativos, todos brasileiros. Acesso por nome + senha. Resultados chegam automaticamente via API, com o admin como fallback. Sistema de ligas permite subgrupos competirem entre si dentro do bolão global.

## Mecânica de aposta e pontuação

- Cada participante palpita o **placar** de cada jogo (ex: 2x1).
- Pontuação por jogo: **10 / 7 / 5 / 0**
  - **10 pts** — placar exato.
  - **7 pts** — acertou o resultado e o saldo de gols, mas não o placar exato (ex: palpitou 2×0, terminou 4×2).
  - **5 pts** — acertou o resultado (quem ganhou/perdeu/empatou), mas errou o saldo.
  - **0 pts** — errou o resultado.

### Regra unificada para todos os jogos (incluindo mata-mata)

A pontuação é sempre calculada sobre o **placar do tempo normal**. Prorrogação e pênaltis são ignorados.

- Se o jogo foi para pênaltis após empate no tempo normal: quem palpitou empate ganha 5 pts. Quem palpitou vitória de qualquer time ganha 0 pts.
- Não existe bônus por acertar o time que avança via pênaltis.

### Desempate no ranking

1. Mais placares exatos (cravadas de 10 pts).
2. Mais saldos certos (7 pts).
3. Mais acertos de resultado (5 pts).
4. Se ainda empatar → posição compartilhada.

## Recorte de jogos

- Valem todos os jogos da Copa 2026.
- Não é possível palpitar em jogos já encerrados.

## Dados (jogos e resultados)

- A tabela de jogos é sincronizada automaticamente com a API da **football-data.org** a cada 30 minutos — times, horários e placares chegam sem intervenção do admin.
- O admin pode lançar ou corrigir resultados manualmente. Entradas manuais nunca são sobrescritas pela API.
- Jogos de mata-mata entram com times "a definir"; o admin preenche os confrontos conforme o chaveamento é publicado.
- Todos os horários em **horário de Brasília (UTC-3)**.

## Travamento e palpites

- O palpite de um jogo **trava no horário oficial de início** da partida.
- **Quem não palpitou a tempo → 0 pts** naquele jogo. Sem palpite tardio.
- Palpites **ocultos até o jogo travar**; depois de travar, **todos veem** o palpite de todos.

## Identidade e acesso

- **Um link compartilhado** no grupo.
- Tela de entrada: campo de nome + senha.
  - **"Sou novo"** — digita nome e cria uma senha. Conta criada imediatamente.
  - **"Já participo"** — digita o mesmo nome e senha cadastrados. Funciona em qualquer celular sem precisar recuperar sessão.
- **Admin** = participante com flag `is_admin` marcada manualmente no banco. Habilita a tela de admin.

### Postura de segurança (risco aceito conscientemente)

- A proteção de "ocultar palpites antes do travamento" e "editar só o próprio palpite" é aplicada no app, não garantida a nível de banco. Um participante com conhecimento técnico consegue contornar via DevTools. Aceitável para o grupo.
- Única escrita protegida de fato: **lançamento de resultados** (restrito ao admin).

## Sistema de ligas

Ligas são subgrupos de competição dentro do bolão global. Qualquer participante pode criar uma liga e convidar outros.

- **Ranking por liga:** filtrado pelos pontos acumulados a partir da data `starts_at` da liga. Todos os membros partem do zero nessa data, independentemente de quantos pontos já tinham no ranking global.
- **`starts_at`** é configurado pelo criador no momento da criação da liga.
- O ranking global (todos os participantes, desde o início da Copa) continua sempre disponível.

### Fluxo de convite — por nome

1. O criador da liga abre a tela de gerenciamento e convida um participante pelo nome.
2. O convidado vê o convite pendente no app (badge na aba Liga) e aceita ou recusa.

### Fluxo de convite — por link

1. O criador gera um link de convite e compartilha (ex: via WhatsApp).
2. Quem acessa o link envia uma **solicitação de entrada** (`requested`).
3. O criador vê a solicitação na tela de Ligas (badge) e aprova ou recusa.
4. Links expiram em 7 dias e têm limite de uso.

## Telas

1. **Entrada** — campo de nome + senha; fluxo "Sou novo" ou "Já participo".
2. **Home** — painel principal: ranking (filtrado pela liga ativa ou global), partidas ao vivo, próximas 3 partidas, posição pessoal e distância para cima/baixo. Badges 🔥 para rodada perfeita e indicadores ↑↓ de variação no ranking.
3. **Jogos** — todos os jogos organizados por data, com entrada e edição de palpites até o travamento.
4. **Ligas** — criação e gerenciamento de ligas; convites por nome e por link; aprovação de solicitações; ranking filtrado por liga.
5. **Meus Palpites** — histórico pessoal de palpites com pontuação por jogo, filtrável por liga.
6. **Admin** (restrito) — lançamento de resultados e gestão dos confrontos do mata-mata.

## Compartilhamento

Após a revelação de um resultado, o participante pode gerar uma imagem com seu palpite e a pontuação obtida para compartilhar no WhatsApp ou redes sociais.

## Notificações

- **Sem Web Push.**
- Avisos dentro do app: badge na aba Jogos indica quantos jogos do dia ainda não têm palpite.
- Lembretes externos via WhatsApp.

## Stack e infraestrutura

- Frontend: **React + Vite + TypeScript + Tailwind**, instalável via `vite-plugin-pwa`.
- Backend/dados: **Supabase** — Postgres + Supabase Auth + Realtime.
- Sync automático: **Edge Function** + pg_cron consumindo football-data.org.
- Deploy: estático na **Vercel**.

## Identidade visual

- Nome: **"Bolão"**.
- Visual: tema escuro com toque verde/amarelo — ver DESIGN.md.
