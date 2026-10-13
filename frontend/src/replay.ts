// Plays a recorded run in the browser, for the static (Vercel) build that has no backend.
// A port of ReplaySession in backend/rayshop/server.py: it waits for the viewer at each founder
// message, approval, time skip and payment, and paces the rest by the recorded gaps (at most 2s).
import type { Ev } from "./state";

const PAUSE_TYPES = new Set(["time_skip", "payment_received"]);
const PAY_TIMEOUT_MS = 90_000; // same as the server: time to tap Pay while presenting

type Gate = { kind: string; open: () => void };

export class LocalReplay {
  private seq = 0;
  private readonly t0 = performance.now();
  private gate: Gate | null = null;
  private readonly pending = new Map<string, (d: { approve: boolean; note: string }) => void>();
  private started = false;
  private stopped = false;

  constructor(private readonly events: any[], initialView: any, private readonly onEvent: (e: Ev) => void, private readonly speed = 1) {
    this.emit("session", { session_id: "static", gateway: "mock" });
    this.emit("snapshot", { view: initialView });
  }

  private emit(type: string, data: Record<string, unknown>) {
    if (this.stopped) return;
    this.onEvent({ seq: this.seq++, t: Math.round(performance.now() - this.t0) / 1000, type, mode: "replay", ...data } as Ev);
  }

  private openGate(kind: string): Promise<void> {
    return new Promise((resolve) => { this.gate = { kind, open: resolve }; });
  }

  release(kind: string): boolean {
    if (this.gate && (this.gate.kind === kind || kind === "any")) {
      const g = this.gate;
      this.gate = null;
      g.open();
      return true;
    }
    return false;
  }

  send(): void {
    if (!this.started) {
      this.started = true;
      void this.play();
    } else {
      this.release("message");
    }
  }

  resolve(approvalId: string, approve: boolean, note = ""): boolean {
    const fn = this.pending.get(approvalId);
    if (!fn) return false;
    this.pending.delete(approvalId);
    fn({ approve, note });
    return true;
  }

  stop(): void {
    this.stopped = true;
    this.gate = null;
    this.pending.clear();
  }

  private async play(): Promise<void> {
    let prev: number | null = null;
    let first = true;
    for (const ev of this.events) {
      if (this.stopped) return;
      const t = ev.type as string;
      if (t === "approval" || t === "session") continue;
      if (t === "founder_message") {
        if (!first) {
          const next = this.openGate("message");
          this.emit("replay_waiting", { next: "message", text: ev.text, images: ev.images ?? [] });
          await next;
        }
        first = false;
        prev = null;
      } else if (PAUSE_TYPES.has(t)) {
        const next = this.openGate(t);
        this.emit("replay_waiting", { next: t });
        if (t === "time_skip") await next;
        else await Promise.race([next, sleep(PAY_TIMEOUT_MS)]);
        this.gate = null;
        prev = null;
      }
      if (prev !== null) await sleep(Math.min(Math.max(ev.t - prev, 0) / this.speed, 2) * 1000);
      if (this.stopped) return;
      prev = ev.t;
      const { seq: _s, t: _t, type: _ty, mode, ...data } = ev;
      this.emit(t, { ...data, recorded_mode: mode ?? "live" });
      if (t === "approval_required") {
        const d = await new Promise<{ approve: boolean; note: string }>((resolve) => this.pending.set(ev.approval_id, resolve));
        this.emit("approval", { approval_id: ev.approval_id, tool: ev.tool, approved: d.approve, note: d.note });
        prev = null;
      }
    }
    this.emit("replay_done", {});
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
