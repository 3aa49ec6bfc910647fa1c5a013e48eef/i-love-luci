#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/applications/luci-app-i-love-luci/frontend/shell"
GENERATED_ASSET_PATH="applications/luci-app-i-love-luci/htdocs/luci-static/i-love-luci-app"

: "${RUN_FRONTEND:=1}"
: "${RUN_ROUTER:=1}"
: "${RUN_MUTATION:=1}"
: "${CHECK_GENERATED_ASSETS:=1}"

step() {
	printf '\n==> %s\n' "$*"
}

run() {
	step "$*"
	"$@"
}

if [ "${RUN_FRONTEND}" = "1" ]; then
	run npm --prefix "${FRONTEND_DIR}" test
	run npm --prefix "${FRONTEND_DIR}" run typecheck
	run npm --prefix "${FRONTEND_DIR}" run lint
	run npm --prefix "${FRONTEND_DIR}" run build

	if [ "${CHECK_GENERATED_ASSETS}" = "1" ]; then
		run git -C "${ROOT_DIR}" diff --exit-code -- "${GENERATED_ASSET_PATH}"
	fi
fi

run bash -n \
	"${ROOT_DIR}/scripts/audit-compat-contract.sh" \
	"${ROOT_DIR}/scripts/audit-router-future-luci-app.sh" \
	"${ROOT_DIR}/scripts/audit-router-compat-gap-doc.sh" \
	"${ROOT_DIR}/scripts/audit-router-native-pages.sh" \
	"${ROOT_DIR}/scripts/audit-router-package-manager-mutation.sh" \
	"${ROOT_DIR}/scripts/audit-router-route-inventory-doc.sh" \
	"${ROOT_DIR}/scripts/audit-router-route-mode-guards.sh" \
	"${ROOT_DIR}/scripts/audit-router-routes.sh" \
	"${ROOT_DIR}/scripts/smoke-router-http-routes.sh"

run "${ROOT_DIR}/scripts/audit-compat-contract.sh"

if [ "${RUN_ROUTER}" = "1" ]; then
	run "${ROOT_DIR}/scripts/audit-router-routes.sh"
	run "${ROOT_DIR}/scripts/audit-router-compat-gap-doc.sh"
	run "${ROOT_DIR}/scripts/audit-router-route-inventory-doc.sh"
	run "${ROOT_DIR}/scripts/audit-router-route-mode-guards.sh"
	run "${ROOT_DIR}/scripts/audit-router-native-pages.sh"
	run "${ROOT_DIR}/scripts/smoke-router-http-routes.sh"
	run "${ROOT_DIR}/scripts/audit-router-future-luci-app.sh"

	if [ "${RUN_MUTATION}" = "1" ]; then
		run "${ROOT_DIR}/scripts/audit-router-package-manager-mutation.sh"
	fi
fi

printf '\nPASS: release readiness checks passed\n'
