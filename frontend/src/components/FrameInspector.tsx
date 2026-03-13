import type { FrameSnapshot, ObjectRecord, SerializedValue } from '../types'
import { ValueChip } from './ValueDisplay'

type Props = {
  frames: FrameSnapshot[]
  objects: Map<string, ObjectRecord>
  changedVars: Map<string, SerializedValue | null>
}

export function FrameInspector({ frames, objects, changedVars }: Props) {
  if (frames.length === 0) {
    return <div className="empty">No active frames</div>
  }

  return (
    <div className="frame-list">
      {frames.map((frame) => (
        <div className="frame" key={frame.id}>
          <div className="frame__header">
            <span className="frame__name">{frame.name}</span>
            <span className="frame__meta">
              <span className={`tag tag--${frame.scopeType}`}>{frame.scopeType}</span>
              <span className="frame__line">L{frame.lineNumber}</span>
            </span>
          </div>
          <div className="var-list">
            {Object.entries(frame.variables).length === 0 ? (
              <div className="empty">No variables</div>
            ) : (
              Object.entries(frame.variables).map(([name, value]) => {
                const key = `${frame.id}:${name}`
                const isChanged = changedVars.has(key)
                const prevValue = isChanged ? changedVars.get(key) : null

                return (
                  <div
                    className={`var-row${isChanged ? ' var-row--changed' : ''}`}
                    key={name}
                  >
                    <span className="var-row__name">{name}</span>
                    <span className="var-row__values">
                      {prevValue != null && (
                        <>
                          <span className="var-row__prev">
                            <ValueChip value={prevValue} objects={objects} />
                          </span>
                          <span className="var-row__arrow">&rarr;</span>
                        </>
                      )}
                      <ValueChip value={value} objects={objects} />
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
