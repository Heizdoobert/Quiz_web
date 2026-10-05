import os
import re

for root, dirs, files in os.walk('.'):
    if any(d in root for d in ['.git', 'node_modules', '.next', 'coco', '.worktrees']):
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.md', '.html', '.css')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            new_content = re.sub(r'bg-gradient-to-', r'bg-linear-to-', content)

            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f'Fixed {filepath}')

