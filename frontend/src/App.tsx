import Editor, { type OnMount } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { editor } from 'monaco-editor'
import './App.css'
import { sampleInput, sampleProgram } from './sampleProgram'
import type {
  ExecutionStep,
  ObjectRecord,
  SerializedObjectData,
  SerializedValue,
  VisualizationResponse,
} from './types'

function valueSignature(value: SerializedValue | undefined): string {
  return JSON.stringify(value)
}

function renderValue(value: SerializedValue, objects: Map<string, ObjectRecord>) {
  if (value.kind === 'primitive') {
    return (
      <span className={`value-chip value-chip--${value.type.toLowerCase()}`}>
        {value.repr}
      </span>
    )
  }

  const referencedObject = objects.get(value.objectId)

  return (
    <span className="object-reference">
      <span className="object-reference__id">{value.objectId}</span>
      <span className="object-reference__type">{value.type}</span>
      <span className="object-reference__preview">
        {referencedObject?.preview ?? value.preview}
      </span>
    </span>
  )
}

function renderObjectData(data: SerializedObjectData, objects: Map<string, ObjectRecord>) {
  switch (data.kind) {
    case 'list':
    case 'tuple':
    case 'set':
      return (
        <div className="object-collection">
          {data.items.length === 0 ? (
            <span className="empty-state">Empty</span>
          ) : (
            data.items.map((item, index) => (
              <div className="object-collection__item" key={`${data.kind}-${index}`}>
                <span className="object-key">{index}</span>
                {renderValue(item, objects)}
              </div>
            ))
          )}
          {data.truncated ? <span className="truncated-flag">More items hidden...</span> : null}
        </div>
      )
    case 'dict':
      return (
        <div className="object-collection">
          {data.entries.length === 0 ? (
            <span className="empty-state">Empty</span>
          ) : (
            data.entries.map((entry, index) => (
              <div className="object-collection__item object-collection__item--dict" key={index}>
                <div className="object-entry">
                  <span className="object-key">Key</span>
                  {renderValue(entry.key, objects)}
                </div>
                <div className="object-entry">
                  <span className="object-key">Value</span>
                  {renderValue(entry.value, objects)}
                </div>
              </div>
            ))
          )}
          {data.truncated ? <span className="truncated-flag">More entries hidden...</span> : null}
        </div>
      )
    case 'instance':
      return (
        <div className="object-collection">
          {Object.entries(data.attributes).length === 0 ? (
            <span className="empty-state">No attributes</span>
          ) : (
            Object.entries(data.attributes).map(([name, value]) => (
              <div className="object-collection__item" key={name}>
                <span className="object-key">{name}</span>
                {renderValue(value, objects)}
              </div>
            ))
          )}
        </div>
      )
    case 'repr':
      return <span className="value-chip">{data.repr}</span>
  }
}

function buildChangedVariableSet(
  previousStep: ExecutionStep | null,
  currentStep: ExecutionStep | null,
): Set<string> {
  if (!currentStep) {
    return new Set()
  }

  const previousFrames = new Map(
    (previousStep?.frames ?? []).map((frame) => [frame.id, frame.variables]),
  )

  const changedKeys = new Set<string>()

  currentStep.frames.forEach((frame) => {
    const previousVariables: Record<string, SerializedValue> =
      previousFrames.get(frame.id) ?? {}

    Object.entries(frame.variables).forEach(([name, value]) => {
      if (valueSignature(previousVariables[name]) !== valueSignature(value)) {
        changedKeys.add(`${frame.id}:${name}`)
      }
    })
  })

  return changedKeys
}

function App() {
  const [code, setCode] = useState(sampleProgram)
  const [stdin, setStdin] = useState(sampleInput)
  const [result, setResult] = useState<VisualizationResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  )
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)
  const decorationIdsRef = useRef<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleModeChange = (event: MediaQueryListEvent) => setIsDarkMode(event.matches)

    setIsDarkMode(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleModeChange)

    return () => mediaQuery.removeEventListener('change', handleModeChange)
  }, [])

  const currentStep =
    result && result.steps.length > 0 ? result.steps[currentStepIndex] : null
  const previousStep =
    result && currentStepIndex > 0 ? result.steps[currentStepIndex - 1] : null

  const objectMap = useMemo<Map<string, ObjectRecord>>(
    () => new Map((currentStep?.objects ?? []).map((item) => [item.objectId, item])),
    [currentStep],
  )

  const changedVariables = useMemo(
    () => buildChangedVariableSet(previousStep, currentStep),
    [previousStep, currentStep],
  )

  const onEditorMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance
    monacoRef.current = monacoInstance
    editorInstance.focus()
  }

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return
    }

    const decorations: editor.IModelDeltaDecoration[] = []

    if (currentStep?.previousLine) {
      decorations.push({
        range: new monacoRef.current.Range(currentStep.previousLine, 1, currentStep.previousLine, 1),
        options: {
          isWholeLine: true,
          className: 'executed-line',
          linesDecorationsClassName: 'executed-glyph',
        },
      })
    }

    if (currentStep?.nextLine) {
      decorations.push({
        range: new monacoRef.current.Range(currentStep.nextLine, 1, currentStep.nextLine, 1),
        options: {
          isWholeLine: true,
          className: 'next-line',
          linesDecorationsClassName: 'next-glyph',
        },
      })
    }

    decorationIdsRef.current = editorRef.current.deltaDecorations(
      decorationIdsRef.current,
      decorations,
    )
  }, [currentStep])

  const runVisualization = async () => {
    setIsLoading(true)
    setRequestError(null)

    try {
      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          stdin,
        }),
      })

      if (!response.ok) {
        throw new Error(`Visualizer request failed with status ${response.status}.`)
      }

      const payload = (await response.json()) as VisualizationResponse
      setResult(payload)
      setCurrentStepIndex(0)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const totalSteps = result?.steps.length ?? 0
  const hasSteps = totalSteps > 0
  const stepStatus = currentStep
    ? currentStep.event === 'line'
      ? `Executed line ${currentStep.previousLine ?? '-'} -> next line ${currentStep.nextLine ?? '-'}`
      : currentStep.event === 'return'
        ? `Execution completed on line ${currentStep.previousLine ?? '-'}`
        : `${currentStep.details?.type ?? 'Error'} on line ${currentStep.previousLine ?? '-'}`
    : 'Run the sample to generate a trace.'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Proof of concept</span>
          <h1>Python Visualizer</h1>
          <p className="subtitle">
            Write Python, run it, and scrub through execution one step at a time with
            live frames, objects, and console output.
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setCode(sampleProgram)}>
            Load sample code
          </button>
          <button className="ghost-button" onClick={() => setStdin(sampleInput)}>
            Reset input
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel editor-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Code editor</span>
              <h2>Python source</h2>
            </div>
            <button className="primary-button" disabled={isLoading} onClick={runVisualization}>
              {isLoading ? 'Visualizing...' : 'Visualize execution'}
            </button>
          </div>

          <div className="editor-shell">
            <Editor
              defaultLanguage="python"
              height="440px"
              onChange={(nextValue) => setCode(nextValue ?? '')}
              onMount={onEditorMount}
              options={{
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 15,
                lineHeight: 22,
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
              theme={isDarkMode ? 'vs-dark' : 'light'}
              value={code}
            />
          </div>

          <div className="input-panel">
            <div className="panel-label-row">
              <span className="panel-label">Standard input</span>
              <span className="panel-caption">One line per input() call</span>
            </div>
            <textarea
              className="stdin-textarea"
              onChange={(event) => setStdin(event.target.value)}
              placeholder="Ada"
              rows={4}
              value={stdin}
            />
          </div>
        </section>

        <section className="panel execution-panel">
          <div className="panel-header panel-header--stacked">
            <div>
              <span className="panel-label">Execution timeline</span>
              <h2>Trace navigator</h2>
            </div>
            <div className="step-chip">
              {hasSteps ? `Step ${currentStepIndex + 1} of ${totalSteps}` : 'No trace yet'}
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-card__label">Last executed</span>
              <strong>{currentStep?.previousLine ?? '-'}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Next line</span>
              <strong>{currentStep?.nextLine ?? '-'}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Frames</span>
              <strong>{currentStep?.frames.length ?? 0}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Objects</span>
              <strong>{currentStep?.objects.length ?? 0}</strong>
            </div>
          </div>

          <div className="status-banner">{stepStatus}</div>

          {requestError ? <div className="error-banner">{requestError}</div> : null}
          {result?.error ? (
            <div className="error-banner">
              {result.error.type}: {result.error.message}
              {result.error.line ? ` (line ${result.error.line})` : ''}
            </div>
          ) : null}

          <div className="controls-card">
            <div className="controls">
              <button disabled={!hasSteps || currentStepIndex === 0} onClick={() => setCurrentStepIndex(0)}>
                {'<<'} First
              </button>
              <button
                disabled={!hasSteps || currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((index) => Math.max(0, index - 1))}
              >
                {'<'} Back
              </button>
              <button
                disabled={!hasSteps || currentStepIndex >= totalSteps - 1}
                onClick={() =>
                  setCurrentStepIndex((index) => Math.min(totalSteps - 1, index + 1))
                }
              >
                Forward {'>'}
              </button>
              <button
                disabled={!hasSteps || currentStepIndex >= totalSteps - 1}
                onClick={() => setCurrentStepIndex(Math.max(totalSteps - 1, 0))}
              >
                Last {'>>'}
              </button>
            </div>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--executed" />
                Just executed
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--next" />
                Next to run
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-swatch--changed" />
                Changed value
              </span>
            </div>
          </div>

          <div className="detail-grid">
            <section className="subpanel">
              <div className="subpanel-header">
                <h3>Frames</h3>
                <span>{currentStep?.frames.length ?? 0} active</span>
              </div>
              {currentStep?.frames.length ? (
                currentStep.frames.map((frame) => (
                  <article className="frame-card" key={frame.id}>
                    <div className="frame-card__header">
                      <div>
                        <strong>{frame.name}</strong>
                        <span>Line {frame.lineNumber}</span>
                      </div>
                      <span className={`scope-badge scope-badge--${frame.scopeType}`}>
                        {frame.scopeType}
                      </span>
                    </div>
                    <div className="variable-list">
                      {Object.entries(frame.variables).length === 0 ? (
                        <div className="empty-state">No variables yet.</div>
                      ) : (
                        Object.entries(frame.variables).map(([name, value]) => (
                          <div
                            className={`variable-row ${
                              changedVariables.has(`${frame.id}:${name}`) ? 'variable-row--changed' : ''
                            }`}
                            key={`${frame.id}-${name}`}
                          >
                            <span className="variable-name">{name}</span>
                            {renderValue(value, objectMap)}
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">Frames will appear here after you run the code.</div>
              )}
            </section>

            <section className="subpanel">
              <div className="subpanel-header">
                <h3>Objects in memory</h3>
                <span>{currentStep?.objects.length ?? 0} tracked</span>
              </div>
              {currentStep?.objects.length ? (
                currentStep.objects.map((item) => (
                  <article className="object-card" key={item.objectId}>
                    <div className="object-card__header">
                      <div>
                        <strong>{item.objectId}</strong>
                        <span>{item.type}</span>
                      </div>
                      <span className="object-preview">{item.preview}</span>
                    </div>
                    {renderObjectData(item.data, objectMap)}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  Mutable containers and instances will be listed here.
                </div>
              )}
            </section>
          </div>

          <div className="detail-grid detail-grid--secondary">
            <section className="subpanel">
              <div className="subpanel-header">
                <h3>Console output</h3>
                <span>{currentStep?.stdout.length ?? 0} chars</span>
              </div>
              <pre className="console-output">{currentStep?.stdout || 'No output yet.'}</pre>
            </section>

            <section className="subpanel">
              <div className="subpanel-header">
                <h3>Consumed input</h3>
                <span>{currentStep?.stdinConsumed.length ?? 0} values</span>
              </div>
              <div className="consumed-input-list">
                {currentStep?.stdinConsumed.length ? (
                  currentStep.stdinConsumed.map((item, index) => (
                    <div className="consumed-input-row" key={`${item}-${index}`}>
                      <span className="object-key">#{index + 1}</span>
                      <span className="value-chip">{JSON.stringify(item)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">input() values will appear here as they are used.</div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
