#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing_required=0
missing_optional=0

have_tool() {
	command -v "$1" >/dev/null 2>&1
}

ok() {
	printf 'ok      %s\n' "$1"
}

warn() {
	printf 'warn    %s\n' "$1"
	missing_optional=$((missing_optional + 1))
}

fail() {
	printf 'missing %s\n' "$1"
	missing_required=$((missing_required + 1))
}

required_tools=(
	node
	npm
	python3
	expect
	jq
	make
	curl
	gh
)

optional_tools=(
	ucode
	usign
	shellcheck
	jsonfilter
	docker
	podman
)

printf 'I Love LuCI development tool check\n\n'

for tool in "${required_tools[@]}"; do
	if have_tool "${tool}"; then
		ok "${tool}: $(command -v "${tool}")"
	else
		fail "${tool}"
	fi
done

for tool in "${optional_tools[@]}"; do
	if have_tool "${tool}"; then
		ok "${tool}: $(command -v "${tool}")"
	else
		warn "${tool}"
	fi
done

printf '\nOpenWrt SDKs\n'
if find "${ROOT_DIR}/build" -maxdepth 3 -type d -name 'openwrt-sdk-*' 2>/dev/null | grep -q .; then
	find "${ROOT_DIR}/build" -maxdepth 3 -type d -name 'openwrt-sdk-*' 2>/dev/null | sort | sed 's#^#ok      #'
else
	warn "no local SDKs under build/"
fi

printf '\nRouter environment\n'
if [ -f "${ROOT_DIR}/.env" ]; then
	ok ".env present"
else
	warn ".env missing; router deploy/audit scripts need OPENWRT_HOST and OPENWRT_PASSWORD"
fi

printf '\nSummary\n'
printf 'required_missing=%s optional_missing=%s\n' "${missing_required}" "${missing_optional}"

if [ "${missing_required}" -ne 0 ]; then
	exit 1
fi
