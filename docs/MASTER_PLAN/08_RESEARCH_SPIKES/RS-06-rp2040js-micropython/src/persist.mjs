import { makeSim, runUntil, py } from './harness.mjs';
import { hookFlash } from './flashhook.mjs';
function boot(flashImg) {
  const h = makeSim(process.argv[2]); hookFlash(h.mcu);
  if (flashImg) h.mcu.flash.set(flashImg);
  runUntil(h, () => h.out.text.includes('>>> '), 60000);
  return h;
}
const a = boot();
console.log('first boot ls:', py(a, "import os\nprint(os.listdir())").text.split('\n')[0]);
py(a, "with open('t.txt','w') as f:\n    f.write('persist me')\nwith open('log.csv','w') as f:\n    f.write('1,2,3\\n'*200)");
const img = Uint8Array.from(a.mcu.flash);
const b = boot(img);
console.log('second boot (same flash image):', py(b, "import os\nprint(os.listdir())\nprint(open('t.txt').read())\nprint(len(open('log.csv').read()))").text);
// does the second boot still contain the original firmware at the same place?
let diff = 0; for (let i = 0; i < 0xa0000; i++) if (a.mcu.flash[i] !== b.mcu.flash[i]) diff++;
console.log('firmware bytes differing below 0xa0000:', diff);
