import { type OnMount } from '@monaco-editor/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { editor } from 'monaco-editor'
import './App.css'
import { samplePrograms, defaultSampleId } from './sampleProgram'
import type {
  ChangeInfo,
  ExecutionStep,
  ObjectRecord,
  SerializedValue,
  VisualizationResponse,
} from './types'
import { CodeEditor } from './components/CodeEditor'
import { TraceControls } from './components/TraceControls'
import { ControlFlowContext } from './components/ControlFlowContext'
import { FrameInspector } from './components/FrameInspector'
import { ObjectInspector } from './components/ObjectInspector'
import { ConsoleOutput } from './components/ConsoleOutput'

function valueSignature(value: SerializedValue | undefined): string {
  return JSON.stringify(value)
}

function classifyChange(
  prev: SerializedValue | undefined,
  curr: SerializedValue,
): ChangeInfo['changeKind'] {
  if (!prev) return 'new'
  if (
    prev.kind === 'object_ref' &&
    curr.kind === 'object_ref' &&
    prev.objectId === curr.objectId
  ) {
    return 'mutated'
  }
  return 'reassigned'
}

function buildChangedVariableMap(
  previousStep: ExecutionStep | null,
  currentStep: ExecutionStep | null,
): Map<string, ChangeInfo> {
  if (!currentStep) return new Map()

  const prev = new Map(
    (previousStep?.frames ?? []).map((f) => [f.id, f.variables]),
  )

  const changed = new Map<string, ChangeInfo>()
  currentStep.frames.forEach((frame) => {
    const prevVars: Record<string, SerializedValue> = prev.get(frame.id) ?? {}
    Object.entries(frame.variables).forEach(([name, value]) => {
      if (valueSignature(prevVars[name]) !== valueSignature(value)) {
        changed.set(`${frame.id}:${name}`, {
          prevValue: prevVars[name] ?? null,
          changeKind: classifyChange(prevVars[name], value),
        })
      }
    })
  })
  return changed
}

function buildSharedObjectMap(
  step: ExecutionStep | null,
): Map<string, string[]> {
  if (!step) return new Map()

  const owners = new Map<string, string[]>()
  step.frames.forEach((frame) => {
    Object.entries(frame.variables).forEach(([name, v]) => {
      if (v.kind === 'object_ref') {
        const list = owners.get(v.objectId) ?? []
        list.push(name)
        owners.set(v.objectId, list)
      }
    })
  })

  const shared = new Map<string, string[]>()
  owners.forEach((names, objectId) => {
    if (names.length > 1) {
      shared.set(objectId, names)
    }
  })
  return shared
}

const defaultSample = samplePrograms.find((s) => s.id === defaultSampleId)!

export default function App() {
  const [code, setCode] = useState(defaultSample.code)
  const [stdin, setStdin] = useState(defaultSample.stdin)
  const [seed, setSeed] = useState('')
  const [result, setResult] = useState<VisualizationResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  )
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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

  const step =
    result && result.steps.length > 0 ? result.steps[stepIndex] : null
  const prevStep =
    result && stepIndex > 0 ? result.steps[stepIndex - 1] : null
  const totalSteps = result?.steps.length ?? 0
  const codeLines = useMemo(() => code.split('\n'), [code])

  const objectMap = useMemo<Map<string, ObjectRecord>>(
    () => new Map((step?.objects ?? []).map((o) => [o.objectId, o])),
    [step],
  )

  const changedVars = useMemo(
    () => buildChangedVariableMap(prevStep, step),
    [prevStep, step],
  )

  const sharedObjectIds = useMemo(() => buildSharedObjectMap(step), [step])

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
        range: new monaco.Range(
          step.previousLine,
          1,
          step.previousLine,
          1,
        ),
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

    if (result?.error?.line && !step) {
      decorations.push({
        range: new monaco.Range(
          result.error.line,
          1,
          result.error.line,
          1,
        ),
        options: {
          isWholeLine: true,
          className: 'error-line',
          linesDecorationsClassName: 'error-glyph',
        },
      })
    }

    decorationsRef.current = ed.deltaDecorations(
      decorationsRef.current,
      decorations,
    )
  }, [step, result])

  const run = useCallback(async () => {
    setLoading(true)
    setRequestError(null)
    try {
      const body: Record<string, unknown> = { code, stdin }
      const parsedSeed = seed.trim() ? parseInt(seed.trim(), 10) : null
      if (parsedSeed !== null && !Number.isNaN(parsedSeed)) {
        body.seed = parsedSeed
      }

      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  }, [code, stdin, seed])

  const loadSample = useCallback((id: string) => {
    const sample = samplePrograms.find((s) => s.id === id)
    if (!sample) return
    setCode(sample.code)
    setStdin(sample.stdin)
    setResult(null)
    setRequestError(null)
    setStepIndex(0)
  }, [])

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const currentLineText = step?.previousLine
    ? codeLines[step.previousLine - 1]?.trim()
    : null

  const stepEvent = step
    ? step.event === 'exception'
      ? 'exception'
      : step.event === 'return'
        ? 'return'
        : 'line'
    : null

  const stepStatus = step
    ? step.event === 'line'
      ? `L${step.previousLine ?? '?'} \u2192 L${step.nextLine ?? '?'}`
      : step.event === 'return'
        ? `returned at L${step.previousLine ?? '?'}`
        : `${step.details?.type ?? 'error'} at L${step.previousLine ?? '?'}`
    : null

  const hasTrace = result !== null
  const returnFrameName =
    step?.event === 'return' && step.frames.length > 0
      ? step.frames[step.frames.length - 1].name
      : undefined

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__title">Python Visualizer</span>
        <div className="topbar__actions">
          <select
            className="btn sample-select"
            onChange={(e) => {
              loadSample(e.target.value)
              e.target.value = ''
            }}
            value=""
          >
            <option value="" disabled>
              Load example&hellip;
            </option>
            {samplePrograms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <input
            className="btn seed-input"
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Seed"
            title="Random seed for deterministic output"
            type="text"
            value={seed}
          />
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
              {stepEvent && (
                <span
                  className={`trace-status__event trace-status__event--${stepEvent}`}
                >
                  {stepEvent}
                </span>
              )}
              {stepStatus && (
                <span className="trace-status__line">{stepStatus}</span>
              )}
              {totalSteps > 0 && (
                <span className="trace-status__step">
                  {stepIndex + 1} / {totalSteps}
                </span>
              )}
            </div>
          </div>

          {currentLineText && (
            <div className="trace-codeline">
              <code>{currentLineText}</code>
            </div>
          )}

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
            <span className="legend__hint">
              &larr; &rarr; step &middot; Space play
            </span>
          </div>

          {requestError && <div className="error-banner">{requestError}</div>}
          {result?.error && (
            <div className="error-banner">
              {result.error.type}: {result.error.message}
              {result.error.line != null && ` (line ${result.error.line})`}
            </div>
          )}

          {!hasTrace ? (
            <div className="trace-empty">
              <div className="trace-empty__icon">&#x25B6;</div>
              <p className="trace-empty__title">No trace yet</p>
              <p className="trace-empty__hint">
                Write Python on the left and click <strong>Run</strong> to
                visualize execution step by step.
              </p>
            </div>
          ) : (
            <div className="trace-body">
              {step &&
                ((step.activeLoops && step.activeLoops.length > 0) ||
                  step.conditionResult !== undefined ||
                  (step.event === 'return' && step.returnValue)) && (
                  <div className="section">
                    <div className="section__header-static">
                      <span>Control flow</span>
                    </div>
                    <div className="section__body">
                      <ControlFlowContext
                        activeLoops={step.activeLoops ?? []}
                        conditionResult={step.conditionResult}
                        previousLine={step.previousLine}
                        returnValue={step.returnValue}
                        eventType={step.event}
                        codeLines={codeLines}
                        objects={objectMap}
                        frameName={returnFrameName}
                      />
                    </div>
                  </div>
                )}

              <div className="section">
                <button
                  className="section__header"
                  onClick={() => toggleSection('frames')}
                  type="button"
                >
                  <span
                    className={`section__chevron${collapsed.frames ? '' : ' section__chevron--open'}`}
                  />
                  <span>Frames</span>
                  <span className="section__count">
                    {step?.frames.length ?? 0}
                  </span>
                </button>
                {!collapsed.frames && (
                  <div className="section__body">
                    <FrameInspector
                      frames={step?.frames ?? []}
                      objects={objectMap}
                      changedVars={changedVars}
                      sharedObjectIds={sharedObjectIds}
                    />
                  </div>
                )}
              </div>

              <div className="section">
                <button
                  className="section__header"
                  onClick={() => toggleSection('heap')}
                  type="button"
                >
                  <span
                    className={`section__chevron${collapsed.heap ? '' : ' section__chevron--open'}`}
                  />
                  <span>Heap</span>
                  <span className="section__count">
                    {step?.objects.length ?? 0}
                  </span>
                </button>
                {!collapsed.heap && (
                  <div className="section__body">
                    <ObjectInspector
                      objects={step?.objects ?? []}
                      objectMap={objectMap}
                    />
                  </div>
                )}
              </div>

              <div className="section">
                <button
                  className="section__header"
                  onClick={() => toggleSection('output')}
                  type="button"
                >
                  <span
                    className={`section__chevron${collapsed.output ? '' : ' section__chevron--open'}`}
                  />
                  <span>Output</span>
                  <span className="section__count">
                    {(step?.stdout.length ?? 0) > 0
                      ? `${step!.stdout.length} chars`
                      : ''}
                  </span>
                </button>
                {!collapsed.output && (
                  <div className="section__body">
                    <ConsoleOutput
                      stdout={step?.stdout ?? ''}
                      stdinConsumed={step?.stdinConsumed ?? []}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
