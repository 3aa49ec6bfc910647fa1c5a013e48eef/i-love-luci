#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-package-mutation.XXXXXX")"
OUTPUT_FILE="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-package-mutation-output.XXXXXX")"
trap 'rm -f "${REMOTE_SCRIPT}" "${OUTPUT_FILE}"' EXIT

cat > "${REMOTE_SCRIPT}" <<'SH'
#!/bin/sh
set -eu

pkg="luci-app-example"
installed=0

cleanup() {
	if [ "${installed}" = "1" ]; then
		ubus call luci.iloveluci package_action "{\"action\":\"remove\",\"name\":\"${pkg}\",\"simulate\":false,\"options\":{}}" >/dev/null 2>&1 || true
		apk del "${pkg}" >/dev/null 2>&1 || true
	fi
	rm -f /tmp/luci-indexcache* /tmp/luci-modulecache* /tmp/i-love-luci-package-job-* /tmp/i-love-luci-package-*-status.json /tmp/i-love-luci-package-*-start.json 2>/dev/null || true
}
trap cleanup EXIT

menu_tree_retry() {
	i=0
	while [ "${i}" -lt 8 ]; do
		if ubus call luci.iloveluci menu_tree; then
			return 0
		fi
		i=$((i + 1))
		sleep 1
	done
	return 1
}

echo "---ILOVELUCI-PACKAGE---"
printf '%s\n' "${pkg}"

echo "---ILOVELUCI-WORLD-BEFORE---"
sha256sum /etc/apk/world 2>/dev/null || true

if apk info -e "${pkg}" >/dev/null 2>&1; then
	echo "---ILOVELUCI-PREINSTALLED---"
	printf '%s\n' "${pkg}"
	exit 3
fi

echo "---ILOVELUCI-MENU-BEFORE---"
menu_tree_retry

echo "---ILOVELUCI-INSTALL-RPC---"
ubus call luci.iloveluci package_job_start "{\"action\":\"install\",\"name\":\"${pkg}\",\"options\":{}}" > /tmp/i-love-luci-package-install-start.json 2>/dev/null || true
cat /tmp/i-love-luci-package-install-start.json
install_job_id="$(jsonfilter -i /tmp/i-love-luci-package-install-start.json -e '@.data.job.id' 2>/dev/null || true)"
if [ -n "${install_job_id}" ]; then
	i=0
	while [ "${i}" -lt 180 ]; do
		ubus call luci.iloveluci package_job_status "{\"id\":\"${install_job_id}\"}" > /tmp/i-love-luci-package-install-status.json 2>/dev/null || true
		cat /tmp/i-love-luci-package-install-status.json
		done_state="$(jsonfilter -i /tmp/i-love-luci-package-install-status.json -e '@.data.done' 2>/dev/null || true)"
		if [ "${done_state}" = "true" ]; then
			break
		fi
		i=$((i + 1))
		sleep 1
	done
fi
if apk info -e "${pkg}" >/dev/null 2>&1; then
	installed=1
fi
rm -f /tmp/luci-indexcache* /tmp/luci-modulecache* 2>/dev/null || true

echo "---ILOVELUCI-MENU-INSTALLED---"
menu_tree_retry

echo "---ILOVELUCI-REMOVE-RPC---"
ubus call luci.iloveluci package_job_start "{\"action\":\"remove\",\"name\":\"${pkg}\",\"options\":{}}" > /tmp/i-love-luci-package-remove-start.json 2>/dev/null || true
cat /tmp/i-love-luci-package-remove-start.json
remove_job_id="$(jsonfilter -i /tmp/i-love-luci-package-remove-start.json -e '@.data.job.id' 2>/dev/null || true)"
if [ -n "${remove_job_id}" ]; then
	i=0
	while [ "${i}" -lt 180 ]; do
		ubus call luci.iloveluci package_job_status "{\"id\":\"${remove_job_id}\"}" > /tmp/i-love-luci-package-remove-status.json 2>/dev/null || true
		cat /tmp/i-love-luci-package-remove-status.json
		done_state="$(jsonfilter -i /tmp/i-love-luci-package-remove-status.json -e '@.data.done' 2>/dev/null || true)"
		if [ "${done_state}" = "true" ]; then
			break
		fi
		i=$((i + 1))
		sleep 1
	done
fi
if ! apk info -e "${pkg}" >/dev/null 2>&1; then
	installed=0
fi
rm -f /tmp/luci-indexcache* /tmp/luci-modulecache* 2>/dev/null || true

echo "---ILOVELUCI-MENU-REMOVED---"
menu_tree_retry

echo "---ILOVELUCI-WORLD-AFTER---"
sha256sum /etc/apk/world 2>/dev/null || true

echo "---ILOVELUCI-UCI-CHANGES---"
uci changes | wc -l
SH

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

def json_after_marker(marker, predicate=None):
	idx = raw.find(marker)
	if idx < 0:
		return None
	for obj in extract_json_objects(raw[idx:]):
		if predicate is None or predicate(obj):
			return obj
	return None

def json_objects_between(start_marker, end_marker):
	start = raw.find(start_marker)
	if start < 0:
		return []
	end = raw.find(end_marker, start + len(start_marker))
	text = raw[start:end if end >= 0 else len(raw)]
	return extract_json_objects(text)

def visible_paths(menu):
	items = ((menu or {}).get("data") or {}).get("items") or []
	return {
		item.get("path"): item
		for item in items
		if item.get("eligible")
		and not item.get("hidden")
		and item.get("effectiveMode") != "hidden"
	}

def sha_after(marker):
	if marker not in raw:
		return ""
	for line in raw.split(marker, 1)[1].splitlines():
		line = line.strip()
		match = re.match(r"([0-9a-f]{64})\s+", line)
		if match:
			return match.group(1)
	return ""

def uci_changes_after(marker):
	if marker not in raw:
		return None
	for line in raw.split(marker, 1)[1].splitlines():
		line = line.strip()
		if line.isdigit():
			return int(line)
	return None

failures = []

if router_status != 0:
	failures.append(f"remote package-manager mutation audit exited with status {router_status}")
if "---ILOVELUCI-PREINSTALLED---" in raw:
	failures.append("test package was already installed before audit")

install_objects = json_objects_between("---ILOVELUCI-INSTALL-RPC---", "---ILOVELUCI-MENU-INSTALLED---")
remove_objects = json_objects_between("---ILOVELUCI-REMOVE-RPC---", "---ILOVELUCI-MENU-REMOVED---")
install_start = next((obj for obj in install_objects if (obj.get("data") or {}).get("started") is True), None)
remove_start = next((obj for obj in remove_objects if (obj.get("data") or {}).get("started") is True), None)
install_status = next((obj for obj in reversed(install_objects) if isinstance((obj.get("data") or {}).get("result"), dict)), None)
remove_status = next((obj for obj in reversed(remove_objects) if isinstance((obj.get("data") or {}).get("result"), dict)), None)
install_result = (install_status.get("data") or {}).get("result") if install_status else None
remove_result = (remove_status.get("data") or {}).get("result") if remove_status else None

if not install_start:
	failures.append("package_job_start install did not start")
if not remove_start:
	failures.append("package_job_start remove did not start")
if not install_result or not install_result.get("ok"):
	failures.append("package_action install did not report ok")
if not remove_result or not remove_result.get("ok"):
	failures.append("package_action remove did not report ok")

before = json_after_marker("---ILOVELUCI-MENU-BEFORE---", lambda obj: isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list))
installed = json_after_marker("---ILOVELUCI-MENU-INSTALLED---", lambda obj: isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list))
removed = json_after_marker("---ILOVELUCI-MENU-REMOVED---", lambda obj: isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("items"), list))

before_paths = visible_paths(before)
installed_paths = visible_paths(installed)
removed_paths = visible_paths(removed)
new_paths = sorted(set(installed_paths) - set(before_paths))

if not new_paths:
	failures.append("native package install did not add visible LuCI app routes")

for path in new_paths:
	item = installed_paths[path]
	if item.get("nativeStatus") != "compat":
		failures.append(f"{path}: installed package route nativeStatus={item.get('nativeStatus')!r}, expected compat")
	if item.get("effectiveMode") != "legacy":
		failures.append(f"{path}: installed package route effectiveMode={item.get('effectiveMode')!r}, expected legacy")
	if item.get("nativePath"):
		failures.append(f"{path}: installed package compat route exposed nativePath={item.get('nativePath')!r}")

leftover = sorted(set(new_paths) & set(removed_paths))
if leftover:
	failures.append("native package remove left visible routes: " + ", ".join(leftover))

world_before = sha_after("---ILOVELUCI-WORLD-BEFORE---")
world_after = sha_after("---ILOVELUCI-WORLD-AFTER---")
if world_before and world_after and world_before != world_after:
	failures.append("apk world hash changed after native install/remove cycle")

uci_changes = uci_changes_after("---ILOVELUCI-UCI-CHANGES---")
if uci_changes is None:
	failures.append("uci changes count was not found")
elif uci_changes != 0:
	failures.append(f"uci changes is not clean after native install/remove cycle: {uci_changes}")

print("I Love LuCI package-manager mutation audit")
print(f"new_routes={len(new_paths)}")
if new_paths:
	print("new_paths=" + ",".join(new_paths))
print(f"install_ok={bool(install_result and install_result.get('ok'))}")
print(f"remove_ok={bool(remove_result and remove_result.get('ok'))}")
print(f"world_restored={bool(world_before and world_after and world_before == world_after)}")
print(f"uci_changes={uci_changes if uci_changes is not None else 'unknown'}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	print("\nRemote output tail:")
	for line in raw.splitlines()[-80:]:
		print(line)
	raise SystemExit(1)

print("\nPASS: package-manager mutation checks passed")
PY
