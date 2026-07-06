# Bolão — Especificação (entendimento compartilhado)

> Documento atualizado em 2026-07-05. O produto está em transição de "um bolão, um torneio" para "um bolão, múltiplos torneios". Copa do Mundo 2026 é o torneio em produção; Champions League é a Fase 1 da expansão multi-torneio (ver [prd-multi-torneio-champions-league.md](docs/prd/prd-multi-torneio-champions-league.md)), ainda em desenvolvimento; Libertadores e Copa do Brasil ficam para a Fase 2. As seções abaixo já descrevem o modelo-alvo (multi-torneio); o que ainda não foi implementado está marcado como tal.

## Visão geral

PWA focada em celular para bolões de futebol, com ~30 participantes ativos, todos brasileiros. Nasceu como bolão exclusivo da Copa do Mundo 2026 e está evoluindo para suportar **múltiplos torneios simultâneos** — cada torneio (Copa do Mundo, Champions League, e futuramente Libertadores/Copa do Brasil) tem seu próprio conjunto de jogos, ranking e ligas, sem placar agregado entre eles. Acesso por nome + senha. Resultados chegam automaticamente via API, com o admin como fallback. Sistema de ligas permite subgrupos competirem entre si dentro de um torneio específico.

## Mecânica de aposta e pontuação

- Cada participante palpita o **placar** de cada jogo (ex: 2x1).
- Pontuação por jogo: **10 / 7 / 5 / 0**
  - **10 pts** — placar exato.
  - **7 pts** — acertou o saldo de gols (ex: palpitou 2×0, terminou 4×2) ou previu um empate não-cravado.
  - **5 pts** — acertou o resultado (quem ganhou/perdeu), mas errou o saldo.
  - **0 pts** — errou o resultado.

### Regra unificada para todos os jogos (incluindo mata-mata)

A pontuação é sempre calculada sobre o **placar do tempo normal**. Prorrogação e pênaltis são ignorados.

- Se o jogo foi para pênaltis após empate no tempo normal: quem palpitou empate ganha 7 pts (pela regra de empate não-cravado). Quem palpitou vitória de qualquer time ganha 0 pts.
- Não existe bônus por acertar o time que avança via pênaltis.

### Fase liga (Champions League) — *em desenvolvimento*

A Champions League não tem mais fase de grupos desde 2024/25: é uma fase liga (36 times, tabela única, 8 jogos cada, sem divisão em grupos). Para efeito de pontuação, esses jogos seguem a **mesma regra da fase de grupos**: 5 pts por acertar o resultado (vitória/derrota/empate), sem bônus de avanço — porque, como na fase de grupos, não existe "quem avança" num jogo individual dessa fase.

### Confrontos de ida e volta (Champions League e, na Fase 2, Copa do Brasil) — *em desenvolvimento*

Mata-matas de ida e volta entram como **dois jogos independentes** (ida e volta), cada um com seu próprio palpite. Cada perna pontua pela regra de mata-mata de sempre (10/7/5/0 acima), e o bônus de 5 pts por "quem avança" é avaliado sobre **o vencedor daquela partida específica** — não sobre o placar agregado do confronto. Depois que as duas pernas terminam, o app mostra o placar agregado e quem realmente avançou de fase como informação — isso não altera a pontuação de ninguém.

### Desempate no ranking

1. Mais placares exatos (cravadas de 10 pts).
2. Mais saldos certos ou empates (7 pts).
3. Mais acertos de resultado (5 pts).
4. Se ainda empatar → posição compartilhada.

## Recorte de jogos

- Cada torneio (Copa do Mundo, Champions League e, na Fase 2, Libertadores/Copa do Brasil) tem seu próprio conjunto de jogos, ranking e ligas — são universos independentes, sem placar agregado entre torneios.
- Dentro de um torneio, valem todos os jogos daquele torneio.
- Não é possível palpitar em jogos já encerrados.
- *Em desenvolvimento:* um seletor de torneio, fixo no topo do app, define qual torneio está sendo visualizado em Home, Jogos, Ranking (Classificação) e Meus Palpites. Abre no último torneio visualizado pelo participante ou, na primeira visita, no torneio marcado como "destaque" pelo admin.

## Dados (jogos e resultados)

- A tabela de jogos é sincronizada automaticamente com a API da **football-data.org** a cada 30 minutos — times, horários e placares chegam sem intervenção do admin. Cada torneio ativo é sincronizado pelo seu próprio código de competição na API (`WC` para Copa do Mundo, `CL` para Champions League); Libertadores e Copa do Brasil (Fase 2) exigem uma segunda fonte de dados, pois não estão no plano gratuito da football-data.org.
- O admin pode lançar ou corrigir resultados manualmente. Entradas manuais nunca são sobrescritas pela API.
- Jogos de mata-mata entram com times "a definir"; o admin preenche os confrontos conforme o chaveamento é publicado.
- *Em desenvolvimento:* confrontos de ida e volta (Champions League) entram como dois jogos ligados por um identificador de confronto comum, cada um rotulado "Ida" ou "Volta".
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

Ligas são subgrupos de competição entre amigos. Qualquer participante pode criar uma liga e convidar outros. **Não confundir** com "torneio" (Copa do Mundo, Champions League etc.) — liga é sempre o subgrupo de pessoas, torneio é sempre o campeonato de futebol.

- *Em desenvolvimento:* **cada liga pertence a um torneio específico**, escolhido pelo criador no momento da criação. Os mesmos amigos que querem competir em mais de um torneio precisam de uma liga por torneio (ex: "Liga da Galera" na Copa do Mundo e outra "Liga da Galera" na Champions League são registros diferentes).
- **Ranking por liga:** filtrado pelos pontos acumulados a partir da data `starts_at` da liga, dentro do torneio ao qual a liga pertence. Todos os membros partem do zero nessa data, independentemente de quantos pontos já tinham no ranking global daquele torneio.
- **`starts_at`** é configurado pelo criador no momento da criação da liga.
- O ranking global (todos os participantes, desde o início do torneio) continua sempre disponível, filtrado pelo torneio selecionado.

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

- **Web Push** para o lembrete de fechamento: quando um jogo em que o participante não palpitou está a até 15 min de travar, ele recebe uma notificação push (mesmo com o app fechado), desde que tenha instalado o PWA e ativado a permissão. Requer opt-in explícito (card "Ativar lembretes de palpite" na tela Jogos).
- Avisos dentro do app: badge na aba Jogos indica quantos jogos do dia ainda não têm palpite.
- Lembretes externos via WhatsApp continuam como reforço complementar.

## Modelo de dados

A estrutura completa das tabelas, colunas e constraints está documentada em [`docs/database/database-doc.md`](docs/database/database-doc.md).

Tabelas principais: `participants`, `matches`, `predictions`, `leagues`, `league_members`, `league_invite_links`.

*Em desenvolvimento (Fase 1 multi-torneio):* nova tabela `torneios` (um registro por campeonato de futebol); `matches` ganha `torneio_id` (obrigatório) e `tie_id`/`leg` (para confrontos de ida e volta); `leagues` ganha `torneio_id` (obrigatório). Detalhes em [`prd-multi-torneio-champions-league.md`](docs/prd/prd-multi-torneio-champions-league.md).

## Stack e infraestrutura

- Frontend: **React + Vite + TypeScript + Tailwind**, instalável via `vite-plugin-pwa`.
- Backend/dados: **Supabase** — Postgres + Supabase Auth + Realtime.
- Sync automático: **Edge Function** + pg_cron consumindo football-data.org (uma segunda fonte de dados entra na Fase 2, para Libertadores/Copa do Brasil).
- Deploy: estático na **Vercel**.

## Identidade visual

- Nome: **"Bolão"**.
- Visual: tema escuro com toque verde/amarelo — ver DESIGN.md.
