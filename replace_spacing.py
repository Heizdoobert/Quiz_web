import os
import re

PREFIXES = [
    'w', 'h', 'min-w', 'max-w', 'min-h', 'max-h',
    'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
    'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
    'gap', 'gap-x', 'gap-y',
    'top', 'bottom', 'left', 'right', 'inset'
]

# Match things like `w-[40px]`, `sm:min-h-[50px]`, `-mt-[10px]`
# capturing group 1: any prefixes like `sm:`, `hover:`, `-`
# capturing group 2: the property like `min-h`
# capturing group 3: the pixel amount like `50`
pattern = re.compile(rf"([a-z0-9:-]*\-)?({'|'.join(PREFIXES)})\-\[(\d+)px\]")

def replace_match(m):
    prefix = m.group(1) or ''
    prop = m.group(2)
    px = int(m.group(3))
    
    val = px / 4
    if val.is_integer():
        val = int(val)
        
    return f"{prefix}{prop}-{val}"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = pattern.sub(replace_match, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    if any(d in root for d in ['.git', 'node_modules', '.next', 'coco', '.worktrees']):
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.md', '.html', '.css')):
            process_file(os.path.join(root, file))
