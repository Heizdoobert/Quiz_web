# mobile/build/linux/x64/debug/_deps/sentry-native-src/scripts/contrib.py
lines:83 exports:
---
#!/usr/bin/env python3

import argparse
import re
import sys
from pathlib import Path


def unique_contributors(contributors):
    unique = {}
    for contributor in contributors:
        contributor = contributor.lstrip("@")
        unique.setdefault(contributor.lower(), contributor)
    return list(unique.values())


def update_changelog(contents, release, contributors):
    heading = re.search(rf"^## {re.escape(release)}$", contents, re.MULTILINE)
    if not heading:
        print(f"Release {release} not found in the changelog", file=sys.stderr)
        return None

    end = contents.find("\n## ", heading.end())
    if end == -1:
        end = len(contents)

    section = contents[heading.start() : end]
    thanks = "**Thank you**:"
    thanks_start = section.find(thanks)
    existing = set()
    if thanks_start != -1:
        existing = {
            contributor.lower()
            for contributor in re.findall(
                r"https://github\.com/([A-Za-z0-9-]+)", section[thanks_start:]
            )
        }

    requested = unique_contributors(contributors)
    contributors = [
