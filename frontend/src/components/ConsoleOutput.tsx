type Props = {
  stdout: string
  stdinConsumed: string[]
}

export function ConsoleOutput({ stdout, stdinConsumed }: Props) {
  return (
    <div className="console-section">
      <div className="console-block">
        <span className="console-block__label">stdout</span>
        <pre className="console-pre">{stdout || '\n'}</pre>
      </div>
      {stdinConsumed.length > 0 && (
        <div className="console-block">
          <span className="console-block__label">consumed input</span>
          <div className="consumed-list">
            {stdinConsumed.map((item, i) => (
              <span className="val" key={i}>
                {JSON.stringify(item)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
