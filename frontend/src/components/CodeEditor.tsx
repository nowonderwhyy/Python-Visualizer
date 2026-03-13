import Editor, { type OnMount } from '@monaco-editor/react'
import { useCallback, useMemo } from 'react'

const INPUT_RE = /\binput\s*\(\s*(?:f?(["'])(.*?)\1)?\s*\)/g

function extractInputPrompts(code: string): string[] {
  const prompts: string[] = []
  for (const line of code.split('\n')) {
    const commentIdx = line.indexOf('#')
    const effective = commentIdx >= 0 ? line.slice(0, commentIdx) : line
    INPUT_RE.lastIndex = 0
    let match
    while ((match = INPUT_RE.exec(effective)) !== null) {
      prompts.push(match[2] ?? '')
    }
  }
  return prompts
}

function formatLabel(prompt: string, index: number): string {
  const cleaned = prompt.replace(/[:?]\s*$/, '').trim()
  return cleaned || `Input ${index + 1}`
}

type Props = {
  code: string
  stdin: string
  isDark: boolean
  onCodeChange: (code: string) => void
  onStdinChange: (stdin: string) => void
  onEditorMount: OnMount
  isLoading: boolean
  onRun: () => void
  consumedInputCount: number
  needsMoreInput: boolean
  fileCount: number
  onToggleFiles: () => void
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
  consumedInputCount,
  needsMoreInput,
  fileCount,
  onToggleFiles,
}: Props) {
  const prompts = useMemo(() => extractInputPrompts(code), [code])
  const hasInputs = prompts.length > 0
  const stdinLines = useMemo(() => stdin.split('\n'), [stdin])

  const minFromRun = needsMoreInput
    ? consumedInputCount + 1
    : consumedInputCount
  const fieldCount = Math.max(prompts.length, minFromRun, stdinLines.length)

  const updateField = useCallback(
    (index: number, value: string) => {
      const lines = stdin.split('\n')
      while (lines.length <= index) lines.push('')
      lines[index] = value
      onStdinChange(lines.join('\n'))
    },
    [stdin, onStdinChange],
  )

  const addField = useCallback(() => {
    const lines = stdin.split('\n')
    lines.push('')
    onStdinChange(lines.join('\n'))
  }, [stdin, onStdinChange])

  return (
    <div className="pane editor-pane">
      <div className="pane__header">
        <span className="pane__title">Source</span>
        <div className="pane__actions">
          {fileCount > 0 && (
            <button
              className="btn btn--sm"
              onClick={onToggleFiles}
              type="button"
            >
              Files ({fileCount})
            </button>
          )}
          <button
            className="btn btn--primary"
            disabled={isLoading}
            onClick={onRun}
          >
            {isLoading ? 'Running\u2026' : 'Run'}
          </button>
        </div>
      </div>
      <div className="editor-wrap">
        <Editor
          defaultLanguage="python"
          height="100%"
          onChange={(v) => onCodeChange(v ?? '')}
          onMount={onEditorMount}
          options={{
            automaticLayout: true,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
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
      {hasInputs && (
        <div className="stdin-section">
          <div className="stdin-header">
            <span className="stdin-label">Inputs</span>
            <span className="stdin-hint">
              {prompts.length} input() call
              {prompts.length !== 1 ? 's' : ''} detected
            </span>
          </div>
          <div className="input-fields">
            {Array.from({ length: fieldCount }, (_, i) => (
              <div className="input-field" key={i}>
                <span className="input-field__prompt">
                  {formatLabel(prompts[i] ?? '', i)}
                </span>
                <input
                  className="input-field__value"
                  value={stdinLines[i] ?? ''}
                  onChange={(e) => updateField(i, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button
            className="btn btn--add"
            onClick={addField}
            type="button"
            title="Add another input value (for loops that call input())"
          >
            + Add input
          </button>
        </div>
      )}
    </div>
  )
}
