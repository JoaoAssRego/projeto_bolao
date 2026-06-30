interface Props {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  ariaLabel?: string
}

export default function DrumPicker({ value, onChange, disabled, ariaLabel }: Props) {
  return (
    <div
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={20}
      className={`flex flex-col items-center select-none ${disabled ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(Math.min(20, value + 1))}
        className="p-3 text-[var(--t3)] hover:text-[var(--accent)] active:text-[var(--accent)] transition-colors disabled:pointer-events-none"
        aria-label="aumentar"
      >
        <ChevronUp />
      </button>
      <span className="text-[42px] font-extrabold leading-none w-[52px] text-center tabular-nums text-[var(--accent)]">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => !disabled && onChange(Math.max(0, value - 1))}
        className="p-3 text-[var(--t3)] hover:text-[var(--accent)] active:text-[var(--accent)] transition-colors disabled:pointer-events-none disabled:opacity-30"
        aria-label="diminuir"
      >
        <ChevronDown />
      </button>
    </div>
  )
}

function ChevronUp() {
  return (
    <svg width="20" height="12" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <path d="M1 9L8 2L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="20" height="12" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
