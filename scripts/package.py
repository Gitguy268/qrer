#!/usr/bin/env python3
# Copyright (c) 2026 Lucas Van De Weerd. MIT.
"""Package release sources without dependencies, history, or test output."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
archive = root.parent / 'qrer.zip'
excluded = {'.git', 'node_modules', 'test-results', '__pycache__', '.DS_Store', '.env'}
files = sorted(path for path in root.rglob('*')
               if path.is_file() and not path.is_symlink()
               and not excluded.intersection(path.relative_to(root).parts)
               and not path.name.startswith('.env.') and path.suffix != '.pyc')
with ZipFile(archive, 'w', ZIP_DEFLATED) as output:
    for path in files:
        entry = ZipInfo('qrer/' + path.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = (path.stat().st_mode & 0xFFFF) << 16
        output.writestr(entry, path.read_bytes())
with ZipFile(archive) as output:
    if output.testzip() is not None:
        raise RuntimeError('Archive verification failed.')
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{checksum}  {archive.name}\n')
print(f'{archive}: {len(files)} files, {archive.stat().st_size:,} bytes')
