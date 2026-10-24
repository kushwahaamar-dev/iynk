"""Builds the design-calculator fixtures from the research notes.

  python3 -I src/lib/drone/__fixtures__/extract.py <repo> <dir with the original drone figure sources>

Writes three JSON files next to this script:
  catalogues.json  battery / motor / prop options and fixed parts of all 13 crafts, read as data
                   (regex, never executed) from the original figure sources
  golden-a.json    docs/research/drone-lab-a.md Appendix A: 4 crafts x 27 combinations
  golden-b.json    docs/research/drone-lab-b-calc-matrix.md: Figs 05-13, 234 combinations

Each golden row keeps the printed number of decimals per column, so the test can compare at the
precision the table was written with.
"""

import json
import re
import sys
from pathlib import Path

FILES = {
    'quad5': '05', 'whoop': '06', 'cinewhoop': '07', 'longrange': '08', 'racer': '09',
    'gpscam': '10', 'delivery': '11', 'agrihex': '12', 'wing': '13', 'vtol': '14',
    'swarm': '15', 'tricopter': '16', 'octo': '17',
}

VALUE = r"('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|-?[\d.]+(?:e-?\d+)?|true|false)"


def block(src, name, opener, closer):
    start = src.index(f'const {name} = {opener}')
    end = src.index(closer, start)
    return src[start:end]


def scalar(text):
    if text in ('true', 'false'):
        return text == 'true'
    if text[0] in '\'"':
        return text[1:-1].replace("\\'", "'").replace('\\"', '"')
    return float(text) if re.search(r'[.e]', text) else int(text)


def options(src, name):
    out = {}
    for key, body in re.findall(r"'([^']+)'\s*:\s*\{([^}]*)\}", block(src, name, '{', '\n};')):
        fields = dict(re.findall(r'(\w+)\s*:\s*' + VALUE, body))
        out[key] = {k: scalar(v) for k, v in fields.items() if k not in ('col', 'lab', 'dims')}
    return out


def fixed(src):
    rows = re.findall(
        r"\[\s*'(\w+)'\s*,\s*" + VALUE + r"\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*'(Electrical|Mechanical)'\s*\]",
        block(src, 'FIXED', '[', '\n];'))
    return [{'id': r[0], 'g': scalar(r[2]), 'price': scalar(r[3]), 'category': r[4]} for r in rows]


def catalogues(orig):
    out = {}
    for craft, num in FILES.items():
        src = next(Path(orig).glob(f'{num}-*.js')).read_text()
        out[craft] = {
            'batteries': options(src, 'BATTS'),
            'motors': options(src, 'MOTORS'),
            'props': options(src, 'PROPS'),
            'fixed': fixed(src),
        }
    return out


def decimals(cell):
    m = re.fullmatch(r'-?\d+(?:\.(\d+))?%?', cell)
    return len(m.group(1) or '') if m else None


DEFAULT = re.compile(r'default = (\S+) / (\S+) / (\S+)\)|battery `([^`]+)`, motor `([^`]+)`, prop `([^`]+)`')


def tables(md, heading):
    """Yields (craft, default pick, header, rows) for every markdown table under a heading naming a craft."""
    craft, default, header, rows = None, None, None, []
    for line in md.splitlines() + ['']:
        h = re.match(heading, line)
        if h:
            craft, default, header, rows = h.group(1), None, None, []
        d = DEFAULT.search(line)
        if craft and d:
            batt, motor, prop = [g for g in d.groups() if g]
            default = {'batt': batt, 'motor': motor, 'prop': prop}
        if h:
            continue
        if craft and line.startswith('|'):
            cells = [c.strip().strip('*').strip() for c in line.strip().strip('|').split('|')]
            if header is None:
                header = cells
            elif not set(line) <= set('|- '):
                rows.append(dict(zip(header, cells)))
        elif craft and header and rows:
            yield craft, default, header, rows
            craft, default, header, rows = None, None, None, []


NUMERIC = {
    # appendix A header -> key
    'AUW g': 'auw', 'g/motor': 'thrust', 'T:W': 'tw', 'hover thr': 'hoverThr', 'max A': 'maxA',
    'hover min': 'hoverMin', 'fly min': 'flyMin',
    # calc matrix extras
    'V': 'V', 'thrust g/motor': 'thrust', 'hover A': 'hoverA', 'cruise km/h': 'cruiseKmh',
    'stall km/h': 'stallKmh', 'top km/h': 'topKmh',
}


def golden(md, heading, flags):
    out = []
    for craft, default, header, rows in tables(md, heading):
        precision = {}
        for col, key in NUMERIC.items():
            if col in header:
                precision[key] = max(decimals(r[col]) for r in rows)
        cost_col = next(c for c in header if c.startswith('$') or c.startswith('cost'))
        verdict_col = header[-1]
        parsed = []
        for r in rows:
            row = {'batt': r['batt'], 'motor': r['motor'], 'prop': r['prop']}
            for col, key in NUMERIC.items():
                if col in r:
                    text = r[col]
                    value = float(text.rstrip('%'))
                    row[key] = value / 100 if text.endswith('%') else value
            row.update(flags(r))
            row['cost'] = [int(x) for x in re.split(r'\s*/\s*', r[cost_col])]
            row['verdict'] = r[verdict_col]
            parsed.append(row)
        if 'hoverThr' in precision and rows[0]['hover thr'].endswith('%'):
            precision['hoverThr'] += 2  # printed as a whole percentage
        out.append({'craft': craft, 'default': default, 'precision': precision, 'rows': parsed})
    return out


def flags_a(r):
    return {'over': 'over' in r['flags'], 'weak': 'weak' in r['flags']}


def flags_b(r):
    return {'over': r['over'] == 'Y', 'weak': r['weak'] == 'Y'}


def main():
    repo, orig = Path(sys.argv[1]), Path(sys.argv[2])
    here = repo / 'src/lib/drone/__fixtures__'
    research = repo / 'docs/research'
    a = golden((research / 'drone-lab-a.md').read_text(), r'#### (\w+): all \d+ combinations', flags_a)
    b = golden((research / 'drone-lab-b-calc-matrix.md').read_text(), r'## Fig \d+ .*\(`(\w+)`\)', flags_b)
    cat = catalogues(orig)
    for name, data in (('catalogues', cat), ('golden-a', a), ('golden-b', b)):
        (here / f'{name}.json').write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    print('crafts', len(cat), 'golden-a', sum(len(t['rows']) for t in a), 'golden-b', sum(len(t['rows']) for t in b))
    for t in a + b:
        print(t['craft'], len(t['rows']), t['default'], t['precision'])


if __name__ == '__main__':
    main()
