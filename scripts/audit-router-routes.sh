#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
	set -a
	# shellcheck disable=SC1091
	. "${ROOT_DIR}/.env"
	set +a
fi

: "${OPENWRT_HOST:?OPENWRT_HOST is required}"
: "${OPENWRT_USER:=root}"
: "${OPENWRT_PASSWORD:?OPENWRT_PASSWORD is required}"

TMP_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-route-audit.XXXXXX")"
trap 'rm -f "${TMP_OUTPUT}"' EXIT

if ! command -v expect >/dev/null 2>&1; then
	echo "expect is required for password-based router audit" >&2
	exit 2
fi

export OPENWRT_HOST OPENWRT_USER OPENWRT_PASSWORD

expect <<'EOF' > "${TMP_OUTPUT}"
set timeout 45
set host $env(OPENWRT_HOST)
set user $env(OPENWRT_USER)
set pass $env(OPENWRT_PASSWORD)
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$host "ubus call luci.iloveluci menu_tree; printf '\n---ILOVELUCI-MENU-FILES---\n'; find /usr/share/luci/menu.d -maxdepth 1 -type f -name '*.json' 2>/dev/null | sort; printf '\n---ILOVELUCI-LUCI-APPS---\n'; apk info -vv 2>/dev/null | grep '^luci-app-' | sort || opkg list-installed 'luci-app-*' 2>/dev/null | sort || true; printf '\n---ILOVELUCI-RELEASE---\n'; cat /etc/openwrt_release 2>/dev/null || true"
expect {
	-re "assword:" { send "$pass\r"; exp_continue }
	eof
}
EOF

python3 - "${TMP_OUTPUT}" <<'PY'
import json
import re
import sys
from collections import Counter

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
	print("FAIL: menu_tree JSON was not found in router output")
	sys.exit(1)

items = menu.get("items") or []
routes = menu.get("routes") or []
tree = menu.get("tree") or []
visible = [
	item for item in items
	if item.get("eligible") and not item.get("hidden") and item.get("effectiveMode") != "hidden"
]

route_paths = {item.get("path") for item in items}
visible_paths = {item.get("path") for item in visible}
failures = []
warnings = []

known_native_pages = {
	"attendedsysupgrade",
	"connections",
	"crontab",
	"diagnostics",
	"firewall-status",
	"flash",
	"leds",
	"logs",
	"packages",
	"password",
	"processes",
	"reboot",
	"repokeys",
	"services",
	"sshkeys",
	"startup",
	"status-routes",
	"wireless",
}
known_core_pages = {"dhcp", "firewall", "network", "system"}

def known_native_path(path):
	if path in {"/", "/realtime", "/settings"}:
		return True
	if path.startswith("/core/"):
		return path.removeprefix("/core/") in known_core_pages
	if path.startswith("/native/service/"):
		return re.fullmatch(r"/native/service/[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)?", path) is not None
	if path.startswith("/native/"):
		return path.removeprefix("/native/") in known_native_pages
	return False

if not visible:
	failures.append("No visible routes returned by menu_tree")

for item in visible:
	path = item.get("path")
	mode = item.get("effectiveMode")
	native_path = item.get("nativePath")
	resolved = item.get("resolvedPath") or item.get("firstChildPath") or path

	if mode not in {"modern", "legacy"}:
		failures.append(f"{path}: invalid effectiveMode={mode!r}")

	if mode == "modern" and not native_path:
		failures.append(f"{path}: modern route has no nativePath")

	if item.get("nativeStatus") in {"supported", "partial"}:
		if not native_path:
			failures.append(f"{path}: native-capable route has no native preview path")
		elif not known_native_path(native_path):
			failures.append(f"{path}: nativePath does not match a known shell route pattern: {native_path}")

	if mode == "legacy" and not resolved:
		failures.append(f"{path}: legacy route has no resolved legacy path")

	if item.get("nativeAutoMode") == "legacy" and item.get("configuredMode", "auto") == "auto" and mode != "legacy":
		failures.append(f"{path}: autoMode=legacy but effectiveMode={mode}")

	if (
		item.get("configuredMode", "auto") == "auto"
		and item.get("nativeStatus") == "partial"
		and mode != "legacy"
	):
		failures.append(f"{path}: partial native route should default to LuCI compat until full-page parity is proven")

	if item.get("actionType") == "firstchild" and item.get("firstChildPath") and item["firstChildPath"] not in route_paths:
		failures.append(f"{path}: firstChildPath missing from menu_tree: {item['firstChildPath']}")

compat_prefixes = (
	"/admin/services/",
	"/admin/system/commands",
)
compat_exact = {
	"/admin/system/package-manager",
	"/admin/system/attendedsysupgrade",
	"/admin/system/attendedsysupgrade/overview",
	"/admin/system/attendedsysupgrade/configuration",
}
strict_compat_prefixes = (
	"/admin/services/adblock-fast",
	"/admin/services/banip",
	"/admin/system/attendedsysupgrade",
)
strict_compat_exact = {
	"/admin/system/package-manager",
}
approved_native_app_prefixes = (
	"/admin/network/firewall",
	"/admin/system/commands",
	"/admin/services/uhttpd",
	"/admin/services/upnp",
)

for item in visible:
	path = item.get("path", "")
	if path in compat_exact or any(path.startswith(prefix) for prefix in compat_prefixes):
		if item.get("configuredMode", "auto") == "auto" and item.get("nativeStatus") != "supported" and item.get("effectiveMode") != "legacy":
			failures.append(f"{path}: incomplete LuCI app route should default to compat in auto mode")
		if not item.get("nativePath") and item.get("nativeStatus") in {"supported", "partial"}:
			failures.append(f"{path}: native-capable app route has no native preview path")

	if path in strict_compat_exact or any(path == prefix or path.startswith(prefix + "/") for prefix in strict_compat_prefixes):
		if item.get("configuredMode", "auto") == "auto":
			if item.get("effectiveMode") != "legacy":
				failures.append(f"{path}: installed LuCI app route must default to compat unless explicitly approved")
			if item.get("nativeAutoMode") != "legacy":
				failures.append(f"{path}: installed LuCI app route must declare autoMode=legacy")

	if any(path == prefix or path.startswith(prefix + "/") for prefix in approved_native_app_prefixes):
		if item.get("configuredMode", "auto") == "auto" and item.get("effectiveMode") == "modern" and item.get("nativeStatus") != "supported":
			failures.append(f"{path}: approved native app route is modern but not fully supported")

if not routes:
	failures.append("menu_tree.routes is empty")

if not tree:
	failures.append("menu_tree.tree is empty")

menu_files = []
menu_marker = raw.rfind("---ILOVELUCI-MENU-FILES---")
apps_marker = raw.rfind("---ILOVELUCI-LUCI-APPS---")
release_marker = raw.rfind("---ILOVELUCI-RELEASE---")

if menu_marker >= 0 and apps_marker > menu_marker:
	after = raw[menu_marker + len("---ILOVELUCI-MENU-FILES---") : apps_marker]
	menu_files = [line.strip() for line in after.splitlines() if line.strip().startswith("/")]

if not menu_files:
	warnings.append("No LuCI menu files were reported by router")

luci_apps = []
if apps_marker >= 0:
	end_marker = release_marker if release_marker > apps_marker else len(raw)
	after = raw[apps_marker + len("---ILOVELUCI-LUCI-APPS---") : end_marker]
	luci_apps = [line.strip().split()[0] for line in after.splitlines() if line.strip().startswith("luci-app-")]

if luci_apps and not any(path.startswith("/admin/services") for path in visible_paths):
	warnings.append("LuCI apps are installed but no /admin/services routes are visible")

counter = Counter(item.get("effectiveMode") for item in visible)
native_counter = Counter(item.get("nativeStatus") for item in visible)

print("I Love LuCI route audit")
print(f"visible_routes={len(visible)} modern={counter.get('modern', 0)} legacy={counter.get('legacy', 0)}")
print(
	f"native_status supported={native_counter.get('supported', 0)} "
	f"partial={native_counter.get('partial', 0)} unsupported={native_counter.get('unsupported', 0)}"
)
print(f"menu_files={len(menu_files)} luci_apps={len(luci_apps)}")
print(f"native_preview_routes={sum(1 for item in visible if item.get('nativePath'))}")

legacy_app_routes = [
	item for item in visible
	if item.get("effectiveMode") == "legacy"
	and (
		item.get("path", "") in compat_exact
		or any(item.get("path", "").startswith(prefix) for prefix in compat_prefixes)
	)
]
strict_compat_routes = [
	item for item in visible
	if item.get("path", "") in strict_compat_exact
	or any(item.get("path", "") == prefix or item.get("path", "").startswith(prefix + "/") for prefix in strict_compat_prefixes)
]
approved_native_app_routes = [
	item for item in visible
	if any(item.get("path", "") == prefix or item.get("path", "").startswith(prefix + "/") for prefix in approved_native_app_prefixes)
]

print(f"compat_default_routes={len(legacy_app_routes)}")
print(
	f"strict_compat_app_routes={len(strict_compat_routes)} "
	f"approved_native_app_routes={len(approved_native_app_routes)}"
)

if warnings:
	print("\nWarnings:")
	for warning in warnings:
		print(f"- {warning}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	sys.exit(1)

print("\nPASS: route audit checks passed")
PY
