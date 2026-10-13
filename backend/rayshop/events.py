"""Event bus for one agent run. Every event goes to live subscribers and to a JSONL recording."""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Any

RUNS_DIR = Path(__file__).resolve().parents[2] / "runs"


class EventBus:
    def __init__(self, run_id: str | None = None, record: bool = True, mode: str = "live"):
        self.run_id = run_id or time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
        self.mode = mode
        self.history: list[dict[str, Any]] = []
        self._subs: list[asyncio.Queue] = []
        self._t0 = time.time()
        self._file = None
        if record:
            RUNS_DIR.mkdir(exist_ok=True)
            self._file = open(RUNS_DIR / f"{self.run_id}.jsonl", "a", encoding="utf-8")

    def emit(self, type_: str, **data: Any) -> dict[str, Any]:
        ev = {"seq": len(self.history), "t": round(time.time() - self._t0, 3), "type": type_, "mode": self.mode, **data}
        self.history.append(ev)
        if self._file:
            self._file.write(json.dumps(ev, ensure_ascii=False, default=str) + "\n")
            self._file.flush()
        for q in list(self._subs):
            q.put_nowait(ev)
        return ev

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        for ev in self.history:
            q.put_nowait(ev)
        self._subs.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self._subs:
            self._subs.remove(q)

    def close(self) -> None:
        if self._file:
            self._file.close()
            self._file = None


def load_recording(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
