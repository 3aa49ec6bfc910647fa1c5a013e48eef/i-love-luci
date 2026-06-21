#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MENU_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-menu-tree.XXXXXX")"
trap 'rm -f "${MENU_OUTPUT}"' EXIT

printf '%s\n' "ubus call luci.iloveluci menu_tree" | "${ROOT_DIR}/scripts/router-run.sh" - > "${MENU_OUTPUT}"

python3 - "${MENU_OUTPUT}" "${ROOT_DIR}/docs/ROUTE_INVENTORY.md" <<'PY'
import json
import re
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
inventory_path = Path(sys.argv[2])
inventory = inventory_path.read_text(encoding="utf-8", errors="replace")

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

doc_rows = {}
row_pattern = re.compile(r"^\| `(?P<route>[^`]+)` \| (?P<title>[^|]+) \| (?P<renderer>[^|]+) \| `(?P<target>[^`]+)` \| (?P<notes>.*) \|$")
for line in inventory.splitlines():
	match = row_pattern.match(line.strip())
	if match:
		doc_rows[match.group("route")] = match.groupdict()

failures = []
for item in visible:
	path = item.get("path", "")
	status = item.get("nativeStatus") or "unsupported"
	mode = item.get("effectiveMode") or ""
	renderer = "Native" if status == "supported" and mode == "modern" else "LuCI compat" if mode == "legacy" else mode
	target = item.get("nativePath") if renderer == "Native" else (item.get("resolvedPath") or item.get("firstChildPath") or path)
	row = doc_rows.get(path)
	if not row:
		failures.append(f"{path}: missing from docs/ROUTE_INVENTORY.md")
		continue
	if row["renderer"].strip() != renderer:
		failures.append(f"{path}: inventory renderer={row['renderer'].strip()!r}, expected {renderer!r}")
	if row["target"].strip() != target:
		failures.append(f"{path}: inventory target={row['target'].strip()!r}, expected {target!r}")
	if status == "compat" and "user route stays compat" not in row["notes"]:
		failures.append(f"{path}: compat inventory row must explain that user route stays compat")

extra_routes = sorted(set(doc_rows) - {item.get("path", "") for item in visible})
for path in extra_routes:
	failures.append(f"{path}: inventory route is not currently visible on router")

print("I Love LuCI route inventory documentation audit")
print(f"visible_routes={len(visible)} inventory_routes={len(doc_rows)}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	sys.exit(1)

print("\nPASS: route inventory documentation is current")
PY
