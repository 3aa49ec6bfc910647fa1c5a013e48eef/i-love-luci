# Console Tunnel Design

## Current State

The shipped console path is direct ttyd access:

```text
browser -> ttyd on router port 7681 -> /bin/login -f root
```

I Love LuCI exposes this explicitly through `console_status`:

- `transport: "direct"`
- `tunnelAvailable: false`
- `requiresDirectConnectivity: true`

The app must not embed `https://user:pass@host/` ttyd URLs. Chromium blocks embedded-credential subresource requests, and the credentials remain visible in browser state.

## Preferred State

Preferred tunnel path:

```text
browser -> uHTTPd/LuCI session -> console tunnel -> ttyd on loopback or UNIX socket
```

Properties:

- browser only connects to the normal LuCI origin
- ttyd is not reachable directly from LAN/WAN
- no helper password is placed in URLs, DOM, or browser history
- LuCI session and I Love LuCI ACLs authorize console access
- a short-lived one-time token scopes each console open action

## Router Evidence

On the `172.16.172.1` test router:

- `ttyd 1.7.7` supports UNIX socket binding with `--interface /path/to.sock`.
- `ttyd 1.7.7` supports reverse-proxy authentication with `--auth-header`.
- the installed `/etc/init.d/ttyd` does not expose `--auth-header`, `--base-path`, or UNIX socket owner options through UCI.
- installed `uhttpd` exposes CGI, Lua, ucode, and ubus handlers.
- current uHTTPd source loads only hard-coded plugins (`uhttpd_lua.so`, `uhttpd_ucode.so`, `uhttpd_ubus.so`) based on config. There is no generic UCI option to load a new third-party proxy plugin.
- standard CGI/ucode/ubus handlers are not sufficient for a ttyd tunnel because ttyd requires bidirectional WebSocket upgrade proxying.

## Practical Implementation Options

### Option A: Patch uHTTPd

Patch or extend uHTTPd so I Love LuCI can register a WebSocket reverse-proxy handler.

Flow:

1. `console_launch` creates a short-lived token and stores only its hash under `/tmp/i-love-luci-console/`.
2. uHTTPd serves `/cgi-bin/luci/admin/i-love-luci/console/<token>/...`.
3. tunnel validates the LuCI session cookie and token.
4. tunnel connects to ttyd over `/var/run/i-love-luci/ttyd.sock`.
5. tunnel injects the configured ttyd auth header server-side.
6. ttyd runs with `/bin/login -f root`, `--auth-header`, and `--base-path`.

This is the cleanest production design, but it requires either an upstream uHTTPd enhancement or a locally rebuilt uHTTPd package.

### Option B: Replace the Front Web Server

Run a front proxy with WebSocket reverse-proxy support, such as nginx or HAProxy, in front of LuCI and ttyd.

This avoids uHTTPd patching but is heavier and riskier on a primary router because it changes the admin web-server path.

### Option C: Keep Direct ttyd for Trusted LAN Only

Keep the current direct ttyd path while the tunnel helper is not available.

This is acceptable for local testing only. It is not the production target.

## Not Acceptable

- embedding `user:pass@host` in an iframe
- exposing ttyd credentials through query parameters, URL fragments, or browser-visible basic-auth URLs
- claiming tunnel support while `transport` is still `direct`
- replacing LuCI app compatibility with a reduced terminal-only workaround
