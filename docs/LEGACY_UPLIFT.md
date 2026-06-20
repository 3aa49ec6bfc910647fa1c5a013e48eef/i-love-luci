# Legacy LuCI Uplift Plan

## Purpose

This document audits the default LuCI surface that the modern `luci-app-i-love-luci` shell must cover, and proposes a migration model that keeps every legacy screen reachable until a native React replacement is proven.

The target is not a hard fork of LuCI. The target is a hybrid app:

- enumerate the installed LuCI menu tree from OpenWrt itself
- render unsupported routes through the legacy iframe bridge
- render supported routes with modern React components
- let each route be toggled between `auto`, `modern`, `legacy`, and optionally `hidden`
- redirect legacy requests to the modern route once a page is migrated, while keeping a fallback escape hatch

## Evidence

Audit sources used:

- live router menu JSON from `/usr/share/luci/menu.d/*.json`
- OpenWrt 25.12.4 SDK LuCI source under `build/sdk-ci/openwrt-sdk-25.12.4-*/feeds/luci/`
- current app shell under `applications/luci-app-i-love-luci/frontend/shell/`

Key upstream LuCI source paths:

- `modules/luci-base/root/usr/share/luci/menu.d/luci-base.json`
- `modules/luci-mod-status/root/usr/share/luci/menu.d/luci-mod-status.json`
- `modules/luci-mod-system/root/usr/share/luci/menu.d/luci-mod-system.json`
- `modules/luci-mod-network/root/usr/share/luci/menu.d/luci-mod-network.json`
- `modules/luci-mod-status/root/usr/share/rpcd/acl.d/*.json`
- `modules/luci-mod-system/root/usr/share/rpcd/acl.d/*.json`
- `modules/luci-mod-network/root/usr/share/rpcd/acl.d/*.json`

## Current Gap

The modern app currently exposes a hardcoded flat sidebar:

- Dashboard
- Status overview
- Network
- DHCP and DNS
- Settings

The bridge RPC `menu_tree` also returns a hardcoded small list. This means lower-level LuCI screens such as `Status > Logs > Kernel Log`, `Status > Realtime Graphs > Connections`, `System > Administration > SSH Access`, `Network > DNS`, and installed app child pages are not discoverable through the modern shell.

Current legacy fallback still works if a correct path is manually opened:

```text
#/legacy?path=/admin/status/logs/dmesg
```

The issue is discovery and navigation, not the iframe bridge itself.

## Default Menu Surface

Default LuCI is data-driven. Menu entries come from JSON files in `/usr/share/luci/menu.d/`. Actions can be:

- `firstchild`: parent route redirects to first eligible child
- `alias`: route redirects to another path
- `view`: JavaScript view under `/luci-static/resources/view/...`
- `template`: ucode template
- `function` or `call`: controller action

The modern app must preserve these semantics when building its route index.

### Base Shell Routes

| Route | Title | Action | Modern handling |
| --- | --- | --- | --- |
| `/admin` | Administration | firstchild recurse | resolve to first visible top-level child |
| `/admin/status` | Status | firstchild preferred `overview` | section parent, route to `/admin/status/overview` |
| `/admin/system` | System | firstchild preferred `system` | section parent, route to `/admin/system/system` |
| `/admin/services` | Services | firstchild recurse | enumerate installed service apps |
| `/admin/network` | Network | firstchild recurse | section parent, route to `/admin/network/network` |
| `/admin/vpn` | VPN | firstchild recurse | enumerate installed VPN apps |
| `/admin/logout` | Log out | function | profile menu only, not sidebar |
| `/admin/uci/*` | Apply/revert APIs | function | modern pending-change service, no nav item |
| `/admin/menu` | Menu API | function | potential source for menu enumeration |

## Status Section Audit

| Route | Title | Legacy action | Core data points | Proposed modern replacement | Priority |
| --- | --- | --- | --- | --- | --- |
| `/admin/status/overview` | Overview | template + dynamic include JS | board, release, kernel, local time, uptime, load, memory, root/tmp storage, WAN/WAN6, ports, leases, DSL, Wi-Fi | Already started as Dashboard; expand into full status overview modules | P0 |
| `/admin/status/routes` | Routing | view `status/routes` | `network.interface dump`, `ip neigh`, `ip route`, `ip rule`, fingerprint/ufp data | Read-only routing tables with filters, grouped IPv4/IPv6 tabs | P2 |
| `/admin/status/routesj` | Routing | view `status/routesj` | JSON `ip -j neigh/route/rule`, `network.interface dump`, fingerprint/ufp data | Same UI as routes, prefer JSON path when available | P2 |
| `/admin/status/iptables` | Firewall | view `status/iptables` | iptables/ip6tables tables, counters, reset counters, firewall restart | Legacy until nft/iptables abstraction exists | P3 |
| `/admin/status/nftables` | Firewall | view `status/nftables` | `nft --json list ruleset`, iptables-save compatibility data | Native nft ruleset browser after firewall app migration | P3 |
| `/admin/status/logs` | System Log | alias to syslog | no page of its own | route alias only | P1 |
| `/admin/status/logs/syslog` | System Log | view `status/syslog` | log stream/read from log service or syslog wrapper | Virtualized log viewer with severity search and copy/download | P1 |
| `/admin/status/logs/dmesg` | Kernel Log | view `status/dmesg` | `dmesg -r`, polling | Virtualized kernel log viewer with severity filters | P1 |
| `/admin/status/processes` | Processes | view `status/processes` | `luci.getProcessList`, kill signal action | Process table with CPU/memory columns and confirm-kill dialog | P2 |
| `/admin/status/channel_analysis` | Channel Analysis | view `status/channel_analysis` | `iwinfo info/freqlist/scan`, Wi-Fi devices | Wireless channel heatmap/table; only when Wi-Fi exists | P3 |
| `/admin/status/realtime` | Realtime Graphs | alias to load | route alias only | route alias only | P1 |
| `/admin/status/realtime/load` | Load | view `status/load` | `luci.getRealtimeStats('load')` | Chart.js load/CPU panel, can merge into Dashboard | P1 |
| `/admin/status/realtime/bandwidth` | Bandwidth | view `status/bandwidth` | network devices + `luci.getRealtimeStats('interface')` | Chart.js bandwidth per interface, can merge into Dashboard | P1 |
| `/admin/status/realtime/wireless` | Wireless | view `status/wireless` | Wi-Fi devices + `luci.getRealtimeStats('wireless')` | Wireless realtime chart, only when Wi-Fi exists | P3 |
| `/admin/status/realtime/connections` | Connections | view `status/connections` | conntrack list/stats, DNS reverse lookup, DHCP leases, `/etc/services` | Connections table with search, host enrichment, protocol grouping | P2 |

### Status Data Notes

The current Dashboard already covers part of `/admin/status/overview` using:

- `system board`
- `system info`
- `network.device status`

To match default Overview fully, add:

- `luci.getVersion`
- `luci.getUnixtime`
- `luci.getMountPoints`
- `luci-rpc.getDHCPLeases`
- `luci-rpc.getHostHints`
- `luci.getBuiltinEthernetPorts`
- `/etc/board.json`
- optional `dsl.metrics`
- optional `iwinfo.assoclist`
- optional `luci.getOdhcp6cStats`

## System Section Audit

| Route | Title | Legacy action | Core data points | Proposed modern replacement | Priority |
| --- | --- | --- | --- | --- | --- |
| `/admin/system/system` | System | view `system/system` | UCI `system`, UCI `luci`, timezones, `luci.getUnixtime`, `luci.setLocaltime`, `rc list/init sysntpd` | Settings page with tabs for identity, time, language/theme, NTP | P1 |
| `/admin/system/admin` | Administration | firstchild | no page of its own | Parent route resolves to native router password form | Done |
| `/admin/system/admin/password` | Router Password | view `system/password` | `luci.setPassword`, validation only | Implemented native password form with strength/confirmation and success/error toast | Done |
| `/admin/system/admin/dropbear` | SSH Access | form map `dropbear` | UCI `dropbear` | Native main-instance SSH editor implemented; add/remove instance parity remains | Partial |
| `/admin/system/admin/sshkeys` | SSH-Keys | view `system/sshkeys` | `/etc/dropbear/authorized_keys` read/write | Key list with add/import/delete and fingerprint display | P2 |
| `/admin/system/admin/uhttpd` | HTTP(S) Access | form map `uhttpd` | UCI `uhttpd` | Native uHTTPd listener/TLS settings after config schema exists | P3 |
| `/admin/system/admin/repokeys` | Repo Public Keys | view `system/repokeys` | `/etc/apk/keys/*`, `/etc/opkg/keys/*` read/write | Key manager with package-manager tie-in | P3 |
| `/admin/system/startup` | Startup | view `system/startup` | `rc list/init`, `/etc/rc.local` read/write | Implemented native init script actions and `/etc/rc.local` editor | Done |
| `/admin/system/crontab` | Scheduled Tasks | view `system/crontab` | `/etc/crontabs/root` read/write, cron reload | Cron editor with validation and reload toast | P2 |
| `/admin/system/mounts` | Mount Points | view `system/mounts` | UCI `fstab`, block devices, mount points, block detect, mount/umount | Storage manager; legacy until block operations are wrapped safely | P3 |
| `/admin/system/leds` | LED Configuration | view `system/leds` | UCI `system`, `luci.getLEDs`, LED trigger modules | Native LED action add/edit/remove implemented; sortable order and plugin-specific trigger forms remain | Partial |
| `/admin/system/flash` | Backup / Flash Firmware | view `system/flash` | backup download/upload, sysupgrade validate/test/run, `/etc/sysupgrade.conf` | Native upgrade wizard only after extensive safety testing | P4 |
| `/admin/system/reboot` | Reboot | view `system/reboot` | UCI changes, `system.reboot` or `/sbin/reboot` | Native confirmation dialog showing pending changes | P2 |

### System Data Notes

System routes mix low-risk UCI forms and high-risk command flows. Modern migration should start with read/write UCI screens that have obvious rollback through normal LuCI apply:

1. System settings
2. Dropbear SSH multiple-instance parity

Delay flash, mounts, and uHTTPd until the modern shell has robust operation progress, reconnect detection, and rollback messaging.

## Network Section Audit

| Route | Title | Legacy action | Core data points | Proposed modern replacement | Priority |
| --- | --- | --- | --- | --- | --- |
| `/admin/network/network` | Interfaces | view `network/interfaces` | UCI `network`, `dhcp`, `firewall`, protocol plugins, netifd status, device status | Interface overview first, edit wizard later | P0/P1 |
| `/admin/network/wireless` | Wireless | view `network/wireless` | UCI `wireless`, UCI `network`, `iwinfo`, hostapd actions, scans | Legacy until Wi-Fi hardware exists in test matrix | P3 |
| `/admin/network/switch` | Switch | view `network/switch` | UCI `network`, swconfig features/port state | Legacy; swconfig is device-specific and often absent on DSA devices | P4 |
| `/admin/network/routes` | Routing | view `network/routes` | UCI `network`, network devices, IPv4/IPv6 routes/rules | Native route/rule editor after read-only status routes | P2 |
| `/admin/network/dhcp` | DHCP | view `network/dhcp` | UCI `dhcp`, leases, DUID hints, host hints, network devices, dnsmasq/odhcpd service status | Native DHCP/DNS app split into leases, server settings, static leases | P0 |
| `/admin/network/dns` | DNS | view `network/dns` | UCI `dhcp`, host hints | Native DNS records/forwarding/resolver settings | P1 |
| `/admin/network/diagnostics` | Diagnostics | view `network/diagnostics` | ping, ping6, traceroute, nslookup, arp-scan, default targets from UCI `luci` | Native command runner with streaming output and history | P1 |

### Network Data Notes

Network is highest value but highest risk. Split it:

- P0: read-only interface status and DHCP leases/static lease shortcuts
- P1: DNS and diagnostics
- P2: route editor and interface edit basics
- P3/P4: wireless, switch, firewall-like device flows

Do not attempt to port the full `network/interfaces.js` form in one pass. It is a large dynamic form with protocol plugins, device widgets, firewall zone integration, and netifd operations.

## Optional Installed App Surface

The live router also has installed app menus such as:

- `luci-app-adblock-fast`
- `luci-app-attendedsysupgrade`
- `luci-app-banip`
- `luci-app-commands`
- `luci-app-firewall`
- `luci-app-package-manager`
- `luci-app-uhttpd`
- `luci-app-upnp`

These are not default core screens, but the modern shell must enumerate them and default them to legacy. Native replacements should be considered app-by-app after the default core sections are stable.

## Menu Enumeration Design

Add a backend method:

```text
luci.iloveluci.menu_tree
```

It should stop returning hardcoded entries and instead read real menu JSON from `/usr/share/luci/menu.d/*.json`.

Recommended returned shape:

```ts
type ModernRouteMode = "auto" | "modern" | "legacy" | "hidden";

type LuCIMenuEntry = {
  id: string;                 // stable slug from path
  path: string;               // /admin/network/dhcp
  title: string;
  order: number;
  depth: number;
  parentPath?: string;
  actionType: "firstchild" | "alias" | "view" | "template" | "function" | "call" | "unknown";
  actionPath?: string;        // view/template path or alias target
  firstChildPath?: string;
  preferredChild?: string;
  eligible: boolean;          // dependency check result
  hasChildren: boolean;
  nativeComponent?: string;   // e.g. DashboardPage, DhcpPage
  nativeStatus: "supported" | "partial" | "unsupported";
  configuredMode: ModernRouteMode;
  effectiveMode: "modern" | "legacy" | "hidden";
};
```

Enumeration rules:

- parse all installed menu JSON files
- normalize `admin/foo` to `/admin/foo`
- remove auth/API-only routes from navigation unless explicitly needed (`/admin/uci/*`, `/admin/ubus/*`, translations, logout)
- evaluate `depends` where practical: ACL, UCI config presence, filesystem path checks
- retain ineligible entries in debug/admin settings but hide from normal nav
- resolve `alias` and `firstchild` so parent clicks navigate to usable pages
- keep wildcard routes searchable only when a concrete child or user-supplied parameter exists
- sort by `order`, then title
- emit a tree for sidebar and a flat index for search

## Route Toggle Design

Add a UCI package:

```text
config route '/admin/status/overview'
  option mode 'modern'

config route '/admin/network/dhcp'
  option mode 'auto'

config route '/admin/system/flash'
  option mode 'legacy'
```

Modes:

- `auto`: use modern if `nativeStatus` is `supported`; otherwise legacy
- `modern`: force modern when available, otherwise show disabled warning and fall back to legacy
- `legacy`: always use iframe bridge
- `hidden`: hide from modern shell navigation/search, but do not delete LuCI route

Resolution:

```text
requested path -> menu entry -> route config -> native registry -> effective renderer
```

Behavior:

- If modern is supported and effective mode is modern, route to the native React path.
- If modern is unsupported, always route to `LegacyFrame`.
- If a user directly opens `/legacy?path=<migrated-route>`, show a small "Open modern version" affordance unless mode is forced legacy.
- Do not remove or mutate original LuCI menu files for default routes. The old routes remain fallback and direct-access recovery.
- Once confidence is high, the modern shell can hide migrated legacy entries from its own search/sidebar by resolving them to native routes.

This satisfies selective disabling without breaking third-party apps or emergency recovery.

## Native Route Registry

Keep a typed registry in the app:

```ts
const nativeRoutes = {
  "/admin/status/overview": {
    component: "DashboardPage",
    status: "partial",
    dataContract: "dashboard_status",
  },
  "/admin/network/dhcp": {
    component: "DhcpPage",
    status: "planned",
    dataContract: "dhcp_status",
  },
} as const;
```

The registry should drive:

- route resolution
- settings toggle UI
- migration status in admin settings
- search result labels
- test coverage requirements

## Route Compatibility Settings UI

Add a "Route compatibility" section to the modern Settings page.

Expected controls:

- filter by section: Status, System, Network, Services, VPN, Other
- search route/title
- show route status: Modern, Partial, Legacy
- toggle mode: Auto, Modern, Legacy, Hidden
- reset route to default
- export debug JSON for support

Safety:

- default all unknown routes to `auto`
- default all unsupported routes to legacy
- show warning when forcing modern for a partial page
- never hide the settings route itself
- never hide all routes in a section

## Replacement Principles

Use modern components consistently:

- `PageHeader` for title, description, actions
- `Tabs` for top-level page modes
- `DataTable` for dense status/config tables
- `Card` only for discrete summary panels, not nested page layout
- `Dialog` for confirmation and destructive operations
- `Sonner` for saved/applied/failed notifications
- `Badge` for connection, service, and migration status
- `Select`, `Switch`, `Input`, `Textarea` wrappers for forms
- Chart.js for live telemetry and historical samples

Avoid:

- cloning LuCI form markup directly
- rebuilding every option from a giant legacy JS file in one page
- direct shell command calls from the browser
- hiding fallback legacy routes before modern parity is proven

## Migration Plan

### Phase 0: Navigation Completeness

Deliver:

- dynamic menu enumeration from `/usr/share/luci/menu.d/*.json`
- hierarchical sidebar with collapsible groups
- search over every eligible installed LuCI route
- parent route first-child/alias handling
- route mode registry and UCI persistence
- `auto/modern/legacy/hidden` settings UI

This fixes lower-level screen access before more page rewrites.

### Phase 1: Status Native Parity

Deliver:

- finish Dashboard parity with default Overview data
- add Status Logs native route
- add Realtime Load/Bandwidth native route
- add Processes native route
- add Connections read-only route

Keep firewall, channel analysis, and wireless realtime in legacy until required data and device coverage exist.

### Phase 2: Network Read-Only + Safe Actions

Deliver:

- interfaces overview read-only
- DHCP leases + static lease save flow
- DNS records/forwarding basics
- diagnostics command runner
- routing read-only, then route editor

Keep full interface edit, wireless, and switch in legacy until per-feature test devices exist.

### Phase 3: System Configuration

Deliver:

- system identity/time/theme/language/NTP
- router password completed through a native `luci.setPassword` bridge
- SSH access main-instance editor and SSH keys completed; Dropbear add/remove instance parity remains
- startup services and rc.local completed through native init actions and editor
- LED action add/edit/remove completed; sortable order and plugin-specific LED trigger forms remain
- crontab editor
- reboot dialog

Keep mount points, repo keys, uHTTPd, and flash in legacy until operation safety is designed.

### Phase 4: High-Risk Operations

Deliver only after explicit safety work:

- backup/restore
- firmware validation/upload/sysupgrade
- mount/unmount/block detect
- uHTTPd listener/TLS changes
- firewall status/config native pages

Required safeguards:

- operation progress modal
- reconnect detection
- rollback/confirm handling
- clear "router may become unreachable" warnings
- manual recovery instructions
- router-specific test matrix

## Testing Strategy

For every migrated route:

- verify legacy route still opens when forced legacy
- verify native route opens when mode auto/modern
- verify mobile at 390 x 844 has no horizontal page overflow
- verify desktop at 1280 x 800 has no overlapping header/sidebar/content
- verify search finds the route and opens the expected renderer
- verify parent menu item routes to first eligible child
- verify direct URL load works
- verify pending UCI changes appear in header when a native form changes config
- verify save/cancel/apply flow matches simplified-save setting
- verify route-specific ACL failures show a useful error and offer legacy fallback

For menu enumeration:

- install optional LuCI apps and confirm they appear as legacy
- uninstall or disable optional dependencies and confirm entries hide
- verify wildcard and function-only routes are not exposed as broken nav entries
- verify route mode UCI survives browser/device changes

## Recommended Next Implementation Order

1. Replace hardcoded `menu_tree` with dynamic menu enumeration.
2. Replace hardcoded sidebar items with the returned tree.
3. Add route resolver and native route registry.
4. Add route compatibility settings with persisted modes.
5. Expand Dashboard to full `/admin/status/overview` parity.
6. Add native System Log and Kernel Log.
7. Add DHCP leases/static leases as the first real network config page.

This order fixes discoverability first and keeps all old LuCI routes available while native pages land.
