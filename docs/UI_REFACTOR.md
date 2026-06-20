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
- `/admin/status/routes`: route tables, rules, and neighbour entries.
- `/admin/status/nftables`: active nftables ruleset summary.
- `/admin/status/logs`, `/admin/status/logs/syslog`, `/admin/status/logs/dmesg`: system and kernel logs.
- `/admin/status/processes`: process list.
- `/admin/status/realtime/load` and `/admin/status/realtime/bandwidth`: covered by the dashboard charts.
- `/admin/status/realtime/connections`: active sockets.
- `/admin/status/realtime/wireless` and `/admin/status/channel_analysis`: guarded wireless status surface; on the current router it validates the no-radio/no-`iw` case.
- `/admin/network/network`, `/admin/network/routes`, `/admin/network/dhcp`, `/admin/network/dns`, `/admin/network/firewall` and firewall child routes: modern read-only UCI summaries, with live interface status where available.
- `/admin/network/wireless`: guarded wireless configuration/status surface.
- `/admin/network/diagnostics`: ping, traceroute, DNS lookup, route table, and resolver view.
- `/admin/system/system` and `/admin/system/admin`: modern read-only UCI summaries.
- `/admin/system/admin/dropbear`: Dropbear service status and UCI summary.
- `/admin/system/admin/sshkeys`: Dropbear authorized keys editor.
- `/admin/system/admin/uhttpd`: uHTTPd service status and UCI summary.
- `/admin/system/admin/repokeys`: installed package repository public keys.
- `/admin/system/attendedsysupgrade` and children: guarded firmware compatibility context and attended sysupgrade configuration. Auto mode defaults to LuCI compat until native image build, progress, package retention, rollback, and flash confirmation reach parity.
- `/admin/system/package-manager`: installed package inventory. Auto mode defaults to LuCI compat until native package search/install/remove/update reaches parity.
- `/admin/system/startup`: init script enabled/running state with native enable, disable, start, stop, and restart actions.
- `/admin/system/crontab`: root crontab editor with cron reload after save.
- `/admin/system/flash`: read-only filesystem and flash partition overview.
- `/admin/system/leds`: LED trigger configuration and current sysfs LED state.
- `/admin/system/reboot`: guarded modern surface; destructive reboot action is intentionally disabled until a confirmation RPC is added.
- `/admin/system/commands` and children: modern read-only UCI summary for custom commands. Auto mode defaults to LuCI compat until command execution/config editing reaches parity.
- `/admin/system/i-love-luci-theme`: native I Love LuCI settings.
- `/admin/services`: service overview with native lifecycle actions where an init script exists. Auto mode defaults to LuCI compat for service-app routes until adapter parity is proven.
- `/admin/services/banip` and child routes: service status, lifecycle actions, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/adblock-fast`: service status, lifecycle actions, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/upnp`: service status, lifecycle actions, and UCI summary are available as native preview; auto mode defaults to LuCI compat.
- `/admin/services/uhttpd`: uHTTPd service status, lifecycle actions, and UCI summary are available as native preview; auto mode defaults to LuCI compat.

Validation on `172.16.172.1`:

- All visible LuCI menu routes have either a native route or a LuCI compat route. Service/package LuCI apps with incomplete native parity default to `legacy` effective mode in `auto`, so full LuCI functionality remains available.
- `native_page` returned successfully for `status-routes`, `firewall-status`, `logs`, `processes`, `connections`, `wireless`, `diagnostics`, `attendedsysupgrade`, `packages`, `startup`, `crontab`, `sshkeys`, `repokeys`, `leds`, `flash`, `services`, and `reboot`.
- `crontab_save` saved through the native bridge and reloaded cron on `172.16.172.1`; the test router had no existing root crontab entries.
- `native_page` returned `sshkeys` successfully. The router currently has no `/etc/dropbear/authorized_keys`, so save was not exercised to avoid creating an empty file during validation.
- `service_detail` returned successfully for `banip`, `adblock-fast`, `upnpd`, `commands`, `uhttpd`, and `dropbear`.
- `service_action` and `startup_action` returned current state for `uhttpd` with non-mutating `status`; invalid init names are rejected.
- Browser smoke test loaded `#/native/services` and rendered the service overview with the flattened native layout.
- Browser smoke tests loaded `#/native/wireless` and `#/native/attendedsysupgrade`.
- Browser smoke test loaded `#/native/service/uhttpd` and rendered lifecycle action buttons.
- Browser smoke tests loaded `#/native/repokeys` and `#/native/leds` on the router.
- Menu policy validation confirmed incomplete LuCI app routes such as banIP, AdBlock Fast, UPnP, uHTTPd, custom commands, attended sysupgrade, and package manager default to LuCI compat in auto mode while keeping native preview routes available for explicit `modern` selection.

Remaining legacy or partial gaps:

- Wireless-specific pages are native but partial. The current test router has no active wireless stack and lacks `iw`/`iwinfo`, so radio scanning, channel analysis, and association lists could not be validated.
- Attended sysupgrade has a native guarded/read-only preview. Auto mode uses LuCI compat. Image requests, build progress, package compatibility replacement, and flash handoff still need dedicated UX and rollback checks before enabling native default.
- Firmware backup/flash and reboot destructive actions remain guarded/read-only. Native actions need dedicated confirmation RPCs, progress reporting, and rollback messaging.
- Package install/remove/update remains LuCI compat by default. Current native package screen is inventory-only and available only when a route is explicitly forced to modern.
- Advanced service editors for banIP, AdBlock Fast, UPnP, custom commands, Dropbear, and uHTTPd remain LuCI compat by default unless explicit native mode is selected. Generic service lifecycle and UCI summaries exist as native previews, but native config forms should be adapter-based and should land only after pending-change/apply flow is complete.
- Save/apply, apply unchecked, reset, and page-specific form validation are not yet universally native.

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

Audit inputs:

- Installed LuCI menu files: `/usr/share/luci/menu.d/*.json`.
- Installed ACL files: `/usr/share/rpcd/acl.d/*.json`.
- Installed packages matching `luci-app-*`, LuCI modules, themes, and packages with service/init scripts.
- I Love LuCI route metadata: `nativeStatus`, `nativeAutoMode`, `configuredMode`, `effectiveMode`, `nativePath`, and legacy target.

Audit checks:

- Every visible LuCI route appears in I Love LuCI navigation/search.
- Every visible route resolves to exactly one working target:
  - native route when `effectiveMode=modern`
  - LuCI compat route when `effectiveMode=legacy`
  - hidden only when explicitly configured hidden or hidden by LuCI metadata
- Every route with `nativeStatus=partial` and incomplete write/action parity defaults to LuCI compat in `auto`.
- Every `luci-app-*` package has all of its menu children represented and defaults to LuCI compat unless a reusable native adapter proves parity.
- Installing a new LuCI app after I Love LuCI is installed requires no manual migration step: the route scanner should pick it up after cache refresh or service reload.
- Uninstalling a LuCI app removes its routes from navigation/search without leaving dead native links.
- ACL-ineligible routes are not shown as usable routes.
- Parent first-child routing uses the same target as the selected child, including legacy/native mode.
- Search results use the same resolved target as the sidebar.
- Settings route-mode overrides work both directions: explicit `modern` opens native preview when present, explicit `legacy` opens compat.

Future app handling:

- New LuCI apps should be treated as compatible by default, not unsupported.
- Default path for unknown future apps: discover menu + ACL metadata, show route in navigation/search, open through LuCI compat frame.
- Native support for future apps should come from adapter registration, not editing app-specific special cases into the shell.
- Adapter registration should be data-driven where possible: package id, route prefixes, UCI packages/section types, init scripts, log filters, and whitelisted files.

Required tooling:

- `scripts/audit-router-routes.sh` calls `ubus call luci.iloveluci menu_tree`, compares it with installed LuCI menu files, and reports:
  - missing routes
  - dead legacy targets
  - dead native targets
  - partial routes that incorrectly default to modern
  - LuCI app routes without compat fallback
- Add browser smoke coverage for representative route types:
  - supported native core route
  - partial native preview forced to modern
  - third-party LuCI app auto route opening compat
  - search result opening same target as sidebar
  - newly installed test LuCI app appearing after refresh

Acceptance gate:

- The standalone split is not ready until this audit passes for currently installed LuCI apps and at least one newly installed LuCI app after installation.
- Latest router audit on `172.16.172.1` passed with `visible_routes=60`, `modern=41`, `legacy=19`, `menu_files=15`, and `luci_apps=9`.

Final release/test gate:

- Merge validated work through PR into `main`.
- Publish package/feed artifacts from GitHub.
- Install the GitHub-published package on `172.16.172.1`, not a local file copy.
- Run the full route audit against the installed release package.
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
