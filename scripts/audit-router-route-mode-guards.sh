#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MENU_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-route-mode-menu.XXXXXX")"
GUARD_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-route-mode-commands.XXXXXX")"
GUARD_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-route-mode-output.XXXXXX")"
trap 'rm -f "${MENU_OUTPUT}" "${GUARD_SCRIPT}" "${GUARD_OUTPUT}"' EXIT

printf '%s\n' "ubus call luci.iloveluci menu_tree" | "${ROOT_DIR}/scripts/router-run.sh" - > "${MENU_OUTPUT}"

python3 - "${MENU_OUTPUT}" "${GUARD_SCRIPT}" <<'PY'
import json
import shlex
import sys

raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()

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
	if isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list):
		menu = obj["data"]
		break

if not menu:
	print("FAIL: menu_tree JSON was not found", file=sys.stderr)
	raise SystemExit(1)

compat_routes = [
	item.get("path")
	for item in menu.get("items", [])
	if item.get("eligible")
	and not item.get("hidden")
	and item.get("effectiveMode") != "hidden"
	and item.get("nativeStatus") == "compat"
]

with open(sys.argv[2], "w", encoding="utf-8") as handle:
	handle.write("#!/bin/sh\nset -eu\n")
	handle.write("echo '---ILOVELUCI-ROUTE-MODE-GUARDS---'\n")
	handle.write("echo '---ILOVELUCI-UCI-CHANGES-BEFORE---'\n")
	handle.write("uci changes | sort\n")
	handle.write("echo '---ILOVELUCI-UCI-CHANGES-BEFORE-END---'\n")
	for path in sorted(filter(None, compat_routes)):
		payload = json.dumps({"path": path, "mode": "modern"}, separators=(",", ":"))
		handle.write("printf '%s\\n' " + shlex.quote(f"---ILOVELUCI-ROUTE-MODE:{path}---") + "\n")
		handle.write("ubus call luci.iloveluci route_mode_set " + shlex.quote(payload) + "\n")
	handle.write("echo '---ILOVELUCI-UCI-CHANGES-AFTER---'\n")
	handle.write("uci changes | sort\n")

print(f"compat_routes={len(compat_routes)}")
PY

"${ROOT_DIR}/scripts/router-run.sh" "${GUARD_SCRIPT}" > "${GUARD_OUTPUT}"

python3 - "${MENU_OUTPUT}" "${GUARD_OUTPUT}" <<'PY'
import json
import sys

menu_raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
guard_raw = open(sys.argv[2], encoding="utf-8", errors="replace").read()

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

def json_after_marker(marker):
	idx = guard_raw.find(marker)
	if idx < 0:
		return None
	start = guard_raw.find("{", idx)
	if start < 0:
		return None
	for obj in extract_json_objects(guard_raw[start:]):
		return obj
	return None

def lines_between(start_marker, end_marker=None):
	start = guard_raw.find(start_marker)
	if start < 0:
		return None
	start += len(start_marker)
	end = guard_raw.find(end_marker, start) if end_marker else -1
	text = guard_raw[start:end if end >= 0 else len(guard_raw)]
	return [
		line.strip()
		for line in text.splitlines()
		if line.strip()
		and not line.startswith("spawn ")
		and not line.startswith("Warning:")
	]

menu = None
for obj in extract_json_objects(menu_raw):
	if isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list):
		menu = obj["data"]
		break

compat_routes = [
	item.get("path")
	for item in (menu or {}).get("items", [])
	if item.get("eligible")
	and not item.get("hidden")
	and item.get("effectiveMode") != "hidden"
	and item.get("nativeStatus") == "compat"
]

failures = []
for path in sorted(filter(None, compat_routes)):
	marker = f"---ILOVELUCI-ROUTE-MODE:{path}---"
	result = json_after_marker(marker)
	data = result.get("data") if isinstance(result, dict) else None
	if not result or not result.get("ok") or not isinstance(data, dict):
		failures.append(f"{path}: route_mode_set did not return wrapped data")
		continue
	if data.get("saved") is not False:
		failures.append(f"{path}: route_mode_set accepted modern mode for compat route")
	if data.get("mode") != "modern":
		failures.append(f"{path}: route_mode_set returned unexpected mode={data.get('mode')!r}")

uci_before = lines_between(
	"---ILOVELUCI-UCI-CHANGES-BEFORE---",
	"---ILOVELUCI-UCI-CHANGES-BEFORE-END---",
)
uci_after = lines_between("---ILOVELUCI-UCI-CHANGES-AFTER---")

if uci_before is None:
	failures.append("uci changes baseline was not found")
elif uci_after is None:
	failures.append("uci changes final state was not found")
elif uci_before != uci_after:
	failures.append("uci changes drifted after route-mode guard checks")

print("I Love LuCI route mode guard audit")
print(f"compat_routes={len(compat_routes)}")
print(f"uci_changes_baseline={len(uci_before) if uci_before is not None else 'unknown'}")
print(f"uci_changes_preserved={uci_before == uci_after if uci_before is not None and uci_after is not None else 'unknown'}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	raise SystemExit(1)

print("\nPASS: route mode guard checks passed")
PY
