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

TMP_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-http-smoke.XXXXXX")"
trap 'rm -f "${TMP_OUTPUT}"' EXIT

if ! command -v expect >/dev/null 2>&1; then
	echo "expect is required for password-based router smoke tests" >&2
	exit 2
fi

export OPENWRT_HOST OPENWRT_USER OPENWRT_PASSWORD

expect <<'EOF' > "${TMP_OUTPUT}"
set timeout 45
set host $env(OPENWRT_HOST)
set user $env(OPENWRT_USER)
set pass $env(OPENWRT_PASSWORD)
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$host "ubus call luci.iloveluci menu_tree"
expect {
	-re "assword:" { send "$pass\r"; exp_continue }
	eof
}
EOF

python3 - "${TMP_OUTPUT}" <<'PY'
import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
host = os.environ["OPENWRT_HOST"]
user = os.environ.get("OPENWRT_USER", "root")
password = os.environ["OPENWRT_PASSWORD"]
base = f"http://{host}"
login_url = f"{base}/cgi-bin/luci/"
app_url = f"{base}/cgi-bin/luci/admin/i-love-luci"
legacy_base = "/cgi-bin/luci/admin"

def extract_json(text):
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
							return json.loads(text[idx : end + 1])
						except json.JSONDecodeError:
							break
	return None

def legacy_href(path):
	if path.startswith("/admin/"):
		return legacy_base + path[len("/admin") :]
	if path.startswith("/"):
		return legacy_base + path
	return legacy_base + "/" + path

def frame_href(path):
	parsed = urllib.parse.urlsplit(legacy_href(path))
	query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
	query.append(("iloveluci_frame", "1"))
	return urllib.parse.urlunsplit((
		parsed.scheme,
		parsed.netloc,
		parsed.path,
		urllib.parse.urlencode(query),
		parsed.fragment,
	))

def open_url(opener, url, data=None):
	request = urllib.request.Request(url, data=data, method="POST" if data is not None else "GET")
	if data is not None:
		request.add_header("content-type", "application/x-www-form-urlencoded")

	try:
		with opener.open(request, timeout=20) as response:
			body = response.read().decode("utf-8", errors="replace")
			return response.status, response.geturl(), body
	except urllib.error.HTTPError as error:
		body = error.read().decode("utf-8", errors="replace")
		return error.code, error.geturl(), body

menu_payload = extract_json(raw)
if not menu_payload or not menu_payload.get("ok"):
	print("FAIL: menu_tree JSON was not found")
	sys.exit(1)

items = menu_payload.get("data", {}).get("items") or []
visible = [
	item for item in items
	if item.get("eligible") and not item.get("hidden") and item.get("effectiveMode") != "hidden"
]

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

pre_status, _, pre_body = open_url(opener, login_url)
failures = []
warnings = []

if pre_status != 403 or 'data-iloveluci-login="true"' not in pre_body or "assets/app.js" not in pre_body:
	failures.append("login page did not render React/Vite login shell before authentication")

post_data = urllib.parse.urlencode({
	"luci_username": user,
	"luci_password": password,
}).encode()
login_status, _, _ = open_url(opener, login_url, post_data)

if login_status not in {200, 302}:
	failures.append(f"login POST returned HTTP {login_status}")

app_status, _, app_body = open_url(opener, app_url)
if app_status != 200 or "i-love-luci-root" not in app_body or "assets/app.js" not in app_body:
	failures.append("authenticated app shell did not load")
if 'data-iloveluci-login="true"' in app_body:
	failures.append("authenticated app shell rendered login mode")

native_seen = 0
legacy_seen = 0
legacy_frame_seen = 0
legacy_query_seen = 0

for item in visible:
	path = item.get("resolvedPath") or item.get("firstChildPath") or item.get("path")
	mode = item.get("effectiveMode")

	if mode == "modern":
		native_seen += 1
		status, _, body = open_url(opener, app_url)
		if status != 200 or "i-love-luci-root" not in body:
			failures.append(f"{item.get('path')}: native shell failed HTTP {status}")
		continue

	if mode == "legacy":
		legacy_seen += 1
		url = base + legacy_href(path)
		status, final_url, body = open_url(opener, url)
		if status >= 400:
			failures.append(f"{item.get('path')}: legacy route returned HTTP {status}")
			continue
		if 'data-iloveluci-login="true"' in body or "Log in | I Love LuCI" in body:
			failures.append(f"{item.get('path')}: legacy route redirected to login")
		if "404 Not Found" in body or "Unable to dispatch" in body:
			failures.append(f"{item.get('path')}: legacy route dispatch failed")
		if final_url.endswith("/logout"):
			warnings.append(f"{item.get('path')}: resolved to logout URL")

		legacy_frame_seen += 1
		frame_status, frame_final_url, frame_body = open_url(opener, base + frame_href(path))
		if frame_status >= 400:
			failures.append(f"{item.get('path')}: legacy iframe source returned HTTP {frame_status}")
			continue
		if 'data-iloveluci-login="true"' in frame_body or "Log in | I Love LuCI" in frame_body:
			failures.append(f"{item.get('path')}: legacy iframe source redirected to login")
		if "404 Not Found" in frame_body or "Unable to dispatch" in frame_body:
			failures.append(f"{item.get('path')}: legacy iframe source dispatch failed")
		if frame_final_url.endswith("/logout"):
			warnings.append(f"{item.get('path')}: legacy iframe source resolved to logout URL")

		if legacy_query_seen == 0:
			query_probe_path = path + ("&" if "?" in path else "?") + "iloveluci_query_probe=1"
			probe_href = frame_href(query_probe_path)
			probe_query = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(probe_href).query, keep_blank_values=True))
			if probe_query.get("iloveluci_query_probe") != "1" or probe_query.get("iloveluci_frame") != "1":
				failures.append(f"{item.get('path')}: legacy iframe source did not preserve existing query params")
			else:
				query_status, query_final_url, query_body = open_url(opener, base + probe_href)
				legacy_query_seen += 1
				if query_status >= 400:
					failures.append(f"{item.get('path')}: legacy iframe query source returned HTTP {query_status}")
				if 'data-iloveluci-login="true"' in query_body or "Log in | I Love LuCI" in query_body:
					failures.append(f"{item.get('path')}: legacy iframe query source redirected to login")
				if "404 Not Found" in query_body or "Unable to dispatch" in query_body:
					failures.append(f"{item.get('path')}: legacy iframe query source dispatch failed")
				if query_final_url.endswith("/logout"):
					warnings.append(f"{item.get('path')}: legacy iframe query source resolved to logout URL")

if native_seen == 0:
	failures.append("No native routes were smoked")
if legacy_seen == 0:
	failures.append("No legacy compat routes were smoked")

print("I Love LuCI HTTP route smoke")
print(
	f"visible_routes={len(visible)} native_shell_checks={native_seen} "
	f"legacy_route_checks={legacy_seen} legacy_frame_checks={legacy_frame_seen} "
	f"legacy_query_checks={legacy_query_seen}"
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

print("\nPASS: HTTP route smoke checks passed")
PY
