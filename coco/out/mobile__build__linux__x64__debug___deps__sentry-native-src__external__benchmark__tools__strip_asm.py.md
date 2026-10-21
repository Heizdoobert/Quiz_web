# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/tools/strip_asm.py
lines:163 exports:
---
#!/usr/bin/env python3

"""
strip_asm.py - Cleanup ASM output for the specified file
"""

import os
import re
import sys
from argparse import ArgumentParser


def find_used_labels(asm):
    found = set()
    label_re = re.compile(r"\s*j[a-z]+\s+\.L([a-zA-Z0-9][a-zA-Z0-9_]*)")
    for line in asm.splitlines():
        m = label_re.match(line)
        if m:
            found.add(".L%s" % m.group(1))
    return found


def normalize_labels(asm):
    decls = set()
    label_decl = re.compile("^[.]{0,1}L([a-zA-Z0-9][a-zA-Z0-9_]*)(?=:)")
    for line in asm.splitlines():
        m = label_decl.match(line)
        if m:
            decls.add(m.group(0))
    if len(decls) == 0:
        return asm
    needs_dot = next(iter(decls))[0] != "."
    if not needs_dot:
        return asm
    for ld in decls:
        asm = re.sub(r"(^|\s+)" + ld + r"(?=:|\s)", "\\1." + ld, asm)
    return asm


def transform_labels(asm):
