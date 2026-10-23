#!/usr/bin/env python3
import pathlib, re, sys

def replace_in_file(path: pathlib.Path):
    text = path.read_text(encoding='utf-8')
    original = text

    # EdgeInsets.all(...)
    def repl_all(match):
        val = match.group(1).strip()
        return f'EdgeInsets.all(Responsive(context).scale({val}))'

    # EdgeInsets.symmetric(horizontal: ..., vertical: ...)
    def repl_sym(match):
        horiz = match.group(1).strip()
        vert = match.group(2).strip()
        return (
            f'EdgeInsets.symmetric(horizontal: Responsive(context).scale({horiz}), '
            f'vertical: Responsive(context).scale({vert}))'
        )

    # EdgeInsets.only(left: ..., top: ..., ...)
    def repl_only(match):
        args = match.group(1)
        parts = []
        for part in args.split(','):
            name, val = part.split(':')
            name = name.strip()
            val = val.strip()
            parts.append(f'{name}: Responsive(context).scale({val})')
        return f'EdgeInsets.only({", ".join(parts)})'

    # EdgeInsets.fromLTRB(left, top, right, bottom)
    def repl_fromLTRB(match):
        vals = [v.strip() for v in match.group(1).split(',')]
        scaled = ', '.join(f'Responsive(context).scale({v})' for v in vals)
        return f'EdgeInsets.fromLTRB({scaled})'

    # Only apply if the file does not already contain the Responsive wrapper
    if 'Responsive(context).scale' not in text:
        text = re.sub(r'EdgeInsets\.all\(([^)]+)\)', repl_all, text)
        text = re.sub(r'EdgeInsets\.symmetric\(horizontal:\s*([^,]+),\s*vertical:\s*([^\)]+)\)', repl_sym, text)
        text = re.sub(r'EdgeInsets\.only\(([^)]+)\)', repl_only, text)
        text = re.sub(r'EdgeInsets\.fromLTRB\(([^)]+)\)', repl_fromLTRB, text)

    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'Updated {path}')

if __name__ == '__main__':
    root = pathlib.Path('mobile/lib')
    for path in root.rglob('*.dart'):
        replace_in_file(path)
