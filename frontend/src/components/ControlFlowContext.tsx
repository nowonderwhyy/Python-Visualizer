import type { ActiveLoop, SerializedValue } from '../types'
import { ValueChip } from './ValueDisplay'
import type { ObjectRecord } from '../types'

type Props = {
  activeLoops: ActiveLoop[]
  conditionResult?: boolean
  previousLine: number | null
  returnValue?: SerializedValue
  eventType: string | null
  codeLines: string[]
  objects: Map<string, ObjectRecord>
  frameName?: string
}

export function ControlFlowContext({
  activeLoops,
  conditionResult,
  previousLine,
  returnValue,
  eventType,
  codeLines,
  objects,
  frameName,
}: Props) {
  const hasContent =
    activeLoops.length > 0 ||
    conditionResult !== undefined ||
    (eventType === 'return' && returnValue)

  if (!hasContent) return null

  return (
    <div className="cf">
      {activeLoops.map((loop) => (
        <div className="cf__item cf__item--loop" key={loop.line}>
          <span className="cf__tag cf__tag--loop">{loop.type}</span>
          <code className="cf__code">
            {codeLines[loop.line - 1]?.trim() ?? `L${loop.line}`}
          </code>
          <span className="cf__iter">iter {loop.iteration}</span>
        </div>
      ))}

      {conditionResult !== undefined && previousLine != null && (
        <div
          className={`cf__item cf__item--${conditionResult ? 'true' : 'false'}`}
        >
          <span
            className={`cf__tag cf__tag--${conditionResult ? 'true' : 'false'}`}
          >
            {conditionResult ? 'True' : 'False'}
          </span>
          <code className="cf__code">
            {codeLines[previousLine - 1]?.trim() ?? `L${previousLine}`}
          </code>
        </div>
      )}

      {eventType === 'return' && returnValue && (
        <div className="cf__item cf__item--return">
          <span className="cf__tag cf__tag--return">return</span>
          {frameName && (
            <code className="cf__code">{frameName}()</code>
          )}
          <ValueChip value={returnValue} objects={objects} />
        </div>
      )}
    </div>
  )
}
