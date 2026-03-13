from __future__ import annotations

import ast
import builtins
import inspect
import io
import sys
import traceback
from collections import deque
from contextlib import redirect_stdout
from types import ModuleType
from typing import Any


USER_FILENAME = "<user_code>"
MAX_TRACE_STEPS = 400
MAX_CONTAINER_ITEMS = 25
MAX_REPR_LENGTH = 120
MAX_STDOUT_CHARS = 8_000
MAX_SERIALIZATION_DEPTH = 4

_SENTINEL = object()


def safe_repr(value: Any, *, max_length: int = MAX_REPR_LENGTH) -> str:
    try:
        rendered = repr(value)
    except Exception:
        rendered = f"<unrepresentable {type(value).__name__}>"

    if len(rendered) > max_length:
        return f"{rendered[: max_length - 3]}..."
    return rendered


def is_primitive(value: Any) -> bool:
    return value is None or isinstance(value, (bool, int, float, complex, str, bytes))


# ---------------------------------------------------------------------------
# AST analysis for control flow metadata
# ---------------------------------------------------------------------------

class CodeAnalyzer:
    """Static analysis of Python source to extract control flow structure."""

    def __init__(self, code: str) -> None:
        self.line_types: dict[int, str] = {}
        self.loop_headers: set[int] = set()
        self.loop_info: dict[int, dict[str, int]] = {}
        self.if_info: dict[int, dict[str, int]] = {}
        self.scopes: list[dict[str, Any]] = []

        try:
            tree = ast.parse(code)
            self._walk(tree)
        except SyntaxError:
            pass

    def _walk(self, node: ast.AST) -> None:
        for child in ast.iter_child_nodes(node):
            if isinstance(child, ast.For):
                self._handle_loop(child, "for")
            elif isinstance(child, ast.While):
                self._handle_loop(child, "while")
            elif isinstance(child, ast.If):
                self._handle_if(child, is_elif=False)
            elif isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.line_types[child.lineno] = "def"
            elif isinstance(child, ast.ClassDef):
                self.line_types[child.lineno] = "class"
            elif isinstance(child, ast.Return):
                self.line_types[child.lineno] = "return"
            elif isinstance(child, ast.Break):
                self.line_types[child.lineno] = "break"
            elif isinstance(child, ast.Continue):
                self.line_types[child.lineno] = "continue"
            self._walk(child)

    def _handle_loop(self, node: ast.For | ast.While, loop_type: str) -> None:
        self.line_types[node.lineno] = loop_type
        self.loop_headers.add(node.lineno)

        if node.body:
            body_start = node.body[0].lineno
            body_end = node.body[-1].end_lineno or node.body[-1].lineno
            self.loop_info[node.lineno] = {
                "bodyStart": body_start,
                "bodyEnd": body_end,
            }
            self.scopes.append({
                "type": loop_type,
                "headerLine": node.lineno,
                "bodyStart": body_start,
                "bodyEnd": body_end,
            })

    def _handle_if(self, node: ast.If, *, is_elif: bool) -> None:
        self.line_types[node.lineno] = "elif" if is_elif else "if"

        if node.body:
            body_start = node.body[0].lineno
            body_end = node.body[-1].end_lineno or node.body[-1].lineno
            self.if_info[node.lineno] = {"bodyStart": body_start}
            self.scopes.append({
                "type": "elif" if is_elif else "if",
                "headerLine": node.lineno,
                "bodyStart": body_start,
                "bodyEnd": body_end,
            })

        if node.orelse:
            if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                self._handle_if(node.orelse[0], is_elif=True)
            else:
                first = node.orelse[0]
                last = node.orelse[-1]
                self.line_types[first.lineno] = "else_body"
                self.scopes.append({
                    "type": "else",
                    "headerLine": first.lineno,
                    "bodyStart": first.lineno,
                    "bodyEnd": last.end_lineno or last.lineno,
                })

    def get_containing_loops(self, line: int) -> list[dict[str, Any]]:
        return [
            s for s in self.scopes
            if s["type"] in ("for", "while")
            and s["headerLine"] <= line <= s["bodyEnd"]
        ]

    def get_metadata(self) -> dict[str, str]:
        return {str(ln): lt for ln, lt in self.line_types.items()}


# ---------------------------------------------------------------------------
# Snapshot serialization (unchanged logic, extracted for clarity)
# ---------------------------------------------------------------------------

class SnapshotSerializer:
    def __init__(self) -> None:
        self.objects: dict[str, dict[str, Any]] = {}
        self._memo: dict[int, str] = {}
        self._building: set[int] = set()
        self._next_id = 1

    def serialize(self, value: Any, depth: int = 0) -> dict[str, Any]:
        if is_primitive(value):
            return {
                "kind": "primitive",
                "type": type(value).__name__,
                "repr": safe_repr(value),
            }

        if inspect.isroutine(value) or inspect.isclass(value) or isinstance(value, ModuleType):
            return {
                "kind": "primitive",
                "type": type(value).__name__,
                "repr": safe_repr(value),
            }

        object_id = self._memo.setdefault(id(value), f"obj{self._next_id}")
        if object_id == f"obj{self._next_id}":
            self._next_id += 1

        reference = {
            "kind": "object_ref",
            "type": type(value).__name__,
            "objectId": object_id,
            "preview": safe_repr(value),
        }

        raw_id = id(value)
        if object_id in self.objects or raw_id in self._building:
            return reference

        self._building.add(raw_id)
        try:
            if depth >= MAX_SERIALIZATION_DEPTH:
                payload = {"kind": "repr", "repr": safe_repr(value)}
            else:
                payload = self._serialize_object_payload(value, depth + 1)

            self.objects[object_id] = {
                "objectId": object_id,
                "type": type(value).__name__,
                "preview": safe_repr(value),
                "data": payload,
            }
        finally:
            self._building.remove(raw_id)

        return reference

    def _serialize_object_payload(self, value: Any, depth: int) -> dict[str, Any]:
        if isinstance(value, list):
            return {
                "kind": "list",
                "items": [self.serialize(item, depth) for item in value[:MAX_CONTAINER_ITEMS]],
                "truncated": len(value) > MAX_CONTAINER_ITEMS,
            }

        if isinstance(value, tuple):
            return {
                "kind": "tuple",
                "items": [self.serialize(item, depth) for item in value[:MAX_CONTAINER_ITEMS]],
                "truncated": len(value) > MAX_CONTAINER_ITEMS,
            }

        if isinstance(value, set):
            ordered_items = sorted(value, key=safe_repr)
            return {
                "kind": "set",
                "items": [self.serialize(item, depth) for item in ordered_items[:MAX_CONTAINER_ITEMS]],
                "truncated": len(ordered_items) > MAX_CONTAINER_ITEMS,
            }

        if isinstance(value, dict):
            entries = list(value.items())
            return {
                "kind": "dict",
                "entries": [
                    {
                        "key": self.serialize(key, depth),
                        "value": self.serialize(item_value, depth),
                    }
                    for key, item_value in entries[:MAX_CONTAINER_ITEMS]
                ],
                "truncated": len(entries) > MAX_CONTAINER_ITEMS,
            }

        if hasattr(value, "__dict__"):
            attributes = {
                name: self.serialize(item_value, depth)
                for name, item_value in vars(value).items()
                if not name.startswith("__")
            }
            return {
                "kind": "instance",
                "className": type(value).__name__,
                "attributes": attributes,
            }

        return {"kind": "repr", "repr": safe_repr(value)}

    def snapshot_frames(self, frame: Any) -> list[dict[str, Any]]:
        user_frames: list[Any] = []
        cursor = frame

        while cursor is not None:
            if cursor.f_code.co_filename == USER_FILENAME:
                user_frames.append(cursor)
            cursor = cursor.f_back

        user_frames.reverse()

        rendered_frames: list[dict[str, Any]] = []
        for index, user_frame in enumerate(user_frames):
            scope_type = "global" if user_frame.f_code.co_name == "<module>" else "local"
            variables: dict[str, Any] = {}

            for name, value in user_frame.f_locals.items():
                if name == "__builtins__":
                    continue
                if name.startswith("__") and name.endswith("__"):
                    continue
                variables[name] = self.serialize(value)

            rendered_frames.append(
                {
                    "id": "global" if scope_type == "global" else f"{user_frame.f_code.co_name}:{index}",
                    "name": "Global Frame" if scope_type == "global" else user_frame.f_code.co_name,
                    "scopeType": scope_type,
                    "lineNumber": user_frame.f_lineno,
                    "variables": variables,
                }
            )

        return rendered_frames


# ---------------------------------------------------------------------------
# Execution tracer with enhanced tracking
# ---------------------------------------------------------------------------

class PythonExecutionTracer:
    def __init__(self, *, stdin_text: str = "", code: str = "") -> None:
        self.stdin_values = deque(stdin_text.splitlines())
        self.stdin_consumed: list[str] = []
        self.stdout = io.StringIO()
        self.steps: list[dict[str, Any]] = []
        self.last_seen_line: int | None = None
        self.analyzer = CodeAnalyzer(code)
        self.loop_counters: dict[int, int] = {}

    def scripted_input(self, prompt: Any = "") -> str:
        prompt_text = "" if prompt is None else str(prompt)
        if prompt_text:
            self.stdout.write(prompt_text)

        if not self.stdin_values:
            raise EOFError("input() requested more values than were provided.")

        supplied_value = self.stdin_values.popleft()
        self.stdin_consumed.append(supplied_value)
        return supplied_value

    def trace(self, frame: Any, event: str, arg: Any) -> Any:
        if frame.f_code.co_filename != USER_FILENAME:
            return None

        if len(self.steps) >= MAX_TRACE_STEPS:
            raise RuntimeError(f"Execution exceeded the {MAX_TRACE_STEPS} step limit.")

        if event == "line":
            if frame.f_lineno in self.analyzer.loop_headers:
                self.loop_counters[frame.f_lineno] = (
                    self.loop_counters.get(frame.f_lineno, 0) + 1
                )

            self._record_step(
                frame,
                event="line",
                previous_line=self.last_seen_line,
                next_line=frame.f_lineno,
            )
            self.last_seen_line = frame.f_lineno
        elif event == "return":
            self._record_step(
                frame,
                event="return",
                previous_line=frame.f_lineno,
                next_line=None,
                return_value=arg,
            )
        elif event == "exception":
            exc_type, exc_value, _ = arg
            self._record_step(
                frame,
                event="exception",
                previous_line=frame.f_lineno,
                next_line=None,
                details={
                    "type": exc_type.__name__,
                    "message": str(exc_value),
                },
            )

        return self.trace

    def _record_step(
        self,
        frame: Any,
        *,
        event: str,
        previous_line: int | None,
        next_line: int | None,
        details: dict[str, Any] | None = None,
        return_value: Any = _SENTINEL,
    ) -> None:
        serializer = SnapshotSerializer()
        frames = serializer.snapshot_frames(frame)

        step: dict[str, Any] = {
            "index": len(self.steps),
            "event": event,
            "previousLine": previous_line,
            "nextLine": next_line,
            "frames": frames,
            "objects": list(serializer.objects.values()),
            "stdout": self._current_stdout(),
            "stdinConsumed": list(self.stdin_consumed),
            "loopIterations": dict(self.loop_counters),
        }

        if return_value is not _SENTINEL and return_value is not None:
            step["returnValue"] = serializer.serialize(return_value)

        target_line = next_line or previous_line
        if target_line:
            containing = self.analyzer.get_containing_loops(target_line)
            if containing:
                step["activeLoops"] = [
                    {
                        "type": scope["type"],
                        "line": scope["headerLine"],
                        "iteration": self.loop_counters.get(scope["headerLine"], 0),
                    }
                    for scope in containing
                ]

        if details:
            step["details"] = details

        self.steps.append(step)

    def _post_process(self) -> None:
        """Infer condition results by comparing consecutive step transitions."""
        for step in self.steps:
            prev = step.get("previousLine")
            nxt = step.get("nextLine")
            if prev is None or nxt is None:
                continue
            if prev in self.analyzer.if_info:
                step["conditionResult"] = nxt == self.analyzer.if_info[prev]["bodyStart"]
            elif prev in self.analyzer.loop_info:
                step["conditionResult"] = nxt == self.analyzer.loop_info[prev]["bodyStart"]

    def _current_stdout(self) -> str:
        output = self.stdout.getvalue()
        if len(output) > MAX_STDOUT_CHARS:
            return f"{output[: MAX_STDOUT_CHARS - 15]}...[truncated]"
        return output


def build_error_payload(error: BaseException) -> dict[str, Any]:
    line_number = getattr(error, "lineno", None)

    if line_number is None and error.__traceback__ is not None:
        for frame_summary in reversed(traceback.extract_tb(error.__traceback__)):
            if frame_summary.filename == USER_FILENAME:
                line_number = frame_summary.lineno
                break

    return {
        "type": type(error).__name__,
        "message": str(error),
        "line": line_number,
    }


def visualize_python(
    code: str, *, stdin_text: str = "", seed: int | None = None
) -> dict[str, Any]:
    if not code.strip():
        return {"steps": [], "stdout": "", "error": None, "lineMetadata": {}}

    tracer = PythonExecutionTracer(stdin_text=stdin_text, code=code)
    globals_scope: dict[str, Any] = {"__name__": "__main__"}
    builtins_scope = builtins.__dict__.copy()
    builtins_scope["input"] = tracer.scripted_input
    globals_scope["__builtins__"] = builtins_scope

    if seed is not None:
        import random as _random
        _random.seed(seed)

    try:
        compiled = compile(code, USER_FILENAME, "exec")
    except SyntaxError as error:
        return {
            "steps": [],
            "stdout": "",
            "error": build_error_payload(error),
            "lineMetadata": {},
        }

    try:
        with redirect_stdout(tracer.stdout):
            previous_trace = sys.gettrace()
            sys.settrace(tracer.trace)
            try:
                exec(compiled, globals_scope, globals_scope)
            finally:
                sys.settrace(previous_trace)
    except BaseException as error:
        tracer._post_process()
        return {
            "steps": tracer.steps,
            "stdout": tracer.stdout.getvalue(),
            "error": build_error_payload(error),
            "lineMetadata": tracer.analyzer.get_metadata(),
        }

    tracer._post_process()
    return {
        "steps": tracer.steps,
        "stdout": tracer.stdout.getvalue(),
        "error": None,
        "lineMetadata": tracer.analyzer.get_metadata(),
    }
