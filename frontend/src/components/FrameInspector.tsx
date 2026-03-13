import type { FrameSnapshot, ObjectRecord, ChangeInfo } from '../types'
import { ValueChip } from './ValueDisplay'

const SHARED_COLORS = ['#58a6ff', '#f0883e', '#bc8cff', '#3fb950', '#f85149']

type Props = {
  frames: FrameSnapshot[]
  objects: Map<string, ObjectRecord>
  changedVars: Map<string, ChangeInfo>
  sharedObjectIds: Map<string, string[]>
}

export function FrameInspector({ frames, objects, changedVars, sharedObjectIds }: Props) {
  if (frames.length === 0) {
    return <div className="empty">No active frames</div>
  }

  const sharedIdList = [...sharedObjectIds.keys()]

  const functionNameCounts = new Map<string, number>()
  frames.forEach((f) => {
    if (f.scopeType === 'local') {
      functionNameCounts.set(f.name, (functionNameCounts.get(f.name) ?? 0) + 1)
    }
  })

  return (
    <div className="frame-list">
      {frames.map((frame, frameIdx) => {
        const isRecursive =
          frame.scopeType === 'local' &&
          (functionNameCounts.get(frame.name) ?? 0) > 1
        const recursionDepth = isRecursive
          ? frames
              .slice(0, frameIdx + 1)
              .filter((f) => f.name === frame.name).length
          : 0

        return (
          <div className="frame" key={frame.id}>
            <div className="frame__header">
              <span className="frame__name">
                {frame.name}
                {isRecursive && (
                  <span className="frame__depth"> depth {recursionDepth}</span>
                )}
              </span>
              <span className="frame__meta">
                <span className={`tag tag--${frame.scopeType}`}>
                  {frame.scopeType}
                </span>
                <span className="frame__line">L{frame.lineNumber}</span>
              </span>
            </div>
            <div className="var-list">
              {Object.entries(frame.variables).length === 0 ? (
                <div className="empty">No variables</div>
              ) : (
                Object.entries(frame.variables).map(([name, value]) => {
                  const key = `${frame.id}:${name}`
                  const change = changedVars.get(key)
                  const isChanged = !!change

                  const isShared =
                    value.kind === 'object_ref' &&
                    sharedObjectIds.has(value.objectId)
                  const sharedColor = isShared
                    ? SHARED_COLORS[
                        sharedIdList.indexOf(
                          (value as { objectId: string }).objectId,
                        ) % SHARED_COLORS.length
                      ]
                    : undefined
                  const sharedWith = isShared
                    ? sharedObjectIds
                        .get((value as { objectId: string }).objectId)!
                        .filter((n) => n !== name)
                    : []

                  return (
                    <div
                      className={`var-row${isChanged ? ' var-row--changed' : ''}`}
                      key={name}
                    >
                      <span className="var-row__name">
                        {sharedColor && (
                          <span
                            className="var-row__dot"
                            style={{ background: sharedColor }}
                          />
                        )}
                        {name}
                      </span>
                      <span className="var-row__values">
                        {change && change.prevValue != null && (
                          <>
                            <span className="var-row__prev">
                              <ValueChip
                                value={change.prevValue}
                                objects={objects}
                              />
                            </span>
                            <span className="var-row__arrow">&rarr;</span>
                          </>
                        )}
                        <ValueChip value={value} objects={objects} />
                        {change && (
                          <span
                            className={`var-row__badge var-row__badge--${change.changeKind}`}
                          >
                            {change.changeKind}
                          </span>
                        )}
                        {sharedWith.length > 0 && (
                          <span
                            className="var-row__shared"
                            style={{ color: sharedColor }}
                          >
                            = {sharedWith.join(', ')}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
