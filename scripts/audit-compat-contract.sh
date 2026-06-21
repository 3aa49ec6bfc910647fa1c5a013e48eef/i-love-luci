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
	root / "docs" / "UI_REFACTOR.md",
	root / "applications" / "luci-app-i-love-luci" / "frontend" / "shell" / "src",
	root / "applications" / "luci-app-i-love-luci" / "root" / "usr" / "share" / "rpcd" / "ucode" / "i-love-luci.uc",
	root / "scripts",
]

forbidden = [
	(re.compile(r"nativeStatus\s*[:=]\s*['\"]partial['\"]"), "nativeStatus must use compat, not partial"),
	(re.compile(r"native_status\s+supported=.*partial=", re.IGNORECASE), "route audit output must report compat, not partial"),
	(re.compile(r"\bpartial\s+native\b", re.IGNORECASE), "user-facing model must not describe partial native routes"),
	(re.compile(r"Modern,\s*Partial,\s*Legacy", re.IGNORECASE), "settings status labels must use supported/compat/unsupported"),
	(re.compile(r"nativeStatus:\s*['\"]supported['\"]\s*\|\s*['\"]partial['\"]"), "types must use supported | compat | unsupported"),
]

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
	print("FAIL: compat contract audit found stale route terminology", file=sys.stderr)
	for failure in failures:
		print(failure, file=sys.stderr)
	sys.exit(1)

print("PASS: compat contract terminology is clean")
PY
