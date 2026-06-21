# I Love LuCI Route Inventory

Generated from `ubus call luci.iloveluci menu_tree` on router `172.16.172.1`.

This inventory records the current user-facing renderer decision for every visible LuCI menu route on the test router. `Native` routes expose an I Love LuCI `nativePath`; `LuCI compat` routes open the LuCI compatibility frame and must keep full legacy behavior until native parity is proven.

| Route | Title | Renderer | Target | Parity | Fallback | Latest test | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin/status` | Status | Native | `/` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/status/overview` |
| `/admin/system` | System | Native | `/core/system` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/system/system` |
| `/admin/services` | Services | Native | `/native/services` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/services/banip` |
| `/admin/network` | Network | LuCI compat | `/admin/network/network` | native parity not proven | LuCI compat primary | live menu audit | route; first child `/admin/network/network`; native adapter evidence retained; user route stays compat |
| `/admin/status/overview` | Overview | Native | `/` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/system` | System | Native | `/core/system` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/admin` | Administration | Native | `/native/password` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/system/admin/password` |
| `/admin/status/routes` | Routing | Native | `/native/status-routes` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/nftables` | Firewall | Native | `/native/firewall-status` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/logs` | System Log | Native | `/native/logs` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/status/logs/syslog` |
| `/admin/status/processes` | Processes | Native | `/native/processes` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/realtime` | Realtime Graphs | Native | `/realtime` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/status/realtime/load` |
| `/admin/network/network` | Interfaces | LuCI compat | `/admin/network/network` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/network/routes` | Routing | Native | `/core/network-routes` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/package-manager` | Software | LuCI compat | `/admin/system/package-manager` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/network/dhcp` | DHCP | Native | `/core/dhcp` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/network/dns` | DNS | Native | `/core/dhcp` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/startup` | Startup | Native | `/native/startup` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/crontab` | Scheduled Tasks | Native | `/native/crontab` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/network/diagnostics` | Diagnostics | Native | `/native/diagnostics` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/attendedsysupgrade` | Attended Sysupgrade | LuCI compat | `/admin/system/attendedsysupgrade/overview` | native parity not proven | LuCI compat primary | live menu audit | route; first child `/admin/system/attendedsysupgrade/overview`; native adapter evidence retained; user route stays compat |
| `/admin/network/firewall` | Firewall | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/network/firewall/zones` |
| `/admin/system/leds` | LED Configuration | Native | `/native/leds` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/banip` | banIP | LuCI compat | `/admin/services/banip/overview` | native parity not proven | LuCI compat primary | live menu audit | route; first child `/admin/services/banip/overview`; native adapter evidence retained; user route stays compat |
| `/admin/system/flash` | Backup / Flash Firmware | LuCI compat | `/admin/system/flash` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/system/commands` | Custom Commands | Native | `/native/service/commands` | supported native | LuCI compat selectable | live menu audit | route; first child `/admin/system/commands/dashboard` |
| `/admin/system/i-love-luci-theme` | I Love LuCI Theme | Native | `/settings` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/reboot` | Reboot | Native | `/native/reboot` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/adblock-fast` | AdBlock Fast | LuCI compat | `/admin/services/adblock-fast` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/services/upnp` | UPnP IGD & PCP | Native | `/native/service/upnpd` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/uhttpd` | uHTTPd | Native | `/native/service/uhttpd` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/commands/dashboard` | Dashboard | Native | `/native/service/commands` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/realtime/load` | Load | Native | `/realtime` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/attendedsysupgrade/overview` | Overview | LuCI compat | `/admin/system/attendedsysupgrade/overview` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/system/admin/password` | Router Password | Native | `/native/password` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/logs/syslog` | System Log | Native | `/native/logs` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/realtime/bandwidth` | Bandwidth | Native | `/realtime` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/attendedsysupgrade/configuration` | Configuration | Native | `/native/attendedsysupgrade-config` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/commands/config` | Configure | Native | `/native/service/commands` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/logs/dmesg` | Kernel Log | Native | `/native/logs` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/admin/dropbear` | SSH Access | Native | `/native/service/dropbear` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/admin/sshkeys` | SSH-Keys | Native | `/native/sshkeys` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/status/realtime/connections` | Connections | Native | `/native/connections` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/admin/uhttpd` | HTTP(S) Access | Native | `/native/service/uhttpd` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/system/admin/repokeys` | Repo Public Keys | Native | `/native/repokeys` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/network/firewall/zones` | General Settings | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/banip/overview` | Overview | LuCI compat | `/admin/services/banip/overview` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/allowlist` | Edit Allowlist | LuCI compat | `/admin/services/banip/allowlist` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/network/firewall/forwards` | Port Forwards | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/banip/blocklist` | Edit Blocklist | LuCI compat | `/admin/services/banip/blocklist` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/network/firewall/rules` | Traffic Rules | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/banip/feeds` | Custom Feed Editor | LuCI compat | `/admin/services/banip/feeds` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/network/firewall/snats` | NAT Rules | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/network/firewall/ipsets` | IP Sets | Native | `/core/firewall` | supported native | LuCI compat selectable | live menu audit | route |
| `/admin/services/banip/setreport` | Set Reporting | LuCI compat | `/admin/services/banip/setreport` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/firewall_log` | Firewall Log | LuCI compat | `/admin/services/banip/firewall_log` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/processing_log` | Processing Log | LuCI compat | `/admin/services/banip/processing_log` | native parity not proven | LuCI compat primary | live menu audit | route; native adapter evidence retained; user route stays compat |
