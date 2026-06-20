#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-luci-theme-i-love-luci}"
PACKAGE_DIR="${PACKAGE_DIR:-themes/${PACKAGE_NAME}}"
OPENWRT_VERSION="${OPENWRT_VERSION:-25.12.4}"
OPENWRT_TARGET="${OPENWRT_TARGET:-rockchip/armv8}"
PACKAGE_FORMAT="${PACKAGE_FORMAT:-auto}"
PACKAGE_RELEASE="${PACKAGE_RELEASE:-}"
BUILD_FRONTEND="${BUILD_FRONTEND:-auto}"
WORK_DIR="${WORK_DIR:-build/sdk-ci}"
OUT_DIR="${OUT_DIR:-dist/openwrt}"
JOBS="${JOBS:-1}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"

absolute_path() {
	case "$1" in
		/*) printf '%s\n' "$1" ;;
		*) printf '%s/%s\n' "${repo_root}" "$1" ;;
	esac
}

PACKAGE_DIR="$(absolute_path "${PACKAGE_DIR}")"
WORK_DIR="$(absolute_path "${WORK_DIR}")"
OUT_DIR="$(absolute_path "${OUT_DIR}")"

case "$(uname -s)-$(uname -m)" in
	Linux-x86_64) ;;
	*)
		echo "OpenWrt release SDKs are Linux x86_64. Run this in GitHub Actions or a Linux x86_64 environment." >&2
		exit 2
		;;
esac

if [ ! -d "${PACKAGE_DIR}" ]; then
	echo "Package directory not found: ${PACKAGE_DIR}" >&2
	exit 1
fi

if [ -f "${PACKAGE_DIR}/src/shell/package.json" ]; then
	case "${BUILD_FRONTEND}" in
		auto|1|true|yes)
			echo "Building frontend assets for ${PACKAGE_NAME}"
			(
				cd "${PACKAGE_DIR}/src/shell"
				if [ -f package-lock.json ]; then
					npm ci
				else
					npm install
				fi
				npm run build
			)
			;;
		0|false|no)
			echo "Skipping frontend build for ${PACKAGE_NAME}"
			;;
		*)
			echo "BUILD_FRONTEND must be auto, true, false, 1, or 0" >&2
			exit 1
			;;
	esac
fi

case "${PACKAGE_NAME}" in
	luci-theme-*) luci_feed_subdir="themes" ;;
	luci-app-*) luci_feed_subdir="applications" ;;
	luci-mod-*) luci_feed_subdir="modules" ;;
	luci-proto-*) luci_feed_subdir="protocols" ;;
	luci-lib-*) luci_feed_subdir="libs" ;;
	*) luci_feed_subdir="${LUCI_FEED_SUBDIR:-applications}" ;;
esac

target_slug="${OPENWRT_TARGET//\//-}"
target_dir="${OPENWRT_TARGET%/*}"
subtarget="${OPENWRT_TARGET#*/}"
base_url="https://downloads.openwrt.org/releases/${OPENWRT_VERSION}/targets/${target_dir}/${subtarget}"

mkdir -p "${WORK_DIR}" "${OUT_DIR}"

sdk_name="$(
	curl -fsSL "${base_url}/" |
		grep -Eo "openwrt-sdk-${OPENWRT_VERSION}-${target_slug}_[^\"<]+\\.tar\\.zst" |
		sort -u |
		head -n 1
)"

if [ -z "${sdk_name}" ]; then
	echo "Could not find SDK for ${OPENWRT_VERSION} ${OPENWRT_TARGET} at ${base_url}" >&2
	exit 1
fi

sdk_url="${base_url}/${sdk_name}"
sdk_archive="${WORK_DIR}/${sdk_name}"
sdk_dir="${WORK_DIR}/${sdk_name%.tar.zst}"

if [ ! -f "${sdk_archive}" ]; then
	echo "Downloading ${sdk_url}"
	curl -fL --retry 3 --retry-delay 5 -o "${sdk_archive}" "${sdk_url}"
fi

if [ ! -d "${sdk_dir}" ]; then
	echo "Extracting ${sdk_name}"
	tar -I zstd -xf "${sdk_archive}" -C "${WORK_DIR}"
fi

echo "Fetching base, package, and LuCI feeds"
(
	cd "${sdk_dir}"
	./scripts/feeds update base packages luci
)

echo "Installing ${PACKAGE_NAME} into SDK LuCI ${luci_feed_subdir} feed"
rm -rf "${sdk_dir}/feeds/luci/${luci_feed_subdir}/${PACKAGE_NAME}"
mkdir -p "${sdk_dir}/feeds/luci/${luci_feed_subdir}"
rsync -a --delete "${PACKAGE_DIR}/" "${sdk_dir}/feeds/luci/${luci_feed_subdir}/${PACKAGE_NAME}/"

if [ -n "${PACKAGE_RELEASE}" ]; then
	echo "Using package release ${PACKAGE_RELEASE}"
	sed -i "s/^PKG_RELEASE:=.*/PKG_RELEASE:=${PACKAGE_RELEASE}/" \
		"${sdk_dir}/feeds/luci/${luci_feed_subdir}/${PACKAGE_NAME}/Makefile"
fi

(
	cd "${sdk_dir}"
	./scripts/feeds update -i luci
	./scripts/feeds install "${PACKAGE_NAME}"
	make defconfig
	make "package/feeds/luci/${PACKAGE_NAME}/compile" -j"${JOBS}" V=s
)

mapfile -t package_files < <(
	find "${sdk_dir}/bin/packages" -type f \( -name "${PACKAGE_NAME}_*.ipk" -o -name "${PACKAGE_NAME}-*.apk" \) | sort
)

if [ "${#package_files[@]}" -eq 0 ]; then
	echo "No ${PACKAGE_NAME} package artifact found under ${sdk_dir}/bin/packages" >&2
	exit 1
fi

case "${PACKAGE_FORMAT}" in
	auto) ;;
	ipk)
		if ! printf '%s\n' "${package_files[@]}" | grep -q '\.ipk$'; then
			echo "Expected .ipk package for ${OPENWRT_VERSION}, got: ${package_files[*]}" >&2
			exit 1
		fi
		;;
	apk)
		if ! printf '%s\n' "${package_files[@]}" | grep -q '\.apk$'; then
			echo "Expected .apk package for ${OPENWRT_VERSION}, got: ${package_files[*]}" >&2
			exit 1
		fi
		;;
	*)
		echo "PACKAGE_FORMAT must be auto, ipk, or apk" >&2
		exit 1
		;;
esac

package_feed_dir="$(dirname "${package_files[0]}")"
arch_packages="$(basename "$(dirname "${package_feed_dir}")")"
output_dir="${OUT_DIR}/${OPENWRT_VERSION}/${target_slug}"

rm -rf "${output_dir}"
mkdir -p "${output_dir}"
cp -a "${package_files[@]}" "${output_dir}/"

cat > "${output_dir}/build-metadata.txt" <<EOF
package=${PACKAGE_NAME}
openwrt_version=${OPENWRT_VERSION}
openwrt_target=${OPENWRT_TARGET}
arch_packages=${arch_packages}
sdk_url=${sdk_url}
package_format=${PACKAGE_FORMAT}
package_release=${PACKAGE_RELEASE:-default}
source_commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
EOF

if printf '%s\n' "${package_files[@]}" | grep -q '\.ipk$'; then
	(
		cd "${output_dir}"
		MKHASH="${sdk_dir}/staging_dir/host/bin/mkhash" \
			"${sdk_dir}/scripts/ipkg-make-index.sh" . > Packages
		gzip -9nc Packages > Packages.gz
	)
	test -f "${output_dir}/Packages" || { echo "Missing opkg Packages index" >&2; exit 1; }
	test -f "${output_dir}/Packages.gz" || { echo "Missing opkg Packages.gz index" >&2; exit 1; }
fi

if printf '%s\n' "${package_files[@]}" | grep -q '\.apk$'; then
	(
		cd "${output_dir}"
		"${sdk_dir}/staging_dir/host/bin/apk" mkndx \
			--root "${sdk_dir}" \
			--keys-dir "${sdk_dir}" \
			--allow-untrusted \
			--output packages.adb \
			*.apk
		"${sdk_dir}/staging_dir/host/bin/apk" adbdump --format json packages.adb |
			"${sdk_dir}/scripts/make-index-json.py" -f apk -a "${arch_packages}" - > index.json
	)
	test -f "${output_dir}/packages.adb" || { echo "Missing apk packages.adb index" >&2; exit 1; }
fi

echo "Built feed output:"
find "${output_dir}" -maxdepth 1 -type f -print | sort
