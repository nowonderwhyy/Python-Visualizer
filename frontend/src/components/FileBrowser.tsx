import { useState, useMemo } from 'react'

export type PyFile = {
  name: string
  path: string
  file: File
}

type Props = {
  files: PyFile[]
  folderName: string
  activePath: string | null
  onSelect: (file: File, path: string) => void
  onClose: () => void
}

export function FilePanel({
  files,
  folderName,
  activePath,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return files
    const q = search.toLowerCase()
    return files.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, search])

  return (
    <aside className="fp pane">
      <div className="fp__header">
        <div className="fp__title">
          <span className="fp__folder">{folderName}</span>
          <span className="fp__count">{files.length}</span>
        </div>
        <button
          className="btn btn--icon"
          onClick={onClose}
          title="Hide panel"
          type="button"
        >
          &times;
        </button>
      </div>
      {files.length > 5 && (
        <div className="fp__search">
          <input
            className="fp__search-input"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="fp__list">
        {filtered.length === 0 ? (
          <div className="fp__empty">No matching files</div>
        ) : (
          filtered.map((f) => {
            const isActive = f.path === activePath
            const parts = f.path.split('/').slice(1)
            const dir =
              parts.length > 1 ? parts.slice(0, -1).join('/') : null

            return (
              <button
                key={f.path}
                className={`fp__item${isActive ? ' fp__item--active' : ''}`}
                onClick={() => onSelect(f.file, f.path)}
                type="button"
              >
                <span className="fp__item-name">{f.name}</span>
                {dir && <span className="fp__item-dir">{dir}</span>}
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
