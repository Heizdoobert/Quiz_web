import pathlib
import re
from collections.abc import AsyncIterator

import cocoindex as coco
from cocoindex.connectors import localfs
from cocoindex.resources.file import FileLike, PatternFilePathMatcher

OUT = pathlib.Path("coco/out")
ROOT = pathlib.Path(".")
MAX_HEAD_CHARS = 4000
MAX_HEAD_LINES = 40

# ponytail: no embeddings/DB, per-file snippets only. Add vectors when keyword index measurably fails.

SOURCE_DIRS = [
    "app",
    "components",
    "lib",
    "hooks",
    "docs",
    "scripts",
    "tasks",
    "tests",
    "contracts/contracts",
    "contracts/scripts",
    "contracts/test",
]

MATCHER = PatternFilePathMatcher(
    included_patterns=[
        "**/*.ts",
        "**/*.tsx",
        "**/*.sql",
        "**/*.md",
        "**/*.js",
        "**/*.mjs",
        "**/*.mts",
        "**/*.py",
        "**/*.sol",
        "**/*.json",
    ],
    excluded_patterns=[
        "**/*.db*",
        "**/.venv/**",
        "**/__pycache__/**",
        "coco/**",
        "main.py",
        "coco_indexer.py",
        "search_docs.py",
        "*docs_indexer*",
        "*test_docs_indexer*",
        "contracts/node_modules/**",
        "contracts/artifacts/**",
        "contracts/cache/**",
        "contracts/typechain-types/**",
    ],
)


@coco.lifespan
def coco_lifespan(builder: coco.EnvironmentBuilder) -> AsyncIterator[None]:
    builder.settings.db_path = pathlib.Path("coco/cocoindex.db")
    yield


def _sanitize_head(head: str) -> str:
    head = re.sub(r"([?&]key=)[a-zA-Z0-9_-]{16,}", r"\g<1>REDACTED", head)
    head = re.sub(
        r"(process\.env\.[A-Z0-9_]+\s*\|\|\s*['\"])0x[a-fA-F0-9]{40}(['\"])",
        r"\g<1>0x0000000000000000000000000000000000000000\g<2>",
        head,
    )
    return head


@coco.fn(memo=True)
async def process_file(file: FileLike, out: pathlib.Path) -> None:
    try:
        text = await file.read_text()
    except Exception:
        return
    rel = str(file.file_path.path).replace("\\", "/")
    lines = text.splitlines()
    raw_head = "\n".join(lines[:MAX_HEAD_LINES])[:MAX_HEAD_CHARS]
    head = _sanitize_head(raw_head)
    exports = _EXPORT_RE.findall(text)
    if "export default" in text:
        exports = [*exports, "default"]
    name = rel.replace("/", "__")
    if not name.endswith(".md"):
        name += ".md"
    localfs.declare_file(
        out / name,
        f"# {rel}\nlines:{len(lines)} exports:{','.join(exports[:20])}\n---\n{head}\n",
        create_parent_dirs=True,
    )



_EXPORT_RE = re.compile(
    r"export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_]+)"
)


@coco.fn
async def agent_index_main(out: pathlib.Path = OUT) -> None:
    for d in SOURCE_DIRS:
        with coco.component_subpath("dir-" + d.replace("/", "-")):
            files = localfs.walk_dir(
                pathlib.Path(d), recursive=True, path_matcher=MATCHER
            )
            await coco.mount_each(process_file, files.items(), out)
    with coco.component_subpath("dir-root"):
        files = localfs.walk_dir(ROOT, recursive=False, path_matcher=MATCHER)
        await coco.mount_each(process_file, files.items(), out)
    with coco.component_subpath("dir-contracts-top"):
        files = localfs.walk_dir(
            pathlib.Path("contracts"), recursive=False, path_matcher=MATCHER
        )
        await coco.mount_each(process_file, files.items(), out)


app = coco.App(
    coco.AppConfig(name="AgentIndex"),
    agent_index_main,
)
