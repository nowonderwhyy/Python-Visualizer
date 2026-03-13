# Python Visualizer

Step-by-step Python execution visualizer for learning. Write code, run it, and scrub through every line of execution seeing exactly how variables, objects, frames, and control flow change.

## Features

### Execution tracing

- **Line-by-line stepping** with forward, back, first, last controls
- **Autoplay** with adjustable speed (Slow / 1x / 2x / 4x) and pause
- **Keyboard navigation** -- arrow keys to step, Space to play/pause
- **Timeline slider** for scrubbing to any step instantly

### Control flow

- **Loop iteration tracking** -- shows which `for`/`while` loop is active and the current iteration number
- **Condition evaluation** -- displays `True` or `False` for `if`/`elif`/`while` conditions as they're evaluated
- **Current line preview** -- the executed Python line is shown in the trace panel header

### Variables and memory

- **Frame inspector** with global and local scope badges
- **Changed variable highlighting** with old → new value display
- **Mutation vs reassignment badges** -- distinguishes `new`, `reassigned`, and `mutated` changes
- **Shared object reference detection** -- colored indicators when multiple variables point to the same object, with `= varname` labels
- **Recursion depth indicator** on recursive call frames

### Object visualization

- **Lists, tuples, sets** rendered as indexed collections
- **Dictionaries** rendered as key → value mappings
- **Class instances** with attribute display
- **Nested/multi-dimensional** structures handled via recursive rendering

### Other

- **Return value display** -- shows what a function returned
- **Error visualization** -- error line highlighted in the editor with red gutter
- **Console output** panel with stdout and consumed `input()` values
- **Random seed control** for deterministic output from `random` module
- **11 built-in example programs** covering variables, loops, branches, functions, recursion, data structures, aliasing, and classes
- **Dark and light mode** following system preference
- **Collapsible trace sections** -- click to collapse Frames, Heap, or Output

## Project structure

```
backend/
  main.py             FastAPI app with /api/visualize endpoint
  tracer.py           Python execution tracer + AST analyzer
  requirements.txt    fastapi, uvicorn

frontend/
  src/
    App.tsx           Main app orchestration
    App.css           All component styles
    index.css         Base styles and color tokens
    types.ts          TypeScript types for API data
    sampleProgram.ts  Built-in example programs
    components/
      CodeEditor.tsx          Monaco editor + stdin input
      TraceControls.tsx       Step nav, autoplay, speed, slider
      ControlFlowContext.tsx  Loop/condition/return display
      FrameInspector.tsx      Frame cards, variables, shared refs
      ObjectInspector.tsx     Heap object cards
      ConsoleOutput.tsx       stdout + consumed input
      ValueDisplay.tsx        Value chips + object data rendering
```

## Setup

### Backend

```bash
pip install -r backend/requirements.txt
uvicorn main:app --app-dir backend --reload
```

Runs on `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server proxies `/api/*` to the backend.

## How it works

1. The frontend sends Python source code and stdin to `POST /api/visualize`
2. The backend compiles the code and executes it under `sys.settrace`, recording a snapshot at every line, return, and exception event
3. An AST analyzer identifies control flow structures (loops, branches) and the tracer tracks iteration counts and infers condition results
4. Each step includes: frame variables, heap objects, stdout, stdin consumed, active loops, condition results, and return values
5. The frontend renders the step sequence with full navigation, letting you scrub through execution at your own pace

## Scope and limitations

The tracer handles beginner-to-intermediate Python: variables, arithmetic, strings, lists, tuples, sets, dicts, functions, classes, recursion, loops, branches, `print()`, and `input()`. It is not a sandboxed execution environment -- treat it as a local development and educational tool.
