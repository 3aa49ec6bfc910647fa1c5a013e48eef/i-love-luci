# I Love LuCI Modern UI Spike

## Goal

Build a modern `I Love LuCI` application shell that can sit beside existing LuCI, provide a better UI/UX for core workflows, and bridge back to legacy LuCI apps when a page has not been rebuilt natively.

This spike should prove the architecture before rewriting pages. The first target is a package named `luci-app-i-love-luci`, with the existing `luci-theme-i-love-luci` retained as the fallback theme for legacy pages and iframe-mounted compatibility views.

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
- themes live in `themes/luci-theme-*`
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
  src/
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
- mobile-first sidebar/search behavior
- no card-in-card layout
- no sensitive router values in docs/screenshots

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
cd applications/luci-app-i-love-luci/src/shell
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

CI should:

- install frontend dependencies
- lint/typecheck frontend
- build Vite assets
- verify generated static assets exist
- build OpenWrt package for supported targets
- publish only from `main`

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

## Open Questions

1. Should `I Love LuCI` replace `/cgi-bin/luci/admin` as default after login, or live under `/cgi-bin/luci/admin/i-love-luci` until stable?
2. Should legacy routes open in iframe by default, or should users have a setting to open them in classic LuCI?
3. Should MFA be mandatory for `root`, optional per user, or disabled by default?
4. Should secrets live in UCI, a root-only JSON file, or a small dedicated auth store?
5. Should WebAuthn/passkey support be a separate optional package to avoid increasing base dependency size?
6. Should Vite-built assets be committed, generated in CI only, or both?

## Recommended Spike Order

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
- Keep `luci-theme-i-love-luci` as fallback styling for classic/iframe pages.

This is practical, testable, and reversible.
