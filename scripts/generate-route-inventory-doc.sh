#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MENU_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-menu-tree.XXXXXX")"
trap 'rm -f "${MENU_OUTPUT}"' EXIT

printf '%s\n' "ubus call luci.iloveluci menu_tree" | "${ROOT_DIR}/scripts/router-run.sh" - > "${MENU_OUTPUT}"

python3 - "${MENU_OUTPUT}" "${ROOT_DIR}/docs/ROUTE_INVENTORY.md" <<'PY'
import json
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
inventory_path = Path(sys.argv[2])

def extract_json_objects(text):
	objects = []
	for idx, ch in enumerate(text):
		if ch != "{":
			continue
		depth = 0
		in_string = False
		escaped = False
		for end in range(idx, len(text)):
			c = text[end]
			if in_string:
				if escaped:
					escaped = False
				elif c == "\\":
					escaped = True
				elif c == '"':
					in_string = False
			else:
				if c == '"':
					in_string = True
				elif c == "{":
					depth += 1
				elif c == "}":
					depth -= 1
					if depth == 0:
						try:
							objects.append(json.loads(text[idx : end + 1]))
						except json.JSONDecodeError:
							pass
						break
	return objects

def markdown_cell(value):
	return str(value).replace("|", "\\|").replace("\n", " ").strip()

menu = None
for obj in extract_json_objects(raw):
	data = obj.get("data")
	if isinstance(data, dict) and isinstance(data.get("items"), list):
		menu = data
		break

if not menu:
	print("FAIL: menu_tree JSON was not found", file=sys.stderr)
	sys.exit(1)

visible = [
	item for item in menu.get("items", [])
	if item.get("eligible") and not item.get("hidden") and item.get("effectiveMode") != "hidden"
]

lines = [
	"# I Love LuCI Route Inventory",
	"",
	"Generated from `ubus call luci.iloveluci menu_tree` on router `172.16.172.1`.",
	"",
	"This inventory records the current user-facing renderer decision for every visible LuCI menu route on the test router. `Native` routes expose an I Love LuCI `nativePath`; `LuCI compat` routes open the LuCI compatibility frame and must keep full legacy behavior until native parity is proven.",
	"",
	"| Route | Title | Renderer | Target | Parity | Fallback | Latest test | Notes |",
	"| --- | --- | --- | --- | --- | --- | --- | --- |",
]

for item in visible:
	path = item.get("path", "")
	status = item.get("nativeStatus") or "unsupported"
	mode = item.get("effectiveMode") or ""
	renderer = "Native" if status == "supported" and mode == "modern" else "LuCI compat" if mode == "legacy" else mode
	target = item.get("nativePath") if renderer == "Native" else (item.get("resolvedPath") or item.get("firstChildPath") or path)
	kind = item.get("type") or "route"
	first_child = item.get("firstChildPath") or ""
	notes = [kind]
	if first_child:
		notes.append(f"first child `{first_child}`")
	if renderer == "Native":
		parity = "supported native"
		fallback = "LuCI compat selectable"
	else:
		parity = "native parity not proven"
		fallback = "LuCI compat primary"
		notes.append("native adapter evidence retained")
		notes.append("user route stays compat")
	latest_test = "live menu audit"
	lines.append(
		"| "
		+ " | ".join(
			[
				f"`{markdown_cell(path)}`",
				markdown_cell(item.get("title") or path),
				renderer,
				f"`{markdown_cell(target)}`",
				parity,
				fallback,
				latest_test,
				"; ".join(notes),
			]
		)
		+ " |"
	)

inventory_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
