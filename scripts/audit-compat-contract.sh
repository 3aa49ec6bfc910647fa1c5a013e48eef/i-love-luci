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
	root / "applications" / "luci-app-i-love-luci" / "root" / "usr" / "share" / "rpcd" / "ucode" / "i-love-luci.uc",
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
frontend_src_root = Path("applications/luci-app-i-love-luci/frontend/shell/src")
app_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/app/app.tsx")
legacy_page_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/routes/legacy.tsx")
legacy_route_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/legacy-route.ts")
rpc_bridge_file = Path("applications/luci-app-i-love-luci/root/usr/share/rpcd/ucode/i-love-luci.uc")
rpc_types_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/lib/rpc.ts")
header_file = Path("applications/luci-app-i-love-luci/frontend/shell/src/components/shell/header.tsx")

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
		if path.suffix not in {".md", ".ts", ".tsx", ".js", ".sh", ".uc"} and path.name != "README.md":
			continue
		text = path.read_text(encoding="utf-8", errors="replace")
		relative_path = path.relative_to(root)
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
			for function_name in ("RoutingSummary", "NftablesSummary"):
				match = re.search(rf"function {function_name}\([^)]*\) \{{(?P<body>.*?)\nfunction ", text, re.S)
				if not match:
					failures.append(f"{relative_path}: expected {function_name} guard target")
					continue
				if "OutputLinesTable" in match.group("body"):
					failures.append(f"{relative_path}: {function_name} must render structured tables, not generic command output")
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
		if relative_path == rpc_types_file:
			status_type = re.search(r"export type ConsoleStatus = \{(?P<body>.*?)\n\};", text, re.S)
			if not status_type:
				failures.append(f"{relative_path}: expected ConsoleStatus type")
			else:
				for secret_term in ("username", "password"):
					if secret_term in status_type.group("body"):
						failures.append(f"{relative_path}: ConsoleStatus must not include helper {secret_term}")
			if "export type ConsoleLaunch" not in text or "console_launch" not in text:
				failures.append(f"{relative_path}: ConsoleLaunch type and RPC call are required")
		if relative_path == header_file:
			if "getConsoleLaunch" not in text:
				failures.append(f"{relative_path}: header console action must use explicit console_launch RPC")
			effect_match = re.search(r"useEffect\(\(\) => \{(?P<body>.*?)\n\t\}, \[\]\);", text, re.S)
			if effect_match and "getConsoleLaunch" in effect_match.group("body"):
				failures.append(f"{relative_path}: console_launch must not run on page load")
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
