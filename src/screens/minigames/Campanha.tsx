import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../data/auth'
import { getCampaign } from '../../lib/minigames/campaigns'
import { COMPETITION_LABEL } from '../../lib/minigames/types'
import type { MgCampaign, MgGuess, MgPathMatch } from '../../lib/minigames/types'
import { scoreCampaign } from '../../lib/minigames/scoring'
import type { CampaignScore } from '../../lib/minigames/scoring'
import { saveCampaignResult } from '../../lib/minigames/storage'
import { ConfrontoScore, MgPointsBadge, MgTeamMark } from '../../components/minigames/bits'

// Rota /games/campanha/:id — refaz a campanha jogo a jogo (um por tela), depois
// o artilheiro, e revela o resultado. Adivinhações vivem em estado local; só
// gravam em localStorage ao final (momento de compromisso).
export default function Campanha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const campaign = getCampaign(id)

  const [step, setStep] = useState(0) // 0..N-1 = jogos; N = artilheiro
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

  function goBack() {
    if (step === 0) navigate('/games')
    else setStep((s) => s - 1)
  }

  function advance() {
    setStep((s) => s + 1)
  }

  function finish() {
    if (!campaign || !me) return
    const sc = scoreCampaign(campaign, guesses, scorerGuess)
    saveCampaignResult(me.id, campaign.id, sc)
    setResult(sc)
  }

  if (result) {
    return <Reveal campaign={campaign} guesses={guesses} scorerGuess={scorerGuess} score={result} onRetry={() => { setStep(0); setGuesses(campaign.path.map(() => [0, 0])); setScorerGuess(null); setResult(null) }} />
  }

  const progress = isScorerStep ? total : step
  return (
    <div className="flex flex-col gap-4">
      <PlayHeader campaign={campaign} onBack={goBack} />

      {/* Progresso */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {campaign.path.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < progress ? 'bg-[var(--accent)]' : i === progress ? 'bg-[var(--t3)]' : 'bg-[var(--raised)]'
            }`}
          />
        ))}
        <span className={`h-1.5 w-1.5 rounded-full ${isScorerStep ? 'bg-[var(--t3)]' : 'bg-[var(--raised)]'}`} />
      </div>

      {isScorerStep ? (
        <ArtilheiroStep
          campaign={campaign}
          value={scorerGuess}
          onSelect={setScorerGuess}
          onConfirm={finish}
        />
      ) : (
        <MatchStep
          campaign={campaign}
          match={campaign.path[step]}
          index={step}
          totalMatches={total}
          value={guesses[step]}
          onChange={setGuess}
          onConfirm={advance}
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
        aria-label="Voltar"
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
  onChange,
  onConfirm,
}: {
  campaign: MgCampaign
  match: MgPathMatch
  index: number
  totalMatches: number
  value: MgGuess
  onChange: (v: MgGuess) => void
  onConfirm: () => void
}) {
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
        <p className="mb-4 text-center text-sm text-[var(--t2)]">
          Qual foi o placar deste jogo?
        </p>
        <ConfrontoScore
          teamName={campaign.team}
          teamKind={campaign.teamKind}
          teamCode={campaign.teamCountryCode}
          opponent={match.opponent}
          opponentCode={match.opponentCountryCode}
          value={value}
          onChange={onChange}
        />
      </div>

      <button
        onClick={onConfirm}
        className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
      >
        {index + 1 === totalMatches ? 'Ir para o artilheiro' : 'Confirmar placar'}
      </button>
    </div>
  )
}

function ArtilheiroStep({
  campaign,
  value,
  onSelect,
  onConfirm,
}: {
  campaign: MgCampaign
  value: string | null
  onSelect: (name: string) => void
  onConfirm: () => void
}) {
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
            const active = value === name
            return (
              <button
                key={name}
                onClick={() => onSelect(name)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors ${
                  active
                    ? 'border-[var(--accent-ring)] bg-[var(--accent-muted)] text-[var(--t1)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--t2)] active:bg-[var(--raised)]'
                }`}
              >
                {name}
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                    active ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]' : 'border-[var(--border)] text-transparent'
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={value == null}
        className="rounded-2xl bg-[var(--accent)] py-3.5 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90 disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
      >
        Ver resultado
      </button>
    </div>
  )
}

// ─── Revelação ───────────────────────────────────────────────────────────────
function headline(pct: number): { title: string; emoji: string } {
  if (pct >= 1) return { title: 'Perfeito! Você é uma lenda', emoji: '🏆' }
  if (pct >= 0.8) return { title: 'Que campanha!', emoji: '🔥' }
  if (pct >= 0.5) return { title: 'Mandou bem', emoji: '👏' }
  if (pct > 0) return { title: 'Dá pra melhorar', emoji: '💪' }
  return { title: 'Não foi dessa vez', emoji: '😬' }
}

function Reveal({
  campaign,
  guesses,
  scorerGuess,
  score,
  onRetry,
}: {
  campaign: MgCampaign
  guesses: MgGuess[]
  scorerGuess: string | null
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
      </div>

      {/* Jogos */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {campaign.path.map((m, i) => (
          <RevealRow key={i} match={m} guess={guesses[i]} pts={score.perMatch[i]} last={i === campaign.path.length - 1} />
        ))}
      </div>

      {/* Artilheiro */}
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-[var(--t3)]">Artilheiro</p>
          <p className="truncate text-sm font-semibold text-[var(--t1)]">
            {campaign.topScorer.name}
            <span className="font-normal text-[var(--t3)]"> · {campaign.topScorer.goals} gols</span>
          </p>
          {!score.scorerCorrect && scorerGuess && (
            <p className="truncate text-xs text-[var(--t3)]">Seu palpite: {scorerGuess}</p>
          )}
        </div>
        <MgPointsBadge pts={score.scorerPoints} />
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

function RevealRow({ match, guess, pts, last }: { match: MgPathMatch; guess: MgGuess; pts: number; last: boolean }) {
  const actual = match.score
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${last ? '' : 'border-b border-[var(--border)]'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--t3)]">{stageTitle(match)}</p>
        <p className="truncate text-sm font-semibold text-[var(--t1)]">{match.opponent}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-sm font-bold text-[var(--t1)] tabular-nums">
          {actual[0]}<span className="font-light text-[var(--t3)]">×</span>{actual[1]}
          {match.penalties && <span className="ml-1 text-[10px] text-[var(--t3)]">(p)</span>}
        </span>
        <span className="text-[11px] text-[var(--t3)] tabular-nums">
          você: {guess[0]}×{guess[1]}
        </span>
      </div>
      <MgPointsBadge pts={pts} />
    </div>
  )
}
