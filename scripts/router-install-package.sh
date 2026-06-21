#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/router-common.sh
. "${ROOT_DIR}/scripts/lib/router-common.sh"

usage() {
	echo "Usage: scripts/router-install-package.sh <package.apk|package.ipk>" >&2
}

if [ "$#" -ne 1 ]; then
	usage
	exit 2
fi

package_path="$1"
if [ ! -f "${package_path}" ]; then
	echo "Package file not found: ${package_path}" >&2
	exit 2
fi

package_name="$(basename "${package_path}")"
case "${package_name}" in
	*[!A-Za-z0-9._+-]*)
		echo "Package filename contains unsupported characters: ${package_name}" >&2
		exit 2
		;;
esac

case "${package_name}" in
	*.apk) package_manager="apk" ;;
	*.ipk) package_manager="opkg" ;;
	*)
		echo "Package must be an .apk or .ipk file: ${package_name}" >&2
		exit 2
		;;
esac

remote_package="/tmp/${package_name}"
router_expect_scp "${package_path}" "${remote_package}"

install_script="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-install.XXXXXX")"
trap 'rm -f "${install_script}"' EXIT

cat > "${install_script}" <<REMOTE
set -e
PACKAGE="${remote_package}"

case "${package_manager}" in
	apk)
		command -v apk >/dev/null 2>&1 || { echo "apk is not available on router" >&2; exit 2; }
		apk add --allow-untrusted --force-overwrite "\${PACKAGE}"
		;;
	opkg)
		command -v opkg >/dev/null 2>&1 || { echo "opkg is not available on router" >&2; exit 2; }
		opkg install "\${PACKAGE}"
		;;
esac

rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
ubus wait_for luci.iloveluci
ubus call luci.iloveluci session_info
rm -f "\${PACKAGE}"
REMOTE

"${ROOT_DIR}/scripts/router-run.sh" "${install_script}"
