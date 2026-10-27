import { hookFlash } from './flashhook.mjs';
import { makeSim, runUntil, py } from './harness.mjs';
const h = makeSim(process.argv[2]); const {mcu,out,sim}=h; const fl=hookFlash(mcu);
runUntil(h,()=>out.text.includes('>>> '),60000);
const t0=sim.clock.nanos;
console.log(py(h,`import rp2, os
b = rp2.Flash()
print('size', b.ioctl(4,0), 'blk', b.ioctl(5,0))
try:
    os.mount(os.VfsLfs2(b), '/')
    print('mounted')
except Exception as e:
    print('mount err', repr(e))
    try:
        os.VfsLfs2.mkfs(b)
        print('mkfs ok')
    except Exception as e2:
        print('mkfs err', repr(e2))
print(os.listdir('/'))
print(os.getcwd())`, 60000).text, (sim.clock.nanos-t0)/1e6);
console.log(fl);
