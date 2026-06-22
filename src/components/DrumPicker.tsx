import { useRef, useEffect } from 'react'

interface Props {
  value: number | ''
  onChange: (v: number) => void
  disabled?: boolean
  ariaLabel?: string
}

export default function DrumPicker({ value, onChange, disabled, ariaLabel }: Props) {
  const n = value === '' ? 0 : value
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)
  const nRef = useRef(n)
  nRef.current = n

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (disabled) return
      e.preventDefault()
      onChange(Math.max(0, Math.min(20, nRef.current + (e.deltaY < 0 ? 1 : -1))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [disabled, onChange])

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startVal: n }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || disabled) return
    const delta = Math.round((dragRef.current.startY - e.clientY) / 22)
    const next = Math.max(0, Math.min(20, dragRef.current.startVal + delta))
    if (next !== n) onChange(next)
  }

  function onPointerUp() {
    dragRef.current = null
  }

  return (
    <div
      ref={containerRef}
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={n}
      aria-valuemin={0}
      aria-valuemax={20}
      className={`flex flex-col items-center select-none touch-none rounded-xl transition-colors ${
        disabled ? 'opacity-40 cursor-default' : 'cursor-ns-resize active:bg-[var(--accent-muted)]'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(Math.min(20, n + 1))}
        className="p-1.5 text-[var(--t3)] hover:text-[var(--t2)] transition-colors disabled:pointer-events-none"
        aria-label="aumentar"
        tabIndex={-1}
      >
        <ChevronUp />
      </button>
      <span className="text-[42px] font-extrabold leading-none w-[52px] text-center tabular-nums text-[var(--accent)]">
        {n}
      </span>
      <button
        type="button"
        disabled={disabled || n <= 0}
        onClick={() => !disabled && onChange(Math.max(0, n - 1))}
        className="p-1.5 text-[var(--t3)] hover:text-[var(--t2)] transition-colors disabled:pointer-events-none disabled:opacity-30"
        aria-label="diminuir"
        tabIndex={-1}
      >
        <ChevronDown />
      </button>
    </div>
  )
}

function ChevronUp() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <path d="M1 9L8 2L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
