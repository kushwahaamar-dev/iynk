#!/usr/bin/env python3
"""Build iynk figure pages.

    python3 -I figures/tools/cfbuild.py boards/uno-r3        one figure: figures/boards/uno-r3.js
    python3 -I figures/tools/cfbuild.py boards/uno-r3 drones/quad5
    python3 -I figures/tools/cfbuild.py --all                every figure of every kind
    python3 -I figures/tools/cfbuild.py --kind boards        every figure of one kind
    python3 -I figures/tools/cfbuild.py _smoke/smoke --out /tmp/x.html

Each item is figures/<kind>/<id>.js. Directives in its leading comment lines say what else goes in the page, in order:

    // @cf use engine/bench/bench.js         a script, path relative to figures/
    // @cf use engine/bench/bench.list       a list of scripts, one path per line (# comments), relative to figures/
    // @cf data SL_UNO data/boards/uno-r3.json   JSON from the repo root, inlined as window.SL_UNO = {...}
    // @cf title Arduino Uno R3              the page <title> before mount (mountFigure sets it again)
    // @cf page plain                        a page that does not call mountFigure (no build.py HEAD/TAIL); it
                                             talks to the host through CF_BRIDGE (docs/FIGURES.md)

The page is: the vendored core (figures/vendor/colorfigures/core.js) and the bridge (figures/engine/embed.js) in the
head, build.py's HEAD before </head>, then the used scripts, the data and the item script, then build.py's TAIL with
the iynk fixes (PATCHES.md, B1-B2). Output: public/figures/<kind>/<id>.html. Anything missing or unsafe fails the
build with a message that names the file and line.
"""
import argparse
import ast
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FIG = os.path.join(ROOT, 'figures')
VENDOR = os.path.join(FIG, 'vendor', 'colorfigures')
OUT_DIR = os.path.join(ROOT, 'public', 'figures')
KINDS = ('boards', 'parts', 'modules', 'robotics', 'drones', 'flight')

# core.js globals a figure must never declare (colorfigures-guide 1.14, plus the iynk patch names); the top-level
# declarations of the vendored core are added at run time, so a new core cannot slip past this list
RESERVED = set("""
PALS METAL CLEAR CERAMIC DARK INK SHADOW C S OX OY VIEW RC RCZ VIEW_NAMES TURNS YAW0 PITCH0 CAM_K YAW PITCH
CAM_R CAM_U CAM_V CAM_D camBasis CAM_B0 CAM_LIM setCam camDot rotV yawTurn rotXY P0 P Dv depthOf boxMid sepOrder
byDepth nearHalf farHalf openShell f pd sp arcUV rrUV rectUV ellUV PX PY PZ on sub dot cross norm avg vis facing
SHADOW_K AZ_MIN AZ_MAX SHADOW_LEN L SH setLight LIN SOFT step3 tone toneI mix matOf ease ink fill face shape line
loft hull hullInk box extrude cyl cylX rod txM tx txY castShadow BOARD WOOD boardTop board act _clipN tag clipTo
INK_REF_VB INK_K inkScale CORE_CSS filterFor bakeNoise mountFigure xrCallouts xrGhost xrGhostRings xrUnder xrWrap
xrMount mountKeypad FIG_A LBL_U GAME_KEYS
CF_Q CF_EMBED CF_NOTE CF_LANG CF_STR CF_T CF_ESC CF_L CF_SLUG CF_TW CF_MAT CF_OPTS CF_FRAME_A CF_MOVE_T CF_MOVED
CF_MOUNT_HOOKS CF_UI CF_CFG CF_SETLOCALE CF_THEME CF_CSS
""".split())
# core helpers that, shadowed by a local of the same name, have broken real figures (guide 1.14, Appendix E)
SHADOW_RISK = {'on', 'f', 'P', 'tag', 'box', 'line', 'fill', 'face', 'shape', 'ink', 'mix', 'act', 'tone', 'toneI',
               'cyl', 'rod', 'board', 'pd', 'sp', 'tx', 'txY', 'avg', 'norm', 'dot', 'sub', 'cross', 'vis', 'facing'}

# B1 (Appendix E): build.py's TAIL turns the hand-drawn filter off on phones and touch screens at all times; iynk
# drops it only while the figure moves (html.cf-moving, core patch P5), as build.py's docstring describes
TAIL_FILTER_OLD = '@media (max-width:560px),(pointer:coarse){#art{filter:none!important}'
TAIL_FILTER_NEW = '@media (max-width:560px),(pointer:coarse){html.cf-moving #art{filter:none!important}'
# B2: the zoom chip is the only build.py control left in embedded mode; it gets keyboard focus rings
TAIL_EXTRA = '<style>.zchip button:focus-visible{outline:2px solid #231e16;outline-offset:1px}</style>'


class BuildError(Exception):
    pass


def read(path):
    if not os.path.isfile(path):
        raise BuildError(f'missing file: {os.path.relpath(path, ROOT)}')
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def build_py_pieces():
    """HEAD and TAIL from the vendored build.py, read as data (the script runs on import, so it is not imported)."""
    tree = ast.parse(read(os.path.join(VENDOR, 'build.py')))
    found = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            if node.targets[0].id in ('HEAD', 'TAIL'):
                found[node.targets[0].id] = ast.literal_eval(node.value)
    if set(found) != {'HEAD', 'TAIL'}:
        raise BuildError('figures/vendor/colorfigures/build.py: HEAD or TAIL not found')
    tail = found['TAIL']
    if tail.count(TAIL_FILTER_OLD) != 1:
        raise BuildError('build.py TAIL changed: the touch filter rule (fix B1) was not found exactly once')
    return found['HEAD'], tail.replace(TAIL_FILTER_OLD, TAIL_FILTER_NEW) + TAIL_EXTRA


def core_names(core):
    names = set(re.findall(r'^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', core, re.M))
    return names | RESERVED


def check_script(name, src, reserved, warnings):
    for i, line in enumerate(src.splitlines(), 1):
        low = line.lower()
        if '</script' in low or '<!--' in low:
            raise BuildError(f'{name}:{i}: "</script" or "<!--" would end the inlined script; write "<\\/script" or split the string')
        m = re.match(r'(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', line)
        if m and m.group(1) in reserved:
            raise BuildError(f'{name}:{i}: top-level "{m.group(1)}" clashes with a core.js global (guide 1.14); wrap the file in an IIFE or rename it')
        m = re.match(r'\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=', line)
        if m and m.group(1) in SHADOW_RISK:
            warnings.append(f'{name}:{i}: local "{m.group(1)}" shadows a core helper; calling it earlier in the same function throws (guide 1.14)')


def inside(base, path, what):
    full = os.path.abspath(os.path.join(base, path))
    if not (full == base or full.startswith(base + os.sep)):
        raise BuildError(f'{what}: {path} is outside {os.path.relpath(base, ROOT) or "."}')
    return full


def directives(name, src):
    out = []
    for i, line in enumerate(src.splitlines(), 1):
        s = line.strip()
        if not s:
            continue
        if not (s.startswith('//') or s.startswith('/*') or s.startswith('*')):
            break
        m = re.match(r'(?://|/\*|\*)\s*@cf\s+(\w+)\s*(.*?)\s*(?:\*/)?$', s)
        if not m:
            continue
        verb, arg = m.group(1), m.group(2).strip()
        if verb not in ('use', 'data', 'title', 'page'):
            raise BuildError(f'{name}:{i}: unknown directive "@cf {verb}"')
        if not arg:
            raise BuildError(f'{name}:{i}: "@cf {verb}" needs an argument')
        out.append((verb, arg, i))
    return out


def expand_use(arg, where, seen, chain=()):
    path = inside(FIG, arg, where)
    if path in chain:
        raise BuildError(f'{where}: {arg} includes itself')
    if not path.endswith('.list'):
        return [] if path in seen else (seen.add(path) or [path])
    files = []
    for j, line in enumerate(read(path).splitlines(), 1):
        entry = line.split('#', 1)[0].strip()
        if entry:
            files += expand_use(entry, f'{os.path.relpath(path, ROOT)}:{j}', seen, chain + (path,))
    return files


def esc_html(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build(item, out=None, quiet=False):
    item = item[:-3] if item.endswith('.js') else item
    if item.startswith('figures/'):
        item = item[len('figures/'):]
    parts = item.split('/')
    if len(parts) != 2 or not all(re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.-]*', p) for p in parts):
        raise BuildError(f'"{item}": name a figure as <kind>/<id>, e.g. boards/uno-r3')
    kind, fid = parts
    src_path = os.path.join(FIG, kind, fid + '.js')
    name = os.path.relpath(src_path, ROOT)
    src = read(src_path)
    core = read(os.path.join(VENDOR, 'core.js'))
    embed = read(os.path.join(FIG, 'engine', 'embed.js'))
    head, tail = build_py_pieces()
    reserved = core_names(core)
    warnings = []

    title, scripts, seen, plain = fid, [], set(), False
    for verb, arg, line in directives(name, src):
        where = f'{name}:{line}'
        if verb == 'title':
            title = arg
        elif verb == 'page':
            if arg != 'plain':
                raise BuildError(f'{where}: "@cf page" takes only "plain"')
            plain = True
        elif verb == 'use':
            for path in expand_use(arg, where, seen):
                rel = os.path.relpath(path, ROOT)
                code = read(path)
                check_script(rel, code, reserved, warnings)
                scripts.append((rel, code))
        else:
            m = re.fullmatch(r'([A-Za-z_$][\w$]*)\s+(\S+)', arg)
            if not m:
                raise BuildError(f'{where}: write "@cf data NAME path/from/repo/root.json"')
            if m.group(1) in reserved:
                raise BuildError(f'{where}: data name "{m.group(1)}" clashes with a core.js global')
            path = inside(ROOT, m.group(2), where)
            try:
                data = json.loads(read(path))
            except json.JSONDecodeError as e:
                raise BuildError(f'{os.path.relpath(path, ROOT)}: invalid JSON ({e})')
            blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/').replace('<!--', '<\\!--')
            scripts.append((os.path.relpath(path, ROOT), f'window.{m.group(1)} = {blob};'))
    check_script(name, src, reserved, warnings)
    scripts.append((name, src))
    for rel, code in (('figures/vendor/colorfigures/core.js', core), ('figures/engine/embed.js', embed)):
        if '</script' in code.lower():
            raise BuildError(f'{rel}: contains "</script"')

    body = ''.join(f'<script>/* {rel} */\n{code}\n</script>\n' for rel, code in scripts)
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<meta name="color-scheme" content="light">\n'
            f'<title>{esc_html(title)}</title>\n'
            f'<script>\n{core}\n</script>\n<script>/* figures/engine/embed.js */\n{embed}\n</script>\n'
            f'{"" if plain else head}</head>\n<body>\n{body}{"" if plain else tail}</body>\n</html>\n')

    dest = out or os.path.join(OUT_DIR, kind, fid + '.html')
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    tmp = dest + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write(page)
    os.replace(tmp, dest)
    for w in warnings:
        print('warning:', w, file=sys.stderr)
    if not quiet:
        print(f'built {os.path.relpath(dest, ROOT) if dest.startswith(ROOT) else dest} '
              f'({len(page.encode("utf-8")) // 1024} kB, {len(scripts)} script{"s" if len(scripts) != 1 else ""})')
    return dest


def all_items(kinds):
    items = []
    for kind in kinds:
        d = os.path.join(FIG, kind)
        if os.path.isdir(d):
            items += [f'{kind}/{n[:-3]}' for n in sorted(os.listdir(d)) if n.endswith('.js') and not n.startswith('_')]
    return items


def main():
    ap = argparse.ArgumentParser(description='Build iynk figure pages into public/figures/<kind>/<id>.html')
    ap.add_argument('items', nargs='*', help='figures as <kind>/<id>, e.g. boards/uno-r3')
    ap.add_argument('--all', action='store_true', help='build every figure of every kind')
    ap.add_argument('--kind', action='append', choices=KINDS, help='build every figure of this kind')
    ap.add_argument('--out', help='output file (one item only)')
    a = ap.parse_args()
    items = list(a.items)
    if a.all:
        items += all_items(KINDS)
    if a.kind:
        items += all_items(a.kind)
    if not items:
        if a.all or a.kind:
            print('no figures to build')
            return
        ap.error('name a figure (e.g. boards/uno-r3), --kind or --all')
    if a.out and len(items) != 1:
        ap.error('--out takes exactly one figure')
    failed = 0
    for item in items:
        try:
            build(item, a.out)
        except BuildError as e:
            failed += 1
            print(f'error: {item}: {e}', file=sys.stderr)
    if failed:
        sys.exit(f'{failed} of {len(items)} figure(s) failed')


if __name__ == '__main__':
    main()
