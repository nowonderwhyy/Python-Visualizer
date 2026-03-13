# Python Visualizer

A modern proof-of-concept inspired by Python Tutor for stepping through Python execution.

## What is included

- **FastAPI backend** that executes Python code and records a trace of:
  - executed line / next line
  - global and local frames
  - tracked objects in memory
  - stdout output
  - consumed `input()` values
- **React + TypeScript frontend** with:
  - Monaco code editor
  - VCR-style stepping controls
  - frame and object visualizations
  - output and input panels
  - modern dark-mode-first UI

## Project structure

```text
backend/
  main.py
  tracer.py
  requirements.txt
frontend/
  src/
```

## Run the backend

```bash
python3 -m pip install -r backend/requirements.txt
python3 -m uvicorn main:app --app-dir backend --reload
```

The backend runs on `http://127.0.0.1:8000`.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to the backend.

## Current proof-of-concept scope

This first version is aimed at simple beginner scripts:

- variables
- lists / tuples / sets / dicts
- functions and call frames
- `print()`
- scripted `input()` values supplied from the UI

It is not a hardened sandbox yet, so it should be treated as a local development / educational prototype for now.
