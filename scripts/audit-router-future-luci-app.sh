#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-future-app.XXXXXX")"
OUTPUT_FILE="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-future-app-output.XXXXXX")"
trap 'rm -f "${REMOTE_SCRIPT}" "${OUTPUT_FILE}"' EXIT

if [ -f "${ROOT_DIR}/.env" ]; then
	set -a
	# shellcheck disable=SC1091
	. "${ROOT_DIR}/.env"
	set +a
fi

: "${OPENWRT_USER:=root}"
: "${OPENWRT_PASSWORD:?OPENWRT_PASSWORD is required}"

cat > "${REMOTE_SCRIPT}" <<'SH'
#!/bin/sh
set -eu

pkg="luci-app-example"
installed=0
http_user=__ILOVELUCI_HTTP_USER__
http_password=__ILOVELUCI_HTTP_PASSWORD__

cleanup() {
	if [ "${installed}" = "1" ]; then
		apk del "${pkg}" >/dev/null 2>&1 || true
	fi
}
trap cleanup EXIT

echo "---ILOVELUCI-PACKAGE---"
printf '%s\n' "${pkg}"

menu_tree_retry() {
	i=0
	while [ "${i}" -lt 5 ]; do
		if ubus call luci.iloveluci menu_tree; then
			return 0
		fi
		i=$((i + 1))
		sleep 1
	done
	return 1
}

http_smoke_installed_routes() {
	if ! command -v curl >/dev/null 2>&1; then
		echo "SMOKE_FAIL curl missing"
		return
	fi

	cookie="/tmp/i-love-luci-future-app-cookie.txt"
	body="/tmp/i-love-luci-future-app-body.txt"
	base="http://127.0.0.1/cgi-bin/luci"

	rm -f "${cookie}" "${body}" 2>/dev/null || true

	curl -fsS -c "${cookie}" -b "${cookie}" \
		--data-urlencode "luci_username=${http_user}" \
		--data-urlencode "luci_password=${http_password}" \
		"${base}/" >/dev/null 2>&1 || {
			echo "SMOKE_FAIL login failed"
			return
		}

	paths="$(jsonfilter -i /tmp/i-love-luci-future-app-menu-installed.json -e '@.data.items[*].path' 2>/dev/null | grep '^/admin/example' | sort -u || true)"
	if [ -z "${paths}" ]; then
		echo "SMOKE_FAIL no example paths"
		return
	fi

	for path in ${paths}; do
		suffix="${path#/admin}"
		url="${base}/admin${suffix}"
		frame_url="${url}?iloveluci_frame=1"

		status="$(curl -sS -L -c "${cookie}" -b "${cookie}" -o "${body}" -w '%{http_code}' "${url}" 2>/dev/null || printf '000')"
		if [ "${status}" -ge 400 ] 2>/dev/null || grep -Eq 'data-iloveluci-login="true"|Log in |404 Not Found|Unable to dispatch' "${body}" 2>/dev/null; then
			echo "SMOKE_FAIL ${path} route ${status}"
			continue
		fi

		frame_status="$(curl -sS -L -c "${cookie}" -b "${cookie}" -o "${body}" -w '%{http_code}' "${frame_url}" 2>/dev/null || printf '000')"
		if [ "${frame_status}" -ge 400 ] 2>/dev/null || grep -Eq 'data-iloveluci-login="true"|Log in |404 Not Found|Unable to dispatch' "${body}" 2>/dev/null; then
			echo "SMOKE_FAIL ${path} frame ${frame_status}"
			continue
		fi

		echo "SMOKE_OK ${path} route=${status} frame=${frame_status}"
	done
}

echo "---ILOVELUCI-WORLD-BEFORE---"
sha256sum /etc/apk/world 2>/dev/null || true

if apk info -e "${pkg}" >/dev/null 2>&1; then
	echo "---ILOVELUCI-PREINSTALLED---"
	printf '%s\n' "${pkg}"
	exit 3
fi

echo "---ILOVELUCI-MENU-BEFORE---"
menu_tree_retry

echo "---ILOVELUCI-INSTALL---"
apk add --allow-untrusted "${pkg}"
installed=1

echo "---ILOVELUCI-MENU-INSTALLED---"
menu_tree_retry | tee /tmp/i-love-luci-future-app-menu-installed.json

echo "---ILOVELUCI-INSTALLED-HTTP-SMOKE---"
http_smoke_installed_routes

echo "---ILOVELUCI-REMOVE---"
apk del "${pkg}"
installed=0

echo "---ILOVELUCI-MENU-REMOVED---"
menu_tree_retry

echo "---ILOVELUCI-WORLD-AFTER---"
sha256sum /etc/apk/world 2>/dev/null || true

echo "---ILOVELUCI-UCI-CHANGES---"
uci changes | wc -l
SH

python3 - "${REMOTE_SCRIPT}" "${OPENWRT_USER}" "${OPENWRT_PASSWORD}" <<'PY'
import shlex
import sys

path, user, password = sys.argv[1:4]
text = open(path, encoding="utf-8").read()
text = text.replace("__ILOVELUCI_HTTP_USER__", shlex.quote(user))
text = text.replace("__ILOVELUCI_HTTP_PASSWORD__", shlex.quote(password))
open(path, "w", encoding="utf-8").write(text)
PY

router_status=0
"${ROOT_DIR}/scripts/router-run.sh" "${REMOTE_SCRIPT}" > "${OUTPUT_FILE}" || router_status=$?

python3 - "${OUTPUT_FILE}" "${router_status}" <<'PY'
import json
import re
import sys

raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
router_status = int(sys.argv[2])

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
	idx = raw.find(marker)
	if idx < 0:
		return None
	for obj in extract_json_objects(raw[idx:]):
		if isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list):
			return obj["data"]
	return None

def visible_paths(menu):
	items = (menu or {}).get("items") or []
	return {
		item.get("path"): item
		for item in items
		if item.get("eligible")
		and not item.get("hidden")
		and item.get("effectiveMode") != "hidden"
	}

def route_index_paths(menu):
	return {
		item.get("path"): item
		for item in ((menu or {}).get("routes") or [])
		if item.get("eligible")
		and not item.get("hidden")
		and item.get("effectiveMode") != "hidden"
	}

def tree_paths(menu):
	paths = {}

	def visit(items):
		for item in items or []:
			path = item.get("path")
			if path:
				paths[path] = item
			visit(item.get("children") or [])

	visit((menu or {}).get("tree") or [])
	return paths

def search_matches(items, query):
	needle = query.strip().lower()
	return {
		item.get("path")
		for item in items.values()
		if needle in (item.get("title") or "").lower()
		or needle in (item.get("path") or "").lower()
	}

def first_line_after(marker):
	if marker not in raw:
		return ""
	for line in raw.split(marker, 1)[1].splitlines():
		line = line.strip()
		if line and not line.startswith("spawn ") and not line.startswith("Warning:"):
			return line
	return ""

def sha_after(marker):
	line = first_line_after(marker)
	match = re.match(r"([0-9a-f]{64})\s+", line)
	return match.group(1) if match else ""

failures = []
if router_status != 0:
	failures.append(f"remote install/remove audit exited with status {router_status}")

if "---ILOVELUCI-PREINSTALLED---" in raw:
	failures.append("test package was already installed before audit")

before = json_after_marker("---ILOVELUCI-MENU-BEFORE---")
installed = json_after_marker("---ILOVELUCI-MENU-INSTALLED---")
removed = json_after_marker("---ILOVELUCI-MENU-REMOVED---")

if not before or not installed or not removed:
	failures.append("failed to capture menu_tree before/install/remove states")

before_paths = visible_paths(before)
installed_paths = visible_paths(installed)
removed_paths = visible_paths(removed)
installed_route_paths = route_index_paths(installed)
installed_tree_paths = tree_paths(installed)
installed_search_matches = search_matches(installed_paths, "example")
new_paths = sorted(set(installed_paths) - set(before_paths))

if not new_paths:
	failures.append("installing test LuCI app did not add visible routes")

smoke_section = raw.split("---ILOVELUCI-INSTALLED-HTTP-SMOKE---", 1)[1].split("---ILOVELUCI-REMOVE---", 1)[0] if "---ILOVELUCI-INSTALLED-HTTP-SMOKE---" in raw else ""
smoke_ok_paths = {
	line.split()[1]
	for line in smoke_section.splitlines()
	if line.startswith("SMOKE_OK ") and len(line.split()) >= 2
}
smoke_failures = [line for line in smoke_section.splitlines() if line.startswith("SMOKE_FAIL ")]

for path in new_paths:
	item = installed_paths[path]
	if path not in installed_route_paths:
		failures.append(f"{path}: future app route missing from flat route index")
	if path not in installed_tree_paths:
		failures.append(f"{path}: future app route missing from sidebar tree")
	if path not in installed_search_matches:
		failures.append(f"{path}: future app route is not searchable by title or path")
	if not item.get("title"):
		failures.append(f"{path}: future app route has no title")
	if item.get("nativeStatus") != "compat":
		failures.append(f"{path}: future app route nativeStatus={item.get('nativeStatus')!r}, expected compat")
	if item.get("effectiveMode") != "legacy":
		failures.append(f"{path}: future app route effectiveMode={item.get('effectiveMode')!r}, expected legacy")
	if item.get("nativePath"):
		failures.append(f"{path}: future app compat route exposed nativePath={item.get('nativePath')!r}")
	if path not in smoke_ok_paths:
		failures.append(f"{path}: future app route was not HTTP-smoked through direct LuCI route and compat frame")

for failure in smoke_failures:
	failures.append(f"future app HTTP smoke failed: {failure}")

leftover = sorted(set(new_paths) & set(removed_paths))
if leftover:
	failures.append("removed test LuCI app left visible routes: " + ", ".join(leftover))

world_before = sha_after("---ILOVELUCI-WORLD-BEFORE---")
world_after = sha_after("---ILOVELUCI-WORLD-AFTER---")
if world_before and world_after and world_before != world_after:
	failures.append("apk world hash changed after install/remove cycle")

uci_changes = None
if "---ILOVELUCI-UCI-CHANGES---" in raw:
	for line in raw.split("---ILOVELUCI-UCI-CHANGES---", 1)[1].splitlines():
		line = line.strip()
		if line.isdigit():
			uci_changes = int(line)
			break

if uci_changes is None:
	failures.append("uci changes count was not found")
elif uci_changes != 0:
	failures.append(f"uci changes is not clean after install/remove cycle: {uci_changes}")

print("I Love LuCI future LuCI app audit")
print(f"new_routes={len(new_paths)}")
if new_paths:
	print("new_paths=" + ",".join(new_paths))
print(f"http_smoke_checks={len(smoke_ok_paths)}")
print(f"world_restored={bool(world_before and world_after and world_before == world_after)}")
print(f"uci_changes={uci_changes if uci_changes is not None else 'unknown'}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	if router_status != 0:
		print("\nRemote output tail:")
		for line in raw.splitlines()[-80:]:
			print(line)
	raise SystemExit(1)

print("\nPASS: future LuCI app compat checks passed")
PY
