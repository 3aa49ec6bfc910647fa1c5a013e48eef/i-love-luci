# I Love LuCI Route Inventory

Generated from `ubus call luci.iloveluci menu_tree` on router `172.16.172.1`.

This inventory records the current user-facing renderer decision for every visible LuCI menu route on the test router. `Native` routes expose an I Love LuCI `nativePath`; `LuCI compat` routes open the LuCI compatibility frame and must keep full legacy behavior until native parity is proven.

| Route | Title | Renderer | Target | Notes |
| --- | --- | --- | --- | --- |
| `/admin/network` | Network | LuCI compat | `/admin/network/network` | firstchild; first child `/admin/network/network`; native adapter evidence retained; user route stays compat |
| `/admin/services` | Services | Native | `/native/services` | firstchild; first child `/admin/services/banip` |
| `/admin/status` | Status | Native | `/` | firstchild; first child `/admin/status/overview` |
| `/admin/system` | System | Native | `/core/system` | firstchild; first child `/admin/system/system` |
| `/admin/network/dhcp` | DHCP | Native | `/core/dhcp` | view |
| `/admin/network/diagnostics` | Diagnostics | Native | `/native/diagnostics` | view |
| `/admin/network/dns` | DNS | Native | `/core/dhcp` | view |
| `/admin/network/firewall` | Firewall | Native | `/core/firewall` | alias; first child `/admin/network/firewall/zones` |
| `/admin/network/network` | Interfaces | LuCI compat | `/admin/network/network` | view; native adapter evidence retained; user route stays compat |
| `/admin/network/routes` | Routing | Native | `/core/network` | view |
| `/admin/services/adblock-fast` | AdBlock Fast | LuCI compat | `/admin/services/adblock-fast` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip` | banIP | LuCI compat | `/admin/services/banip/overview` | alias; first child `/admin/services/banip/overview`; native adapter evidence retained; user route stays compat |
| `/admin/services/uhttpd` | uHTTPd | Native | `/native/service/uhttpd` | view |
| `/admin/services/upnp` | UPnP IGD & PCP | Native | `/native/service/upnpd` | view |
| `/admin/status/logs` | System Log | Native | `/native/logs` | alias; first child `/admin/status/logs/syslog` |
| `/admin/status/nftables` | Firewall | Native | `/native/firewall-status` | view |
| `/admin/status/overview` | Overview | Native | `/` | template |
| `/admin/status/processes` | Processes | Native | `/native/processes` | view |
| `/admin/status/realtime` | Realtime Graphs | Native | `/realtime` | alias; first child `/admin/status/realtime/load` |
| `/admin/status/routes` | Routing | Native | `/native/status-routes` | view |
| `/admin/system/admin` | Administration | Native | `/native/password` | firstchild; first child `/admin/system/admin/password` |
| `/admin/system/attendedsysupgrade` | Attended Sysupgrade | LuCI compat | `/admin/system/attendedsysupgrade/overview` | firstchild; first child `/admin/system/attendedsysupgrade/overview`; native adapter evidence retained; user route stays compat |
| `/admin/system/commands` | Custom Commands | Native | `/native/service/commands` | firstchild; first child `/admin/system/commands/dashboard` |
| `/admin/system/crontab` | Scheduled Tasks | Native | `/native/crontab` | view |
| `/admin/system/flash` | Backup / Flash Firmware | LuCI compat | `/admin/system/flash` | view; native adapter evidence retained; user route stays compat |
| `/admin/system/i-love-luci-theme` | I Love LuCI Theme | Native | `/settings` | view |
| `/admin/system/leds` | LED Configuration | Native | `/native/leds` | view |
| `/admin/system/package-manager` | Software | LuCI compat | `/admin/system/package-manager` | view; native adapter evidence retained; user route stays compat |
| `/admin/system/reboot` | Reboot | Native | `/native/reboot` | view |
| `/admin/system/startup` | Startup | Native | `/native/startup` | view |
| `/admin/system/system` | System | Native | `/core/system` | view |
| `/admin/network/firewall/forwards` | Port Forwards | Native | `/core/firewall` | view |
| `/admin/network/firewall/ipsets` | IP Sets | Native | `/core/firewall` | view |
| `/admin/network/firewall/rules` | Traffic Rules | Native | `/core/firewall` | view |
| `/admin/network/firewall/snats` | NAT Rules | Native | `/core/firewall` | view |
| `/admin/network/firewall/zones` | General Settings | Native | `/core/firewall` | view |
| `/admin/services/banip/allowlist` | Edit Allowlist | LuCI compat | `/admin/services/banip/allowlist` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/blocklist` | Edit Blocklist | LuCI compat | `/admin/services/banip/blocklist` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/feeds` | Custom Feed Editor | LuCI compat | `/admin/services/banip/feeds` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/firewall_log` | Firewall Log | LuCI compat | `/admin/services/banip/firewall_log` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/overview` | Overview | LuCI compat | `/admin/services/banip/overview` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/processing_log` | Processing Log | LuCI compat | `/admin/services/banip/processing_log` | view; native adapter evidence retained; user route stays compat |
| `/admin/services/banip/setreport` | Set Reporting | LuCI compat | `/admin/services/banip/setreport` | view; native adapter evidence retained; user route stays compat |
| `/admin/status/logs/dmesg` | Kernel Log | Native | `/native/logs` | view |
| `/admin/status/logs/syslog` | System Log | Native | `/native/logs` | view |
| `/admin/status/realtime/bandwidth` | Bandwidth | Native | `/realtime` | view |
| `/admin/status/realtime/connections` | Connections | Native | `/native/connections` | view |
| `/admin/status/realtime/load` | Load | Native | `/realtime` | view |
| `/admin/system/admin/dropbear` | SSH Access | Native | `/native/service/dropbear` | view |
| `/admin/system/admin/password` | Router Password | Native | `/native/password` | view |
| `/admin/system/admin/repokeys` | Repo Public Keys | Native | `/native/repokeys` | view |
| `/admin/system/admin/sshkeys` | SSH-Keys | Native | `/native/sshkeys` | view |
| `/admin/system/admin/uhttpd` | HTTP(S) Access | Native | `/native/service/uhttpd` | view |
| `/admin/system/attendedsysupgrade/configuration` | Configuration | Native | `/native/attendedsysupgrade-config` | view |
| `/admin/system/attendedsysupgrade/overview` | Overview | LuCI compat | `/admin/system/attendedsysupgrade/overview` | view; native adapter evidence retained; user route stays compat |
| `/admin/system/commands/config` | Configure | Native | `/native/service/commands` | view |
| `/admin/system/commands/dashboard` | Dashboard | Native | `/native/service/commands` | template |
