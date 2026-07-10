import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../data/auth'
import { getCampaign } from '../../lib/minigames/campaigns'
import { COMPETITION_LABEL } from '../../lib/minigames/types'
import type { MgCampaign, MgGuess, MgPathMatch } from '../../lib/minigames/types'
import { scoreCampaign, scoreGuess, ARTILHEIRO_POINTS } from '../../lib/minigames/scoring'
import type { CampaignScore } from '../../lib/minigames/scoring'
import { saveCampaignResult } from '../../lib/minigames/storage'
import { ConfrontoReveal, ConfrontoScore, MandoContext, MgPointsBadge, MgTeamMark } from '../../components/minigames/bits'

// Rota /games/campanha/:id — refaz a campanha jogo a jogo (um por tela). Cada jogo
// é fechado na hora: ao confirmar o palpite, revela acerto/erro e trava. Fluxo é
// só pra frente; sair no meio pede confirmação. Só grava em localStorage ao final.
export default function Campanha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const campaign = getCampaign(id)

  const [step, setStep] = useState(0) // 0..N-1 = jogos; N = artilheiro
  const [locked, setLocked] = useState(false) // passo atual já revelado/travado?
  const [guesses, setGuesses] = useState<MgGuess[]>(() =>
    campaign ? campaign.path.map(() => [0, 0] as MgGuess) : [],
  )
  const [scorerGuess, setScorerGuess] = useState<string | null>(null)
  const [result, setResult] = useState<CampaignScore | null>(null)

  if (!me) return null
  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-[var(--t3)]">Campanha não encontrada.</p>
        <button onClick={() => navigate('/games')} className="text-sm font-semibold text-[var(--accent)]">
          Voltar aos jogos
        </button>
      </div>
    )
  }

  const total = campaign.path.length
  const isScorerStep = step === total

  function setGuess(v: MgGuess) {
    setGuesses((prev) => {
      const next = [...prev]
      next[step] = v
      return next
    })
  }

  // Sair da campanha (setinha do header). Se houve progresso, confirma antes.
  function exit() {
    const hasProgress = step > 0 || locked
    if (hasProgress && !window.confirm('Sair? Você perde o progresso desta campanha.')) return
    navigate('/games')
  }

  function advance() {
    setStep((s) => s + 1)
    setLocked(false)
  }

  function finish() {
    const sc = scoreCampaign(campaign!, guesses, scorerGuess)
    saveCampaignResult(me!.id, campaign!.id, sc)
    setResult(sc)
  }

  if (result) {
    return (
      <Reveal
        campaign={campaign}
        score={result}
        onRetry={() => {
          setStep(0)
          setLocked(false)
          setGuesses(campaign.path.map(() => [0, 0]))
          setScorerGuess(null)
          setResult(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PlayHeader campaign={campaign} onBack={exit} />

      {/* Progresso */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {campaign.path.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-[var(--accent)]' : i === step ? 'bg-[var(--t3)]' : 'bg-[var(--raised)]'
            }`}
          />
        ))}
        <span className={`h-1.5 w-1.5 rounded-full ${isScorerStep ? 'bg-[var(--t3)]' : 'bg-[var(--raised)]'}`} />
      </div>

      {isScorerStep ? (
        <ArtilheiroStep
          campaign={campaign}
          value={scorerGuess}
          locked={locked}
          onSelect={setScorerGuess}
          onConfirm={() => setLocked(true)}
          onFinish={finish}
        />
      ) : (
        <MatchStep
          campaign={campaign}
          match={campaign.path[step]}
          index={step}
          totalMatches={total}
          value={guesses[step]}
          locked={locked}
          onChange={setGuess}
          onConfirm={() => setLocked(true)}
          onNext={advance}
        />
      )}
    </div>
  )
}

function PlayHeader({ campaign, onBack }: { campaign: MgCampaign; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--raised)] text-[var(--t2)] transition-colors active:bg-[var(--border)]"
        aria-label="Sair da campanha"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <MgTeamMark name={campaign.team} code={campaign.teamCountryCode} kind={campaign.teamKind} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-[var(--t1)]">{campaign.team}</p>
          <p className="truncate text-[11px] uppercase tracking-widest text-[var(--t3)]">
            {COMPETITION_LABEL[campaign.competition]} {campaign.year}
          </p>
        </div>
      </div>
    </div>
  )
}

function stageTitle(m: MgPathMatch): string {
  return m.leg ? `${m.stageLabel} · ${m.leg === 'ida' ? 'Ida' : 'Volta'}` : m.stageLabel
}

function MatchStep({
  campaign,
  match,
  index,
  totalMatches,
  value,
  locked,
  onChange,
  onConfirm,
  onNext,
}: {
  campaign: MgCampaign
  match: MgPathMatch
  index: number
  totalMatches: number
  value: MgGuess
  locked: boolean
  onChange: (v: MgGuess) => void
  onConfirm: () => void
  onNext: () => void
}) {
  const pts = scoreGuess(value, match.score)
  const isLast = index + 1 === totalMatches
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--t2)]">
          {stageTitle(match)}
        </span>
        <span className="text-xs font-semibold text-[var(--t3)] tabular-nums">
          Jogo {index + 1} de {totalMatches}
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
        <MandoContext home={match.home} venue={match.venue} />
        {locked ? (
          <>
            <ConfrontoReveal
              teamName={campaign.team}
              teamKind={campaign.teamKind}
              teamCode={campaign.teamCountryCode}
              opponent={match.opponent}
              opponentCode={match.opponentCountryCode}
              home={match.home}
              actual={match.score}
              penalties={match.penalties}
              guess={value}
              pts={pts}
            />
            {match.note && <p className="text-center text-xs text-[var(--t3)]">{match.note}</p>}
          </>
        ) : (
          <>
            <p className="text-center text-sm text-[var(--t2)]">Qual foi o placar deste jogo?</p>
            <ConfrontoScore
              teamName={campaign.team}
              teamKind={campaign.teamKind}
              teamCode={campaign.teamCountryCode}
              opponent={match.opponent}
              opponentCode={match.opponentCountryCode}
              home={match.home}
              value={value}
              onChange={onChange}
            />
          </>
        )}
      </div>

      {locked ? (
        <button
          onClick={onNext}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
        >
          {isLast ? 'Ir para o artilheiro' : 'Próximo jogo'}
        </button>
      ) : (
        <button
          onClick={onConfirm}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
        >
          Confirmar palpite
        </button>
      )}
    </div>
  )
}

function ArtilheiroStep({
  campaign,
  value,
  locked,
  onSelect,
  onConfirm,
  onFinish,
}: {
  campaign: MgCampaign
  value: string | null
  locked: boolean
  onSelect: (name: string) => void
  onConfirm: () => void
  onFinish: () => void
}) {
  const correct = value === campaign.topScorer.name
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--t2)]">
          Última pergunta
        </span>
        <span className="text-xs font-semibold text-[var(--t3)]">Artilheiro</span>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
        <p className="text-center text-sm text-[var(--t2)]">
          Quem foi o artilheiro do <span className="font-bold text-[var(--t1)]">{campaign.team}</span> nesta campanha?
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {campaign.scorerOptions.map((name) => {
            const isCorrect = name === campaign.topScorer.name
            const isPicked = value === name
            // Estado visual: enquanto não revela, só destaca o escolhido. Depois de
            // revelar, marca o certo (verde); o palpite errado fica apagado.
            let cls = 'border-[var(--border)] bg-[var(--bg)] text-[var(--t2)]'
            if (locked) {
              if (isCorrect) cls = 'border-[var(--ok)] bg-[oklch(57%_0.140_155_/_0.18)] text-[var(--t1)]'
              else if (isPicked) cls = 'border-[var(--border)] bg-[var(--raised)] text-[var(--t3)]'
            } else if (isPicked) {
              cls = 'border-[var(--accent-ring)] bg-[var(--accent-muted)] text-[var(--t1)]'
            }
            return (
              <button
                key={name}
                onClick={() => !locked && onSelect(name)}
                disabled={locked}
                aria-pressed={isPicked}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors ${cls} ${
                  locked ? '' : 'active:bg-[var(--raised)]'
                }`}
              >
                <span>
                  {name}
                  {locked && isCorrect && (
                    <span className="ml-2 text-xs font-normal text-[var(--t3)]">· {campaign.topScorer.goals} gols</span>
                  )}
                  {locked && isPicked && !isCorrect && (
                    <span className="ml-2 text-xs font-normal text-[var(--t3)]">· seu palpite</span>
                  )}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                    locked && isCorrect
                      ? 'border-[var(--ok)] bg-[var(--ok)] text-[var(--ok-fg)]'
                      : isPicked
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'border-[var(--border)] text-transparent'
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            )
          })}
        </div>
        {locked && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-[var(--t2)]">
              {correct ? 'Acertou o artilheiro!' : 'Não foi o artilheiro'}
            </span>
            <MgPointsBadge pts={correct ? ARTILHEIRO_POINTS : 0} />
          </div>
        )}
      </div>

      {locked ? (
        <button
          onClick={onFinish}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
        >
          Ver resultado
        </button>
      ) : (
        <button
          onClick={onConfirm}
          disabled={value == null}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90 disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
        >
          Confirmar
        </button>
      )}
    </div>
  )
}

// ─── Revelação final (celebração) ──────────────────────────────────────────────
function headline(pct: number): { title: string; emoji: string } {
  if (pct >= 1) return { title: 'Perfeito! Você é uma lenda', emoji: '🏆' }
  if (pct >= 0.8) return { title: 'Que campanha!', emoji: '🔥' }
  if (pct >= 0.5) return { title: 'Mandou bem', emoji: '👏' }
  if (pct > 0) return { title: 'Dá pra melhorar', emoji: '💪' }
  return { title: 'Não foi dessa vez', emoji: '😬' }
}

// Cor de cada pontinho da retrospectiva, na escala do bolão (10/7/5/0).
function pipColor(pts: number): string {
  if (pts === 10) return 'bg-[var(--accent)]'
  if (pts === 7) return 'bg-[oklch(75%_0.16_120)]'
  if (pts === 5) return 'bg-[var(--ok)]'
  return 'bg-[var(--raised)]'
}

function Reveal({
  campaign,
  score,
  onRetry,
}: {
  campaign: MgCampaign
  score: CampaignScore
  onRetry: () => void
}) {
  const navigate = useNavigate()
  const [shared, setShared] = useState(false)
  const h = useMemo(() => headline(score.total / score.max), [score])

  async function share() {
    const text = `Refiz a campanha do ${campaign.team} na ${COMPETITION_LABEL[campaign.competition]} ${campaign.year} e fiz ${score.total}/${score.max} pts no Bolão! 🔥`
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Placar geral */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-center">
        <div className="text-4xl" aria-hidden>{h.emoji}</div>
        <p className="mt-2 text-lg font-extrabold text-[var(--t1)]">{h.title}</p>
        <p className="mt-3">
          <span className="text-5xl font-extrabold text-[var(--accent)] tabular-nums">{score.total}</span>
          <span className="text-lg font-bold text-[var(--t3)] tabular-nums"> / {score.max}</span>
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-[var(--t3)]">
          {campaign.team} · {COMPETITION_LABEL[campaign.competition]} {campaign.year}
        </p>

        {/* Retrospectiva compacta: um pontinho por jogo, cor pelo acerto */}
        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {score.perMatch.map((pts, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${pipColor(pts)}`} />
          ))}
          <span className="mx-1 h-3 w-px bg-[var(--border)]" />
          <span className={`h-2 w-2 rounded-full ${score.scorerCorrect ? 'bg-[var(--accent)]' : 'bg-[var(--raised)]'}`} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--t3)] tabular-nums">
          {score.exacts} placar{score.exacts === 1 ? '' : 'es'} cravado{score.exacts === 1 ? '' : 's'}
          {score.scorerCorrect && ' · artilheiro certo'}
        </p>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        <button
          onClick={share}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
        >
          {shared ? 'Copiado ✓' : 'Compartilhar'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-semibold text-[var(--t1)] transition-colors active:bg-[var(--surface)]"
          >
            Jogar de novo
          </button>
          <button
            onClick={() => navigate('/games')}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-semibold text-[var(--t1)] transition-colors active:bg-[var(--surface)]"
          >
            Outra campanha
          </button>
        </div>
      </div>
    </div>
  )
}
