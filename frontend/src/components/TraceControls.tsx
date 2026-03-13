import { useCallback, useEffect } from 'react'

type Props = {
  currentIndex: number
  totalSteps: number
  onIndexChange: (index: number) => void
}

export function TraceControls({ currentIndex, totalSteps, onIndexChange }: Props) {
  const hasSteps = totalSteps > 0
  const atStart = !hasSteps || currentIndex === 0
  const atEnd = !hasSteps || currentIndex >= totalSteps - 1

  const goFirst = useCallback(() => onIndexChange(0), [onIndexChange])
  const goPrev = useCallback(
    () => onIndexChange(Math.max(0, currentIndex - 1)),
    [onIndexChange, currentIndex],
  )
  const goNext = useCallback(
    () => onIndexChange(Math.min(totalSteps - 1, currentIndex + 1)),
    [onIndexChange, currentIndex, totalSteps],
  )
  const goLast = useCallback(
    () => onIndexChange(Math.max(0, totalSteps - 1)),
    [onIndexChange, totalSteps],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && !atStart) {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight' && !atEnd) {
        e.preventDefault()
        goNext()
      }
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
        <button className="btn btn--icon" disabled={atEnd} onClick={goNext} title="Next (→)">
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
        onChange={(e) => onIndexChange(Number(e.target.value))}
        type="range"
        value={currentIndex}
      />
      <span className="trace-nav__label">
        {hasSteps ? `${currentIndex + 1} / ${totalSteps}` : '\u2014'}
      </span>
    </div>
  )
}
