#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/router-common.sh
. "${ROOT_DIR}/scripts/lib/router-common.sh"

if [ "$#" -ne 2 ]; then
	echo "Usage: scripts/router-copy.sh <local-file> <remote-path>" >&2
	exit 2
fi

router_expect_scp "$1" "$2"

