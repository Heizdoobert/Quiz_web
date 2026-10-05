import os
import re

COLOR_MAP = {
    '#0A1128': 'deep-space',
    '#0a1128': 'deep-space',
    '#1A1B35': 'cyber-violet',
    '#1a1b35': 'cyber-violet',
    '#25284D': 'cyber-violet-light',
    '#25284d': 'cyber-violet-light',
    '#2D305A': 'cyber-border',
    '#2d305a': 'cyber-border',
    '#00FFCC': 'neo-mint',
    '#00ffcc': 'neo-mint',
    '#6C5CE7': 'electric-indigo',
    '#6c5ce7': 'electric-indigo',
    '#FFD166': 'crypto-gold',
    '#ffd166': 'crypto-gold',
    '#FF4757': 'pop-coral',
    '#ff4757': 'pop-coral',
    '#8A2BE2': 'cat-defi',
    '#8a2be2': 'cat-defi',
    '#FF007F': 'cat-nft',
    '#ff007f': 'cat-nft',
    '#3071FF': 'cat-l1',
    '#3071ff': 'cat-l1',
    '#14163A': 'elevation-2',
    '#14163a': 'elevation-2',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for hex_code, color_name in COLOR_MAP.items():
        # Replace `bg-[#0A1128]` with `bg-deep-space`
        # Also handles `/opacity` like `bg-[#0A1128]/80` -> `bg-deep-space/80`
        new_content = re.sub(rf'\[{hex_code}\]', color_name, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    # skip node_modules, .git, etc
    if any(d in root for d in ['.git', 'node_modules', '.next', 'coco', '.worktrees']):
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.md', '.html', '.css')):
            process_file(os.path.join(root, file))
