#!/usr/bin/env python3
"""Package only runtime sources into portable, environment-local build inputs."""
import argparse
import io
from pathlib import Path
import tarfile


def snapshot(root):
    output = io.BytesIO()
    members = [(f"bingo-isolation/common/{path.name}", path)
               for path in sorted((root / "common").iterdir()) if path.is_file()]
    members += [(f"bingo-transfer/common/{name}", root.parent / "bingo-transfer" / "common" / name)
                for name in ("acl.mjs", "transfer.mjs")]
    with tarfile.open(fileobj=output, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, path in sorted(members):
            data = path.read_bytes()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = 0o644
            info.mtime = info.uid = info.gid = 0
            archive.addfile(info, io.BytesIO(data))
    return output.getvalue()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    data = snapshot(root)
    for arm in ("aspire", "raw-scripted"):
        path = root / "tasks" / arm / "environment" / "isolation-common.tar"
        if args.check:
            if not path.is_file() or path.read_bytes() != data:
                parser.error(f"{path}: stale runtime snapshot; run package.py")
        else:
            path.write_bytes(data)
