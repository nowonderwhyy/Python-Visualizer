import type { ObjectRecord } from '../types'
import { ObjectData } from './ValueDisplay'

type Props = {
  objects: ObjectRecord[]
  objectMap: Map<string, ObjectRecord>
}

export function ObjectInspector({ objects, objectMap }: Props) {
  if (objects.length === 0) {
    return <div className="empty">No heap objects</div>
  }

  return (
    <div className="obj-list">
      {objects.map((item) => (
        <div className="obj" key={item.objectId}>
          <div className="obj__header">
            <span className="obj__id">{item.objectId}</span>
            <span className="obj__type">{item.type}</span>
            <span className="obj__preview">{item.preview}</span>
          </div>
          <ObjectData data={item.data} objects={objectMap} />
        </div>
      ))}
    </div>
  )
}
