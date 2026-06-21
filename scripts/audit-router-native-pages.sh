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

TMP_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-native-audit.XXXXXX")"
trap 'rm -f "${TMP_OUTPUT}"' EXIT

if ! command -v expect >/dev/null 2>&1; then
	echo "expect is required for password-based router audit" >&2
	exit 2
fi

export OPENWRT_HOST OPENWRT_USER OPENWRT_PASSWORD

expect <<'EOF' > "${TMP_OUTPUT}"
set timeout 90
set host $env(OPENWRT_HOST)
set user $env(OPENWRT_USER)
set pass $env(OPENWRT_PASSWORD)
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$host "cat <<'REMOTE' >/tmp/i-love-luci-native-audit.sh
#!/bin/sh
pages='status-routes firewall-status logs processes connections wireless diagnostics attendedsysupgrade packages startup crontab sshkeys password repokeys leds flash services reboot'
core_pages='network dhcp firewall system'
services='adblock-fast banip upnpd commands uhttpd dropbear'
echo '---ILOVELUCI-MENU---'
ubus call luci.iloveluci menu_tree
for page in \$core_pages; do
	printf '%s\n' \"---ILOVELUCI-CORE-PAGE:\$page---\"
	ubus call luci.iloveluci core_settings \"{\\\"page\\\":\\\"\$page\\\"}\"
done
for page in \$pages; do
	printf '%s\n' \"---ILOVELUCI-NATIVE-PAGE:\$page---\"
	ubus call luci.iloveluci native_page \"{\\\"page\\\":\\\"\$page\\\"}\"
done
for service in \$services; do
	printf '%s\n' \"---ILOVELUCI-SERVICE:\$service---\"
	ubus call luci.iloveluci service_detail \"{\\\"id\\\":\\\"\$service\\\"}\"
done
echo '---ILOVELUCI-CONSOLE---'
ubus call luci.iloveluci console_status
echo '---ILOVELUCI-CHANGES---'
ubus call luci.iloveluci changes_list
echo '---ILOVELUCI-REBOOT-REJECT---'
ubus call luci.iloveluci reboot_confirm \"{\\\"confirm\\\":\\\"__audit_do_not_reboot__\\\"}\"
echo '---ILOVELUCI-CONFIG-BACKUP-DRY-RUN---'
ubus call luci.iloveluci config_backup_create \"{\\\"dry_run\\\":true}\"
echo '---ILOVELUCI-FIREWALL-INCLUDE-NOOP---'
ubus call luci.iloveluci firewall_includes_save
echo '---ILOVELUCI-PACKAGE-SEARCH---'
ubus call luci.iloveluci package_search \"{\\\"query\\\":\\\"luci-app\\\"}\"
echo '---ILOVELUCI-PACKAGE-FEEDS-NOOP---'
ubus call luci.iloveluci native_page '{\"page\":\"packages\"}' >/tmp/i-love-luci-package-feeds.json
feeds_payload=\$(jsonfilter -i /tmp/i-love-luci-package-feeds.json -e '@.data.packageFeeds' | sed 's/^/{\"rows\":/; s/\$/}/')
ubus call luci.iloveluci package_feeds_save \"\$feeds_payload\"
rm -f /tmp/i-love-luci-package-feeds.json
echo '---ILOVELUCI-RELEASE---'
cat /etc/openwrt_release 2>/dev/null || true
rm -f /tmp/i-love-luci-native-audit.sh
REMOTE
sh /tmp/i-love-luci-native-audit.sh"
expect {
	-re "assword:" { send "$pass\r"; exp_continue }
	eof
}
EOF

python3 - "${TMP_OUTPUT}" <<'PY'
import json
import sys

raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()

expected_pages = {
	"status-routes": {"commands": ["IPv4 routes", "IPv6 routes", "IPv4 rules", "IPv6 rules"]},
	"firewall-status": {"commands": ["nftables ruleset"]},
	"logs": {"commands": ["System log", "Kernel log"]},
	"processes": {"commands": ["Processes"]},
	"connections": {"commands": ["Active sockets"]},
	"wireless": {"commands": ["Wireless devices", "Wireless status"]},
	"diagnostics": {"commands": ["Routing table", "DNS servers"]},
	"attendedsysupgrade": {"commands": ["Current firmware", "Upgrade helper"]},
	"packages": {"lines": True, "packageFeeds": True, "commands": ["Available upgrades"]},
	"startup": {"services": True, "text": True},
	"crontab": {"text": True},
	"sshkeys": {"text": True},
	"password": {},
	"repokeys": {"commands": ["Repository public keys"]},
	"leds": {"commands": ["LED sysfs state"], "sections": True, "required_options": ["name", "sysfs", "trigger"]},
	"flash": {"commands": ["Mounted filesystems", "Flash partitions"], "objects": ["flashBackup"]},
	"services": {"services": True},
	"reboot": {"commands": ["System uptime"]},
}

expected_core_pages = {
	"network": {"sections": "network", "arrays": ["networkRoutes", "networkRules"], "required_types": ["interface", "device"]},
	"dhcp": {"sections": "dhcp", "arrays": ["dhcpLeases", "dhcpHosts", "dhcpDomains", "dhcpPools", "dhcpRelays"], "objects": ["dhcpStatus"]},
	"firewall": {"sections": "firewall", "arrays": ["firewallFiles"], "required_options": ["input", "output", "forward"], "required_types": ["defaults", "zone", "forwarding", "rule"]},
	"system": {"sections": "system", "required_types": ["system", "timeserver", "led", "dropbear", "uhttpd", "cert"], "required_names": ["main", "apply", "themes"]},
}

expected_services = {
	"adblock-fast": {"sections": True, "files": True},
	"banip": {
		"sections": True,
		"files": True,
		"file_titles": ["Allowlist", "Blocklist", "Custom feeds"],
		"logs": ["activity"],
	},
	"upnpd": {"sections": True, "arrays": ["upnpActiveRules"], "required_options": ["upnp_lease_file", "uuid"]},
	"commands": {"customCommands": True},
	"uhttpd": {"sections": True, "required_options": ["redirect_https", "lua_prefix"]},
	"dropbear": {"sections": True, "required_options": ["Port", "PasswordAuth", "RootPasswordAuth"]},
}

def json_after_marker(marker):
	idx = raw.rfind(marker)
	if idx < 0:
		return None

	start = raw.find("{", idx)
	if start < 0:
		return None

	depth = 0
	in_string = False
	escaped = False

	for end in range(start, len(raw)):
		ch = raw[end]
		if in_string:
			if escaped:
				escaped = False
			elif ch == "\\":
				escaped = True
			elif ch == '"':
				in_string = False
		else:
			if ch == '"':
				in_string = True
			elif ch == "{":
				depth += 1
			elif ch == "}":
				depth -= 1
				if depth == 0:
					try:
						return json.loads(raw[start : end + 1])
					except json.JSONDecodeError:
						return None

	return None

failures = []
warnings = []

menu = json_after_marker("---ILOVELUCI-MENU---")
if not menu or not menu.get("data", {}).get("items"):
	failures.append("menu_tree did not return visible menu data")

for page, rules in expected_core_pages.items():
	payload = json_after_marker(f"---ILOVELUCI-CORE-PAGE:{page}---")
	if not payload or not payload.get("ok"):
		failures.append(f"{page}: core_settings did not return ok")
		continue

	data = payload.get("data") or {}
	if data.get("page") != page:
		failures.append(f"{page}: core_settings returned page={data.get('page')!r}")

	sections_key = rules.get("sections")
	if sections_key and not isinstance(data.get(sections_key), list):
		failures.append(f"{page}: core_settings missing {sections_key} section list")
	elif sections_key and not data.get(sections_key):
		failures.append(f"{page}: core_settings returned empty {sections_key} section list")

	required_options = set(rules.get("required_options", []))
	if sections_key and required_options:
		options = set()
		for section in data.get(sections_key) or []:
			options.update((section.get("values") or {}).keys())
		for option in required_options:
			if option not in options:
				failures.append(f"{page}: core_settings expected UCI option {option!r}")

	required_types = set(rules.get("required_types", []))
	if sections_key and required_types:
		types = {section.get("type") for section in data.get(sections_key) or []}
		for section_type in required_types:
			if section_type not in types:
				failures.append(f"{page}: core_settings expected UCI section type {section_type!r}")

	required_names = set(rules.get("required_names", []))
	if sections_key and required_names:
		names = {section.get("name") for section in data.get(sections_key) or []}
		for section_name in required_names:
			if section_name not in names:
				failures.append(f"{page}: core_settings expected UCI section name {section_name!r}")

	for key in rules.get("arrays", []):
		if not isinstance(data.get(key), list):
			failures.append(f"{page}: core_settings missing {key} array")

	if page == "firewall":
		files = data.get("firewallFiles") or []
		if not any(file.get("path", "").startswith("/etc/nftables.d/") and file.get("editable") for file in files):
			failures.append("firewall: expected editable /etc/nftables.d firewall include file")

	for key in rules.get("objects", []):
		if not isinstance(data.get(key), dict):
			failures.append(f"{page}: core_settings missing {key} object")

for page, rules in expected_pages.items():
	payload = json_after_marker(f"---ILOVELUCI-NATIVE-PAGE:{page}---")
	if not payload or not payload.get("ok"):
		failures.append(f"{page}: native_page did not return ok")
		continue

	data = payload.get("data") or {}
	if data.get("page") != page:
		failures.append(f"{page}: returned page={data.get('page')!r}")

	command_titles = {command.get("title") for command in data.get("commands") or []}
	for title in rules.get("commands", []):
		if title not in command_titles:
			failures.append(f"{page}: missing command data {title!r}")

	if rules.get("services") and not data.get("services"):
		failures.append(f"{page}: expected services data")

	if rules.get("sections") and not data.get("sections"):
		failures.append(f"{page}: expected UCI sections")

	required_options = set(rules.get("required_options", []))
	if required_options:
		options = set()
		for section in data.get("sections") or []:
			options.update((section.get("values") or {}).keys())
		for option in required_options:
			if option not in options:
				failures.append(f"{page}: expected UCI option {option!r}")

	if rules.get("lines") and not data.get("lines"):
		failures.append(f"{page}: expected package line data")

	if rules.get("packageFeeds") and not data.get("packageFeeds"):
		failures.append(f"{page}: expected package feed data")

	if rules.get("text") and "text" not in data:
		failures.append(f"{page}: expected text field")

	for key in rules.get("objects", []):
		if not isinstance(data.get(key), dict):
			failures.append(f"{page}: expected {key} object")

	if page == "flash":
		backup = data.get("flashBackup") or {}
		for key in ("available", "hasRootfsData", "storageSize"):
			if key not in backup:
				failures.append(f"flash: flashBackup missing {key}")
		if not isinstance(backup.get("list"), list):
			failures.append("flash: flashBackup missing backup file list")
		if not isinstance(backup.get("config"), str):
			failures.append("flash: flashBackup missing sysupgrade config text")
		if not isinstance(backup.get("mtdBlocks"), list):
			failures.append("flash: flashBackup missing mtdBlocks list")

for service, rules in expected_services.items():
	payload = json_after_marker(f"---ILOVELUCI-SERVICE:{service}---")
	if not payload or not payload.get("ok"):
		failures.append(f"{service}: service_detail did not return ok")
		continue

	data = payload.get("data") or {}
	if data.get("id") != service:
		failures.append(f"{service}: returned id={data.get('id')!r}")

	if rules.get("sections") and not data.get("sections"):
		failures.append(f"{service}: expected UCI sections")

	required_options = set(rules.get("required_options", []))
	if required_options:
		options = set()
		for section in data.get("sections") or []:
			options.update((section.get("values") or {}).keys())
		for option in required_options:
			if option not in options:
				failures.append(f"{service}: expected UCI option {option!r}")

	if rules.get("files") and not data.get("files"):
		failures.append(f"{service}: expected service file summaries")

	for key in rules.get("arrays", []):
		if not isinstance(data.get(key), list):
			failures.append(f"{service}: expected {key} array")

	file_titles = {file.get("title") for file in data.get("files") or []}
	for title in rules.get("file_titles", []):
		if title not in file_titles:
			failures.append(f"{service}: expected focused file summary {title!r}")

	log_names = set((data.get("logs") or {}).keys())
	for name in rules.get("logs", []):
		if name not in log_names:
			failures.append(f"{service}: expected service log {name!r}")

	if rules.get("customCommands") and "customCommands" not in data:
		failures.append(f"{service}: expected customCommands field")

	init = data.get("init")
	if service != "commands" and (not init or "enabled" not in init or "running" not in init):
		failures.append(f"{service}: missing init enabled/running state")

console = json_after_marker("---ILOVELUCI-CONSOLE---")
if not console or not console.get("ok"):
	warnings.append("console_status did not return ok")
else:
	console_data = console.get("data") or {}
	if not console_data.get("available"):
		warnings.append("console_status reports ttyd unavailable")
	if console_data.get("enabled") and not console_data.get("url"):
		failures.append("console_status enabled but missing URL")
	if console_data.get("enabled") and not console_data.get("username"):
		failures.append("console_status enabled but missing helper username")
	if console_data.get("enabled") and not console_data.get("password"):
		failures.append("console_status enabled but missing helper password")
	if console_data.get("enabled") and console_data.get("path") != "/":
		failures.append("console_status enabled but did not expose the ttyd root path")

changes = json_after_marker("---ILOVELUCI-CHANGES---")
if not changes or not changes.get("ok"):
	failures.append("changes_list did not return ok")
elif not isinstance(changes.get("data", {}).get("changes"), list):
	failures.append("changes_list did not return a changes array")

reboot_reject = json_after_marker("---ILOVELUCI-REBOOT-REJECT---")
if not reboot_reject or not reboot_reject.get("ok"):
	failures.append("reboot_confirm reject check did not return ok")
elif reboot_reject.get("data", {}).get("accepted") is not False:
	failures.append("reboot_confirm accepted invalid confirmation")

backup_dry_run = json_after_marker("---ILOVELUCI-CONFIG-BACKUP-DRY-RUN---")
if not backup_dry_run or not backup_dry_run.get("ok"):
	failures.append("config_backup_create dry-run check did not return ok")
elif backup_dry_run.get("data", {}).get("ok") is not True:
	failures.append("config_backup_create dry-run did not report helper availability")
elif backup_dry_run.get("data", {}).get("data"):
	failures.append("config_backup_create dry-run returned backup data")

firewall_include_reject = json_after_marker("---ILOVELUCI-FIREWALL-INCLUDE-NOOP---")
if not firewall_include_reject or not firewall_include_reject.get("ok"):
	failures.append("firewall_includes_save empty no-op check did not return ok")
elif firewall_include_reject.get("data", {}).get("saved") is not True:
	failures.append("firewall_includes_save empty no-op did not save cleanly")
elif firewall_include_reject.get("data", {}).get("changed") is not False:
	failures.append("firewall_includes_save empty no-op reported changes")

package_search = json_after_marker("---ILOVELUCI-PACKAGE-SEARCH---")
if not package_search or not package_search.get("ok"):
	failures.append("package_search did not return ok")
else:
	package_data = package_search.get("data") or {}
	if not isinstance(package_data.get("lines"), list):
		failures.append("package_search did not return package lines")
	elif not package_data.get("lines"):
		warnings.append("package_search returned no luci-app results")

package_feed_save = json_after_marker("---ILOVELUCI-PACKAGE-FEEDS-NOOP---")
if not package_feed_save or not package_feed_save.get("ok"):
	failures.append("package_feeds_save no-op did not return ok")
else:
	feed_data = package_feed_save.get("data") or {}
	if feed_data.get("saved") is not True:
		failures.append("package_feeds_save no-op did not save cleanly")
	if feed_data.get("changed") is not False:
		failures.append("package_feeds_save no-op reported changes")
	if not feed_data.get("feeds"):
		failures.append("package_feeds_save no-op did not return feed rows")

print("I Love LuCI native page audit")
print(f"core_pages={len(expected_core_pages)} native_pages={len(expected_pages)} service_adapters={len(expected_services)}")

if warnings:
	print("\nWarnings:")
	for warning in warnings:
		print(f"- {warning}")

if failures:
	print("\nFailures:")
	for failure in failures:
		print(f"- {failure}")
	sys.exit(1)

print("\nPASS: native page audit checks passed")
PY
