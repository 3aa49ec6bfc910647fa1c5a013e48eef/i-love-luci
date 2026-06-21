#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "${ROOT_DIR}" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])

scan_roots = [
	root / "README.md",
	root / "docs" / "LEGACY_UPLIFT.md",
	root / "docs" / "ROUTE_INVENTORY.md",
	root / "docs" / "UI_REFACTOR.md",
	root / "applications" / "luci-app-i-love-luci" / "frontend" / "shell" / "src",
	root / "applications" / "luci-app-i-love-luci" / "Makefile",
	root / "applications" / "luci-app-i-love-luci" / "root" / "etc" / "uci-defaults" / "90_luci-app-i-love-luci",
	root / "applications" / "luci-app-i-love-luci" / "root" / "lib" / "upgrade" / "keep.d" / "luci-app-i-love-luci",
	root / "applications" / "luci-app-i-love-luci" / "root" / "usr" / "share" / "rpcd" / "ucode" / "i-love-luci.uc",
	root / "applications" / "luci-app-i-love-luci" / "root" / "usr" / "share" / "rpcd" / "acl.d" / "luci-app-i-love-luci.json",
	root / "scripts",
]

forbidden = [
	(re.compile(r"nativeStatus\s*[:=]\s*['\"]partial['\"]"), "nativeStatus must use compat, not partial"),
	(re.compile(r"native_status\s+supported=.*partial=", re.IGNORECASE), "route audit output must report compat, not partial"),
	(re.compile(r"\bpartial\s+native\b", re.IGNORECASE), "user-facing model must not describe partial native routes"),
	(re.compile(r"\bnative\s+preview\b", re.IGNORECASE), "user-facing model must not describe native preview routes"),
	(re.compile(r"\bpreview\s+route\b", re.IGNORECASE), "user-facing model must not describe preview routes"),
	(re.compile(r"\bnative_preview_routes\b", re.IGNORECASE), "route audit output must not report native preview routes"),
	(re.compile(r"Modern,\s*Partial,\s*Legacy", re.IGNORECASE), "settings status labels must use supported/compat/unsupported"),
	(re.compile(r"nativeStatus:\s*['\"]supported['\"]\s*\|\s*['\"]partial['\"]"), "types must use supported | compat | unsupported"),
]

route_ui_files = {
	Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/settings.tsx"),
	Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/header-search.tsx"),
	Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/sidebar.tsx"),
}
native_page_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/native-page.tsx")
core_settings_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/core-settings.tsx")
frontend_src_root = Path("applications/luci-app-i-love-luci/frontend/shell/src")
app_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/app/app.tsx")
legacy_page_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/legacy.tsx")
legacy_route_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/legacy-route.ts")
rpc_bridge_file = Path("applications/luci-app-i-love-luci/root/usr/share/rpcd/ucode/i-love-luci.uc")
rpc_acl_file = Path("applications/luci-app-i-love-luci/root/usr/share/rpcd/acl.d/luci-app-i-love-luci.json")
rpc_types_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/rpc.ts")
navigation_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/navigation.ts")
service_compat_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/service-compat.ts")
header_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/header.tsx")
console_page_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/console.tsx")
modern_shell_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/modern-shell.tsx")
sidebar_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/sidebar.tsx")
readme_file = Path("README.md")
router_install_file = Path("scripts/router-install-package.sh")
package_makefile = Path("applications/luci-app-i-love-luci/Makefile")
uci_defaults_file = Path("applications/luci-app-i-love-luci/root/etc/uci-defaults/90_luci-app-i-love-luci")
upgrade_keep_file = Path("applications/luci-app-i-love-luci/root/lib/upgrade/keep.d/luci-app-i-love-luci")
sysauth_template_files = {
	Path("applications/luci-app-i-love-luci/root/usr/share/ucode/luci/template/sysauth.ut"),
	Path("applications/luci-app-i-love-luci/root/usr/share/ucode/luci/template/themes/i-love-luci/sysauth.ut"),
}

allowed_archived = [
	"Historical validation notes below may contain older raw audit labels",
	"Archived route audit",
]

failures = []

def iter_files(path: Path):
	if path.is_file():
		yield path
		return

	for child in path.rglob("*"):
		if not child.is_file():
			continue
		if any(part in {"node_modules", "htdocs", "build_dir", "staging_dir", "tmp"} for part in child.parts):
			continue
		yield child

for base in scan_roots:
	if not base.exists():
		continue
	for path in iter_files(base):
		if path.name == "audit-compat-contract.sh":
			continue
		text = path.read_text(encoding="utf-8", errors="replace")
		relative_path = path.relative_to(root)
		if (
			path.suffix not in {".md", ".ts", ".tsx", ".js", ".sh", ".uc", ".ut"}
			and path.name != "README.md"
			and relative_path not in {package_makefile, uci_defaults_file, upgrade_keep_file}
		):
			continue
		if relative_path in sysauth_template_files:
			for required in (
				'data-iloveluci-login="true"',
				"/luci-static/i-love-luci-app/assets/app.css",
				"/luci-static/i-love-luci-app/assets/app.js",
				"window.ILoveLuCI",
				"login: true",
				"data-login-failed",
				"data-default-user",
				"maximum-scale=1.0",
				"user-scalable=no",
			):
				if required not in text:
					failures.append(f"{relative_path}: React/Vite login template missing {required}")
			for forbidden_login_text in (
				"Authorization Required",
				"Please enter your username and password.",
				'type="reset"',
				"id=\"mainmenu\"",
				"id=\"menubar\"",
			):
				if forbidden_login_text in text:
					failures.append(f"{relative_path}: React/Vite login template must not include legacy login/header UI ({forbidden_login_text})")
		if relative_path in route_ui_files and ("<Badge" in text or "from \"@/components/ui/badge\"" in text):
			failures.append(f"{relative_path}: route UI must not render mode/coverage/status chips")
		if relative_path in route_ui_files - {Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/settings.tsx")}:
			for term in ("nativeStatus", "effectiveMode", "configuredMode"):
				if term in text:
					failures.append(f"{relative_path}: navigation/search UI must not display route mode metadata ({term})")
		if relative_path.is_relative_to(frontend_src_root) and "<pre" in text:
			failures.append(f"{relative_path}: frontend source must not render raw <pre> command dumps")
		if relative_path == app_file:
			if "LegacyFallbackPage" not in text:
				failures.append(f"{relative_path}: direct LuCI admin hash routes must use LegacyFallbackPage")
			if '<Route path="*" element={<LegacyFallbackPage />} />' not in text:
				failures.append(f"{relative_path}: wildcard hash route must render LegacyFallbackPage instead of redirecting to dashboard")
		if relative_path == legacy_page_file:
			if "legacyPathFromUnmatchedLocation" not in text:
				failures.append(f"{relative_path}: direct LuCI fallback must call legacyPathFromUnmatchedLocation")
			if "<LegacyFrame path={path}" not in text:
				failures.append(f"{relative_path}: direct LuCI fallback must render the compat frame")
			if '<Navigate to="/" replace />' not in text:
				failures.append(f"{relative_path}: non-LuCI unmatched shell routes must still fall back to dashboard")
		if relative_path == legacy_route_file:
			if "pathname.startsWith(\"/admin/\")" not in text:
				failures.append(f"{relative_path}: direct LuCI fallback must detect /admin/* routes")
			if "`${pathname}${search}${hash}`" not in text:
				failures.append(f"{relative_path}: direct LuCI fallback must preserve path, query string, and hash")
		if relative_path == native_page_file:
			if "nativePageCompatPath(page)" not in text or "return <Navigate replace to={legacyTarget(compatPath)} />" not in text:
				failures.append(f"{relative_path}: NativePage must redirect stale compat-only native aliases back to LuCI compat")
			if "firmwareValidation.output.split" in text:
				failures.append(f"{relative_path}: firmware validation output must use structured rows, not inline raw split rendering")
			if "FirmwareValidationOutputTable" not in text or "firmwareValidationLines" not in text:
				failures.append(f"{relative_path}: flash adapter must render sysupgrade validation output as structured rows")
			if "Package state fingerprint" not in text:
				failures.append(f"{relative_path}: package manager output must show package state fingerprints")
			for required_package_install_term in ("Install source", "allowRemote: remoteSource", "isRemotePackageSource"):
				if required_package_install_term not in text:
					failures.append(f"{relative_path}: package manager manual install apply missing {required_package_install_term}")
			package_inventory_match = re.search(r"function PackageInventory\([^)]*\) \{(?P<body>.*?)\nfunction PackageActionOutput", text, re.S)
			if not package_inventory_match:
				failures.append(f"{relative_path}: expected PackageInventory guard target")
			else:
				package_inventory_body = package_inventory_match.group("body")
				if "window.confirm" in package_inventory_body:
					failures.append(f"{relative_path}: package manager apply must use structured confirmation dialog, not browser window.confirm")
				if "PackageMutationConfirmDialog" not in package_inventory_body:
					failures.append(f"{relative_path}: package manager apply must render PackageMutationConfirmDialog")
			for forbidden_native_page_copy in (
				"URL apply remains in LuCI compat",
				"broader rollback workflows remain LuCI compat",
				"remain in LuCI compat until",
				"manual / LuCI compat",
				"Use LuCI compat",
				"Native upload limit",
			):
				if forbidden_native_page_copy in text:
					failures.append(f"{relative_path}: user-visible native page copy must not expose migration wording ({forbidden_native_page_copy})")
			page_meta_match = re.search(r"const pageMeta: Record<string, PageMeta> = \{(?P<body>.*?)\n\};\n\nexport function NativePage", text, re.S)
			if not page_meta_match:
				failures.append(f"{relative_path}: expected pageMeta guard target")
			else:
				for forbidden_page_header_term in ("Modern", "read-only", "LuCI compat", "compat until"):
					if forbidden_page_header_term in page_meta_match.group("body"):
						failures.append(f"{relative_path}: page headers must not expose internal mode/migration wording ({forbidden_page_header_term})")
			for function_name in ("RoutingSummary", "NftablesSummary"):
				match = re.search(rf"function {function_name}\([^)]*\) \{{(?P<body>.*?)\nfunction ", text, re.S)
				if not match:
					failures.append(f"{relative_path}: expected {function_name} guard target")
					continue
				if "OutputLinesTable" in match.group("body"):
					failures.append(f"{relative_path}: {function_name} must render structured tables, not generic command output")
		if relative_path == core_settings_file:
			core_page_meta_match = re.search(r"const pageMeta: Record<CorePage, \{ title: string; description: string; configKey: keyof CoreSettings \}> = \{(?P<body>.*?)\n\};\n\nexport function CoreSettingsPage", text, re.S)
			if not core_page_meta_match:
				failures.append(f"{relative_path}: expected core pageMeta guard target")
			else:
				for forbidden_core_page_header_term in ("Modern", "LuCI compat", "compat until"):
					if forbidden_core_page_header_term in core_page_meta_match.group("body"):
						failures.append(f"{relative_path}: core page headers must not expose internal mode/migration wording ({forbidden_core_page_header_term})")
			if 'page === "network"' not in text or 'legacyTarget("/admin/network/network")' not in text:
				failures.append(f"{relative_path}: stale /core/network must redirect to LuCI interface compat")
			if 'page === "network-routes"' not in text or "NetworkRoutesSummary" not in text:
				failures.append(f"{relative_path}: network routing must use route-only native page, not shared interface adapter")
			if "const exposeNetworkAdapterEvidence = false;" not in text:
				failures.append(f"{relative_path}: network interface adapter evidence must stay disabled in user routing")
		if relative_path == rpc_bridge_file:
			status_match = re.search(r"console_status:\s*\{\s*call:\s*function\(\)\s*\{(?P<body>.*?)\n\t\},\n\n\tconsole_launch:", text, re.S)
			if not status_match:
				failures.append(f"{relative_path}: expected console_status before console_launch")
			else:
				status_body = status_match.group("body")
				for secret_term in ("username", "password", "credential"):
					if secret_term in status_body:
						failures.append(f"{relative_path}: console_status must not expose or read helper {secret_term}")
			if "console_launch:" not in text:
				failures.append(f"{relative_path}: console_launch RPC is required for explicit console credential release")
			for tunnel_method in ("console_poll:", "console_write:", "console_resize:", "console_close:"):
				if tunnel_method not in text:
					failures.append(f"{relative_path}: missing console tunnel RPC stub {tunnel_method}")
			for required_package_state_term in ("package_state_snapshot", "stateBefore", "stateAfter", "databaseHash", "luciAppCount"):
				if required_package_state_term not in text:
					failures.append(f"{relative_path}: package actions must retain rollback fingerprint term {required_package_state_term}")
			for required_remote_install_term in ("allow_remote", "remote_package_url", "remote_package_install_command", "uclient-fetch", "-T 8", "--max-time 20", "Package URL download failed.", "valid_package_reference(name, simulate, allow_remote)"):
				if required_remote_install_term not in text:
					failures.append(f"{relative_path}: package actions must support guarded remote URL install term {required_remote_install_term}")
			for required_package_job_term in ("package_job_output", "sh -c ${command_quoted} >${output_quoted} 2>&1", "echo $? >${rc_quoted}"):
				if required_package_job_term not in text:
					failures.append(f"{relative_path}: package jobs must capture full command output/rc term {required_package_job_term}")
			for required_asu_job_term in ("attendedsysupgrade_job_output", "sh -c ${command_quoted} >${output_quoted} 2>&1", "attendedsysupgrade_job_status"):
				if required_asu_job_term not in text:
					failures.append(f"{relative_path}: attended sysupgrade jobs must capture full command output/rc term {required_asu_job_term}")
			if "exit $rc" in text:
				failures.append(f"{relative_path}: package job commands must not exit before the job wrapper writes rc state")
		if relative_path == rpc_types_file:
			status_type = re.search(r"export type ConsoleStatus = \{(?P<body>.*?)\n\};", text, re.S)
			if not status_type:
				failures.append(f"{relative_path}: expected ConsoleStatus type")
			else:
				for required_console_term in ("transport?", "tunnelAvailable?", "requiresDirectConnectivity?"):
					if required_console_term not in status_type.group("body"):
						failures.append(f"{relative_path}: ConsoleStatus must disclose {required_console_term}")
				for secret_term in ("username", "password"):
					if secret_term in status_type.group("body"):
						failures.append(f"{relative_path}: ConsoleStatus must not include helper {secret_term}")
			if "export type ConsoleLaunch" not in text or "console_launch" not in text:
				failures.append(f"{relative_path}: ConsoleLaunch type and RPC call are required")
			for required_tunnel_client in ("ConsolePollResult", "ConsoleActionResult", "console_poll", "console_write", "console_resize", "console_close"):
				if required_tunnel_client not in text:
					failures.append(f"{relative_path}: missing console tunnel client contract {required_tunnel_client}")
			for required_package_state_term in ("PackageStateSnapshot", "stateBefore?", "stateAfter?", "databaseHash", "packageCount", "luciAppCount"):
				if required_package_state_term not in text:
					failures.append(f"{relative_path}: package action contract must expose package state fingerprint term {required_package_state_term}")
			if "allowRemote?" not in text:
				failures.append(f"{relative_path}: package action options must expose allowRemote")
		if relative_path == rpc_acl_file:
			for required_console_acl in ("console_poll", "console_write", "console_resize", "console_close"):
				if required_console_acl not in text:
					failures.append(f"{relative_path}: missing ACL for console tunnel method {required_console_acl}")
		if relative_path == navigation_file:
			for compat_route in (
				'"/admin/services/adblock-fast"',
				'"/admin/services/banip"',
				'"/admin/services/banip/',
			):
				if compat_route in text:
					failures.append(f"{relative_path}: native fallback map must not include third-party LuCI app route {compat_route}")
		if relative_path == service_compat_file:
			for required_alias in (
				'attendedsysupgrade: "/admin/system/attendedsysupgrade/overview"',
				'flash: "/admin/system/flash"',
				'packages: "/admin/system/package-manager"',
				'"/admin/services/adblock-fast"',
				'"/admin/services/banip"',
			):
				if required_alias not in text:
					failures.append(f"{relative_path}: compat redirect map missing {required_alias}")
		if relative_path == header_file:
			if "getConsoleLaunch" in text:
				failures.append(f"{relative_path}: header must not request or handle helper console credentials")
			if "#/console?launch=1" not in text:
				failures.append(f"{relative_path}: header console action must open the internal console route")
			effect_match = re.search(r"useEffect\(\(\) => \{(?P<body>.*?)\n\t\}, \[\]\);", text, re.S)
			if effect_match and "getConsoleLaunch" in effect_match.group("body"):
				failures.append(f"{relative_path}: console_launch must not run on page load")
		if relative_path == console_page_file:
			if "getConsoleLaunch" not in text:
				failures.append(f"{relative_path}: console route must use explicit console_launch RPC")
			if "buildConsoleFallbackUrl" not in text or "buildConsoleEmbeddedUrl" not in text:
				failures.append(f"{relative_path}: console route must separate fallback URL and embedded URL construction")
			if "src={fallbackUrl}" in text or "src={consoleUrl}" in text:
				failures.append(f"{relative_path}: console iframe must not use a credential-capable URL")
		if relative_path == Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/console-url.ts"):
			if "buildConsoleEmbeddedUrl" not in text or "return null;" not in text:
				failures.append(f"{relative_path}: embedded console URL must reject helper credentials")
			if "buildConsoleFallbackUrl" not in text or "url.username" not in text or "url.password" not in text:
				failures.append(f"{relative_path}: direct console fallback must isolate helper credential URL construction")
		if relative_path == package_makefile:
			if "+i-love-luci-console" not in text:
				failures.append(f"{relative_path}: release package must depend on the console tunnel helper")
			if "+ttyd" in text:
				failures.append(f"{relative_path}: release package must not install direct ttyd by default")
		if relative_path == uci_defaults_file:
			for forbidden_ttyd_default in ("uci set ttyd", "uci add ttyd", "/etc/init.d/ttyd", "credential=\"iloveluci:"):
				if forbidden_ttyd_default in text:
					failures.append(f"{relative_path}: release install must not configure direct ttyd by default ({forbidden_ttyd_default})")
			if "/etc/init.d/i-love-luci-console" not in text:
				failures.append(f"{relative_path}: release install must enable/restart the console tunnel helper")
		if relative_path == upgrade_keep_file:
			if "/etc/config/i-love-luci" not in text:
				failures.append(f"{relative_path}: sysupgrade keep file must preserve I Love LuCI settings")
			if "/etc/config/ttyd" in text:
				failures.append(f"{relative_path}: release keep file must not preserve generated ttyd config")
		if relative_path == router_install_file:
			for required_install_term in (
				"[package.apk|package.ipk ...]",
				'for package_path in "$@"; do',
				"All packages in one install must use the same format",
				"/etc/init.d/i-love-luci-console enable",
				"/etc/init.d/i-love-luci-console restart",
			):
				if required_install_term not in text:
					failures.append(f"{relative_path}: helper-aware release install missing {required_install_term}")
		if relative_path == readme_file:
			for required_readme_term in (
				"utils/i-love-luci-console/",
				"./scripts/feeds install i-love-luci-console",
				"dist/openwrt/25.12.4/rockchip-armv8/i-love-luci-console-*.apk",
				"apk del luci-app-i-love-luci i-love-luci-console",
				"opkg remove luci-app-i-love-luci i-love-luci-console",
				"## Route Model",
				"Unknown or newly installed `luci-app-*` routes",
				"LuCI compat bridge",
			):
				if required_readme_term not in text:
					failures.append(f"{relative_path}: install/rollback docs missing helper term {required_readme_term}")
			for forbidden_readme_term in (
				"Legacy bridge",
				"legacy bridge",
				"native, legacy, hidden",
			):
				if forbidden_readme_term in text:
					failures.append(f"{relative_path}: README must use LuCI compat product wording, not {forbidden_readme_term}")
		if relative_path == modern_shell_file:
			if "flex min-h-0 flex-1 overflow-hidden" not in text:
				failures.append(f"{relative_path}: shell body must constrain overflow for independent sidebar/main scrolling")
			if "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto" not in text:
				failures.append(f"{relative_path}: main content must own its vertical scroll container")
			if "i-love-luci.desktopSidebarOpen" not in text or "localStorage.setItem" not in text:
				failures.append(f"{relative_path}: desktop sidebar toggle state must persist in localStorage")
		if relative_path == sidebar_file:
			if "lg:flex" not in text or "h-full min-h-0" not in text:
				failures.append(f"{relative_path}: desktop sidebar must be a constrained flex column")
			if "min-h-0 flex-1 overflow-y-auto" not in text:
				failures.append(f"{relative_path}: nav list must own sidebar vertical overflow")
			for required_sidebar_motion in (
				"transition-[transform,opacity]",
				"transition-[grid-template-rows,opacity]",
				"duration-500",
				"motion-reduce:transition-none",
			):
				if required_sidebar_motion not in text:
					failures.append(f"{relative_path}: sidebar animation contract missing {required_sidebar_motion}")
		if relative_path == Path("docs/ROUTE_INVENTORY.md"):
			if "| LuCI compat |" not in text:
				failures.append(f"{relative_path}: route inventory must include LuCI compat renderer decisions")
			if "| Route | Title | Renderer | Target | Parity | Fallback | Latest test | Notes |" not in text:
				failures.append(f"{relative_path}: route inventory must include parity, fallback, and latest test columns")
			for line_no, line in enumerate(text.splitlines(), 1):
				if "| LuCI compat |" in line and "user route stays compat" not in line:
					failures.append(f"{relative_path}:{line_no}: compat route must be documented as user route stays compat")
		if relative_path == Path("docs/UI_REFACTOR.md"):
			required_model = "User routing has only three outcomes: supported native route, LuCI compat route, or intentionally hidden route."
			if required_model not in text:
				failures.append(f"{relative_path}: current compatibility model must keep the three-outcome route contract")
			if "package state fingerprints before/after actions" not in text:
				failures.append(f"{relative_path}: package manager promotion evidence must document package state fingerprints")
			if "guarded package-name/URL/staged-file install apply with typed confirmation" not in text:
				failures.append(f"{relative_path}: package manager promotion evidence must document guarded URL install apply")
			if "bounded remote URL fetch jobs that complete with package state fingerprints" not in text:
				failures.append(f"{relative_path}: package manager promotion evidence must document bounded remote URL job completion")
			if "quoted job output/rc capture for ASU helper commands" not in text:
				failures.append(f"{relative_path}: attended sysupgrade promotion evidence must document quoted job output/rc capture")
			coverage_match = re.search(
				r"Converted to native React/Vite surfaces:\n(?P<body>.*?)(?=\nInstalled LuCI app renderer policy:)",
				text,
				re.S,
			)
			if not coverage_match:
				failures.append(f"{relative_path}: current native coverage section missing or malformed")
			else:
				for line_no, coverage_line in enumerate(coverage_match.group("body").splitlines(), 1):
					if not coverage_line.startswith("- `"):
						continue
					for wireless_route in ("/admin/status/realtime/wireless", "/admin/status/channel_analysis", "/admin/network/wireless"):
						if wireless_route in coverage_line:
							failures.append(f"{relative_path}: wireless route {wireless_route} must not be documented as converted native coverage without radio-hardware validation")
			if "Wireless-specific routes are not listed as converted native routes." not in text:
				failures.append(f"{relative_path}: wireless routes must be documented as adapter evidence only until radio-hardware validation")
		if relative_path == Path("docs/CONSOLE_TUNNEL.md"):
			for required_console_doc_term in (
				'transport: "tunnel"',
				"tunnelAvailable: true",
				"requiresDirectConnectivity: false",
				"i-love-luci-console",
				"current uHTTPd source loads only hard-coded plugins",
				"not sufficient for a ttyd tunnel",
			):
				if required_console_doc_term not in text:
					failures.append(f"{relative_path}: missing console tunnel constraint {required_console_doc_term}")
		if relative_path == Path("docs/LEGACY_UPLIFT.md"):
			for required_legacy_console_term in (
				"i-love-luci-console",
				"/var/run/i-love-luci-console/control.sock",
				"direct `ttyd` is not installed or configured by default",
			):
				if required_legacy_console_term not in text:
					failures.append(f"{relative_path}: console gateway plan must describe shipped helper tunnel ({required_legacy_console_term})")
		archived_history = False
		for line_no, line in enumerate(text.splitlines(), 1):
			if path.name == "UI_REFACTOR.md" and line.startswith("Historical validation notes below"):
				archived_history = True
			if archived_history:
				continue
			if any(marker in line for marker in allowed_archived):
				continue
			for pattern, message in forbidden:
				if pattern.search(line):
					failures.append(f"{path.relative_to(root)}:{line_no}: {message}: {line.strip()}")

if failures:
	print("FAIL: compat/native UI contract audit found regressions", file=sys.stderr)
	for failure in failures:
		print(failure, file=sys.stderr)
	sys.exit(1)

print("PASS: compat/native UI contract is clean")
PY
