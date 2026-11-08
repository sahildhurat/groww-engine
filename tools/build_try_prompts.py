"""Build site/data/try_prompts.json: the gate and extraction system prompts exactly as the pipeline sends them.

Mirrors pipeline/gate.py load_gate_prompt and pipeline/extract.py load_extract_prompt + format_categories_for_prompt:
the SYSTEM section only (the USER template is dropped) and {{CATEGORIES}} filled from config/categories_v0_1.yaml
(the categories file the pipeline uses for v1_2 prompts). Run from the repo root: python tools/build_try_prompts.py
"""
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def system_part(raw: str) -> str:
    return raw.split("USER")[0].replace("SYSTEM", "").strip()


def format_categories(path: Path) -> str:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    lines = []
    for fname, fdef in data.get("fields", {}).items():
        if isinstance(fdef, dict):
            codes = fdef.get("codes", [])
            df = fdef.get("def", "")
            if codes:
                lines.append(f'- "{fname}": allowed codes: {", ".join(str(c) for c in codes)}. ({df})')
            else:
                lines.append(f'- "{fname}": ({df})')
    return "\n".join(lines)


gate_raw = (ROOT / "prompts" / "gate_v1_1.md").read_text(encoding="utf-8")
extract_raw = (ROOT / "prompts" / "extract_v1_2a.md").read_text(encoding="utf-8")
extract_filled = extract_raw.replace("{{CATEGORIES}}", format_categories(ROOT / "config" / "categories_v0_1.yaml"))
out = {
    "gate_version": "gate_v1_1",
    "extract_version": "extract_v1_2a",
    "categories_version": "categories_v0_1",
    "gate_system": system_part(gate_raw),
    "extract_system": system_part(extract_filled),
}
assert "{{CATEGORIES}}" not in out["extract_system"]
(ROOT / "site" / "data" / "try_prompts.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote site/data/try_prompts.json", len(out["gate_system"]), len(out["extract_system"]))
