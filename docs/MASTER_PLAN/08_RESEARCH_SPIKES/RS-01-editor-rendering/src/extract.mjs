import { chromium } from 'playwright';
import fs from 'fs';
const dir='/Users/amar/Codes/ak/simlab/public/figures/parts/';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:900,height:700}});
const out=[];
for (const f of fs.readdirSync(dir)) {
  if (['breadboard.html','wire.html','multimeter.html'].includes(f)) continue;
  await p.goto('file://'+dir+f+'?bare=1'); await p.waitForTimeout(700);
  const r = await p.evaluate(()=>{
    const gs=[...document.querySelectorAll('#art g[data-act]')].filter(g=>g.dataset.id!=='BB');
    if(!gs.length) return null;
    const g=gs.sort((a,b)=>b.querySelectorAll('path').length-a.querySelectorAll('path').length)[0];
    const items=[];
    g.querySelectorAll('path,circle,rect,ellipse').forEach(e=>{
      const o={t:e.tagName};for(const a of e.attributes)o[a.name]=a.value;items.push(o);});
    const bb=g.getBBox();
    return {id:g.dataset.id,label:g.dataset.label,bbox:[bb.x,bb.y,bb.width,bb.height],items};
  });
  if(!r){console.log('skip',f);continue;}
  r.name=f.replace('.html','');
  out.push(r);
  console.log(r.name,r.items.length,r.bbox.map(v=>v.toFixed(1)).join(','));
}
fs.writeFileSync('public/parts.json',JSON.stringify(out));
console.log('bytes',fs.statSync('public/parts.json').size);
await b.close();
