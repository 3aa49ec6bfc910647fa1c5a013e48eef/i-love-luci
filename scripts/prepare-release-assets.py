#!/usr/bin/env python3
import shutil
import sys
import tarfile
from pathlib import Path


def read_metadata(path):
    data = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key] = value
    return data


def suffix_package_name(path, suffix):
    name = path.name
    if name.endswith(".tar.gz"):
        return f"{name[:-7]}-{suffix}.tar.gz"
    stem = path.stem
    return f"{stem}-{suffix}{path.suffix}"


def add_tarball(src_dir, dest_file):
    with tarfile.open(dest_file, "w:gz") as archive:
        for path in sorted(src_dir.rglob("*")):
            archive.add(path, arcname=path.relative_to(src_dir))


def main():
    if len(sys.argv) != 3:
        print("usage: prepare-release-assets.py <artifact-dir> <release-upload-dir>", file=sys.stderr)
        return 2

    artifact_root = Path(sys.argv[1])
    release_dir = Path(sys.argv[2])

    if not artifact_root.is_dir():
        print(f"Artifact directory not found: {artifact_root}", file=sys.stderr)
        return 1

    if release_dir.exists():
        shutil.rmtree(release_dir)
    release_dir.mkdir(parents=True)

    package_count = 0
    feed_count = 0

    for artifact_dir in sorted(p for p in artifact_root.iterdir() if p.is_dir()):
        metadata_path = artifact_dir / "build-metadata.txt"
        if not metadata_path.is_file():
            continue

        metadata = read_metadata(metadata_path)
        version = metadata["openwrt_version"]
        target_slug = metadata.get("target_slug", metadata["openwrt_target"].replace("/", "-"))
        arch = metadata["arch_packages"]
        package_format = metadata["package_format"]
        suffix = f"{version}-{target_slug}-{arch}"

        feed_name = f"i-love-luci-stable-{version}-{arch}-{package_format}-feed.tar.gz"
        add_tarball(artifact_dir, release_dir / feed_name)
        feed_count += 1

        for package_file in sorted(list(artifact_dir.glob("*.apk")) + list(artifact_dir.glob("*.ipk"))):
            shutil.copy2(package_file, release_dir / suffix_package_name(package_file, suffix))
            package_count += 1

    if feed_count == 0 or package_count == 0:
        print(f"No release assets prepared from {artifact_root}", file=sys.stderr)
        return 1

    for path in sorted(release_dir.iterdir()):
        if path.is_file():
            print(path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
