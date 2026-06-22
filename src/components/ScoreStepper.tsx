interface Props {
  value: number | ''
  onChange: (v: number) => void
  disabled?: boolean
  ariaLabel?: string
}

/** Seletor de gols grande e fácil de tocar no celular: − [n] + */
export default function ScoreStepper({ value, onChange, disabled, ariaLabel }: Props) {
  const n = value === '' ? 0 : value
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || n <= 0}
        onClick={() => onChange(Math.max(0, n - 1))}
        className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--raised)] text-lg font-bold text-[var(--t1)] transition-colors disabled:opacity-30 active:border-[var(--accent)] active:text-[var(--accent)]"
        aria-label="diminuir"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
        className="h-9 w-10 rounded-lg bg-[var(--bg)] text-center text-lg font-bold text-[var(--t1)] outline-none disabled:bg-transparent disabled:text-[var(--t2)]"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(99, n + 1))}
        className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--raised)] text-lg font-bold text-[var(--t1)] transition-colors disabled:opacity-30 active:border-[var(--accent)] active:text-[var(--accent)]"
        aria-label="aumentar"
      >
        +
      </button>
    </div>
  )
}
