#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/router-common.sh
. "${ROOT_DIR}/scripts/lib/router-common.sh"

APP_DIR="${ROOT_DIR}/applications/luci-app-i-love-luci"
BUILD=1

for arg in "$@"; do
	case "${arg}" in
		--no-build) BUILD=0 ;;
		*)
			echo "Unknown option: ${arg}" >&2
			echo "Usage: scripts/deploy-router-assets.sh [--no-build]" >&2
			exit 2
			;;
	esac
done

if [ "${BUILD}" -eq 1 ]; then
	( cd "${APP_DIR}/frontend/shell" && npm run build )
fi

remote_dir="/tmp/i-love-luci-deploy-$$"

printf 'mkdir -p %s\n' "${remote_dir}" | "${ROOT_DIR}/scripts/router-run.sh" - >/dev/null

router_expect_scp "${APP_DIR}/htdocs/luci-static/i-love-luci-app/index.html" "${remote_dir}/index.html"
router_expect_scp "${APP_DIR}/htdocs/luci-static/i-love-luci-app/assets/app.css" "${remote_dir}/app.css"
router_expect_scp "${APP_DIR}/htdocs/luci-static/i-love-luci-app/assets/app.js" "${remote_dir}/app.js"
router_expect_scp "${APP_DIR}/root/usr/share/rpcd/ucode/i-love-luci.uc" "${remote_dir}/i-love-luci.uc"
router_expect_scp "${APP_DIR}/root/usr/share/rpcd/acl.d/luci-app-i-love-luci.json" "${remote_dir}/luci-app-i-love-luci.json"
router_expect_scp "${APP_DIR}/root/usr/share/ucode/luci/template/sysauth.ut" "${remote_dir}/sysauth-default.ut"
router_expect_scp "${APP_DIR}/root/usr/share/ucode/luci/template/themes/i-love-luci/sysauth.ut" "${remote_dir}/sysauth-theme.ut"

apply_script="$(mktemp "${TMPDIR:-/tmp}/i-love-luci-deploy.XXXXXX")"
trap 'rm -f "${apply_script}"' EXIT

cat > "${apply_script}" <<REMOTE
set -e
DIR="${remote_dir}"
ucode -c "\${DIR}/i-love-luci.uc"
mkdir -p /www/luci-static/i-love-luci-app/assets
mkdir -p /usr/share/rpcd/acl.d
mkdir -p /usr/share/ucode/luci/template/themes/i-love-luci
cp "\${DIR}/index.html" /www/luci-static/i-love-luci-app/index.html
cp "\${DIR}/app.css" /www/luci-static/i-love-luci-app/assets/app.css
cp "\${DIR}/app.js" /www/luci-static/i-love-luci-app/assets/app.js
cp "\${DIR}/i-love-luci.uc" /usr/share/rpcd/ucode/i-love-luci.uc
cp "\${DIR}/luci-app-i-love-luci.json" /usr/share/rpcd/acl.d/luci-app-i-love-luci.json
cp "\${DIR}/sysauth-default.ut" /usr/share/ucode/luci/template/sysauth.ut
cp "\${DIR}/sysauth-theme.ut" /usr/share/ucode/luci/template/themes/i-love-luci/sysauth.ut
chmod 0644 \\
	/www/luci-static/i-love-luci-app/index.html \\
	/www/luci-static/i-love-luci-app/assets/app.css \\
	/www/luci-static/i-love-luci-app/assets/app.js \\
	/usr/share/rpcd/ucode/i-love-luci.uc \\
	/usr/share/rpcd/acl.d/luci-app-i-love-luci.json \\
	/usr/share/ucode/luci/template/sysauth.ut \\
	/usr/share/ucode/luci/template/themes/i-love-luci/sysauth.ut
/etc/init.d/rpcd restart
ubus wait_for luci.iloveluci
ubus call luci.iloveluci session_info
rm -rf "\${DIR}"
REMOTE

"${ROOT_DIR}/scripts/router-run.sh" "${apply_script}"
