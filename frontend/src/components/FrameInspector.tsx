import type { FrameSnapshot, ObjectRecord } from '../types'
import { ValueChip } from './ValueDisplay'

type Props = {
  frames: FrameSnapshot[]
  objects: Map<string, ObjectRecord>
  changedVars: Set<string>
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
              Object.entries(frame.variables).map(([name, value]) => (
                <div
                  className={`var-row${changedVars.has(`${frame.id}:${name}`) ? ' var-row--changed' : ''}`}
                  key={name}
                >
                  <span className="var-row__name">{name}</span>
                  <ValueChip value={value} objects={objects} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
