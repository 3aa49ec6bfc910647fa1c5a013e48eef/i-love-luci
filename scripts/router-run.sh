#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/router-common.sh
. "${ROOT_DIR}/scripts/lib/router-common.sh"

usage() {
	echo "Usage: scripts/router-run.sh <script-file|->" >&2
	echo "Example: printf 'uci changes\\n' | scripts/router-run.sh -" >&2
}

if [ "$#" -ne 1 ]; then
	usage
	exit 2
fi

local_script=""
cleanup() {
	if [ -n "${local_script}" ] && [ -f "${local_script}" ]; then
		rm -f "${local_script}"
	fi
}
trap cleanup EXIT

case "$1" in
	-)
		local_script="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-router-run.XXXXXX")"
		cat > "${local_script}"
		;;
	*)
		local_script="$1"
		if [ ! -f "${local_script}" ]; then
			echo "Script file not found: ${local_script}" >&2
			exit 2
		fi
		;;
esac

remote_script="/tmp/i-love-luci-router-run-$$.sh"
router_expect_scp "${local_script}" "${remote_script}"
router_expect_ssh_script "${remote_script}"

