import json,sys
for f in sys.argv[1:]:
    d=json.load(open(f))
    print(f, d.get('runtime') or d.get('browser'), d.get('throttle',''), d.get('initMs',''))
    for r in d['runs']:
        t=r['timing']
        print(' ',r['engine'],r['finalHash'],'mean_us=%.1f p95step_us=%.1f p95batch100_us=%.1f max_us=%.0f'%(t['perStep']['mean']*1000,t['perStep']['p95']*1000,t['batch100']['p95']*1000,t['perStep']['max']*1000),'nan',r['nanWords'])
