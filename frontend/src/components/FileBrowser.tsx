import { useState, useMemo } from 'react'

export type PyFile = {
  name: string
  path: string
  file: File
}

type Props = {
  files: PyFile[]
  folderName: string
  onSelect: (file: File) => void
  onClose: () => void
}

export function FileBrowser({ files, folderName, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return files
    const q = search.toLowerCase()
    return files.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, search])

  return (
    <div className="fb">
      <div className="fb__header">
        <span className="fb__folder">{folderName}</span>
        <span className="fb__count">
          {files.length} .py file{files.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn btn--icon fb__close"
          onClick={onClose}
          title="Close"
          type="button"
        >
          &times;
        </button>
      </div>
      {files.length > 5 && (
        <div className="fb__search-wrap">
          <input
            className="fb__search"
            placeholder="Filter files\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="fb__list">
        {filtered.length === 0 ? (
          <div className="fb__empty">No matching files</div>
        ) : (
          filtered.map((f) => {
            const displayPath = f.path.split('/').slice(1).join('/')
            return (
              <button
                key={f.path}
                className="fb__item"
                onClick={() => onSelect(f.file)}
                type="button"
              >
                <span className="fb__item-name">{f.name}</span>
                {displayPath !== f.name && (
                  <span className="fb__item-path">{displayPath}</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
