import { type OnMount } from '@monaco-editor/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { editor } from 'monaco-editor'
import './App.css'
import { sampleInput, sampleProgram } from './sampleProgram'
import type { ExecutionStep, ObjectRecord, SerializedValue, VisualizationResponse } from './types'
import { CodeEditor } from './components/CodeEditor'
import { TraceControls } from './components/TraceControls'
import { FrameInspector } from './components/FrameInspector'
import { ObjectInspector } from './components/ObjectInspector'
import { ConsoleOutput } from './components/ConsoleOutput'

function valueSignature(value: SerializedValue | undefined): string {
  return JSON.stringify(value)
}

function buildChangedVariableSet(
  previousStep: ExecutionStep | null,
  currentStep: ExecutionStep | null,
): Set<string> {
  if (!currentStep) return new Set()

  const prev = new Map(
    (previousStep?.frames ?? []).map((f) => [f.id, f.variables]),
  )

  const changed = new Set<string>()
  currentStep.frames.forEach((frame) => {
    const prevVars: Record<string, SerializedValue> = prev.get(frame.id) ?? {}
    Object.entries(frame.variables).forEach(([name, value]) => {
      if (valueSignature(prevVars[name]) !== valueSignature(value)) {
        changed.add(`${frame.id}:${name}`)
      }
    })
  })
  return changed
}

export default function App() {
  const [code, setCode] = useState(sampleProgram)
  const [stdin, setStdin] = useState(sampleInput)
  const [result, setResult] = useState<VisualizationResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  )

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)
  const decorationsRef = useRef<string[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    setIsDark(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const step = result && result.steps.length > 0 ? result.steps[stepIndex] : null
  const prevStep = result && stepIndex > 0 ? result.steps[stepIndex - 1] : null
  const totalSteps = result?.steps.length ?? 0

  const objectMap = useMemo<Map<string, ObjectRecord>>(
    () => new Map((step?.objects ?? []).map((o) => [o.objectId, o])),
    [step],
  )

  const changedVars = useMemo(
    () => buildChangedVariableSet(prevStep, step),
    [prevStep, step],
  )

  const onEditorMount: OnMount = (ed, monaco) => {
    editorRef.current = ed
    monacoRef.current = monaco
    ed.focus()
  }

  useEffect(() => {
    const ed = editorRef.current
    const monaco = monacoRef.current
    if (!ed || !monaco) return

    const decorations: editor.IModelDeltaDecoration[] = []
    if (step?.previousLine) {
      decorations.push({
        range: new monaco.Range(step.previousLine, 1, step.previousLine, 1),
        options: {
          isWholeLine: true,
          className: 'executed-line',
          linesDecorationsClassName: 'executed-glyph',
        },
      })
    }
    if (step?.nextLine) {
      decorations.push({
        range: new monaco.Range(step.nextLine, 1, step.nextLine, 1),
        options: {
          isWholeLine: true,
          className: 'next-line',
          linesDecorationsClassName: 'next-glyph',
        },
      })
    }
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, decorations)
  }, [step])

  const run = useCallback(async () => {
    setLoading(true)
    setRequestError(null)
    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, stdin }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = (await res.json()) as VisualizationResponse
      setResult(data)
      setStepIndex(0)
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [code, stdin])

  const stepStatus = step
    ? step.event === 'line'
      ? `L${step.previousLine ?? '?'} \u2192 L${step.nextLine ?? '?'}`
      : step.event === 'return'
        ? `returned at L${step.previousLine ?? '?'}`
        : `${step.details?.type ?? 'error'} at L${step.previousLine ?? '?'}`
    : null

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__title">Python Visualizer</span>
        <div className="topbar__actions">
          <button
            className="btn"
            onClick={() => {
              setCode(sampleProgram)
              setStdin(sampleInput)
            }}
          >
            Load sample
          </button>
        </div>
      </header>

      <main className="workspace">
        <CodeEditor
          code={code}
          stdin={stdin}
          isDark={isDark}
          onCodeChange={setCode}
          onStdinChange={setStdin}
          onEditorMount={onEditorMount}
          isLoading={loading}
          onRun={run}
        />

        <section className="pane trace-pane">
          <div className="pane__header">
            <span className="pane__title">Trace</span>
            <div className="trace-status">
              {stepStatus && (
                <span className="trace-status__line">{stepStatus}</span>
              )}
              {totalSteps > 0 && (
                <span className="trace-status__step">
                  Step {stepIndex + 1} of {totalSteps}
                </span>
              )}
            </div>
          </div>

          <TraceControls
            currentIndex={stepIndex}
            totalSteps={totalSteps}
            onIndexChange={setStepIndex}
          />

          <div className="legend">
            <span className="legend__item">
              <span className="legend__dot legend__dot--executed" /> executed
            </span>
            <span className="legend__item">
              <span className="legend__dot legend__dot--next" /> next
            </span>
            <span className="legend__item">
              <span className="legend__dot legend__dot--changed" /> changed
            </span>
          </div>

          {requestError && <div className="error-banner">{requestError}</div>}
          {result?.error && (
            <div className="error-banner">
              {result.error.type}: {result.error.message}
              {result.error.line != null && ` (line ${result.error.line})`}
            </div>
          )}

          <div className="trace-body">
            <div className="section">
              <div className="section__header">
                <span>Frames</span>
                <span className="section__count">{step?.frames.length ?? 0}</span>
              </div>
              <div className="section__body">
                <FrameInspector
                  frames={step?.frames ?? []}
                  objects={objectMap}
                  changedVars={changedVars}
                />
              </div>
            </div>

            <div className="section">
              <div className="section__header">
                <span>Heap</span>
                <span className="section__count">{step?.objects.length ?? 0}</span>
              </div>
              <div className="section__body">
                <ObjectInspector
                  objects={step?.objects ?? []}
                  objectMap={objectMap}
                />
              </div>
            </div>

            <div className="section">
              <div className="section__header">
                <span>Output</span>
              </div>
              <div className="section__body">
                <ConsoleOutput
                  stdout={step?.stdout ?? ''}
                  stdinConsumed={step?.stdinConsumed ?? []}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
