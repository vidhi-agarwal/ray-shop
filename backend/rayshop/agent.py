"""The live agent: Claude Agent SDK + RAY Shop tools + a seller-approval gate on anything a customer will see."""
from __future__ import annotations

import asyncio
import base64
import os
import uuid
import warnings
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    PermissionResultAllow,
    PermissionResultDeny,
    ResultMessage,
    TextBlock,
    ToolPermissionContext,
)

from .events import EventBus
from .prompts import SYSTEM_PROMPT
from .store import Store
from .tools import GATED, build_server

# The read-only tools are allowed on purpose; only the submit tools should reach the approval gate.
warnings.filterwarnings("ignore", message="can_use_tool will not be invoked")

# Read-only Razorpay MCP tools the agent may use without asking (test mode only).
RAZORPAY_READ_TOOLS = ["fetch_order", "fetch_payment", "fetch_all_orders", "fetch_all_payments",
                       "fetch_all_settlements", "fetch_settlement_with_id", "fetch_order_payments"]


def razorpay_mcp() -> tuple[dict[str, Any], list[str]]:
    """Connect Razorpay's hosted MCP server when test keys are set. Live keys are refused."""
    key, secret = os.getenv("RAZORPAY_KEY_ID", ""), os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key or not secret:
        return {}, []
    if not key.startswith("rzp_test_"):
        raise RuntimeError("Only Razorpay test-mode keys (rzp_test_...) are allowed in this prototype.")
    token = base64.b64encode(f"{key}:{secret}".encode()).decode()
    cfg = {"razorpay": {"type": "http", "url": os.getenv("RAZORPAY_MCP_URL", "https://mcp.razorpay.com/mcp"),
                        "headers": {"Authorization": f"Basic {token}"}}}
    return cfg, [f"mcp__razorpay__{t}" for t in RAZORPAY_READ_TOOLS]


def approval_detail(store: Store, tool: str, inp: dict) -> dict:
    if tool == "publish_shop":
        return {"items": store.catalogue_draft}
    if tool == "send_payment_link":
        return {"quote": store.quotes.get(inp.get("quote_id")), "message": inp.get("message_to_customer")}
    if tool == "send_customer_message":
        return {"customer": inp.get("customer"), "message": inp.get("text"), "order_id": inp.get("order_id")}
    if tool == "send_broadcast":
        found = store.find_customers(inp.get("segment", "repeat"))
        return {"segment": inp.get("segment"), "message": inp.get("text"), "recipients": found["opted_in"],
                "skipped": found["count"] - found["opted_in"]}
    return {}


class AgentSession:
    def __init__(self, store: Store, bus: EventBus, model: str | None = None):
        self.store, self.bus = store, bus
        self.pending: dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()
        server, names, _ = build_server(store, bus)
        allowed = [n for n in names if n.rsplit("__", 1)[-1] not in GATED]
        rp_cfg, rp_allowed = razorpay_mcp() if os.getenv("RAYSHOP_RAZORPAY_MCP") else ({}, [])
        prompt = SYSTEM_PROMPT
        self.options = ClaudeAgentOptions(
            system_prompt=prompt,
            mcp_servers={"rayshop": server, **rp_cfg},
            tools=[],                       # no built-in tools: no shell, no file access
            allowed_tools=allowed + rp_allowed,
            can_use_tool=self._gate,        # everything else (the submit tools) comes here
            setting_sources=[],             # ignore local Claude settings so nothing can pre-approve a submit
            model=model or os.getenv("RAYSHOP_MODEL", "sonnet"),
            max_turns=int(os.getenv("RAYSHOP_MAX_TURNS", "60")),
            cwd=str(Path(__file__).resolve().parents[1]),
        )
        self.client: ClaudeSDKClient | None = None

    async def _gate(self, tool_name: str, tool_input: dict[str, Any], ctx: ToolPermissionContext):
        short = tool_name.rsplit("__", 1)[-1]
        if short not in GATED:
            self.bus.emit("guardrail", message=f"Blocked tool {tool_name}: not on the allowed list.")
            return PermissionResultDeny(message=f"{tool_name} is not permitted for this agent.")
        approval_id = uuid.uuid4().hex[:8]
        fut: asyncio.Future = asyncio.get_running_loop().create_future()
        self.pending[approval_id] = fut
        self.bus.emit("approval_required", approval_id=approval_id, tool=short, input=tool_input,
                      detail=approval_detail(self.store, short, tool_input))
        decision = await fut
        self.pending.pop(approval_id, None)
        self.bus.emit("approval", approval_id=approval_id, tool=short, approved=decision["approve"],
                      note=decision.get("note", ""))
        if decision["approve"]:
            return PermissionResultAllow()
        return PermissionResultDeny(
            message=f"Meera did not approve. Her note: {decision.get('note') or '(none)'}. "
                    "Ask her what to change. Do not try again until she agrees.")

    def resolve(self, approval_id: str, approve: bool, note: str = "") -> bool:
        fut = self.pending.get(approval_id)
        if not fut or fut.done():
            return False
        fut.set_result({"approve": approve, "note": note})
        return True

    async def send(self, text: str, images: list[str] | None = None) -> None:
        async with self._lock:
            self.bus.emit("founder_message", text=text, images=images or [])
            try:
                if self.client is None:
                    self.client = ClaudeSDKClient(options=self.options)
                    await self.client.connect()
                await self.client.query(text + (("\n[Attached photos: " + ", ".join(images) + "]") if images else ""))
                async for msg in self.client.receive_response():
                    if isinstance(msg, AssistantMessage):
                        for block in msg.content:
                            if isinstance(block, TextBlock) and block.text.strip():
                                self.bus.emit("agent_note", text=block.text.strip())
                    elif isinstance(msg, ResultMessage):
                        self.bus.emit("turn_done", cost_usd=msg.total_cost_usd, duration_ms=msg.duration_ms,
                                      turns=msg.num_turns, is_error=msg.is_error)
            except Exception as e:  # noqa: BLE001
                self.bus.emit("error", message=f"{type(e).__name__}: {e}")

    async def close(self) -> None:
        if self.client:
            await self.client.disconnect()
            self.client = None
