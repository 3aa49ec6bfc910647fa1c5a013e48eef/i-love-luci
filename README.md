# I Love LuCI

I Love LuCI is a modern OpenWrt administration app delivered as a LuCI application. It uses a React/Vite shell for the main experience, LuCI/rpcd/ubus for authenticated router access, native I Love LuCI screens where parity has been proven, and a LuCI compatibility bridge for every current or future LuCI app route that has not been rebuilt natively.

The current architecture is a wrapper, not a hard fork of LuCI. The package still depends on `luci-base`, installs LuCI menu/template files, discovers routes from live LuCI menu metadata, and keeps LuCI as the compatibility runtime. Third-party and package-specific LuCI apps such as banIP and AdBlock Fast default to LuCI compat so existing forms, JavaScript, save/apply behavior, deep links, ACL visibility, and side effects remain intact.

The router console uses the `i-love-luci-console` helper. The helper owns PTY sessions behind a root-only UNIX socket; browser input/output is tunnelled through authenticated same-origin LuCI RPC calls. The browser does not receive helper credentials and does not connect directly to a second console port.

Stable package version: `1.0.0-r4`.

## Install Without Building

Use the published package feed that matches your OpenWrt release and package architecture. The UI package is architecture-independent, but the `i-love-luci-console` helper is a compiled binary, so the feed must match the router package architecture.

Public feed root:

<https://3aa49ec6bfc910647fa1c5a013e48eef.github.io/i-love-luci/>

OpenWrt 25.12/apk:

```sh
FEED_ARCH="$(apk --print-arch)"

printf 'https://3aa49ec6bfc910647fa1c5a013e48eef.github.io/i-love-luci/openwrt/25.12.4/%s/packages.adb\n' "$FEED_ARCH" >/etc/apk/repositories.d/i-love-luci.list

apk update --allow-untrusted
apk add --allow-untrusted luci-app-i-love-luci
```

OpenWrt 24.10/opkg:

```sh
FEED_ARCH="$(opkg print-architecture | awk '$2 != "all" && $2 != "noarch" { arch=$2 } END { print arch }')"

printf 'src/gz i_love_luci https://3aa49ec6bfc910647fa1c5a013e48eef.github.io/i-love-luci/openwrt/24.10.7/%s\n' "$FEED_ARCH" >/etc/opkg/customfeeds.d/i-love-luci.conf

opkg update
opkg install luci-app-i-love-luci
```

Then open:

```text
http://router-address/cgi-bin/luci/admin/i-love-luci
```

Feed installs pull the `i-love-luci-console` helper through the `luci-app-i-love-luci` package dependency. Feed signing is not configured yet, so OpenWrt 25.12/apk requires `--allow-untrusted` for this feed.

Current CI publishes feeds for common package architectures using reference SDK targets:

| Package architecture | Reference SDK target | Example device family |
| --- | --- | --- |
| `aarch64_generic` | `rockchip/armv8` | Rockchip ARMv8 boards |
| `aarch64_cortex-a53` | `mediatek/filogic` | MediaTek Filogic routers |
| `arm_cortex-a7_neon-vfpv4` | `ipq40xx/generic` | Qualcomm IPQ40xx routers |
| `mips_24kc` | `ath79/generic` | Many older Atheros routers |
| `mipsel_24kc` | `ramips/mt7621` | MediaTek MT7621 routers |
| `x86_64` | `x86/64` | x86 routers, VMs, and mini-PCs |

Target aliases are also published for each reference SDK target, but architecture paths are preferred because they avoid choosing the wrong chipset feed.

If you do not want to add the feed, install the matching GitHub Release assets manually. Install both `i-love-luci-console` and `luci-app-i-love-luci`:

```sh
# OpenWrt 25.12/apk
apk add --allow-untrusted ./i-love-luci-console-1.0.0-r4-25.12.4-<target>-<arch>.apk
apk add --allow-untrusted ./luci-app-i-love-luci-1.0.0-r4-25.12.4-<target>-<arch>.apk

# OpenWrt 24.10/opkg
opkg install ./i-love-luci-console_1.0.0-r4_<arch>-24.10.7-<target>-<arch>.ipk
opkg install ./luci-app-i-love-luci_1.0.0-r4_all-24.10.7-<target>-<arch>.ipk
```

## Screenshots

Screenshots are captured from the current router build. Console screenshots are taken before opening a terminal session so hostnames and shell banners are not exposed.

| Dashboard | Search |
| --- | --- |
| ![I Love LuCI desktop dashboard with bandwidth, CPU, memory, and interface panels](docs/assets/app-desktop-overview.png) | ![I Love LuCI desktop route search popover with live results](docs/assets/app-desktop-search.png) |

| System | DHCP and DNS |
| --- | --- |
| ![I Love LuCI native system configuration screen](docs/assets/app-desktop-system.png) | ![I Love LuCI native DHCP and DNS configuration screen](docs/assets/app-desktop-dhcp.png) |

| Firewall | Routing |
| --- | --- |
| ![I Love LuCI native firewall configuration screen](docs/assets/app-desktop-firewall.png) | ![I Love LuCI native routing status screen with structured tables](docs/assets/app-desktop-routes.png) |

| Services | LuCI compat |
| --- | --- |
| ![I Love LuCI native services overview](docs/assets/app-desktop-services.png) | ![I Love LuCI LuCI compatibility bridge rendering banIP](docs/assets/app-desktop-compat-banip.png) |

| Route settings | Console tunnel |
| --- | --- |
| ![I Love LuCI route compatibility settings](docs/assets/app-desktop-settings.png) | ![I Love LuCI router console tunnel screen before terminal launch](docs/assets/app-desktop-console.png) |

| Logs | Processes |
| --- | --- |
| ![I Love LuCI native system logs screen](docs/assets/app-desktop-logs.png) | ![I Love LuCI native processes screen](docs/assets/app-desktop-processes.png) |

| Diagnostics | Startup |
| --- | --- |
| ![I Love LuCI native diagnostics screen](docs/assets/app-desktop-diagnostics.png) | ![I Love LuCI native startup services screen](docs/assets/app-desktop-startup.png) |

| Password | uHTTPd |
| --- | --- |
| ![I Love LuCI native router password screen](docs/assets/app-desktop-password.png) | ![I Love LuCI native uHTTPd service screen](docs/assets/app-desktop-uhttpd.png) |

| Software compat | Profile menu |
| --- | --- |
| ![I Love LuCI LuCI compatibility bridge rendering package manager](docs/assets/app-desktop-compat-software.png) | ![I Love LuCI profile menu with logout](docs/assets/app-desktop-profile.png) |

| Mobile dashboard | Mobile menu |
| --- | --- |
| ![I Love LuCI mobile dashboard with compact header](docs/assets/app-mobile-overview.png) | ![I Love LuCI mobile sidebar navigation](docs/assets/app-mobile-sidebar.png) |

| Mobile search | Mobile DHCP |
| --- | --- |
| ![I Love LuCI mobile search popover with live route results](docs/assets/app-mobile-search.png) | ![I Love LuCI mobile DHCP and DNS screen](docs/assets/app-mobile-dhcp.png) |

| Mobile firewall | Mobile console |
| --- | --- |
| ![I Love LuCI mobile firewall screen](docs/assets/app-mobile-firewall.png) | ![I Love LuCI mobile console tunnel screen](docs/assets/app-mobile-console.png) |

## Features

- React/Vite shell loaded through LuCI today.
- Native dashboard for bandwidth, CPU, memory, and interface telemetry.
- Dynamic LuCI route discovery from installed menu definitions.
- LuCI compat bridge for LuCI apps that have not yet been rebuilt as native screens.
- Header search with recent routes and live results.
- Responsive sidebar with mobile drawer and persisted desktop collapse state.
- Profile menu with logout.
- Web console tunnel backed by `i-love-luci-console`; terminal I/O stays inside the authenticated I Love LuCI session.
- Route rendering settings so individual LuCI paths can use native, LuCI compat, hidden, or automatic rendering.
- Local shadcn-style component library, Tailwind CSS v4, Chart.js charts, and Sonner toasts.

## Route Model

User-facing routes have three outcomes:

- `Native`: the React/Vite screen has enough parity evidence to be the default.
- `LuCI compat`: the original LuCI route opens inside the I Love LuCI shell, preserving the LuCI app's JavaScript, forms, save/apply behavior, deep links, and package-specific side effects.
- `Hidden`: the route is intentionally omitted from I Love LuCI navigation/search.

Unknown or newly installed `luci-app-*` routes are discovered from LuCI menu metadata and default to LuCI compat unless a native adapter explicitly supports the full workflow. Current release audits on the test router report 57 visible routes: 42 native routes, 15 LuCI compat routes, and 0 unsupported routes. Remaining compat routes are network interfaces, firmware flash, attended sysupgrade overview, package manager, banIP, and AdBlock Fast workflows where LuCI still owns behavior that is risky, destructive, long-running, or package-specific.

## Sysupgrade Compatibility

`sysupgrade` does not guarantee that manually installed package files survive an OpenWrt release upgrade. Configuration can be preserved when users keep settings, but static package files under `/www`, LuCI templates, menu files, and `rpcd` scripts must be present in the upgraded firmware image or reinstalled from the package feed after the upgrade.

The package installs `/lib/upgrade/keep.d/luci-app-i-love-luci` so `/etc/config/i-love-luci` is included in OpenWrt configuration backups. This protects settings, not package binaries.

Recommended upgrade paths:

- Build `luci-app-i-love-luci` into the firmware image.
- Use Attended Sysupgrade or `owut` so installed packages are carried into the generated image where supported.
- Keep the I Love LuCI package feed configured, then reinstall `luci-app-i-love-luci` after a manual `sysupgrade`.

Future-proof target:

- Split a standalone `i-love-luci` package from the LuCI-specific compatibility layer.
- Serve the React app directly through `uhttpd` instead of LuCI dispatcher/templates.
- Keep `rpcd`/`ubus` as the backend bridge, with first-party auth/session handling.
- Make LuCI optional: if installed, expose LuCI routes through a compatibility adapter; if not installed, keep native I Love LuCI screens working.
- Keep release-specific feeds for 24.10/opkg and 25.12+/apk until the package manager transition has settled.

Relevant OpenWrt docs:

- [Sysupgrade using LuCI and CLI](https://openwrt.org/docs/guide-user/installation/generic.sysupgrade)
- [OpenWrt Upgrade Tool (`owut`)](https://openwrt.org/docs/guide-user/installation/sysupgrade.owut)
- [Attended Sysupgrade](https://openwrt.org/docs/guide-user/installation/attended.sysupgrade)
- [Creating OpenWrt packages](https://openwrt.org/docs/guide-developer/packages)
- [Using the OpenWrt SDK](https://openwrt.org/docs/guide-developer/toolchain/using_the_sdk)

## Project Layout

```text
applications/luci-app-i-love-luci/
  Makefile
  htdocs/luci-static/i-love-luci-app/
  root/etc/config/i-love-luci
  root/etc/uci-defaults/90_luci-app-i-love-luci
  root/usr/share/luci/menu.d/luci-app-i-love-luci.json
  root/usr/share/rpcd/acl.d/luci-app-i-love-luci.json
  root/usr/share/rpcd/ucode/i-love-luci.uc
  frontend/shell/
  ucode/template/i-love-luci/app.ut
```

## Build Frontend

Check the local development toolchain before building or deploying:

```sh
scripts/check-dev-tools.sh
```

Required local tools are Node.js, npm, `python3`, `expect`, `jq`, `make`, `curl`, and `gh`.
Optional tools improve the loop: `ucode` for local bridge syntax checks, `usign` for local feed signing checks, `shellcheck` for script linting, and `jsonfilter` for matching OpenWrt JSON command behavior. The OpenWrt SDKs are Linux x86_64, so full package builds should run in GitHub Actions or an amd64 Linux/Docker environment when working from macOS.

```sh
cd applications/luci-app-i-love-luci/frontend/shell
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

The production build writes static assets to:

```text
applications/luci-app-i-love-luci/htdocs/luci-static/i-love-luci-app/
```

Node.js is only used at build time. No Node.js runtime is required on the router.

## Build OpenWrt Package

The package build script uses official Linux x86_64 OpenWrt SDKs. Run it in GitHub Actions or an amd64 Linux environment.

OpenWrt 25.12/apk:

```sh
OPENWRT_VERSION=25.12.4 \
OPENWRT_TARGET=rockchip/armv8 \
PACKAGE_FORMAT=apk \
scripts/build-openwrt-package.sh
```

OpenWrt 24.10/opkg:

```sh
OPENWRT_VERSION=24.10.7 \
OPENWRT_TARGET=rockchip/armv8 \
PACKAGE_FORMAT=ipk \
scripts/build-openwrt-package.sh
```

Output goes to:

```text
dist/openwrt/<version>/<target-slug>/
```

## CI Publishing

`.github/workflows/build.yml` builds package feeds for:

- OpenWrt `24.10.7` as opkg `.ipk`
- OpenWrt `25.12.4` as apk `.apk`
- reference SDK targets covering common package architectures: `rockchip/armv8`, `mediatek/filogic`, `ipq40xx/generic`, `ath79/generic`, `ramips/mt7621`, and `x86/64`

Rules:

- Pull requests build artifacts only.
- `main` builds stable artifacts, publishes the GitHub Pages package feeds, and updates the `v1.0.0-r4` GitHub Release assets.
- Pull requests into `main` must come from `dev` or `uat`.
- Node.js 22 LTS is used for the frontend build.

Stable package version is `1.0.0-r4`. Development and UAT work is validated through pull request builds; only `main` publishes package feed and GitHub Release updates.

The release job uploads:

- unsigned package-feed directories as `.tar.gz` archives for each supported OpenWrt release/package architecture
- direct `.apk` assets for OpenWrt 25.12/apk with target and architecture suffixes
- direct `.ipk` assets for OpenWrt 24.10/opkg with target and architecture suffixes
- both required packages: `i-love-luci-console` and `luci-app-i-love-luci`

## OpenWrt Source Integration

To build inside an OpenWrt source tree, copy or overlay both packages into the LuCI feed:

```sh
mkdir -p feeds/luci/applications/luci-app-i-love-luci
mkdir -p feeds/luci/utils/i-love-luci-console
rsync -a applications/luci-app-i-love-luci/ feeds/luci/applications/luci-app-i-love-luci/
rsync -a utils/i-love-luci-console/ feeds/luci/utils/i-love-luci-console/
./scripts/feeds update luci
./scripts/feeds install i-love-luci-console
./scripts/feeds install luci-app-i-love-luci
make menuconfig
make package/feeds/luci/i-love-luci-console/compile V=s
make package/feeds/luci/luci-app-i-love-luci/compile V=s
```

Enable `LuCI -> Applications -> luci-app-i-love-luci` in `menuconfig` if building firmware images.

## Router Test Deploy

Local router credentials belong in `.env`, which is ignored by Git.

For day-to-day development, use the reusable router scripts instead of hand-written SSH/SCP commands. The scripts read:

- `OPENWRT_HOST`
- `OPENWRT_USER` defaults to `root`
- `OPENWRT_PASSWORD`

Live asset deploy, useful while iterating on the frontend or rpcd bridge:

```sh
scripts/deploy-router-assets.sh
scripts/router-run.sh - <<'EOF'
ubus call luci.iloveluci session_info
uci changes
EOF
```

`scripts/deploy-router-assets.sh --no-build` redeploys the current generated assets, rpcd bridge, and login templates without rebuilding.

Full package install, useful when validating release artifacts:

```sh
scripts/router-install-package.sh \
  dist/openwrt/25.12.4/rockchip-armv8/i-love-luci-console-*.apk \
  dist/openwrt/25.12.4/rockchip-armv8/luci-app-i-love-luci-*.apk
```

Targeted command and file copy helpers:

```sh
scripts/router-run.sh ./local-router-check.sh
scripts/router-copy.sh ./local-file /tmp/local-file
```

After install, run the full readiness audit:

```sh
scripts/audit-release-readiness.sh
```

The readiness audit runs frontend tests/typecheck/lint/build, committed generated-asset validation, shell syntax checks, the compat contract audit, live route inventory validation, compat gap documentation validation, route audit, route-mode guards, native page audit, HTTP route smoke, future LuCI app install/remove audit, and package-manager mutation audit. It verifies that route terminology stays on the supported/compat/unsupported contract, route mode/status chips stay out of navigation and search UI, routing/firewall status pages cannot regress to raw command dumps, visible LuCI routes resolve to either native I Love LuCI screens or the LuCI compatibility bridge, the Vite build output committed under `applications/luci-app-i-love-luci/htdocs/luci-static/i-love-luci-app` matches the current frontend source, the route inventory and compat gap register match live router metadata, compat routes reject native-mode overrides, iframe source URLs load with `iloveluci_frame=1`, incomplete LuCI app routes default to compat mode, installed `luci-app-*` routes remain discoverable for current and future app installs, and native async package install/remove restores package state without adding pending UCI changes. The future-app and package-manager mutation audits temporarily install and remove `luci-app-example`, then check that new routes appear through compat and cleanup restores package state. They refuse to start if the router already has pending `uci changes`, because package installs can disturb pending UCI state on a live router.

Targeted audits remain available when iterating on a smaller area:

```sh
scripts/audit-compat-contract.sh
scripts/audit-router-routes.sh
scripts/audit-router-route-inventory-doc.sh
scripts/audit-router-route-mode-guards.sh
scripts/audit-router-future-luci-app.sh
scripts/audit-router-package-manager-mutation.sh
scripts/audit-router-native-pages.sh
scripts/smoke-router-http-routes.sh
```

## Secondary uhttpd Testing

For safer router testing, run a secondary `uhttpd` instance on port `8081` so the main LuCI admin session remains available.

```sh
uci -q delete uhttpd.iloveluci_test
uci set uhttpd.iloveluci_test='uhttpd'
uci add_list uhttpd.iloveluci_test.listen_http='0.0.0.0:8081'
uci add_list uhttpd.iloveluci_test.listen_http='[::]:8081'
uci set uhttpd.iloveluci_test.home='/www'
uci set uhttpd.iloveluci_test.ucode_prefix='/cgi-bin/luci=/usr/share/ucode/luci/uhttpd.uc'
uci set uhttpd.iloveluci_test.rfc1918_filter='1'
uci commit uhttpd
/etc/init.d/uhttpd restart
```

Test URL:

```text
http://router-address:8081/cgi-bin/luci/admin/i-love-luci
```

Cleanup:

```sh
uci -q delete uhttpd.iloveluci_test
uci commit uhttpd
/etc/init.d/uhttpd restart
```

## Rollback

OpenWrt 25.12/apk:

```sh
apk del luci-app-i-love-luci i-love-luci-console
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd reload
/etc/init.d/uhttpd restart
```

OpenWrt 24.10/opkg:

```sh
opkg remove luci-app-i-love-luci i-love-luci-console
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd reload
/etc/init.d/uhttpd restart
```

## References

- LuCI JavaScript API: <https://openwrt.github.io/luci/jsapi/index.html>
- LuCI example app: <https://github.com/openwrt/luci/tree/master/applications/luci-app-example>
- OpenWrt SDK guide: <https://openwrt.org/docs/guide-developer/toolchain/using_the_sdk>
- Vite: <https://vite.dev/guide/>
- React Router: <https://reactrouter.com/>
- Tailwind CSS v4 with Vite: <https://tailwindcss.com/docs/installation/using-vite>
- shadcn/ui Vite install: <https://ui.shadcn.com/docs/installation/vite>
- shadcn/ui Tailwind v4: <https://ui.shadcn.com/docs/tailwind-v4>
- Sonner: <https://sonner.emilkowal.ski/>
- ttyd: <https://github.com/tsl0922/ttyd>

## Security Notes

- The React app is never the source of security truth. Privileged work must go through LuCI, `rpcd`, `ubus`, or OpenWrt services.
- The web console tunnel uses `i-love-luci-console`. Terminal I/O stays behind authenticated LuCI RPC calls; direct `ttyd` is optional and should be used only as a trusted-LAN development fallback.
- Passkey and MFA support require server-side challenge and secret handling before they are production-ready.
- Do not commit router credentials, package signing keys, or screenshots containing real hostnames, MACs, leases, addresses, or secrets.
