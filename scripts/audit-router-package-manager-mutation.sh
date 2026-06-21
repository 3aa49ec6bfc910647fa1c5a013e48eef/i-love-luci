#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-package-mutation.XXXXXX")"
OUTPUT_FILE="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-package-mutation-output.XXXXXX")"
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
staged_install_path=""

cleanup() {
	if [ "${installed}" = "1" ]; then
		ubus call luci.iloveluci package_action "{\"action\":\"remove\",\"name\":\"${pkg}\",\"simulate\":false,\"options\":{}}" >/dev/null 2>&1 || true
		apk del "${pkg}" >/dev/null 2>&1 || true
	fi
	rm -rf /tmp/i-love-luci-package-fetch 2>/dev/null || true
	rm -f /tmp/luci-indexcache* /tmp/luci-modulecache* /tmp/i-love-luci-package-job-* /tmp/i-love-luci-package-*-status.json /tmp/i-love-luci-package-*-start.json /tmp/i-love-luci-package-menu-installed.json /tmp/i-love-luci-package-http-* /tmp/i-love-luci-package-stage-*.json /tmp/i-love-luci-package-fetch.log /tmp/i-love-luci-package-*.apk /tmp/i-love-luci-package-*.ipk /tmp/i-love-luci-package-uci-before.txt 2>/dev/null || true
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

http_smoke_installed_routes() {
	if ! command -v curl >/dev/null 2>&1; then
		echo "SMOKE_FAIL curl missing"
		return
	fi

	cookie="/tmp/i-love-luci-package-http-cookie.txt"
	body="/tmp/i-love-luci-package-http-body.txt"
	base="http://127.0.0.1/cgi-bin/luci"

	rm -f "${cookie}" "${body}" 2>/dev/null || true

	curl -fsS -c "${cookie}" -b "${cookie}" \
		--data-urlencode "luci_username=${http_user}" \
		--data-urlencode "luci_password=${http_password}" \
		"${base}/" >/dev/null 2>&1 || {
			echo "SMOKE_FAIL login failed"
			return
		}

	paths="$(jsonfilter -i /tmp/i-love-luci-package-menu-installed.json -e '@.data.items[*].path' 2>/dev/null | grep '^/admin/example' | sort -u || true)"
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

echo "---ILOVELUCI-PACKAGE---"
printf '%s\n' "${pkg}"

echo "---ILOVELUCI-WORLD-BEFORE---"
sha256sum /etc/apk/world 2>/dev/null || true

echo "---ILOVELUCI-UCI-CHANGES-BEFORE---"
uci changes | sort > /tmp/i-love-luci-package-uci-before.txt
cat /tmp/i-love-luci-package-uci-before.txt
if [ -s /tmp/i-love-luci-package-uci-before.txt ]; then
	echo "---ILOVELUCI-UCI-DIRTY-ABORT---"
	exit 4
fi

if apk info -e "${pkg}" >/dev/null 2>&1; then
	echo "---ILOVELUCI-PREINSTALLED---"
	printf '%s\n' "${pkg}"
	exit 3
fi

echo "---ILOVELUCI-MENU-BEFORE---"
menu_tree_retry

echo "---ILOVELUCI-STAGED-PACKAGE---"
rm -rf /tmp/i-love-luci-package-fetch 2>/dev/null || true
mkdir -p /tmp/i-love-luci-package-fetch
if command -v apk >/dev/null 2>&1; then
	(cd /tmp/i-love-luci-package-fetch && apk fetch "${pkg}" >/tmp/i-love-luci-package-fetch.log 2>&1) || true
	stage_source="$(find /tmp/i-love-luci-package-fetch -maxdepth 1 -type f -name "${pkg}-*.apk" | head -n 1 || true)"
	if [ -n "${stage_source}" ]; then
		stage_filename="$(basename "${stage_source}" | sed 's/[^A-Za-z0-9_.-]/-/g')"
		staged_install_path="/tmp/i-love-luci-package-${stage_filename}"
		cp "${stage_source}" "${staged_install_path}"
		chmod 0600 "${staged_install_path}"
		stage_size="$(wc -c < "${staged_install_path}" | tr -d ' ')"
		stage_sha256="$(sha256sum "${staged_install_path}" | awk '{print $1}')"
		printf '{"ok":true,"data":{"ok":true,"path":"%s","filename":"%s","size":%s,"sha256sum":"%s"}}\n' "${staged_install_path}" "${stage_filename}" "${stage_size:-0}" "${stage_sha256}"
	else
		cat /tmp/i-love-luci-package-fetch.log 2>/dev/null || true
	fi
else
	echo "apk fetch unavailable"
fi

echo "---ILOVELUCI-INSTALL-RPC---"
ubus call luci.iloveluci package_job_start "{\"action\":\"install\",\"name\":\"${staged_install_path}\",\"options\":{\"allowUntrusted\":true}}" > /tmp/i-love-luci-package-install-start.json 2>/dev/null || true
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
menu_tree_retry | tee /tmp/i-love-luci-package-menu-installed.json

echo "---ILOVELUCI-INSTALLED-HTTP-SMOKE---"
http_smoke_installed_routes

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

echo "---ILOVELUCI-UCI-CHANGES-AFTER---"
uci changes | sort
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

def lines_after_until(marker, stop_marker):
	if marker not in raw:
		return []
	start = raw.find(marker) + len(marker)
	end = raw.find(stop_marker, start)
	text = raw[start:end if end >= 0 else len(raw)]
	return [line.strip() for line in text.splitlines() if line.strip()]

def lines_between(start_marker, end_marker=None):
	start = raw.find(start_marker)
	if start < 0:
		return None
	start += len(start_marker)
	end = raw.find(end_marker, start) if end_marker else -1
	text = raw[start:end if end >= 0 else len(raw)]
	return [
		line.strip()
		for line in text.splitlines()
		if line.strip()
		and not line.startswith("spawn ")
		and not line.startswith("Warning:")
	]

failures = []
uci_before = lines_between(
	"---ILOVELUCI-UCI-CHANGES-BEFORE---",
	"---ILOVELUCI-UCI-DIRTY-ABORT---" if "---ILOVELUCI-UCI-DIRTY-ABORT---" in raw else "---ILOVELUCI-MENU-BEFORE---",
)

if "---ILOVELUCI-UCI-DIRTY-ABORT---" in raw:
	print("I Love LuCI package-manager mutation audit")
	print(f"uci_changes_baseline={len(uci_before) if uci_before is not None else 'unknown'}")
	print("\nFailures:")
	print("- router has pre-existing pending UCI changes; refusing package-manager mutation audit")
	raise SystemExit(1)

if router_status != 0:
	failures.append(f"remote package-manager mutation audit exited with status {router_status}")
if "---ILOVELUCI-PREINSTALLED---" in raw:
	failures.append("test package was already installed before audit")

install_objects = json_objects_between("---ILOVELUCI-INSTALL-RPC---", "---ILOVELUCI-MENU-INSTALLED---")
remove_objects = json_objects_between("---ILOVELUCI-REMOVE-RPC---", "---ILOVELUCI-MENU-REMOVED---")
stage_result = json_after_marker("---ILOVELUCI-STAGED-PACKAGE---")
install_start = next((obj for obj in install_objects if (obj.get("data") or {}).get("started") is True), None)
remove_start = next((obj for obj in remove_objects if (obj.get("data") or {}).get("started") is True), None)
install_status = next((obj for obj in reversed(install_objects) if isinstance((obj.get("data") or {}).get("result"), dict)), None)
remove_status = next((obj for obj in reversed(remove_objects) if isinstance((obj.get("data") or {}).get("result"), dict)), None)
install_result = (install_status.get("data") or {}).get("result") if install_status else None
remove_result = (remove_status.get("data") or {}).get("result") if remove_status else None
stage_data = (stage_result or {}).get("data") or {}

if not stage_result or not stage_result.get("ok") or not stage_data.get("ok"):
	failures.append("fetched test package was not staged for install")
if not str(stage_data.get("path") or "").startswith("/tmp/i-love-luci-package-"):
	failures.append("staged package returned unexpected install path")

if not install_start:
	failures.append("package_job_start install did not start")
if not remove_start:
	failures.append("package_job_start remove did not start")
if not install_result or not install_result.get("ok"):
	failures.append("package_action install did not report ok")
elif not str(install_result.get("name") or "").startswith("/tmp/i-love-luci-package-"):
	failures.append("package_action install did not use staged upload path")
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

smoke_lines = lines_after_until("---ILOVELUCI-INSTALLED-HTTP-SMOKE---", "---ILOVELUCI-REMOVE-RPC---")
smoke_ok = [line for line in smoke_lines if line.startswith("SMOKE_OK ")]
smoke_fail = [line for line in smoke_lines if line.startswith("SMOKE_FAIL ")]
if smoke_fail:
	failures.extend(f"installed route HTTP smoke failed: {line}" for line in smoke_fail)
if not smoke_ok:
	failures.append("installed route HTTP smoke did not verify any routes")

world_before = sha_after("---ILOVELUCI-WORLD-BEFORE---")
world_after = sha_after("---ILOVELUCI-WORLD-AFTER---")
if world_before and world_after and world_before != world_after:
	failures.append("apk world hash changed after native install/remove cycle")

uci_after = lines_between("---ILOVELUCI-UCI-CHANGES-AFTER---")
if uci_before is None:
	failures.append("uci changes baseline was not found")
elif uci_after is None:
	failures.append("uci changes final state was not found")
elif uci_before != uci_after:
	failures.append("uci changes drifted after native install/remove cycle")

print("I Love LuCI package-manager mutation audit")
print(f"new_routes={len(new_paths)}")
if new_paths:
	print("new_paths=" + ",".join(new_paths))
print(f"install_ok={bool(install_result and install_result.get('ok'))}")
print(f"remove_ok={bool(remove_result and remove_result.get('ok'))}")
print(f"staged_install={bool(stage_data.get('ok'))}")
print(f"http_smoke_checks={len(smoke_ok)}")
print(f"world_restored={bool(world_before and world_after and world_before == world_after)}")
print(f"uci_changes_baseline={len(uci_before) if uci_before is not None else 'unknown'}")
print(f"uci_changes_preserved={uci_before == uci_after if uci_before is not None and uci_after is not None else 'unknown'}")

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
