#!/usr/bin/env python3
"""Shoot and check one built SimLab figure page (colorfigures-guide 4.3, 4.6).

    python3 -I figures/tools/cfshoot.py boards/uno-r3 [--press "Label@300,Picker>Choice@900" --at 1200,4000]
    python3 -I figures/tools/cfshoot.py public/figures/boards/uno-r3.html --out /some/dir

It shoots, each in a fresh browser context with a paused fake clock (nothing moves until the clock is run):
  angle-*.png     7 angles, closed                    xr-*.png        the same 7 angles, see-through + labels
  exploded-*.png  the same 7 angles, ?exploded=1 (skipped when the figure's state has no "exploded")
  press-*.png     ?press= runs at each --at time: front, from behind (--behind), see-through
  phone-xr.png    390 x 844 touch phone, full page    zoom-xr.png     4x close-up of part of the figure (--zoom)
  embed.png       the page inside an iframe host, driven through the bridge (hello, press by id, query)
  set-<n>.png     with --set '<json>' (repeatable): a fresh host sends that state patch through the bridge, waits, and
                  records the figure's state (status, power, faults, fault, why) in report.json under "sets"
plus contact.png (every shot on one sheet) and report.json: data-errors, NaN/Infinity/undefined inside #art, console
and page errors, label pills that overlap or leave the frame, horizontal scroll, the toast, a state snapshot, and the
bridge messages. Exit code 1 when anything is wrong.
"""
import argparse
import asyncio
import datetime
import json
import os
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SCRATCH = '/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad'
ANGLES = [('45', 'yaw=45'), ('110', 'yaw=110'), ('170', 'yaw=170'), ('230', 'yaw=230'), ('300', 'yaw=300'),
          ('top', 'yaw=20&pitch=62'), ('high-back', 'yaw=200&pitch=70')]
T0 = datetime.datetime(2026, 1, 1)

PROBE = r"""() => {
  const art = document.getElementById('art'), fig = document.getElementById('fig'), s = art ? art.innerHTML : '';
  const count = w => s.split(w).length - 1;
  const out = { errors: (document.documentElement.dataset.errors || '').trim(), nan: count('NaN'), inf: count('Infinity'),
    undef: count('undefined'), hscroll: document.documentElement.scrollWidth > innerWidth + 1, overlaps: [], offFrame: [],
    toast: (document.querySelector('#toast.show') || {}).textContent || '', mounted: !!fig, state: null };
  try { out.state = JSON.parse(JSON.stringify(window.__st, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v)); } catch (e) { out.state = String(e); }
  if (fig && !document.documentElement.classList.contains('nolabels')){
    const vb = fig.viewBox.baseVal, boxes = [];
    for (const g of fig.querySelectorAll('.tag')){ const r = g.querySelector('rect'); if (!r) continue;
      const b = { t: g.dataset.t, x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') };
      if (b.x < vb.x - .5 || b.y < vb.y - .5 || b.x + b.w > vb.x + vb.width + .5 || b.y + b.h > vb.y + vb.height + .5) out.offFrame.push(b.t);
      for (const o of boxes) if (b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h) out.overlaps.push(o.t + ' / ' + b.t);
      boxes.push(b); }
    out.labels = boxes.length; }
  return out; }"""

HOST = """<!doctype html><html><head><meta charset="utf-8"><title>cfshoot host</title>
<style>body{margin:0;background:#1d1b18;display:grid;place-items:center;height:100vh}
iframe{width:720px;height:540px;border:0;border-radius:12px;background:#e4ddcf;color-scheme:light}</style></head>
<body><iframe id="fr" title="figure" src="SRC"></iframe><script>
window.LOG = []; const fr = document.getElementById('fr');
addEventListener('message', e => { const m = e.data; if (e.source === fr.contentWindow && m && m.source === 'simlab-figure' && m.v === 1) LOG.push(m); });
fr.addEventListener('load', () => fr.contentWindow.postMessage({ source: 'simlab', v: 1, type: 'hello' }, '*'));
window.cmd = m => fr.contentWindow.postMessage({ source: 'simlab', v: 1, ...m }, '*');
</script></body></html>"""


def resolve(target):
    if target.endswith('.html') and os.path.isfile(target):
        page = os.path.abspath(target)
        rel = os.path.relpath(page, os.path.join(ROOT, 'public', 'figures'))
        name = rel[:-5].replace(os.sep, '-') if not rel.startswith('..') else os.path.basename(page)[:-5]
        return page, name
    item = target[:-3] if target.endswith('.js') else target
    page = os.path.join(ROOT, 'public', 'figures', item + '.html')
    if not os.path.isfile(page):
        sys.exit(f'no built page {os.path.relpath(page, ROOT)}; run figures/tools/cfbuild.py {item} first')
    return page, item.replace('/', '-')


class Shooter:
    def __init__(self, browser, page_path, out, args):
        self.browser, self.base, self.out, self.a = browser, 'file://' + page_path, out, args
        self.report, self.failed = {'page': page_path, 'shots': {}}, False

    async def shot(self, name, query, budget=None, viewport=(900, 800), scale=1.5, phone=False, clip=None, full=False):
        ctx = await self.browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]}, device_scale_factor=scale,
                                             is_mobile=phone, has_touch=phone)
        page = await ctx.new_page()
        logs = []
        page.on('console', lambda m: logs.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        page.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        await page.clock.install(time=T0)
        await page.clock.pause_at(T0 + datetime.timedelta(seconds=1))
        await page.goto(self.base + '?' + query)
        await page.clock.run_for(budget or self.a.budget)
        await page.wait_for_timeout(350)
        res = await page.evaluate(PROBE)
        res['console'] = logs
        path = os.path.join(self.out, name + '.png')
        if clip:
            box = await page.locator('#fig').bounding_box()
            x, y, w, h = clip
            await page.screenshot(path=path, clip={'x': box['x'] + box['width'] * x, 'y': box['y'] + box['height'] * y,
                                                   'width': box['width'] * w, 'height': box['height'] * h})
        else:
            await page.screenshot(path=path, full_page=full)
        await ctx.close()
        bad = [k for k in ('errors', 'console') if res[k]] + [k for k in ('nan', 'inf', 'undef') if res[k]]
        bad += ['overlaps'] if res.get('overlaps') else []
        bad += ['offFrame'] if res.get('offFrame') else []
        bad += ['hscroll'] if res['hscroll'] else []
        bad += [] if res['mounted'] else ['not mounted']
        res['problems'] = bad
        if bad:
            self.failed = True
        self.report['shots'][name] = res
        flag = ' PROBLEMS: ' + ', '.join(bad) if bad else ''
        print(f'{name}.png{flag}')
        return res

    async def embed(self):
        host = os.path.join(self.out, '_host.html')
        with open(host, 'w', encoding='utf-8') as fh:
            fh.write(HOST.replace('SRC', self.base + '?lang=en'))
        ctx = await self.browser.new_context(viewport={'width': 800, 'height': 620}, device_scale_factor=1.5)
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('file://' + host)
        await page.wait_for_function('window.LOG.some(m => m.type === "ready")', timeout=8000)
        ready = await page.evaluate('window.LOG.find(m => m.type === "ready")')
        checks = {'ready': True, 'buttons': len(ready.get('buttons') or [])}
        if ready.get('buttons'):
            bid = ready['buttons'][0]['id']
            await page.evaluate('id => cmd({ type: "press", id })', bid)
            await page.wait_for_function('id => window.LOG.some(m => m.type === "button" && m.id === id && m.by === "host")', arg=bid, timeout=4000)
            checks['press'] = bid
        await page.evaluate('cmd({ type: "press", id: "no-such-button" })')
        await page.wait_for_function('window.LOG.some(m => m.type === "error")', timeout=4000)
        n = await page.evaluate('window.LOG.filter(m => m.type === "state").length')
        await page.evaluate('cmd({ type: "query" })')
        await page.wait_for_function('n => window.LOG.filter(m => m.type === "state").length > n', arg=n, timeout=4000)
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(self.out, 'embed.png'))
        log = await page.evaluate('window.LOG')
        await ctx.close()
        checks['types'] = sorted({m['type'] for m in log})
        checks['errors_from_bad_press'] = [m['message'] for m in log if m['type'] == 'error']
        checks['pageerrors'] = errors
        unexpected = [m for m in checks['errors_from_bad_press'] if 'no-such-button' not in m]
        if errors or unexpected:
            self.failed = True
            checks['problems'] = errors + unexpected
        self.report['embed'] = {'checks': checks, 'ready': ready, 'messages': log[:80]}
        print('embed.png' + (' PROBLEMS: ' + '; '.join(checks['problems']) if checks.get('problems') else ''), '- bridge:', ', '.join(checks['types']))

    async def set_shot(self, n, patch):
        """One bridge `set` on a fresh host, the way the lab's failure panel sends it."""
        host = os.path.join(self.out, '_host.html')
        with open(host, 'w', encoding='utf-8') as fh:
            fh.write(HOST.replace('SRC', self.base + '?lang=en'))
        ctx = await self.browser.new_context(viewport={'width': 800, 'height': 620}, device_scale_factor=1.5)
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('file://' + host)
        await page.wait_for_function('window.LOG.some(m => m.type === "ready")', timeout=8000)
        await page.evaluate('s => cmd({ type: "set", state: s })', patch)
        await page.wait_for_timeout(self.a.set_wait)
        n0 = await page.evaluate('window.LOG.length')
        await page.evaluate('cmd({ type: "query" })')
        await page.wait_for_function('n => window.LOG.slice(n).some(m => m.type === "state")', arg=n0, timeout=4000)
        await page.screenshot(path=os.path.join(self.out, f'set-{n}.png'))
        log = await page.evaluate('window.LOG')
        await ctx.close()
        st = next((m.get('state') or {} for m in reversed(log) if m['type'] == 'state'), {})
        keep = {k: st.get(k) for k in ('status', 'power', 'faults', 'fault', 'why', 'missing', 'rails') if k in st}
        problems = errors + [m['message'] for m in log if m['type'] == 'error']
        if problems:
            self.failed = True
        self.report.setdefault('sets', []).append({'set': patch, 'state': keep, 'problems': problems})
        fault = (keep.get('fault') or {}).get('id') if isinstance(keep.get('fault'), dict) else keep.get('fault')
        print(f'set-{n}.png {json.dumps(patch)} -> status {keep.get("status")}, power {keep.get("power")}, '
              f'faults {keep.get("faults")}, fault {fault}' + (' PROBLEMS: ' + '; '.join(problems) if problems else ''))

    async def contact(self):
        names = [n for n in sorted(os.listdir(self.out)) if n.endswith('.png') and n != 'contact.png']
        cells = ''.join(f'<figure><img src="{urllib.parse.quote(n)}"><figcaption>{n}'
                        f'{" !" if self.report["shots"].get(n[:-4], {}).get("problems") else ""}</figcaption></figure>' for n in names)
        sheet = os.path.join(self.out, '_contact.html')
        with open(sheet, 'w', encoding='utf-8') as fh:
            fh.write('<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:#fff;font:12px monospace;display:grid;'
                     'grid-template-columns:repeat(5,300px);gap:8px}figure{margin:0}img{width:300px;height:250px;object-fit:contain;'
                     f'background:#eee;display:block}}</style>{cells}')
        ctx = await self.browser.new_context(viewport={'width': 1560, 'height': 600})
        page = await ctx.new_page()
        await page.goto('file://' + sheet)
        await page.wait_for_timeout(300)
        await page.screenshot(path=os.path.join(self.out, 'contact.png'), full_page=True)
        await ctx.close()
        os.remove(sheet)


async def run(args):
    from playwright.async_api import async_playwright
    page_path, name = resolve(args.target)
    out = os.path.abspath(args.out or os.path.join(SCRATCH, 'shots', name))
    os.makedirs(out, exist_ok=True)
    for n in os.listdir(out):
        if n.endswith('.png'):
            os.remove(os.path.join(out, n))
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        s = Shooter(browser, page_path, out, args)
        extra = ('&' + args.query) if args.query else ''
        for tag, q in ANGLES:
            await s.shot(f'angle-{tag}', f'free=1&{q}{extra}')
        for tag, q in ANGLES:
            await s.shot(f'xr-{tag}', f'free=1&{q}&xr=1&labels=1{extra}')
        if not args.no_exploded:
            for tag, q in ANGLES:
                r = await s.shot(f'exploded-{tag}', f'free=1&{q}&exploded=1{extra}')
                if not (isinstance(r['state'], dict) and r['state'].get('exploded')):
                    os.remove(os.path.join(out, f'exploded-{tag}.png'))
                    del s.report['shots'][f'exploded-{tag}']
                    s.report['exploded'] = 'unsupported: state has no truthy "exploded" after ?exploded=1'
                    print('exploded: not supported by this figure, skipped')
                    break
        if args.press:
            press = 'press=' + urllib.parse.quote(args.press, safe='@,>')
            for t in [int(x) for x in args.at.split(',')]:
                await s.shot(f'press-front-{t}', f'{press}{extra}', budget=t)
                await s.shot(f'press-behind-{t}', f'free=1&yaw={args.behind}&{press}{extra}', budget=t)
                await s.shot(f'press-xr-{t}', f'xr=1&labels=1&{press}{extra}', budget=t)
        await s.shot('phone-xr', f'xr=1&labels=1{extra}', viewport=(390, 844), scale=2, phone=True, full=True)
        zoom = [float(v) for v in args.zoom.split(',')]
        await s.shot('zoom-xr', f'xr=1&labels=1{extra}', scale=4, clip=zoom)
        try:
            await s.embed()
        except Exception as e:      # a timeout here means the bridge did not answer
            s.failed = True
            s.report['embed'] = {'problems': [f'bridge check failed: {e}']}
            print('embed: PROBLEMS:', str(e).splitlines()[0])
        for i, raw in enumerate(args.set or []):
            await s.set_shot(i + 1, json.loads(raw))
        await s.contact()
        await browser.close()
    s.report['ok'] = not s.failed
    with open(os.path.join(out, 'report.json'), 'w', encoding='utf-8') as fh:
        json.dump(s.report, fh, indent=1, ensure_ascii=False)
    for n in ('_host.html',):
        if os.path.exists(os.path.join(out, n)):
            os.remove(os.path.join(out, n))
    print(('OK' if not s.failed else 'PROBLEMS') + f': {len(s.report["shots"])} shots + embed check in {out} (contact.png, report.json)')
    return 0 if not s.failed else 1


def main():
    ap = argparse.ArgumentParser(description='Shoot and check one built figure page')
    ap.add_argument('target', help='<kind>/<id> (reads public/figures/<kind>/<id>.html) or a path to a built .html')
    ap.add_argument('--out', help=f'output folder (default {SCRATCH}/shots/<kind>-<id>)')
    ap.add_argument('--press', help='core ?press= list: "Label@ms,Picker>Choice@ms" (English button text)')
    ap.add_argument('--at', default='1500,4000', help='clock budgets in ms for the press shots')
    ap.add_argument('--behind', default='225', help='yaw for the from-behind press shots')
    ap.add_argument('--budget', type=int, default=1500, help='clock budget in ms for the still shots')
    ap.add_argument('--zoom', default='0.3,0.25,0.4,0.45', help='close-up crop of the figure box: x,y,w,h as fractions')
    ap.add_argument('--query', default='', help='extra URL parameters for every shot, e.g. "mode=blink"')
    ap.add_argument('--no-exploded', action='store_true', help='skip the exploded set')
    ap.add_argument('--set', action='append', help='a state patch (JSON) to send through the bridge; repeatable')
    ap.add_argument('--set-wait', type=int, default=1200, help='ms to wait after each --set before reading the state')
    sys.exit(asyncio.run(run(ap.parse_args())))


if __name__ == '__main__':
    main()
