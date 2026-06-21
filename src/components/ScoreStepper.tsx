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
        className="h-9 w-9 rounded-lg bg-emerald-900/70 text-lg font-bold text-emerald-100 disabled:opacity-30 active:bg-emerald-800"
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
        className="h-9 w-10 rounded-lg bg-emerald-950 text-center text-lg font-bold text-white outline-none disabled:bg-transparent disabled:text-emerald-100"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(99, n + 1))}
        className="h-9 w-9 rounded-lg bg-emerald-900/70 text-lg font-bold text-emerald-100 disabled:opacity-30 active:bg-emerald-800"
        aria-label="aumentar"
      >
        +
      </button>
    </div>
  )
}
