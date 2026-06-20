# I Love LuCI Modern UI

## Goal

Build a modern `I Love LuCI` application shell that can sit beside existing LuCI, provide a better UI/UX for core workflows, and bridge back to legacy LuCI apps when a page has not been rebuilt natively.

The production target is a single package named `luci-app-i-love-luci`. It owns the app shell, static assets, rpcd bridge, settings, and legacy iframe compatibility layer.

## Working Model

Use a hybrid shell:

- Native modern shell: React, Vite, Tailwind CSS v4, shadcn/ui source components, Sonner toasts, lucide icons.
- OpenWrt integration: LuCI package layout, `rpcd`, `ubus`, UCI, LuCI ACL files, LuCI session cookies.
- Legacy compatibility: iframe bridge for unknown or unreimplemented LuCI apps.
- Progressive replacement: rebuild high-value pages as native React routes over time.

This avoids a risky full LuCI fork while allowing the new app to feel like a modern product.

## LuCI Reference Points

Upstream LuCI is a feed of many OpenWrt packages, not a single SPA:

- app packages live in `applications/luci-app-*`
- core modules live in `modules/luci-mod-*`
- themes live in `themes/luci-theme-*`, but this project is no longer theme-first
- static assets install from `htdocs/` into `/www`
- server templates and dispatcher code use `ucode/`
- menu entries live under `root/usr/share/luci/menu.d/*.json`
- API permissions live under `root/usr/share/rpcd/acl.d/*.json`

Client views use LuCI's custom runtime:

- `view.ut` calls `ui.instantiateView(path)`
- JS modules use string directives such as `'require form'`
- modules are fetched from `/luci-static/resources/...`
- `form.Map`, `ui`, `rpc`, `uci`, and `network` provide most page behavior

The modern app should reuse LuCI's backend contract, not emulate the old frontend internals as React.

## Proposed Package Layout

```text
applications/luci-app-i-love-luci/
  Makefile
  htdocs/luci-static/i-love-luci-app/
    index.html
    assets/
  root/
    usr/share/luci/menu.d/luci-app-i-love-luci.json
    usr/share/rpcd/acl.d/luci-app-i-love-luci.json
    usr/share/rpcd/ucode/i-love-luci.uc
  frontend/
    shell/
      package.json
      vite.config.ts
      tsconfig.json
      postcss.config.mjs
      components.json
      src/
        app/
        components/
          ui/
          shell/
          legacy/
          auth/
          forms/
          feedback/
        lib/
        routes/
        styles/
```

The Vite project should build static assets into `htdocs/luci-static/i-love-luci-app/`. The OpenWrt package should install the built assets, not require Node.js on the router.

## Frontend Stack

Use current upstream docs as references:

- Vite: https://vite.dev/guide/
- Vite production build: https://vite.dev/guide/build
- Tailwind CSS v4 with Vite/PostCSS: https://tailwindcss.com/docs/installation/using-postcss
- shadcn/ui Vite install: https://ui.shadcn.com/docs/installation/vite
- shadcn/ui Tailwind v4 notes: https://ui.shadcn.com/docs/tailwind-v4
- shadcn/ui CLI: https://ui.shadcn.com/docs/cli
- shadcn/ui Sonner: https://ui.shadcn.com/docs/components/radix/sonner
- Sonner upstream: https://github.com/emilkowalski/sonner
- LuCI JS API: https://openwrt.github.io/luci/jsapi/index.html
- LuCI example app: https://github.com/openwrt/luci/tree/master/applications/luci-app-example

Tailwind v4 wiring options:

- Preferred for Vite: `@tailwindcss/vite` in `vite.config.ts`.
- Acceptable alternate: `@tailwindcss/postcss` in `postcss.config.mjs`.
- Global CSS should use `@import "tailwindcss";`.
- shadcn Tailwind v4 support expects CSS variables and v4-compatible component styles.

Use shadcn components as local source code in `src/components/ui/`, not as a runtime dependency on a component library.

## Local Component Library

Create reusable components before pages:

- `AppShell`: header, sidebar, content frame, responsive layout.
- `SidebarNav`: LuCI menu tree renderer with active route state.
- `HeaderSearch`: command/search popover with recents and indexed routes.
- `ProfileMenu`: initials/avatar, account actions, logout.
- `PendingChangesBadge`: pending UCI changes and apply/discard dialog.
- `LegacyFrame`: iframe bridge for classic LuCI pages.
- `LegacyFrameToolbar`: open legacy route, refresh, pop out, copy URL.
- `PageHeader`: title, description, actions.
- `Section`, `DataTable`, `StatusMetric`, `EmptyState`, `Alert`, `ConfirmDialog`.
- `FormField`, `SelectField`, `SwitchField`, `PasswordField`, `CodeInput`.
- `ToastProvider`: Sonner wrapper with top-center default placement.
- `MfaSetupDialog`, `MfaVerifyDialog`, `RecoveryCodesDialog`.
- `AuthLayout`, `LoginForm`, `VerificationCodeForm`.

Design constraints:

- minimal, quiet admin-tool UI
- no marketing-style hero layout
- dense but readable data surfaces
- full keyboard support
- first-class mobile support across every native route, dialog, table, form, toast, and navigation surface
- mobile-first sidebar/search behavior
- no horizontal page overflow on narrow screens
- tap targets sized for touch input
- input fields sized to avoid mobile browser zoom, with the root viewport locked to `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
- no card-in-card layout
- no sensitive router values in docs/screenshots

## Mobile Support

Mobile is a first-class target for the modern shell, not a reduced fallback. Every native route should be designed and tested at phone, tablet, and desktop widths before it is considered complete.

Required behavior:

- header actions must not overlap search, pending-change badges, refresh indicators, or the profile menu
- sidebar navigation must collapse predictably, close on outside tap, and avoid duplicate close buttons
- command/search popovers must be viewport-aware and usable with the on-screen keyboard open
- tab bars and action rows must wrap or scroll horizontally without pushing the page wider than the viewport
- tables must use responsive column priority, compact density, or horizontal scroll containers instead of clipping content
- forms must use mobile-safe input sizing and must not trigger browser zoom when focused
- dialogs, sheets, and toasts must remain visible above legacy iframe content
- legacy iframe routes must be wrapped so the shell remains usable on small screens

Minimum test viewports:

- 390 x 844 phone
- 430 x 932 large phone
- 768 x 1024 tablet
- 1280 x 800 desktop

The root Vite shell index must set the viewport to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

## Legacy Compatibility Bridge

### Phase 1: iframe Bridge

Render unsupported LuCI routes inside an iframe:

```text
/cgi-bin/luci/admin/network/dhcp
```

inside:

```text
/cgi-bin/luci/admin/i-love-luci/legacy?path=/admin/network/dhcp
```

Expected behavior:

- new shell owns header/sidebar/search/profile
- iframe renders legacy page content
- legacy theme hides duplicate header/sidebar when framed
- same LuCI auth/session cookie is reused
- unsupported routes remain functional

Pros:

- best compatibility for third-party LuCI apps
- works for JS views, ucode templates, old Lua/CBI pages
- low router runtime risk

Cons:

- styling is partially isolated
- nested navigation needs synchronization
- save/apply UI may appear inside iframe until native bridge exists

### Phase 2: Native LuCI View Adapter

For `action.type = "view"` pages only, test mounting LuCI views into a React-managed container by calling LuCI's `ui.instantiateView(path)`.

This may improve integration but is more brittle than iframe because many LuCI views assume global DOM, LuCI's lifecycle, and form action rows.

Do not rely on this for universal compatibility.

### Phase 3: Native React Pages

Rebuild selected pages as native routes:

- Status overview
- DHCP leases
- Network interfaces overview
- Package update/install status
- Theme/settings
- System logs
- Reboot/upgrade guardrails

Native pages should call `rpcd` and UCI directly through a typed client wrapper.

## Backend Bridge

Add a small `rpcd` ucode module for the modern shell:

- `session.info`: current user, ACL snapshot, menu tree metadata
- `menu.tree`: effective LuCI menu tree
- `changes.list`: pending UCI changes
- `changes.apply`: apply confirmed changes
- `changes.revert`: revert pending changes
- `auth.mfa.status`: MFA enabled/required state
- `auth.mfa.begin_setup`: generate TOTP secret and QR payload
- `auth.mfa.verify_setup`: confirm first TOTP code
- `auth.mfa.verify_login`: verify login code
- `auth.recovery_codes.rotate`: rotate backup codes

Keep privileged operations server-side. The React app must never be the source of security truth.

## Authentication, MFA, and Passcode Feasibility

### MFA

MFA is practical if implemented server-side.

Recommended first factor remains existing LuCI username/password. Add a second step:

1. login form posts username/password to existing LuCI auth path or a new compatibility endpoint
2. if MFA is enabled, server returns `mfa_required`
3. user enters TOTP verification code
4. server verifies code and creates/finalizes LuCI session

Recommended MFA method:

- TOTP using an authenticator app
- encrypted or root-only UCI-backed secret storage
- backup recovery codes
- per-user enable/disable state
- rate limiting
- lockout/backoff
- audit log entries through syslog

Do not implement MFA purely in frontend code.

### Passcode / Passkey

There are two possible meanings:

- local passcode/PIN: practical as a convenience factor after password login, but weaker than TOTP unless server-verified and rate-limited
- passkey/WebAuthn: technically possible, but likely not a good first spike target

Passkey/WebAuthn concerns:

- needs reliable server-side challenge/response validation
- needs resident credential storage
- needs HTTPS for real browser support
- needs extra C/ucode/Rust/Go dependency or carefully audited implementation
- may be too heavy for small OpenWrt targets

Recommendation:

- implement TOTP MFA first
- document WebAuthn/passkey as a later optional package
- avoid inventing custom cryptography

## Routing Strategy

Use React Router internally for modern routes:

```text
/admin/i-love-luci
/admin/i-love-luci/status
/admin/i-love-luci/network/dhcp
/admin/i-love-luci/settings
/admin/i-love-luci/legacy/*
```

Use LuCI menu metadata for:

- navigation tree
- route search
- ACL-aware visibility
- legacy fallback routing

Native routes get priority. Unknown routes fall back to `LegacyFrame`.

### Route and App Compatibility Audit

Before any native route is made the default, run a full route audit against the installed LuCI menu tree and installed `luci-app-*` packages.

Audit scope:

- every visible LuCI menu route must resolve to one of: native route, guarded native preview, or LuCI compat route
- every installed LuCI app must retain a functional compat path until its native route reaches parity
- service apps such as banIP, AdBlock Fast, UPnP, uHTTPd, and future installed apps must be treated consistently through the generic adapter
- native routes must be audited for functionality regressions, not only visual rendering
- native routes must not ship as text-only command dumps when a structured table, chart, form, or status component is practical
- installing a new LuCI app after I Love LuCI is installed must surface it in navigation/search and route it through LuCI compat automatically unless a native adapter explicitly supports it
- native route migrations must be documented with the original LuCI route, replacement route, current parity level, and fallback behavior

Required adapter behavior:

- discover new LuCI menu JSON without hard-coding every future route
- preserve ACL-aware menu visibility from LuCI/rpcd
- default unknown app routes to legacy compat instead of hiding or breaking them
- keep native preview routes opt-in when full edit/apply behavior is incomplete
- expose route audit output in a repeatable script so regressions are caught before release

The target outcome is that I Love LuCI can evolve native screens without losing functionality from current or future LuCI apps installed from OpenWrt feeds.

Route audit must be treated as a release gate, not an optional validation step. Each release candidate should prove that:

- all installed LuCI routes are discovered from live router metadata
- every route has an explicit compat/native decision recorded in the route inventory
- compat is configured and tested for every installed LuCI app, including all child routes exposed by each app
- native I Love LuCI routes cover the workflows already migrated from LuCI
- every migrated native route has an explicit LuCI source route, parity status, test evidence, and fallback decision
- every route audit result records whether the active renderer is LuCI compat, a generic adapter, or a native I Love LuCI screen
- partial native routes keep LuCI compat as their default until edit/save/apply parity is proven
- newly installed LuCI apps appear automatically after menu/cache refresh and work through compat without a package-specific code change
- future LuCI apps installed through standard OpenWrt package tooling are expected to work through the adapter/compat path without a new I Love LuCI release

## Build Strategy

Development:

```sh
cd applications/luci-app-i-love-luci/frontend/shell
npm install
npm run dev
```

Production asset build:

```sh
npm run build
```

The build should emit to:

```text
applications/luci-app-i-love-luci/htdocs/luci-static/i-love-luci-app/
```

OpenWrt package build should consume committed or CI-built static assets. Do not run Node.js on the router.

During the spike, build locally only. Do not rely on GitHub Actions as the primary feedback loop until the package skeleton, frontend build, local package build, and router install path have all succeeded at least once. CI should be wired after the spike has a known-good local build so CI failures reflect real regressions instead of unresolved scaffolding work.

CI should:

- install frontend dependencies
- lint/typecheck frontend
- build Vite assets
- verify generated static assets exist
- build OpenWrt package for supported targets
- publish only from `main`

## Testing Strategy

Testing needs to cover two different systems:

- frontend correctness before packaging
- router integration after packaging

The spike should use layered tests so most issues are caught before installing on a router, while still proving the real LuCI/rpcd/uhttpd path on target hardware.

### Frontend Tests

Run these in `applications/luci-app-i-love-luci/frontend/shell`:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected tooling:

- TypeScript strict mode for the shell and typed RPC client.
- Vitest for utility, state, RPC client, route, and component behavior.
- Testing Library for accessible component behavior.
- Playwright for shell, navigation, search, toasts, responsive layout, and legacy frame smoke tests.

Frontend test fixtures should use sanitized fake router data only.

### Static Build Verification

After `npm run build`, verify:

- `htdocs/luci-static/i-love-luci-app/index.html` exists.
- hashed JS/CSS assets exist under `htdocs/luci-static/i-love-luci-app/assets/`.
- no source maps are shipped unless explicitly enabled for debug builds.
- asset paths work when served from `/luci-static/i-love-luci-app/`.
- bundle size stays within a documented budget.

Recommended first bundle budget:

- initial JS under 300 KB gzip
- initial CSS under 80 KB gzip
- lazy-load native routes where practical

### Package Build Tests

CI should build the OpenWrt package after frontend assets are generated:

```sh
OPENWRT_VERSION=24.10.7 OPENWRT_TARGET=rockchip/armv8 PACKAGE_FORMAT=ipk scripts/build-openwrt-package.sh
OPENWRT_VERSION=25.12.4 OPENWRT_TARGET=rockchip/armv8 PACKAGE_FORMAT=apk scripts/build-openwrt-package.sh
```

Package checks:

- package contains built app assets
- package contains menu JSON
- package contains ACL JSON
- package contains `rpcd` ucode bridge
- package install clears LuCI cache and reloads `rpcd`
- package uninstall leaves classic LuCI usable

### Router Integration Tests

Use a test router or VM. Do not run destructive firmware or package changes on a primary router without a rollback path.

Install the package, then run:

```sh
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd reload
/etc/init.d/uhttpd restart
```

Verify:

- app route loads
- current user/session is detected
- menu tree endpoint responds
- legacy iframe can open an existing LuCI page
- search indexes menu items
- toast provider renders top-center toasts
- pending changes badge reflects UCI changes
- classic LuCI remains reachable

### Secondary `uhttpd` Instance

During router testing, use a second `uhttpd` instance on a different port where possible. This lets the spike test new routing and headers without breaking the main LuCI admin session.

Recommended test port:

```text
8081
```

Example UCI shape:

```sh
uci -q delete uhttpd.iloveluci_test
uci set uhttpd.iloveluci_test='uhttpd'
uci add_list uhttpd.iloveluci_test.listen_http='0.0.0.0:8081'
uci add_list uhttpd.iloveluci_test.listen_http='[::]:8081'
uci set uhttpd.iloveluci_test.home='/www'
uci set uhttpd.iloveluci_test.ucode_prefix='/cgi-bin/luci=/usr/share/ucode/luci/uhttpd.uc'
uci set uhttpd.iloveluci_test.rfc1918_filter='1'
uci set uhttpd.iloveluci_test.max_requests='3'
uci set uhttpd.iloveluci_test.max_connections='100'
uci commit uhttpd
/etc/init.d/uhttpd restart
```

Test URL:

```text
http://router-address:8081/cgi-bin/luci/admin/i-love-luci
```

Rules:

- keep standard LuCI on port 80/443 as fallback
- use port 8081 only for spike verification
- remove the test instance after testing if it is not needed
- do not expose the test port outside the trusted LAN
- prefer HTTPS for MFA/passkey work once the authentication prototype starts

Cleanup:

```sh
uci -q delete uhttpd.iloveluci_test
uci commit uhttpd
/etc/init.d/uhttpd restart
```

### Playwright Router Smoke Tests

Run Playwright against the secondary port:

- login screen renders
- password field focus works when username is prefilled
- MFA code screen renders when server returns `mfa_required`
- shell renders after login
- sidebar opens/closes on mobile
- search opens and returns results
- toast appears after a mock save
- legacy iframe opens `/admin/status/overview`
- classic LuCI fallback link works

Use environment variables for router target and credentials:

```sh
ILOVELUCI_TEST_URL=http://192.168.1.1:8081/cgi-bin/luci
ILOVELUCI_TEST_USER=root
ILOVELUCI_TEST_PASSWORD=...
npm run test:e2e:router
```

Do not commit credentials. `.env` stays ignored.

### MFA Test Plan

MFA tests must cover security-sensitive behavior server-side:

- setup creates a secret only after authenticated session
- setup requires first valid TOTP before enabling
- login requires second factor when enabled
- invalid codes are rejected
- replayed codes are rejected when possible
- rate limiting/backoff works
- recovery codes are one-time use
- disabling MFA requires password plus valid second factor
- lost-MFA recovery path is documented

Do not test MFA only with frontend mocks. Use unit tests for TOTP helpers and integration tests against the `rpcd` bridge.

### CI Gate

Pull requests should pass:

- frontend lint/typecheck/unit tests
- frontend production build
- static asset verification
- OpenWrt package build for supported targets
- optional Playwright mock-backend smoke test

## Current Native Route Coverage

Router test target: `172.16.172.1`, OpenWrt `25.12.4`, `rockchip/armv8`.

Converted to native React/Vite surfaces:

- `/admin/status` and `/admin/status/overview`: dashboard with bandwidth, CPU, memory, interfaces, and system facts.
- `/admin/status/routes`: structured route tables, policy rules, and neighbour entries. Raw `ip route`/`ip rule`/`ip neigh` dumps are no longer rendered.
- `/admin/status/nftables`: structured active nftables chain/rule summary. Raw `nft list ruleset` dumps are no longer rendered.
- `/admin/status/logs`, `/admin/status/logs/syslog`, `/admin/status/logs/dmesg`: structured system and kernel log tables with parsed time, level, facility, process, and message.
- `/admin/status/processes`: structured process table with PID, user, memory size, state, and command.
- `/admin/status/realtime`, `/admin/status/realtime/load`, and `/admin/status/realtime/bandwidth`: dedicated native realtime chart route using the same LuCI/rpcd dashboard data source as the dashboard.
- `/admin/status/realtime/connections`: structured active socket table with protocol, state, queues, local/peer endpoints, and process where available.
- `/admin/status/realtime/wireless` and `/admin/status/channel_analysis`: guarded wireless status surface with helper status; on the current router it validates the no-radio/no-`iw` case.
- `/admin/network/network` and `/admin/network/routes`: modern UCI summaries plus live interface/device status from `dashboard_status`, including protocol, link state, device mapping, addresses, uptime, native common interface/device editing, native static route add/edit/remove, and native policy rule add/edit/remove.
- `/admin/network/firewall` and firewall child routes: modern firewall defaults, zone, zone-forwarding, traffic-rule, redirect, and whitelisted custom nftables include file editors, with LuCI compat retained for advanced firewall forms.
- `/admin/network/dhcp` and `/admin/network/dns`: modern DHCP/DNS surface with dnsmasq/odhcpd service state, active DHCP leases, native common dnsmasq settings, native DHCP pool add/edit/remove, native static host reservation add/edit/remove, native DNS host record add/edit/remove, and compact UCI summaries. Less-common dnsmasq/odhcpd edit/apply workflows remain LuCI compat.
- `/admin/network/wireless`: guarded wireless configuration/status surface.
- `/admin/network/diagnostics`: structured route table, resolver view, and guarded ping/traceroute/DNS runner.
- `/admin/system/system`: native editor for hostname, description, timezone, logging, basic NTP settings, and uHTTPd certificate defaults, plus modern summaries for local time, Dropbear, uHTTPd, and LEDs.
- `/admin/system/admin` and `/admin/system/admin/password`: native router password form with confirmation, strength feedback, client validation, and a server-side `luci.setPassword` bridge.
- `/admin/system/admin/dropbear`: Dropbear service status, main-instance SSH access editor, and UCI summary.
- `/admin/system/admin/sshkeys`: Dropbear authorized keys editor.
- `/admin/system/admin/uhttpd`: uHTTPd service status, redirect-to-HTTPS editor, and UCI summary.
- `/admin/system/admin/repokeys`: structured installed package repository public key metadata without raw key dumps.
- `/admin/system/attendedsysupgrade` and children: guarded firmware compatibility context, target metadata, upgrade helper status, native build server/client setting editor, and guardrail messaging. Auto mode defaults to LuCI compat until native image build, progress, package retention behavior, rollback, and flash confirmation reach parity.
- `/admin/system/package-manager`: parsed installed package inventory with package/version/description table, available-upgrades table, available package-feed search, client filter, package family counts, package-index update action, and guarded package install/remove plan/apply actions. Auto mode defaults to LuCI compat until rollback and mutation test coverage reaches parity.
- `/admin/system/startup`: init script enabled/running state with native enable, disable, start, stop, and restart actions, plus `/etc/rc.local` local startup editor.
- `/admin/system/crontab`: root crontab editor with cron reload after save.
- `/admin/system/flash`: guarded read-only firmware, overlay usage, mounted filesystem, and flash partition overview.
- `/admin/system/leds`: LED action add/edit/remove plus structured current sysfs LED trigger/brightness state. Sortable order and plugin-specific trigger option forms remain LuCI compat gaps.
- `/admin/system/reboot`: guarded modern reboot surface with hostname confirmation and dedicated reboot RPC.
- `/admin/system/commands` and children: modern custom command dashboard can add/edit/remove, execute configured LuCI commands by section id, and download text command output, with UCI summary. Auto mode still defaults to LuCI compat until public-link parity is complete.
- `/admin/system/i-love-luci-theme`: native I Love LuCI settings.
- `/admin/services`: service overview with native lifecycle actions where an init script exists. The root services route is native by default; service-app child routes still default to LuCI compat until adapter parity is proven.
- `/admin/services/banip` and child routes: service status, lifecycle actions, banIP common policy editor, feed/country/interface/log-term list editor, native allowlist/blocklist/custom-feed file editors, runtime file summary, focused reporting/log views, service activity log table, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/adblock-fast`: service status, lifecycle actions, AdBlock Fast common settings editor, allow/block domain list editor, feed-source add/edit/remove editor, generated dnsmasq server file summary/preview, service activity log table, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/upnp`: service status, lifecycle actions, UPnP enable/internal-interface/bandwidth/port/IGDv1 editor, permission-rule add/edit/remove editor, service activity log table, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/uhttpd`: uHTTPd service status, lifecycle actions, common web-server editor, listener/web-server summary, service activity log table, and UCI summary are available as native preview; auto mode defaults to LuCI compat.

Validation on `172.16.172.1`:

- All visible LuCI menu routes have either a native route or a LuCI compat route. Service/package LuCI apps with incomplete native parity default to `legacy` effective mode in `auto`, so full LuCI functionality remains available.
- `native_page` returned successfully for `status-routes`, `firewall-status`, `logs`, `processes`, `connections`, `wireless`, `diagnostics`, `attendedsysupgrade`, `packages`, `startup`, `crontab`, `sshkeys`, `password`, `repokeys`, `leds`, `flash`, `services`, and `reboot`.
- `crontab_save` saved through the native bridge and reloaded cron on `172.16.172.1`; the test router had no existing root crontab entries.
- `native_page` returned `sshkeys` successfully. The router currently has no `/etc/dropbear/authorized_keys`, so save was not exercised to avoid creating an empty file during validation.
- `service_detail` returned successfully for `banip`, `adblock-fast`, `upnpd`, `commands`, `uhttpd`, and `dropbear`.
- `service_action` and `startup_action` returned current state for `uhttpd` with non-mutating `status`; invalid init names are rejected.
- Browser smoke test loaded `#/native/services` and rendered the service overview with the flattened native layout. The root Services route now resolves to native in auto mode.
- Browser smoke tests loaded `#/native/wireless` and `#/native/attendedsysupgrade`.
- Browser smoke test loaded `#/native/service/uhttpd` and rendered lifecycle action buttons.
- Browser smoke tests loaded `#/native/repokeys` and `#/native/leds` on the router.
- Menu policy validation confirmed incomplete LuCI app routes such as banIP, AdBlock Fast, UPnP, uHTTPd, custom commands, attended sysupgrade, and package manager default to LuCI compat in auto mode while keeping native preview routes available for explicit `modern` selection.
- Native custom command RPC was validated on `172.16.172.1` with a temporary harmless `luci.command` section. The command list surfaced in `service_detail`, `custom_command_run` executed it successfully, and the temporary UCI section was removed after the smoke test.
- `core_settings` now returns scoped page payloads to keep router `ubus` responses small and wrapper-friendly. DHCP/DNS was validated on `172.16.172.1` with live dnsmasq/odhcpd state and active lease data, while LuCI compat remains the fallback for editing.
- Browser smoke test loaded `#/core/network` on `172.16.172.1` with the `1.0.0-r4-native12` bundle and rendered 4 live interfaces, LAN/WAN addresses, uptime, and live ethernet device counters.
- Browser smoke test loaded `#/core/firewall` on `172.16.172.1` with the `1.0.0-r4-native13` bundle and rendered firewall defaults, 3 zones, 3 zone forwardings, and 9 traffic rules.
- Browser smoke test loaded `#/core/system` on `172.16.172.1` with the `1.0.0-r4-native14` bundle and rendered system identity, NTP servers, SSH access, uHTTPd listeners, LEDs, and certificate defaults.
- Browser smoke test loaded `#/native/packages` on `172.16.172.1` with the `1.0.0-r4-native15` bundle and rendered 186 installed packages, 31 LuCI packages, 30 kernel modules, and a parsed package/version/description table.
- Browser smoke test loaded `#/native/flash` on `172.16.172.1` with the `1.0.0-r4-native16` bundle and rendered firmware version, root usage, overlay free space, mounted filesystem table, and the target's no-MTD-partition state.
- Browser smoke test loaded `#/native/attendedsysupgrade` on `172.16.172.1` with the `1.0.0-r4-native17` bundle and rendered firmware version, target, `auc` helper state, build server URL, and rollback-safe guardrail messaging.
- Native route audit found text-only command dumps on routing, nftables firewall status, processes, and connections. Browser smoke tests loaded `#/native/status-routes`, `#/native/firewall-status`, `#/native/processes`, and `#/native/connections` with the `1.0.0-r4-native19` bundle and confirmed all four now render structured tables without the raw command dump panels.
- Follow-up text-output audit found remaining raw command panels on logs, diagnostics, repository keys, LED sysfs state, and wireless helper status. Browser smoke tests loaded `#/native/logs`, `#/native/diagnostics`, `#/native/repokeys`, `#/native/leds`, and `#/native/wireless` with the `1.0.0-r4-native20` bundle and confirmed all five now render structured tables without raw command dump panels.
- Diagnostics runner output now renders command-aware result tables. Browser smoke test ran ping from `#/native/diagnostics` with the `1.0.0-r4-native22` bundle and confirmed IPv6 replies render as a `Ping replies` table with transmitted/received/loss metrics and no raw `<pre>` output.
- Custom command and fallback text output now render as stream/line/text tables instead of raw preformatted command dumps.
- Browser smoke test loaded `#/native/packages` on `172.16.172.1` with the `1.0.0-r4-native24` bundle and rendered available upgrades from `apk version -l '<'` as package/installed/available rows without raw package-manager warnings or `<pre>` output.
- Browser smoke tests loaded `#/native/service/adblock-fast`, `#/native/service/banip`, `#/native/service/upnpd`, `#/native/service/dropbear`, and `#/native/service/uhttpd` with the `1.0.0-r4-native25` bundle and confirmed structured service-specific summaries render without raw `<pre>` output. Service running-state detection was corrected to use full `ubus service list` plus init `status` fallback; uHTTPd and AdBlock Fast now show `running` on the router.
- Route audit on `172.16.172.1` with `1.0.0-r4-native25` passed: `visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=20`, `partial=40`, `unsupported=0`, `menu_files=15`, `luci_apps=9`, `compat_default_routes=18`.
- Native page audit on `172.16.172.1` passed with `scripts/audit-router-native-pages.sh`: `native_pages=17`, `service_adapters=6`. The audit calls every current native page RPC, every current service adapter, and `console_status`, then fails if required data sources disappear.
- HTTP route smoke on `172.16.172.1` passed with `scripts/smoke-router-http-routes.sh`: `visible_routes=60`, `native_shell_checks=42`, `legacy_route_checks=18`. The smoke test verifies the React/Vite login shell, authenticates through standard LuCI form fields, checks the app shell, and fetches every visible legacy compat target for dispatch/login regressions.
- Pending-change bridge now reads real `uci changes` output and exposes a header dialog with config/action/section/option/value rows plus guarded discard. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native26` bundle created a harmless `i-love-luci.codex_probe` pending change, verified the `2 pending` chip and dialog, discarded through the UI, and confirmed `uci changes` was empty after discard.
- Package manager native preview now includes read-only available package-feed search through `package_search`. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native27` bundle searched for `luci-app`, confirmed `luci-app-banip` rendered in structured rows, and confirmed package-manager warnings are separated from table data.
- Generic service adapters now include service activity from `logread` where a known init/service pattern exists. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native28` bundle loaded `#/native/service/adblock-fast`, confirmed the activity log renders as a structured log table, and confirmed the old generic output panel is not used for that service log.
- Service file adapters now expose read-only summaries and previews for whitelisted service files. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native29` bundle loaded `#/native/service/banip`, confirmed allowlist/blocklist/runtime files render as structured tables, and confirmed no `<pre>` output is used.
- Service file summaries now use line-count and preview commands instead of reading whole files into rpcd memory. Browser smoke on `172.16.172.1` confirmed the AdBlock Fast generated dnsmasq server file reports `471530` lines, renders a preview row, and uses no `<pre>` output.
- Wireless helper status now reads the correct native `Wireless status` command payload. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native30` bundle confirmed both `iw` and `iwinfo` show `not installed` on the no-radio test router and no `<pre>` output is used.
- Guarded native pages now suppress duplicate generic command output panels when a structured summary exists. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native31` bundle confirmed `#/native/attendedsysupgrade`, `#/native/flash`, and `#/native/reboot` render without generic output panels or `<pre>` elements; reboot uptime now appears in a structured context table.
- Native pages no longer render a generic raw command-output fallback. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native32` bundle confirmed `#/native/crontab`, `#/native/sshkeys`, `#/native/startup`, `#/native/status-routes`, and `#/native/firewall-status` render purpose-built controls/tables without generic output headings or `<pre>` elements. Route audit, native page audit, and HTTP route smoke all passed after deploy.
- Route headers no longer render mode/status chips such as `modern`, `legacy`, `partial modern`, `read-only`, or `guarded`. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native33` bundle confirmed route header chips are absent from `#/native/status-routes`, `#/native/packages`, `#/native/wireless`, and `#/native/service/banip`. Route audit, native page audit, and HTTP route smoke all passed after deploy.
- Realtime graph routes now resolve to a dedicated `#/realtime` native route instead of the dashboard root. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native34` bundle confirmed `#/realtime` renders bandwidth, memory, CPU load, interface, and system sections with 3 Chart.js canvases and no `<pre>` elements; `#/native/connections` still renders the structured sockets table. Route audit, native page audit, and HTTP route smoke all passed after deploy.
- The route compatibility table now labels route support as `Coverage` and no longer displays effective `modern`/`legacy` status text beside each route. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native35` bundle confirmed the settings table renders `Route`, `Coverage`, and `Mode` columns; mode labels remain only inside the explicit route override selector. Route audit, native page audit, and HTTP route smoke all passed after deploy.
- banIP child routes now have focused native preview targets for allowlist, blocklist, custom feeds, reporting, firewall log, and processing log when a route is explicitly forced to modern. Auto mode still defaults these LuCI app routes to compat until edit/reload parity is complete. Browser smoke on `172.16.172.1` with the `1.0.0-r4-native36` bundle confirmed `#/native/service/banip/allowlist`, `#/native/service/banip/blocklist`, `#/native/service/banip/feeds`, `#/native/service/banip/setreport`, and `#/native/service/banip/firewall_log` render focused structured views without `<pre>` elements. Route audit, native page audit, and HTTP route smoke all passed after deploy.
- Route audit now validates every native-capable route has a shell-native preview path matching a known I Love LuCI route pattern, including partial routes that default to LuCI compat in auto mode. The latest audit on `172.16.172.1` reported `native_preview_routes=60` and passed route, native page, and HTTP route checks.
- Native page audit now asserts focused service-preview data sources for banIP, including allowlist, blocklist, custom-feed file summaries, and service activity logs, so focused native child routes cannot silently regress to empty views. The latest native page audit on `172.16.172.1` passed.
- Native page audit now fails if the console bridge is enabled but does not expose the ttyd helper username, helper password, root path, and URL required to open the terminal without asking the user for router credentials again. The latest native page audit on `172.16.172.1` passed with ttyd enabled.
- Router password now resolves to `#/native/password` and uses the same `luci.setPassword` ubus method as LuCI. The `1.0.0-r4-native39` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`), native page audit (`native_pages=18`, `service_adapters=6`), HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`), and a safe mismatch RPC check returning `Password confirmation does not match.` without changing the credential.
- Startup now includes the LuCI `/etc/rc.local` local startup editor in the native route. The `1.0.0-r4-native40` deploy passed lint, unit tests, production build, route audit, native page audit, and HTTP route smoke; `rc_local_save` was exercised by saving the existing file content and verifying the SHA-256 checksum remained `0f767af53e16d3d39db620fcd8e71fab4a16939b2c0a724b8750aff3c00378e1`.
- Dropbear SSH access now has a native main-instance editor for enable state, port, password authentication, root password authentication, Gateway Ports, and interface binding. The `1.0.0-r4-native42` deploy passed lint, unit tests, production build, route audit, native page audit, and HTTP route smoke; `dropbear_config_save` was exercised with the current router values and the exported UCI checksum stayed `e73cfdf3ac7bafe90fa3b4218b81d4f3531bcfa04188c9c82ae745cfecd79023`.
- LED configuration now has native add/edit/remove for UCI LED action rows. The `1.0.0-r4-native44` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=22`, `partial=38`), native page audit, and HTTP route smoke; `led_config_save` was exercised with current WAN/LAN LED rows and unchanged checksum, then with a temporary added LED action followed by restore. The final exported `system` UCI checksum returned to `601cf3c77a28d1c6ce2ac7d29fe688da329fd182ea41b75c439b006f995688c5`.
- System HTTP(S) access now has a native redirect-to-HTTPS editor matching the LuCI `system/uhttpd` view on this router. The `1.0.0-r4-native45` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`), native page audit, and HTTP route smoke; `uhttpd_config_save` was exercised with the current router value and exported `uhttpd` UCI checksum stayed `706d4c881377d165e692084b4da2e6ed52fa9e6d3e65b8a7c6a6bdfe6ea1ee74`.
- uHTTPd now has a native common web-server editor for HTTP/HTTPS listeners, redirect-to-HTTPS, document root, RFC1918 filter, request/connection limits, certificate/key paths, CGI/ubus prefixes, and timeouts/keepalive. The `1.0.0-r4-native62` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `uhttpd_config_save` was exercised with the current router values and exported `uhttpd` UCI checksum stayed `706d4c881377d165e692084b4da2e6ed52fa9e6d3e65b8a7c6a6bdfe6ea1ee74`.
- UPnP now has a native editor for enabled state, internal interface, advertised bandwidth, miniupnpd port, IGDv1 compatibility, and permission rules. The `1.0.0-r4-native63` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `upnpd_config_save` rejected anonymous UCI selectors without mutation, then a no-op save with current section ids returned `changed=false` and exported `upnpd` UCI checksum stayed `fca427d6088b0977fc1b43fcc4b9ee3467d3a8f883fe3e17edf4c1e8e7ac0c70` with no pending UCI changes.
- AdBlock Fast now has a native editor for enabled state, DNS backend, force DNS, parallel downloads, auto update, allow/block domain lists, and feed URL add/edit/remove. The `1.0.0-r4-native64` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `adblock_fast_config_save` rejected anonymous UCI selectors without mutation, then a no-op save generated from current UCI returned `changed=false` with 18 feeds and exported `adblock-fast` UCI checksum stayed `c65a127cac1861724e1f4ab53e32bb0563edb8e857a4da326c7d03214871e8ac` with no pending UCI changes.
- banIP now has a native editor for enable/autodetect/auto-list/protocol toggles, block and nft policies, nft priority/log level, fetch/log/rate limits, feeds, countries, trigger interfaces, IPv4/IPv6 interfaces, devices, and log terms. The `1.0.0-r4-native65` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `banip_config_save` was exercised with current UCI values, returned `changed=false`, and exported `banip` UCI checksum stayed `71a2524999f138fcf485dcf1f0fa2178ae1a99873d7283fdf89ef7b3e80cf5d0` with no pending UCI changes.
- banIP allowlist, blocklist, and custom-feed files now have native whitelisted text editors and reload banIP after changed saves. The `1.0.0-r4-native66` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `banip_file_save` was exercised against `/etc/banip/banip.allowlist`, `/etc/banip/banip.blocklist`, and `/etc/banip/banip.custom.feeds` with current content, returned `changed=false` for all files, and the combined file checksum stayed `c8cff9f41c0382db53833ac466d608ab461cfbbb7f45a3f355842aa6ca61d7e8` with no pending UCI changes.
- Package manager now has native package-index update wiring plus guarded package install/remove planning and apply actions. The `1.0.0-r4-native67` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `package_action` was exercised with a simulated `apk add banip` and an invalid package-name rejection, `/etc/apk/world` checksum stayed `23fe9d53009433177208bd4d82687a18cc0457f0d79a75fbd4f463c20ac22c95`, and no UCI changes were pending. Actual install/remove mutation tests are intentionally deferred until a disposable package target and rollback guard are selected.
- Custom command results now include native text download for non-binary command output. The `1.0.0-r4-native68` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`). Public unauthenticated command links remain disabled until a safe tokenized endpoint and audit logging are designed.
- Attended sysupgrade now has a native editor for build server URL, retained-package behavior, auto-search, advanced mode, and login upgrade checks. The `1.0.0-r4-native69` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `attendedsysupgrade_config_save` was exercised with current UCI values, returned `changed=false`, exported `attendedsysupgrade` UCI checksum stayed `340f483818163ece0b03c90737149e77626366856dda8fb57f28b175ddbe964f`, and no UCI changes were pending.
- System settings now include a native editor for hostname, description, log buffer/protocol/levels, NTP enable state, DHCP-advertised NTP use, and NTP server list. The `1.0.0-r4-native46` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `system_settings_save` was exercised with the current router values and exported `system` UCI checksum stayed `9a2bed4829c882d323854b2a9574ace0167476175906429e2ab6c46cacbdefa6`.
- System settings now include native timezone name and POSIX timezone editing. The `1.0.0-r4-native59` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `system_settings_save` was exercised with the current `Australia/Perth` / `AWST-8` values and exported `system` UCI checksum stayed `9a2bed4829c882d323854b2a9574ace0167476175906429e2ab6c46cacbdefa6`.
- System settings now include native uHTTPd certificate-default editing for days, key type, bits, EC curve, country, state, location, and common name. The `1.0.0-r4-native60` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `uhttpd_cert_defaults_save` was exercised with the current router values and exported `uhttpd` UCI checksum stayed `706d4c881377d165e692084b4da2e6ed52fa9e6d3e65b8a7c6a6bdfe6ea1ee74`.
- Custom commands now include native add/edit/remove for UCI `luci.command` rows plus native execution. The `1.0.0-r4-native61` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `custom_commands_save` was exercised with a temporary `/bin/echo iloveluci-test` command, `custom_command_run` returned `iloveluci-test`, then the command was removed and exported `luci` UCI checksum returned to `2f315fa7bfe76d4fbadf1180a8b490609f1eff08aae4eb0969f687af91be5b13`.
- DHCP/DNS now includes a native static host reservation editor for existing and new UCI `dhcp.host` rows, including add/remove controls and dnsmasq/odhcpd reload after changes. The `1.0.0-r4-native47` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `dhcp_hosts_save` was exercised with the current router reservations and exported `dhcp` UCI checksum stayed `d15e4bc2723b2bd844ee87e8d843c1c2f874b26728d21f2b5ab79264f59d4fa8`.
- DHCP/DNS now includes a native DNS host record editor for existing and new UCI `dhcp.domain` rows, including add/remove controls and dnsmasq reload after changes. The `1.0.0-r4-native48` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `dhcp_domains_save` was exercised with the current router records and exported `dhcp` UCI checksum stayed `d15e4bc2723b2bd844ee87e8d843c1c2f874b26728d21f2b5ab79264f59d4fa8`.
- DHCP/DNS now includes a native DHCP pool editor for UCI `dhcp.dhcp` rows, including interface, ignore, start, limit, lease time, DHCPv4, DHCPv6, and RA mode. The `1.0.0-r4-native49` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `dhcp_pools_save` was exercised with the current router pools and exported `dhcp` UCI checksum stayed `d15e4bc2723b2bd844ee87e8d843c1c2f874b26728d21f2b5ab79264f59d4fa8`.
- DHCP/DNS now includes a native common dnsmasq settings editor for domain-required, localise queries, rebind protection, localhost rebind, expand hosts, read ethers, local service, authoritative, sequential IP, local/search domains, cache size, EDNS packet max, lease/resolver/server files, and upstream server list. The `1.0.0-r4-native50` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `dnsmasq_config_save` was exercised with the current router values and exported `dhcp` UCI checksum stayed `d15e4bc2723b2bd844ee87e8d843c1c2f874b26728d21f2b5ab79264f59d4fa8`.
- Network settings now include a native static route editor for UCI `network.route` and `network.route6` rows, including family, interface, target, netmask, gateway, metric, table, source, MTU, and on-link mode. The `1.0.0-r4-native51` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `network_routes_save` was exercised with the current router values and exported `network` UCI checksum stayed `a17a63979cfc26787774abd87acc356d3dbb0ac8a28897541bcf7454a07b8e84`.
- Network settings now include a native policy rule editor for UCI `network.rule` and `network.rule6` rows, including family, input/output interface, source, destination, priority, lookup table, mark, TOS, action, and invert mode. The `1.0.0-r4-native52` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `network_rules_save` was exercised with the current router values and exported `network` UCI checksum stayed `a17a63979cfc26787774abd87acc356d3dbb0ac8a28897541bcf7454a07b8e84`.
- Network settings now include native edit-only common interface/device editors for existing UCI `network.interface` and `network.device` sections, including protocol, device, IPv4 address/netmask/gateway, IPv6 assignment length, DNS, peer DNS, delegate, device name/type/ports/MAC/MTU. The `1.0.0-r4-native58` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `network_interfaces_save` and `network_devices_save` were exercised with the current router rows and exported `network` UCI checksum stayed `a17a63979cfc26787774abd87acc356d3dbb0ac8a28897541bcf7454a07b8e84`.
- Firewall now includes a native defaults editor for input/output/forward policy, SYN flood protection, drop invalid packets, software flow offload, and hardware flow offload. The `1.0.0-r4-native53` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_defaults_save` was exercised with the current router values and exported `firewall` UCI checksum stayed `8287ac6222abec8f151c48ff703d8c8bcce9de1bb23dab1a5e8f361311f3ed88`.
- Firewall now includes a native zone editor for UCI `firewall.zone` rows, including name, networks, devices, input/output/forward policy, masquerading, and MTU fix. The `1.0.0-r4-native54` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_zones_save` was exercised with the current router zones and exported `firewall` UCI checksum stayed `8287ac6222abec8f151c48ff703d8c8bcce9de1bb23dab1a5e8f361311f3ed88`.
- Firewall now includes a native zone forwarding editor for UCI `firewall.forwarding` rows, including source and destination zones. The `1.0.0-r4-native55` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_forwardings_save` was exercised with the current router forwardings and exported `firewall` UCI checksum stayed `8287ac6222abec8f151c48ff703d8c8bcce9de1bb23dab1a5e8f361311f3ed88`.
- Firewall now includes a native traffic rule editor for UCI `firewall.rule` rows, including name, enabled state, source/destination zones, protocol list, source/destination IP and port matches, ICMP type list, family, rate limit, and target. The `1.0.0-r4-native56` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_rules_save` was exercised with the current router traffic rules and exported `firewall` UCI checksum stayed `8287ac6222abec8f151c48ff703d8c8bcce9de1bb23dab1a5e8f361311f3ed88`.
- Firewall now includes a native redirect/port-forward editor for UCI `firewall.redirect` rows, including name, enabled state, source zone, external port, destination zone/IP/port, protocol list, family, and DNAT/SNAT target. The `1.0.0-r4-native57` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_redirects_save` was exercised with an empty no-op save plus a disabled temporary redirect add/remove, and exported `firewall` UCI checksum returned to `8287ac6222abec8f151c48ff703d8c8bcce9de1bb23dab1a5e8f361311f3ed88` with no pending UCI changes.
- Firewall now includes a native whitelisted custom nftables file editor for `/etc/nftables.d/*.nft` and existing `/etc/firewall.user`. The `1.0.0-r4-native70` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `firewall_file_save` was exercised as a no-op against `/etc/nftables.d/10-custom-filter-chains.nft`, returning `changed=false`, preserving checksum `af5cbfeb3e3b61d32ce134ae33d15330ee27da838e6f4fb9c717f034923b8b16`, and leaving `uci changes` at `0`.
- Reboot now has a dedicated guarded native RPC requiring exact hostname confirmation before scheduling a reboot. The `1.0.0-r4-native71` deploy passed lint, unit tests, production build, route audit (`visible_routes=60`, `modern=42`, `legacy=18`, `native_status supported=23`, `partial=37`, `native_preview_routes=60`, `compat_default_routes=18`), native page audit (`core_pages=4`, `native_pages=18`, `service_adapters=6`), and HTTP route smoke (`native_shell_checks=42`, `legacy_route_checks=18`); `reboot_confirm` was exercised with an invalid confirmation and returned `accepted=false` while the router stayed up.

Remaining legacy or partial gaps:

- Wireless-specific pages are native but partial. The current test router has no active wireless stack and lacks `iw`/`iwinfo`, so radio scanning, channel analysis, and association lists could not be validated.
- Network interfaces are native for live status, common existing interface/device editing, static route add/edit/remove, and policy rule add/edit/remove. Interface/device create/delete, advanced protocol-specific forms, reconnect/reload actions, and full save/apply parity remain LuCI compat until the generic form/pending-change adapter is complete.
- DHCP/DNS now has native active lease visibility, common dnsmasq settings, DHCP pool add/edit/remove, static host reservation add/edit/remove, and DNS host record add/edit/remove. Less-common dnsmasq options, odhcpd options, RA flag editing beyond current pool modes, and full save/apply parity remain LuCI compat until a broader generic form/pending-change adapter is complete.
- Firewall is native for defaults editing, zone add/edit/remove, zone forwarding add/edit/remove, traffic rule add/edit/remove for common rule fields, redirect add/edit/remove for common port-forward/NAT fields, whitelisted custom nftables file editing, and summary views. Advanced UCI include creation, nft syntax validation, advanced zone/rule/redirect options, validation, and full save/apply parity remain LuCI compat until the generic form/pending-change adapter is complete.
- System administration now has native editors for hostname, description, timezone name/POSIX timezone, logging, basic NTP, router password, Dropbear main-instance SSH access, startup init actions, local startup, cron, SSH authorized keys, LED action add/edit/remove, uHTTPd redirect-to-HTTPS, and uHTTPd certificate defaults. Timezone browser-sync, language/theme selection, zram options, and full save/apply parity remain LuCI compat gaps. Dropbear remains partial because LuCI still supports add/remove multiple instances and full direct-interface semantics. LED configuration remains partial because LuCI still supports sortable order and plugin-specific trigger forms. The `luci-app-uhttpd` service route remains partial/compat by default because the app-level surface is broader than the system HTTP(S) redirect view.
- Attended sysupgrade has a structured native guarded preview plus native build server/client setting editor. Auto mode uses LuCI compat. Image requests, build progress, package compatibility replacement, flash handoff, and rollback checks still need dedicated RPCs before enabling native default.
- Firmware backup/flash destructive actions remain guarded/read-only. Native flash now has structured storage visibility, and reboot has a dedicated hostname-confirm RPC. Backup/download, image upload, sysupgrade validation, flash confirmation, progress reporting, and rollback messaging still need dedicated RPCs.
- Package install/remove/update remains LuCI compat by default. Current native package screen has parsed inventory, available-upgrades visibility, available feed search, package-index update, and guarded install/remove plan/apply controls. Actual install/remove mutation on the router still needs a disposable package target, rollback validation, and post-mutation route smoke before package manager can default to native.
- Advanced service editors for banIP, AdBlock Fast, UPnP, Dropbear, and uHTTPd remain LuCI compat by default unless explicit native mode is selected. Native preview pages now include service-specific status summaries, lifecycle controls, structured service logs, whitelisted service file summaries/editors where available, common banIP/AdBlock Fast/UPnP/uHTTPd editing, and structured UCI-derived tables, but broader native config edit/apply forms should be adapter-based and should land only after pending-change/apply flow is complete. banIP report/firewall-log/processing-log workflows still require LuCI compat. Custom commands now have native config editing, execution, and output download, but public link generation still requires LuCI compat.
- Native text-output debt remains only where output shape is intentionally arbitrary, such as custom commands from user configuration. These now render in a structured line table; future work should add command-specific renderers for commonly configured commands where practical.
- Save/apply, apply unchecked, reset, and page-specific form validation are not yet universally native. Pending-change listing and discard now work through the native shell; applying changes remains guarded until the rollback/confirm flow is implemented and tested.

## Sysupgrade and Standalone Direction

Current package reality:

- `luci-app-i-love-luci` is still a LuCI application package.
- It uses `luci.mk`, declares `+luci-base`, installs LuCI menu/template files, overrides LuCI `sysauth.ut`, and depends on LuCI session handling.
- The React shell wraps and progressively replaces LuCI, but it is not yet independent of LuCI.

Sysupgrade impact:

- Config can be kept by OpenWrt when users keep settings, but package-owned files are not guaranteed to survive a release sysupgrade unless the package is included in the new image or reinstalled after upgrade.
- The package feed reduces the recovery gap because users can reinstall with standard package tooling after upgrade.
- More robust paths are: include I Love LuCI in a custom image, use Attended Sysupgrade or `owut` where supported, or add a post-upgrade reinstall checklist.
- The package now installs `/lib/upgrade/keep.d/luci-app-i-love-luci` to preserve `/etc/config/i-love-luci` and `/etc/config/ttyd` in sysupgrade configuration backups.

Future-proof target:

- Create a standalone `i-love-luci` package that uses OpenWrt package infrastructure directly instead of LuCI `luci.mk`.
- Serve the React/Vite bundle directly through `uhttpd`.
- Keep `rpcd`/`ubus` as the privileged backend boundary.
- Own the login/session flow instead of overriding LuCI login templates.
- Move LuCI route discovery, iframe rendering, and legacy auth handoff into an optional `i-love-luci-luci-compat` adapter.
- Native I Love LuCI screens should continue working when LuCI is not installed; legacy LuCI screens should appear only when the adapter detects LuCI.

Near-term hardening:

- Add package-manager conffile metadata for package upgrades if needed; sysupgrade backup coverage now exists for `/etc/config/i-love-luci` and `/etc/config/ttyd`.
- Avoid persisting versioned asset URLs in config; keep cache keys template-owned.
- Keep CI/build matrix for OpenWrt 24.10/opkg, 25.12+/apk, and snapshot when practical.
- Prefer typed `rpcd` endpoints and UCI-backed settings over scraping LuCI pages.

## LuCI Compatibility Layer

Standalone I Love LuCI must not break the OpenWrt LuCI app ecosystem. The practical design is not a hard fork that expects every LuCI app to be rewritten immediately. It should be a layered runtime:

- `i-love-luci-core`: standalone React/Vite shell, own auth/session, static assets served by `uhttpd`, typed `rpcd` bridge, and native first-party screens. No `luci-base` dependency.
- `i-love-luci-luci-compat`: optional compatibility package that depends on `luci-base`, discovers installed LuCI menu/ACL/view metadata, and runs unconverted LuCI apps through a framed or proxied legacy surface.
- `i-love-luci-adapters`: optional native adapters for high-value LuCI apps. These translate known UCI schemas, service actions, logs, and package-specific files into native React screens.

Compatibility rule:

- Existing LuCI apps from OpenWrt feeds should remain installable through normal package tooling.
- If a LuCI app depends on `luci-base`, the compatibility package should satisfy the runtime path by keeping LuCI installed.
- I Love LuCI should detect the app, add it to navigation/search, and choose the best renderer in this order: native adapter, generic UCI/service adapter, legacy compat frame.
- No route should disappear just because a native adapter does not exist yet.
- Do not rewrite individual third-party LuCI apps as one-off React pages unless the same adapter pattern can apply to comparable apps.

Translation layer scope:

- Menu translation: parse `/usr/share/luci/menu.d/*.json` into I Love LuCI navigation, preserving order, nesting, first-child behavior, ACL visibility, and route titles.
- ACL/session bridge: map existing LuCI/rpcd permissions into I Love LuCI route availability so users do not see unusable actions.
- UCI schema adapter: render safe generic summaries/editors for packages that expose standard UCI sections.
- Service adapter: expose status, start, stop, restart, enable, disable, and relevant logs for packages with init scripts.
- File adapter: expose whitelisted package files such as banIP allow/block/custom feed lists.
- Legacy frame fallback: render arbitrary LuCI JS views unchanged when there is no adapter.

Limit:

- Fully automatic conversion of arbitrary LuCI JavaScript views into native React is not realistic. LuCI apps can contain custom client code, RPC calls, form logic, and side effects that cannot be inferred safely.
- The safe target is universal compatibility first, then progressive native replacement through explicit adapters.

Package model:

- Publish `i-love-luci-core` for users who want the standalone native app only.
- Publish `i-love-luci-luci-compat` for users who want all existing LuCI apps to continue working.
- Keep current `luci-app-i-love-luci` as the transition package until the standalone split is ready.

Router compatibility audit on `172.16.172.1`:

| LuCI app/package | Current route handling | Required I Love LuCI treatment |
| --- | --- | --- |
| `luci-app-banip` / `banip` | Generic native service summary with lifecycle actions; child routes map to the same service surface. | Keep full LuCI app available through compat frame. Add native allowlist/blocklist/feed/log adapters only as part of a reusable service/file/log adapter framework. |
| `luci-app-adblock-fast` / `adblock-fast` | Generic native service summary with lifecycle actions and UCI sections. | Same as banIP. Do not create a bespoke rewrite; use generic UCI/service/file adapters or fall back to LuCI compat. |
| `luci-app-upnp` / `upnpd` | Generic native service summary with lifecycle actions and UCI sections. | Same treatment: adapter first, compat fallback always. |
| `luci-app-uhttpd` / `uhttpd` | Generic native service summary with lifecycle actions and UCI sections. | Treat as a LuCI app despite being system-adjacent. Native adapter can exist, but LuCI compat remains fallback. |
| `luci-app-commands` | Generic native UCI summary; no command execution/config UI replacement yet. | Preserve LuCI app through compat. Native command runner/editor should be a reusable command adapter, not a bespoke page. |
| `luci-app-attendedsysupgrade` | Guarded native firmware context only. | Keep LuCI app or official upgrade tool path available until native flow handles image requests, package retention, progress, rollback, and flash confirmation. |
| `luci-app-package-manager` | Native installed package inventory only. | Keep LuCI app available until native package search/install/remove/update has equivalent safeguards and package-manager-specific behavior. |
| `luci-app-firewall` and LuCI core modules | Generic native UCI summaries for network/firewall/system. | Keep compat fallback for advanced forms. Promote native pages only when validation, pending changes, and apply semantics match LuCI behavior. |

Audit decision:

- banIP and AdBlock Fast are both third-party/service-style LuCI apps, so they must be handled through the same compatibility and adapter rules.
- Bespoke rewrites are acceptable only for first-party I Love LuCI shell/dashboard/auth features or for adapter primitives that benefit multiple LuCI apps.
- For every installed LuCI app, route availability is more important than native styling. If native parity is not proven, fallback to LuCI compat.

## Full Route and Future App Audit Plan

The compatibility layer needs a repeatable audit, not a one-time manual check. The audit should run against the router and later become a smoke-test script.

Mandatory workstream:

- Perform a full route audit across every installed LuCI route before release.
- Generate a route inventory artifact from the live router and keep it as the authoritative map from LuCI route to I Love LuCI route handling.
- Confirm compat is configured and working for every current LuCI app, including all child routes exposed by those apps.
- Confirm every route migrated to a native I Love LuCI screen is recorded in the route inventory, mapped back to its LuCI source route or workflow, and covered by native route tests.
- Confirm every migrated native route remains reachable as an I Love LuCI route and has an explicit compat fallback decision, so native migration cannot remove the original LuCI workflow by accident.
- Harden the LuCI app adapter so current and future installed LuCI apps are discovered from menu/ACL metadata instead of hard-coded route lists.
- Add adapter contract tests for current and future LuCI apps: discovery, ACL visibility, navigation/search indexing, direct route loading, session recovery, query-string preservation, child routes, and compat-frame rendering.
- Audit migrated native routes and compat routes together so native coverage cannot grow by silently dropping LuCI app functionality.
- Prove future app install handling is seamless: install a LuCI app from the standard OpenWrt feed, refresh menu/cache state, verify it appears in sidebar/search, verify it opens through compat without code changes, then uninstall it and verify the route disappears cleanly.
- Treat package install, upgrade, removal, and reinstall as first-class adapter scenarios, not edge cases, so future LuCI apps installed through normal OpenWrt tooling remain usable without an I Love LuCI release.
- Treat adapter robustness as a release gate: unknown apps must degrade to LuCI compat, not broken native screens or missing navigation entries.

The audit has two equally important outcomes:

- every installed LuCI route must have a working compatibility path
- every route that has been rebuilt natively must be tracked, validated, and promoted only when it has feature parity for its current scope

Route inventory must become the source of truth for compatibility decisions. It should record each discovered LuCI route, its source package, source menu file, ACL requirements, native migration state, chosen renderer, fallback target, and latest test result. Routes should not be inferred from sidebar rendering alone.

Compatibility evidence must be captured per route, not only per app. Each route entry should show whether compat is configured, whether compat has been exercised successfully on the router, whether a native route exists, whether that native route is production-ready or preview-only, and what happens when the related LuCI app is installed, upgraded, removed, or reinstalled later.

Native migration evidence must also be captured per route. Each native I Love LuCI screen needs a matching LuCI source route or workflow, the data source used by the native route, edit/save/apply parity status, mobile status, and a fallback decision. Native pages should not replace LuCI routes by default until this record exists and the audit proves the compat path still works when needed.

Audit inputs:

- Installed LuCI menu files: `/usr/share/luci/menu.d/*.json`.
- Installed ACL files: `/usr/share/rpcd/acl.d/*.json`.
- Installed packages matching `luci-app-*`, LuCI modules, themes, and packages with service/init scripts.
- I Love LuCI route metadata: `nativeStatus`, `nativeAutoMode`, `configuredMode`, `effectiveMode`, `nativePath`, and legacy target.

Audit checks:

- Every visible LuCI route appears in I Love LuCI navigation/search.
- Every visible LuCI route has compat configured, unless it is explicitly replaced by a fully migrated native route with documented parity.
- Every native I Love LuCI route is mapped back to the LuCI route or workflow it replaces, with fallback behavior documented.
- Every visible route resolves to exactly one working target:
  - native route when `effectiveMode=modern`
  - LuCI compat route when `effectiveMode=legacy`
  - hidden only when explicitly configured hidden or hidden by LuCI metadata
- Every route with `nativeStatus=partial` and incomplete write/action parity defaults to LuCI compat in `auto`.
- Every `luci-app-*` package has all of its menu children represented and defaults to LuCI compat unless a reusable native adapter proves parity.
- Native route migrations are tested route-by-route, including dashboard/status, network, firewall, system, services, package, console, pending-change, and settings surfaces.
- Installing a new LuCI app after I Love LuCI is installed requires no manual migration step: the route scanner should pick it up after cache refresh or service reload.
- Uninstalling a LuCI app removes its routes from navigation/search without leaving dead native links.
- ACL-ineligible routes are not shown as usable routes.
- Parent first-child routing uses the same target as the selected child, including legacy/native mode.
- Search results use the same resolved target as the sidebar.
- Settings route-mode overrides work both directions: explicit `modern` opens native preview when present, explicit `legacy` opens compat.

Native migration checks:

- Maintain a route inventory that marks each LuCI route as `native`, `partial native`, `legacy compat`, or `hidden`.
- Require every native route migrated into I Love LuCI to have an owner entry in the inventory with source LuCI route, native React route, data source, write/apply behavior, mobile test status, and fallback route.
- For native routes, verify the React route renders, uses the intended `rpcd`/UCI data source, and has mobile-safe layout.
- For partial native routes, verify `auto` mode still prefers LuCI compat until missing edit/save/apply flows are complete.
- For migrated first-party routes, test sidebar navigation, search navigation, direct hash URL load, refresh, and session-expired login recovery.
- For write-capable native routes, verify pending changes, save/apply, discard, validation errors, and rollback behavior match LuCI expectations.
- Do not promote a route from partial to native default until the route-specific parity checklist is documented in this file.

LuCI app adapter robustness checks:

- Adapter selection must be deterministic: native adapter first, generic service/UCI/file adapter second, LuCI compat frame last.
- Unknown current and future `luci-app-*` packages must be considered supported through compat unless ACL/menu metadata says otherwise.
- Installing a future LuCI app must not require a code change, rebuild, or manual route mapping for basic navigation and compat rendering.
- Installing, upgrading, removing, or reinstalling LuCI apps must update navigation/search after menu/cache refresh without stale routes, duplicate routes, or broken compat links.
- The adapter must preserve LuCI route parameters, query strings, ACL visibility, auth/session handling, and child-route nesting for current and future installed apps.
- The adapter must not special-case only known apps such as banIP or AdBlock Fast; those apps should validate the generic adapter pattern used for all service-style LuCI apps.
- Route discovery must tolerate new menu files, changed route nesting, missing optional ACL files, package uninstall/reinstall, and renamed init scripts.
- Adapter failures must degrade to LuCI compat instead of showing a broken native screen.
- Cache refresh or service reload must be enough for newly installed LuCI apps to appear in sidebar and search.

Future app handling:

- New LuCI apps should be treated as compatible by default, not unsupported.
- Default path for unknown future apps: discover menu + ACL metadata, show route in navigation/search, open through LuCI compat frame.
- Native support for future apps should come from adapter registration, not editing app-specific special cases into the shell.
- Adapter registration should be data-driven where possible: package id, route prefixes, UCI packages/section types, init scripts, log filters, and whitelisted files.
- Future app install flow should be tested through standard OpenWrt tooling: install package, refresh LuCI menu/cache state, verify sidebar/search/route open, remove package, verify cleanup.

Required tooling:

- `scripts/audit-router-routes.sh` calls `ubus call luci.iloveluci menu_tree`, compares it with installed LuCI menu files, and reports:
  - missing routes
  - dead legacy targets
  - dead native targets
  - native preview paths that do not match known I Love LuCI shell route patterns
  - partial routes that incorrectly default to modern
  - LuCI app routes without compat fallback
- `scripts/audit-router-native-pages.sh` calls representative `core_settings`, `native_page`, `service_detail`, `console_status`, and `changes_list` RPCs on the router and reports:
  - core network/DHCP/firewall/system payload regressions
  - native page RPC failures
  - missing command/section/service/text/package data for known native routes
  - service adapter detail failures
  - focused service-preview data source failures such as missing banIP file/log summaries
  - missing service enabled/running state
  - console bridge availability, URL, helper credential, and ttyd path regressions
  - pending-change bridge shape regressions
- `scripts/smoke-router-http-routes.sh` logs into LuCI over HTTP using the React/Vite login form contract and reports:
  - login shell missing the React/Vite app bundle
  - authenticated app shell failing to load
  - visible native routes whose shell target fails
  - visible legacy compat routes that return login, 404, dispatch failure, or HTTP errors
- Add browser smoke coverage for representative route types:
  - supported native core route
  - partial native preview forced to modern
  - third-party LuCI app auto route opening compat
  - search result opening same target as sidebar
  - newly installed test LuCI app appearing after refresh

Acceptance gate:

- The standalone split is not ready until this audit passes for currently installed LuCI apps and at least one newly installed LuCI app after installation.
- The release is not ready until every installed `luci-app-*` package has confirmed compat coverage and every native replacement route has confirmed I Love LuCI test coverage.
- Future app handling must be proven with an install/remove/reinstall smoke test for a LuCI app that was not hard-coded into I Love LuCI.
- Native migration is not complete until every migrated route has parity evidence and every non-migrated or partial route has a working LuCI compat fallback.
- Future installed apps are considered supported only when navigation, search, ACL visibility, direct route load, session recovery, and compat rendering all work without an I Love LuCI code change.
- Latest router audit on `172.16.172.1` passed with `visible_routes=60`, `modern=42`, `legacy=18`, `menu_files=15`, and `luci_apps=9`.

Final release/test gate:

- Merge validated work through PR into `main`.
- Publish package/feed artifacts from GitHub.
- Install the GitHub-published package on `172.16.172.1`, not a local file copy.
- Run the full route audit against the installed release package.
- Confirm all LuCI apps have working compat routes unless a native route has documented parity and test evidence.
- Confirm all routes migrated to native I Love LuCI screens are present in the route inventory and covered by browser smoke tests.
- Install a fresh LuCI app from the OpenWrt feed, refresh menu/cache state, confirm it appears in sidebar/search, opens through compat, then uninstall it and confirm routes disappear cleanly.
- Browser-smoke every visible route target at least once:
  - native route renders expected title/content
  - compat route renders framed LuCI content
  - search and sidebar resolve to the same target
  - login uses React/Vite bundle after session expiry
  - console opens without re-entering router credentials
- Do not mark this project complete until the GitHub-installed package passes the route audit.

## Login Conversion

`sysauth.ut` is overridden by this package and now loads the same React/Vite bundle as the app shell in `login` mode. LuCI prefers the active theme login template, so the package also installs `themes/i-love-luci/sysauth.ut`; this is the path validated on the router. The login template exposes `data-iloveluci-login="true"` on `body` so the external bundle can detect login mode even if LuCI or browser policy prevents the inline configuration script from persisting.

The React login form posts the standard LuCI fields:

- `luci_username`
- `luci_password`

The server remains the source of truth for authentication. The React form does not create sessions client-side. Password focus is applied automatically when the username is already populated. Browser validation confirmed the React login renders, focuses the password field, submits to LuCI, and loads the app dashboard after authentication.

## Console Access Strategy

Current implementation:

- `ttyd` is installed as a package dependency and configured by `90_luci-app-i-love-luci`.
- The command is `/bin/login -f root`, so the terminal session does not ask for the root password after ttyd accepts the helper credential.
- `console_status` reads the generated ttyd credential from UCI and the header opens the terminal URL with embedded basic-auth credentials.
- This means the user does not need to manually provide credentials again.

Security gap:

- The ttyd helper credential is long-lived while stored in UCI, and embedding it in a URL can expose it in browser history or logs.

Preferred future helper:

- Bind ttyd to localhost or a private interface.
- Add a small LuCI-session-protected websocket proxy or helper service that validates the LuCI session cookie and forwards to ttyd.
- Issue short-lived one-time console tokens through `rpcd`; the browser opens `/cgi-bin/luci/admin/i-love-luci/console/<token>` without basic-auth credentials.
- Rotate or expire tokens after first use and log console opens through syslog.

Until that helper exists, the current ttyd integration is acceptable for trusted LAN testing but should be documented as a convenience bridge, not a hardened remote console.

Router smoke tests should be manual at first. Add scheduled or self-hosted CI only after a stable test router/VM exists.

## Initial Spike Deliverables

1. Package skeleton for `luci-app-i-love-luci`.
2. Vite React TypeScript shell with Tailwind v4.
3. shadcn component setup with local `components/ui`.
4. App shell with sidebar/header/search/profile/toasts.
5. Legacy iframe route working against existing LuCI.
6. Stub native dashboard route.
7. Stub login/MFA flow with server API contract documented.
8. `rpcd` bridge stub returning menu/session metadata.
9. CI updates to build frontend assets before package build.
10. Router install instructions and rollback path.
11. Documented test plan with secondary `uhttpd` test-port workflow.
12. Full route/app compatibility audit proving current LuCI apps, future installed LuCI apps, and migrated native I Love LuCI routes all resolve through the correct adapter or compat path.

## Open Questions

1. Should `I Love LuCI` replace `/cgi-bin/luci/admin` as default after login, or live under `/cgi-bin/luci/admin/i-love-luci` until stable?
2. Should legacy routes open in iframe by default, or should users have a setting to open them in classic LuCI?
3. Should MFA be mandatory for `root`, optional per user, or disabled by default?
4. Should secrets live in UCI, a root-only JSON file, or a small dedicated auth store?
5. Should WebAuthn/passkey support be a separate optional package to avoid increasing base dependency size?
6. Should Vite-built assets be committed, generated in CI only, or both?

## Recommended Delivery Order

1. Build shell and legacy iframe bridge first.
2. Add typed RPC client and session/menu endpoint.
3. Add toast/pending changes flows.
4. Add native dashboard/status overview.
5. Add MFA setup/verify prototype behind a disabled-by-default setting.
6. Decide whether passkey support is worth a separate package.

## Decision

Proceed with a hybrid replacement:

- Keep LuCI backend and package ecosystem.
- Build modern React shell as `luci-app-i-love-luci`.
- Use iframe bridge for universal legacy compatibility.
- Rebuild important routes natively over time.
- Plan a standalone `i-love-luci` package and make LuCI compatibility optional once enough native screens exist.

This is practical, testable, and reversible.
