#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/router-common.sh
. "${ROOT_DIR}/scripts/lib/router-common.sh"

usage() {
	echo "Usage: scripts/router-install-package.sh <package.apk|package.ipk> [package.apk|package.ipk ...]" >&2
}

if [ "$#" -lt 1 ]; then
	usage
	exit 2
fi

package_manager=""
remote_packages=""

for package_path in "$@"; do
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
		*.apk) next_manager="apk" ;;
		*.ipk) next_manager="opkg" ;;
		*)
			echo "Package must be an .apk or .ipk file: ${package_name}" >&2
			exit 2
			;;
	esac

	if [ -n "${package_manager}" ] && [ "${package_manager}" != "${next_manager}" ]; then
		echo "All packages in one install must use the same format" >&2
		exit 2
	fi

	package_manager="${next_manager}"
	remote_package="/tmp/${package_name}"
	remote_packages="${remote_packages} ${remote_package}"
	router_expect_scp "${package_path}" "${remote_package}"
done

install_script="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-install.XXXXXX")"
trap 'rm -f "${install_script}"' EXIT

cat > "${install_script}" <<REMOTE
set -e
PACKAGES="${remote_packages# }"

case "${package_manager}" in
	apk)
		command -v apk >/dev/null 2>&1 || { echo "apk is not available on router" >&2; exit 2; }
		apk add --allow-untrusted --force-overwrite \${PACKAGES}
		;;
	opkg)
		command -v opkg >/dev/null 2>&1 || { echo "opkg is not available on router" >&2; exit 2; }
		opkg install \${PACKAGES}
		;;
esac

rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/i-love-luci-console enable >/dev/null 2>&1 || true
/etc/init.d/i-love-luci-console restart >/dev/null 2>&1 || true
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
ubus wait_for luci.iloveluci
ubus call luci.iloveluci session_info
rm -f \${PACKAGES}
REMOTE

"${ROOT_DIR}/scripts/router-run.sh" "${install_script}"
