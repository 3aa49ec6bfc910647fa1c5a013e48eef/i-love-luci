#!/usr/bin/env python3
import json
import shutil
import sys
from pathlib import Path


def read_metadata(path):
    data = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key] = value
    return data


def copy_feed(src, dest):
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dest)


def feed_index_file(package_format):
    if package_format == "apk":
        return "packages.adb"
    if package_format == "ipk":
        return "Packages.gz"
    raise ValueError(f"Unsupported package_format: {package_format}")


def html_index(feeds):
    lines = [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        "  <title>I Love LuCI package feed</title>",
        "</head>",
        "<body>",
        "  <h1>I Love LuCI package feed</h1>",
        "  <p>Feeds are grouped by OpenWrt release and package architecture.</p>",
        '  <p><a href="feeds.json">Machine-readable feed manifest</a></p>',
        "  <ul>",
    ]
    for feed in feeds:
        lines.append(
            "    <li>"
            f"<a href=\"{feed['path']}/\">OpenWrt {feed['openwrt_version']} "
            f"{feed['arch_packages']} {feed['package_format']} feed</a> "
            f"(built from {feed['openwrt_target']})"
            "</li>"
        )
    lines.extend(["  </ul>", "</body>", "</html>", ""])
    return "\n".join(lines)


def main():
    if len(sys.argv) != 3:
        print("usage: prepare-public-feed.py <artifact-dir> <public-dir>", file=sys.stderr)
        return 2

    artifact_root = Path(sys.argv[1])
    public_root = Path(sys.argv[2])

    if not artifact_root.is_dir():
        print(f"Artifact directory not found: {artifact_root}", file=sys.stderr)
        return 1

    if public_root.exists():
        shutil.rmtree(public_root)
    public_root.mkdir(parents=True)

    feeds = []
    seen_arch_feeds = set()

    for artifact_dir in sorted(p for p in artifact_root.iterdir() if p.is_dir()):
        metadata_path = artifact_dir / "build-metadata.txt"
        if not metadata_path.is_file():
            continue

        metadata = read_metadata(metadata_path)
        version = metadata["openwrt_version"]
        target = metadata["openwrt_target"]
        target_slug = metadata.get("target_slug", target.replace("/", "-"))
        arch = metadata["arch_packages"]
        package_format = metadata["package_format"]
        index_file = feed_index_file(package_format)

        if not (artifact_dir / index_file).is_file():
            print(f"Missing {index_file} in {artifact_dir}", file=sys.stderr)
            return 1

        arch_key = (version, arch, package_format)
        if arch_key in seen_arch_feeds:
            print(
                f"Duplicate feed for OpenWrt {version} {arch} {package_format}; "
                "publish one reference SDK per package arch.",
                file=sys.stderr,
            )
            return 1
        seen_arch_feeds.add(arch_key)

        arch_path = Path("openwrt") / version / arch
        target_path = Path("openwrt") / version / target_slug
        copy_feed(artifact_dir, public_root / arch_path)
        copy_feed(artifact_dir, public_root / target_path)

        feeds.append(
            {
                "openwrt_version": version,
                "openwrt_target": target,
                "target_slug": target_slug,
                "arch_packages": arch,
                "package_format": package_format,
                "path": str(arch_path),
                "index_file": index_file,
                "target_alias_path": str(target_path),
            }
        )

    if not feeds:
        print(f"No feed artifacts found in {artifact_root}", file=sys.stderr)
        return 1

    feeds.sort(key=lambda item: (item["openwrt_version"], item["arch_packages"], item["package_format"]))
    (public_root / ".nojekyll").write_text("", encoding="utf-8")
    (public_root / "feeds.json").write_text(json.dumps({"feeds": feeds}, indent=2) + "\n", encoding="utf-8")
    (public_root / "index.html").write_text(html_index(feeds), encoding="utf-8")

    for path in sorted(public_root.rglob("*")):
        if path.is_file():
            print(path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
