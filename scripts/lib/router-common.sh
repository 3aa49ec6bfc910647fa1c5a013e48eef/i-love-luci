#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
	set -a
	# shellcheck disable=SC1091
	. "${ROOT_DIR}/.env"
	set +a
fi

: "${OPENWRT_HOST:?OPENWRT_HOST is required}"
: "${OPENWRT_USER:=root}"
: "${OPENWRT_PASSWORD:?OPENWRT_PASSWORD is required}"

if ! command -v expect >/dev/null 2>&1; then
	echo "expect is required for password-based router access" >&2
	exit 2
fi

export OPENWRT_HOST OPENWRT_USER OPENWRT_PASSWORD

router_expect_scp() {
	local source_path="$1"
	local target_path="$2"

	if [ ! -e "${source_path}" ]; then
		echo "Local file not found: ${source_path}" >&2
		return 2
	fi

	OPENWRT_SOURCE="${source_path}" OPENWRT_TARGET_PATH="${target_path}" expect <<'EXPECT'
set timeout 90
set host $env(OPENWRT_HOST)
set user $env(OPENWRT_USER)
set pass $env(OPENWRT_PASSWORD)
set source_path $env(OPENWRT_SOURCE)
set target_path $env(OPENWRT_TARGET_PATH)

spawn scp -O -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $source_path $user@$host:$target_path
expect {
	-re "(?i)are you sure.*yes/no" { send -- "yes\r"; exp_continue }
	-re "(?i)password:" { send -- "$pass\r"; exp_continue }
	timeout { exit 124 }
	eof
}
catch wait result
set code [lindex $result 3]
if {$code != 0} { exit $code }
EXPECT
}

router_expect_ssh_script() {
	local remote_script="$1"

	OPENWRT_REMOTE_SCRIPT="${remote_script}" expect <<'EXPECT'
set timeout 180
set host $env(OPENWRT_HOST)
set user $env(OPENWRT_USER)
set pass $env(OPENWRT_PASSWORD)
set remote_script $env(OPENWRT_REMOTE_SCRIPT)

spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $user@$host sh $remote_script
expect {
	-re "(?i)are you sure.*yes/no" { send -- "yes\r"; exp_continue }
	-re "(?i)password:" { send -- "$pass\r"; exp_continue }
	timeout { exit 124 }
	eof
}
catch wait result
set code [lindex $result 3]
if {$code != 0} { exit $code }
EXPECT
}

