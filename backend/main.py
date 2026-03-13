from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tracer import visualize_python


class VisualizeRequest(BaseModel):
    code: str = Field(..., description="Python source code to execute")
    stdin: str = Field(default="", description="One input value per line")


app = FastAPI(
    title="Python Visualizer API",
    description="Execution tracing API for the educational Python visualizer.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/visualize")
def visualize(request: VisualizeRequest) -> dict:
    return visualize_python(request.code, stdin_text=request.stdin)
