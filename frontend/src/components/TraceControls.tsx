import { useCallback, useEffect, useState } from 'react'

const SPEEDS = [
  { label: 'Slow', ms: 1500 },
  { label: '1x', ms: 800 },
  { label: '2x', ms: 400 },
  { label: '4x', ms: 150 },
]

type Props = {
  currentIndex: number
  totalSteps: number
  onIndexChange: (index: number) => void
}

export function TraceControls({ currentIndex, totalSteps, onIndexChange }: Props) {
  const hasSteps = totalSteps > 0
  const atStart = !hasSteps || currentIndex === 0
  const atEnd = !hasSteps || currentIndex >= totalSteps - 1

  const [playing, setPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(800)

  const goFirst = useCallback(() => { setPlaying(false); onIndexChange(0) }, [onIndexChange])
  const goPrev = useCallback(() => { setPlaying(false); onIndexChange(Math.max(0, currentIndex - 1)) }, [onIndexChange, currentIndex])
  const goNext = useCallback(() => onIndexChange(Math.min(totalSteps - 1, currentIndex + 1)), [onIndexChange, currentIndex, totalSteps])
  const goLast = useCallback(() => { setPlaying(false); onIndexChange(Math.max(0, totalSteps - 1)) }, [onIndexChange, totalSteps])

  useEffect(() => {
    if (!playing || atEnd) return
    const timer = setTimeout(() => {
      const next = Math.min(totalSteps - 1, currentIndex + 1)
      onIndexChange(next)
      if (next >= totalSteps - 1) setPlaying(false)
    }, speedMs)
    return () => clearTimeout(timer)
  }, [playing, currentIndex, speedMs, atEnd, onIndexChange, totalSteps])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft' && !atStart) { e.preventDefault(); goPrev() }
      if (e.key === 'ArrowRight' && !atEnd) { e.preventDefault(); goNext() }
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [atStart, atEnd, goPrev, goNext])

  return (
    <div className="trace-nav">
      <div className="trace-nav__buttons">
        <button className="btn btn--icon" disabled={atStart} onClick={goFirst} title="First step">
          &#x23EE;
        </button>
        <button className="btn btn--icon" disabled={atStart} onClick={goPrev} title="Previous (←)">
          &#x25C0;
        </button>
        <button
          className={`btn btn--icon btn--play${playing ? ' btn--active' : ''}`}
          disabled={!hasSteps}
          onClick={() => setPlaying((p) => !p)}
          title="Play / Pause (Space)"
        >
          {playing ? '\u23F8' : '\u23F5'}
        </button>
        <button className="btn btn--icon" disabled={atEnd} onClick={() => { setPlaying(false); goNext() }} title="Next (→)">
          &#x25B6;
        </button>
        <button className="btn btn--icon" disabled={atEnd} onClick={goLast} title="Last step">
          &#x23ED;
        </button>
      </div>
      <input
        className="trace-nav__slider"
        disabled={!hasSteps}
        max={Math.max(0, totalSteps - 1)}
        min={0}
        onChange={(e) => { setPlaying(false); onIndexChange(Number(e.target.value)) }}
        type="range"
        value={currentIndex}
      />
      <select
        className="trace-nav__speed"
        onChange={(e) => setSpeedMs(Number(e.target.value))}
        value={speedMs}
        title="Playback speed"
      >
        {SPEEDS.map((s) => (
          <option key={s.ms} value={s.ms}>{s.label}</option>
        ))}
      </select>
      <span className="trace-nav__label">
        {hasSteps ? `${currentIndex + 1} / ${totalSteps}` : '\u2014'}
      </span>
    </div>
  )
}
