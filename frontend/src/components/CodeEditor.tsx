import Editor, { type OnMount } from '@monaco-editor/react'

type Props = {
  code: string
  stdin: string
  isDark: boolean
  onCodeChange: (code: string) => void
  onStdinChange: (stdin: string) => void
  onEditorMount: OnMount
  isLoading: boolean
  onRun: () => void
}

export function CodeEditor({
  code,
  stdin,
  isDark,
  onCodeChange,
  onStdinChange,
  onEditorMount,
  isLoading,
  onRun,
}: Props) {
  return (
    <div className="pane editor-pane">
      <div className="pane__header">
        <span className="pane__title">Source</span>
        <button
          className="btn btn--primary"
          disabled={isLoading}
          onClick={onRun}
        >
          {isLoading ? 'Running…' : 'Run'}
        </button>
      </div>
      <div className="editor-wrap">
        <Editor
          defaultLanguage="python"
          height="100%"
          onChange={(v) => onCodeChange(v ?? '')}
          onMount={onEditorMount}
          options={{
            automaticLayout: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
          theme={isDark ? 'vs-dark' : 'light'}
          value={code}
        />
      </div>
      <div className="stdin-section">
        <label className="stdin-label">stdin</label>
        <textarea
          className="stdin"
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Input for input() calls, one per line"
          rows={2}
          value={stdin}
        />
      </div>
    </div>
  )
}
