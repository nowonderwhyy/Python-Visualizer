import type { SerializedValue, SerializedObjectData, ObjectRecord } from '../types'

export function ValueChip({
  value,
  objects,
}: {
  value: SerializedValue
  objects: Map<string, ObjectRecord>
}) {
  if (value.kind === 'primitive') {
    return (
      <span className={`val val--${value.type.toLowerCase()}`}>{value.repr}</span>
    )
  }

  const obj = objects.get(value.objectId)
  return (
    <span className="val val--ref">
      <span className="val__type">{value.type}</span>
      <span className="val__preview">{obj?.preview ?? value.preview}</span>
    </span>
  )
}

export function ObjectData({
  data,
  objects,
}: {
  data: SerializedObjectData
  objects: Map<string, ObjectRecord>
}) {
  switch (data.kind) {
    case 'list':
    case 'tuple':
    case 'set':
      if (data.items.length === 0) return <div className="empty">empty</div>
      return (
        <div className="obj-entries">
          {data.items.map((item, i) => (
            <div className="obj-entry" key={i}>
              <span className="obj-entry__key">{i}</span>
              <ValueChip value={item} objects={objects} />
            </div>
          ))}
          {data.truncated && <div className="truncated">…</div>}
        </div>
      )
    case 'dict':
      if (data.entries.length === 0) return <div className="empty">empty</div>
      return (
        <div className="obj-entries">
          {data.entries.map((entry, i) => (
            <div className="obj-entry obj-entry--dict" key={i}>
              <ValueChip value={entry.key} objects={objects} />
              <span className="obj-entry__arrow">&rarr;</span>
              <ValueChip value={entry.value} objects={objects} />
            </div>
          ))}
          {data.truncated && <div className="truncated">…</div>}
        </div>
      )
    case 'instance': {
      const attrs = Object.entries(data.attributes)
      if (attrs.length === 0) return <div className="empty">no attributes</div>
      return (
        <div className="obj-entries">
          {attrs.map(([name, value]) => (
            <div className="obj-entry" key={name}>
              <span className="obj-entry__key">{name}</span>
              <ValueChip value={value} objects={objects} />
            </div>
          ))}
        </div>
      )
    }
    case 'repr':
      return <span className="val">{data.repr}</span>
  }
}
