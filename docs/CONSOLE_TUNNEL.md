# Console Tunnel Design

## Current State

The shipped console path is now the native helper tunnel when `i-love-luci-console` is installed and running:

```text
browser -> uHTTPd/LuCI session -> I Love LuCI console helper -> router PTY
```

Properties:

- browser only connects to the normal LuCI origin
- no terminal service is reachable directly from LAN/WAN
- no helper password is placed in URLs, DOM, or browser history
- LuCI session and I Love LuCI ACLs authorize console access
- a short-lived one-time token scopes each console open action
- terminal input/output is scoped to the authenticated LuCI session that opened it

The app must not embed `https://user:pass@host/` ttyd URLs. Chromium blocks embedded-credential subresource requests, and credentials would remain visible in browser state.

The release package depends on the helper and does not install or configure `ttyd` by default. If an operator separately installs and enables `ttyd`, the backend can still report the older trusted-LAN fallback with `transport: "direct"`, but release validation expects the helper tunnel.

## Selected Production Direction

Use the small `i-love-luci-console` helper package and make `luci-app-i-love-luci` use it when present.

The helper should own PTY sessions directly instead of proxying ttyd. That avoids the uHTTPd WebSocket proxy gap and lets the browser tunnel over the existing LuCI HTTP origin using authenticated RPC calls:

```text
console_status -> reports helper availability
console_launch -> creates short-lived PTY session and returns session id
console_poll -> long-polls terminal output for that session
console_write -> writes keystrokes for that session
console_resize -> updates PTY dimensions
console_close -> closes session
```

Initial transport can use short long-polling over ubus/rpcd because it works with current uHTTPd. A later WebSocket transport can be added behind the same session contract if uHTTPd gains a safe same-origin upgrade bridge.

Current implementation:

- `utils/i-love-luci-console` builds a small C helper binary and procd service.
- the helper listens on `/var/run/i-love-luci-console/control.sock` with root-only permissions.
- the helper can launch `/bin/login -f root` inside a PTY, poll output, write input, resize the terminal, and close sessions.
- `luci-app-i-love-luci` depends on `i-love-luci-console` and switches `console_status` / `console_launch` to `transport: "tunnel"` when the helper responds.
- if the helper is not installed or not running, and an operator has separately installed/enabled `ttyd`, the backend can report `transport: "direct"` for the trusted-LAN development fallback.
- local Linux smoke coverage compiled the helper, started the daemon, opened a PTY session, polled shell output, wrote `id`, polled the command output, and closed the session.
- router smoke coverage on `172.16.172.1` installed `i-love-luci-console-1.0.0-r4.apk`, enabled and started the procd service, verified `console_status` reports `transport: "tunnel"`, launched a PTY session through same-origin RPC, wrote `echo ILOVE-CONSOLE-SMOKE`, observed the output, closed the session, and left `uci changes=0`.

Implementation guardrails:

- run helper as root only because router console is privileged by design
- require an active LuCI session and I Love LuCI ACL for every console RPC
- bind session id to LuCI session id and source address where available
- expire unopened sessions quickly and idle sessions after a short timeout
- cap concurrent sessions and output buffer size
- avoid shell command arguments supplied from the browser
- never return passwords, bearer tokens, or terminal credentials to the browser
- keep direct ttyd as an operator-installed development fallback only while `transport` reports `direct`

## Router Evidence

On the `172.16.172.1` test router:

- `ttyd 1.7.7` supports UNIX socket binding with `--interface /path/to.sock`.
- `ttyd 1.7.7` supports reverse-proxy authentication with `--auth-header`.
- the installed `/etc/init.d/ttyd` does not expose `--auth-header`, `--base-path`, or UNIX socket owner options through UCI.
- installed `uhttpd` exposes CGI, Lua, ucode, and ubus handlers.
- current uHTTPd source loads only hard-coded plugins (`uhttpd_lua.so`, `uhttpd_ucode.so`, `uhttpd_ubus.so`) based on config. There is no generic UCI option to load a new third-party proxy plugin.
- standard CGI/ucode/ubus handlers are not sufficient for a ttyd tunnel because ttyd requires bidirectional WebSocket upgrade proxying.
- ttyd `--auth-header` still needs a trusted reverse proxy to inject the header; the browser cannot safely inject that header into an iframe or WebSocket request without exposing credentials.

## Practical Implementation Options

### Option A: Native PTY Helper

Add the selected `i-love-luci-console` helper described above.

Flow:

1. `console_launch` creates a short-lived PTY session through the helper.
2. Frontend renders a terminal component in the React shell.
3. Frontend uses authenticated same-origin RPC to poll output and write input.
4. Helper closes the PTY on logout, idle timeout, explicit close, or process exit.
5. `console_status` reports `transport: "tunnel"`, `tunnelAvailable: true`, and `requiresDirectConnectivity: false`.

This is the preferred path because it works with current uHTTPd and does not expose a terminal TCP listener.

### Option B: Patch uHTTPd

Patch or extend uHTTPd so I Love LuCI can register a WebSocket reverse-proxy handler.

Flow:

1. `console_launch` creates a short-lived token and stores only its hash under `/tmp/i-love-luci-console/`.
2. uHTTPd serves `/cgi-bin/luci/admin/i-love-luci/console/<token>/...`.
3. tunnel validates the LuCI session cookie and token.
4. tunnel connects to ttyd over `/var/run/i-love-luci/ttyd.sock`.
5. tunnel injects the configured ttyd auth header server-side.
6. ttyd runs with `/bin/login -f root`, `--auth-header`, and `--base-path`.

This keeps ttyd and its xterm.js UI, but it requires either an upstream uHTTPd enhancement or a locally rebuilt uHTTPd package.

### Option C: Replace the Front Web Server

Run a front proxy with WebSocket reverse-proxy support, such as nginx or HAProxy, in front of LuCI and ttyd.

This avoids uHTTPd patching but is heavier and riskier on a primary router because it changes the admin web-server path.

### Option D: Keep Direct ttyd for Trusted LAN Only

Keep the current direct ttyd path while the tunnel helper is not available.

This is acceptable for local testing only. It is not the production target.

## Not Acceptable

- embedding `user:pass@host` in an iframe
- exposing ttyd credentials through query parameters, URL fragments, or browser-visible basic-auth URLs
- claiming tunnel support while `transport` is still `direct`
- replacing LuCI app compatibility with a reduced terminal-only workaround
