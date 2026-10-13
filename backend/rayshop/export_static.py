"""Write the files the static (Vercel) build needs into frontend/public.

The hosted demo has no backend, so the browser replays the recorded run from these files:
  static/initial.json        the shop as a fresh session sees it (what /api/initial returns)
  static/insights.json       menu and customer insights (what /api/insights returns)
  static/demo.jsonl          the recorded live run
  static/images/*            menu photo and payment screenshots
  shop/meeras-bakes.html     the shop page (served at /shop/meeras-bakes)

Run from backend/ after changing data or the recording:  python -m rayshop.export_static
"""
from __future__ import annotations

import json
import shutil

from .server import ROOT, find_recording, shop_page
from .store import Store

OUT = ROOT / "frontend" / "public"


def main() -> None:
    st = Store()
    static = OUT / "static"
    (static / "images").mkdir(parents=True, exist_ok=True)
    (static / "initial.json").write_text(json.dumps(st.view(), ensure_ascii=False, default=str), encoding="utf-8")
    (static / "insights.json").write_text(json.dumps(Store(start_phase="month3").insights(), ensure_ascii=False), encoding="utf-8")
    shutil.copyfile(find_recording(None), static / "demo.jsonl")
    for im in st.images.values():
        shutil.copyfile(st.dir / im["file"], static / "images" / (st.dir / im["file"]).name)
    (OUT / "shop").mkdir(exist_ok=True)
    (OUT / "shop" / "meeras-bakes.html").write_text(shop_page("meeras-bakes"), encoding="utf-8")
    print(f"wrote static demo files to {OUT}")


if __name__ == "__main__":
    main()
