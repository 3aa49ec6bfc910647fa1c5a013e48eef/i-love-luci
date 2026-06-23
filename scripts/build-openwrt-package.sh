#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-luci-app-i-love-luci}"
PACKAGE_DIR="${PACKAGE_DIR:-applications/${PACKAGE_NAME}}"
PACKAGE_SPECS="${PACKAGE_SPECS:-${PACKAGE_NAME}:${PACKAGE_DIR}}"
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

WORK_DIR="$(absolute_path "${WORK_DIR}")"
OUT_DIR="$(absolute_path "${OUT_DIR}")"

case "$(uname -s)-$(uname -m)" in
	Linux-x86_64) ;;
	*)
		echo "OpenWrt release SDKs are Linux x86_64. Run this in GitHub Actions or a Linux x86_64 environment." >&2
		exit 2
		;;
esac

declare -a package_names package_dirs package_subdirs

luci_subdir_for_package() {
	case "$1" in
		luci-theme-*) printf '%s\n' "themes" ;;
		luci-app-*) printf '%s\n' "applications" ;;
		luci-mod-*) printf '%s\n' "modules" ;;
		luci-proto-*) printf '%s\n' "protocols" ;;
		luci-lib-*) printf '%s\n' "libs" ;;
		*) printf '%s\n' "${LUCI_FEED_SUBDIR:-applications}" ;;
	esac
}

feed_subdir_for_package_spec() {
	local package_name="$1"
	local package_dir="$2"

	case "${package_dir}" in
		*/applications/*|applications/*) printf '%s\n' "applications" ;;
		*/themes/*|themes/*) printf '%s\n' "themes" ;;
		*/modules/*|modules/*) printf '%s\n' "modules" ;;
		*/protocols/*|protocols/*) printf '%s\n' "protocols" ;;
		*/libs/*|libs/*) printf '%s\n' "libs" ;;
		*/utils/*|utils/*) printf '%s\n' "utils" ;;
		*) luci_subdir_for_package "${package_name}" ;;
	esac
}

for package_spec in ${PACKAGE_SPECS}; do
	package_name="${package_spec%%:*}"
	package_dir="${package_spec#*:}"

	if [ "${package_name}" = "${package_spec}" ]; then
		package_dir="$(luci_subdir_for_package "${package_name}")/${package_name}"
	fi

	package_dir="$(absolute_path "${package_dir}")"

	if [ ! -d "${package_dir}" ]; then
		echo "Package directory not found: ${package_dir}" >&2
		exit 1
	fi

	package_names+=("${package_name}")
	package_dirs+=("${package_dir}")
	package_subdirs+=("$(feed_subdir_for_package_spec "${package_name}" "${package_spec#*:}")")
done

for i in "${!package_names[@]}"; do
	if [ -f "${package_dirs[$i]}/frontend/shell/package.json" ]; then
		case "${BUILD_FRONTEND}" in
			auto|1|true|yes)
				echo "Building frontend assets for ${package_names[$i]}"
				(
					cd "${package_dirs[$i]}/frontend/shell"
					if [ -f package-lock.json ]; then
						npm ci
					else
						npm install
					fi
					npm run build
					if [ -f "${package_dirs[$i]}/htdocs/luci-static/i-love-luci-app/assets/app.js" ]; then
						node --check "${package_dirs[$i]}/htdocs/luci-static/i-love-luci-app/assets/app.js"
					fi
				)
				;;
			0|false|no)
				echo "Skipping frontend build for ${package_names[$i]}"
				;;
			*)
				echo "BUILD_FRONTEND must be auto, true, false, 1, or 0" >&2
				exit 1
				;;
		esac
	fi
done

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

for i in "${!package_names[@]}"; do
	echo "Installing ${package_names[$i]} into SDK LuCI ${package_subdirs[$i]} feed"
	rm -rf "${sdk_dir}/feeds/luci/${package_subdirs[$i]}/${package_names[$i]}"
	mkdir -p "${sdk_dir}/feeds/luci/${package_subdirs[$i]}"
	rsync -a --delete "${package_dirs[$i]}/" "${sdk_dir}/feeds/luci/${package_subdirs[$i]}/${package_names[$i]}/"

	if [ -n "${PACKAGE_RELEASE}" ]; then
		echo "Using package release ${PACKAGE_RELEASE} for ${package_names[$i]}"
		sed -i "s/^PKG_RELEASE:=.*/PKG_RELEASE:=${PACKAGE_RELEASE}/" \
			"${sdk_dir}/feeds/luci/${package_subdirs[$i]}/${package_names[$i]}/Makefile"
	fi
done

(
	cd "${sdk_dir}"
	./scripts/feeds update -i luci
	for package_name in "${package_names[@]}"; do
		./scripts/feeds install "${package_name}"
	done
	make defconfig
	for package_name in "${package_names[@]}"; do
		make "package/feeds/luci/${package_name}/compile" -j"${JOBS}" V=s
	done
)

package_files=()
for package_name in "${package_names[@]}"; do
	while IFS= read -r package_file; do
		package_files+=("${package_file}")
	done < <(find "${sdk_dir}/bin/packages" -type f \( -name "${package_name}_*.ipk" -o -name "${package_name}-*.apk" \) | sort)
done

if [ "${#package_files[@]}" -eq 0 ]; then
	echo "No package artifacts found under ${sdk_dir}/bin/packages" >&2
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
packages=$(IFS=,; echo "${package_names[*]}")
openwrt_version=${OPENWRT_VERSION}
openwrt_target=${OPENWRT_TARGET}
target_slug=${target_slug}
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
