# Bolão da Copa — Especificação (entendimento compartilhado)

> Documento gerado a partir da sessão de grilling em 2026-06-21. Base para a construção.

## Visão geral
PWA focada em celular para um bolão da Copa do Mundo de 2026, usada por ~10 amigos. Sem login tradicional. Resultados lançados manualmente por um admin. Deve ir ao ar rápido — a Copa já está em andamento (fase de grupos, ~21/jun).

## Mecânica de aposta e pontuação
- Cada participante palpita o **placar** de cada jogo (ex: 2x1).
- Pontuação por jogo: **10 / 5 / 0**
  - **10 pts** — placar exato.
  - **5 pts** — errou o placar mas acertou o resultado.
  - **0 pts** — errou tudo.

### Regra do mata-mata (eliminatórias)
O palpite continua sendo um placar. Para jogos de mata-mata:
- **10 pts** — placar exato bate com o placar do tempo normal/prorrogação (**pênaltis ignorados para o placar**). Ex: palpitou 1x1, terminou 1x1 e foi pra pênaltis → 10 pts.
- **5 pts** — não acertou o placar, mas **o time favorecido no palpite foi quem avançou** (inclusive via pênaltis). Ex: palpitou "Brasil 2x1", terminou "1x1, Brasil nos pênaltis" → 5 pts.
- **0 pts** — errou o placar e o time favorecido não avançou.
- Palpite de **empate** no mata-mata só pode dar **10 ou 0** (não aponta ninguém para avançar).
- Na fase de grupos o empate é resultado válido (10/5/0 normal).

### Desempate no ranking
1. Mais placares exatos (cravadas de 10).
2. Mais acertos de resultado.
3. Se ainda empatar → posição compartilhada.

## Recorte de jogos
- Valem **todos os jogos restantes** a partir do próximo disponível (fim da fase de grupos + todo o mata-mata).
- Jogos já ocorridos ficam de fora (não dá pra palpitar no passado).

## Dados (jogos e resultados)
- Tabela de jogos importada **uma única vez** de fonte pública (montada na construção), em **horário de Brasília (UTC-3)**.
- Jogos de mata-mata entram com times "a definir"; o admin preenche os confrontos conforme o chaveamento sai.
- **Resultados lançados manualmente pelo admin.** Sem API ao vivo.

## Travamento e palpites
- O palpite de um jogo **trava no horário oficial de início** da partida.
- **Quem não palpitou a tempo → 0 pts** naquele jogo. Sem palpite tardio.
- Palpites **ocultos até o jogo travar**; depois de travar, **todos veem** o palpite de todos.

## Identidade e acesso (sem login)
- **Um link compartilhado** no grupo.
- Tela de entrada: **"Sou novo"** (digita o nome, cria o registro) ou **"Já participo"** (escolhe o nome na lista — re-vincula a conta ao trocar de celular/limpar navegador).
- Identidade lembrada no aparelho (armazenamento local).
- **Admin** = participante com flag `is_admin` marcada **manualmente uma vez no banco** (João se cadastra, avisa, flag é ligada). Habilita as telas de admin.

### Postura de segurança (risco aceito conscientemente)
- Proteção da regra "ocultar palpites" e "editar só o próprio" é **no app (na confiança)**, não garantida no servidor. Um amigo com conhecimento técnico consegue espiar via DevTools. Aceitável para o grupo.
- Única escrita protegida de fato: **lançamento de resultados** (restrito ao admin) para ninguém estragar o placar.

## Telas (MVP)
1. **Entrada** — "Sou novo" / "Já participo".
2. **Jogos / Meu palpite** — próximos jogos, digitar/editar placar até travar; destaque "você ainda não palpitou nos jogos de hoje".
3. **Jogo encerrado** — após travar: palpite de todos + resultado + pontos de cada um.
4. **Classificação** — ranking geral com desempate.
5. **Meus palpites** — histórico pessoal e pontos por jogo.
6. **Admin** (só João) — lançar resultado + definir confrontos do mata-mata.

## Notificações
- **Sem Web Push** no MVP.
- Em vez disso: **aviso dentro do app** ("você ainda não palpitou nos jogos de hoje"). Lembretes externos via WhatsApp.

## Stack e infraestrutura
- Frontend: **React + Vite + TypeScript + Tailwind**, instalável via `vite-plugin-pwa`.
- Backend/dados: **Supabase (plano gratuito)** — Postgres + API + realtime para o ranking.
- Deploy: estático grátis na **Vercel ou Netlify**.

## Identidade visual
- Nome: **"Bolão da Copa"** (provisório, fácil de trocar).
- Visual: **tema escuro** com toque verde/amarelo.

## Pendências de execução (não bloqueiam o design)
- Compilar/validar a tabela de jogos restantes da Copa 2026 com horários de Brasília.
- Ligar a flag de admin no registro do João após o primeiro cadastro.
- Definir o modelo de dados no Supabase (participantes, jogos, palpites) e a regra de cálculo de pontos.
