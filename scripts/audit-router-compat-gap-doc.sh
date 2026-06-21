#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MENU_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-menu-tree.XXXXXX")"
trap 'rm -f "${MENU_OUTPUT}"' EXIT

printf '%s\n' "ubus call luci.iloveluci menu_tree" | "${ROOT_DIR}/scripts/router-run.sh" - > "${MENU_OUTPUT}"

python3 - "${MENU_OUTPUT}" "${ROOT_DIR}/docs/UI_REFACTOR.md" <<'PY'
import json
import re
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
doc_path = Path(sys.argv[2])
doc = doc_path.read_text(encoding="utf-8", errors="replace")


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
	item
	for item in menu.get("items", [])
	if item.get("eligible") and not item.get("hidden") and item.get("effectiveMode") != "hidden"
]
compat_routes = sorted(
	item.get("path", "")
	for item in visible
	if (item.get("effectiveMode") == "legacy" or item.get("nativeStatus") != "supported")
)
compat_routes = [route for route in compat_routes if route]

section_match = re.search(
	r"^### Current LuCI Compat Gap Register\n(?P<body>.*?)(?=^### |\Z)",
	doc,
	flags=re.MULTILINE | re.DOTALL,
)
if not section_match:
	print("FAIL: docs/UI_REFACTOR.md is missing '### Current LuCI Compat Gap Register'", file=sys.stderr)
	sys.exit(1)

section = section_match.group("body")
table_lines = "\n".join(line for line in section.splitlines() if line.startswith("|"))
documented_routes = sorted(set(re.findall(r"`(/admin/[^`]+)`", table_lines)))

missing = sorted(set(compat_routes) - set(documented_routes))
extra = sorted(set(documented_routes) - set(compat_routes))
failures = []

if missing:
	failures.append("missing compat gap entries: " + ", ".join(missing))
if extra:
	failures.append("stale compat gap entries: " + ", ".join(extra))

required_phrases = [
	"LuCI owns the full route",
	"No native promotion until",
	"route stays compat",
]
for phrase in required_phrases:
	if phrase not in section:
		failures.append(f"gap register must contain phrase: {phrase!r}")

print("I Love LuCI compat gap documentation audit")
print(f"visible_compat_routes={len(compat_routes)} documented_gap_routes={len(documented_routes)}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	sys.exit(1)

print("\nPASS: compat gap documentation is current")
PY
