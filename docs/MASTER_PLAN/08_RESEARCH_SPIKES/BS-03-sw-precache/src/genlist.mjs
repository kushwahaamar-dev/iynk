import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const D='.next-T-B3-S3'; const page=process.argv[2]||'/en/about'; const extraPages=['/en/boards'];
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const gz=(f)=>zlib.gzipSync(fs.readFileSync(f)).length;
const urlOf=(f)=>'/_next/'+path.relative(D,f);
// A-all: everything under static except maps/ts, plus the prerendered html
const all=walk(D+'/static').filter(f=>!/\.(map|ts)$/.test(f)).map(urlOf);
// A-manifest: build-manifest root files + client reference manifest of the page and its layouts
const bm=JSON.parse(fs.readFileSync(D+'/build-manifest.json','utf8'));
const set=new Set([...bm.polyfillFiles,...bm.rootMainFiles].map(f=>'/_next/'+f));
const read=(p)=>{const s=fs.readFileSync(p,'utf8');return JSON.parse(s.slice(s.indexOf('= {')+2,s.lastIndexOf('}')+1).replace(/;\s*$/,''))};
const roots=['[lang]/about/page','[lang]/layout','layout'].map(r=>`${D}/server/app/${r}_client-reference-manifest.js`).filter(fs.existsSync);
for(const p of roots){const m=read(p);for(const f of Object.values(m.entryJSFiles||{}).flat())set.add('/_next/'+f.replace(/^\//,'')) ;for(const f of Object.values(m.entryCSSFiles||{}).flat())set.add('/_next/'+(f.path||f).replace(/^\//,''));for(const cm of Object.values(m.clientModules))for(const c of cm.chunks)set.add(c)}
const man=[...set].map(u=>u.replace('/_next/_next/','/_next/'));
const html=[page,...extraPages];
const size=(l)=>l.reduce((n,u)=>{const f=path.join(D,u.replace('/_next/',''));return fs.existsSync(f)?n+gz(f):n},0);
const out={all:[...html,...all],manifest:[...html,...man]};
for(const [k,l] of Object.entries(out)){fs.writeFileSync(`public/sw-list-${k}.json`,JSON.stringify(l));console.log(k,l.length,'urls; list gzip',zlib.gzipSync(JSON.stringify(l)).length,'B; assets gzip',size(l),'B; missing on disk',l.filter(u=>u.startsWith('/_next/')&&!fs.existsSync(path.join(D,u.replace('/_next/','')))).length)}
console.log(roots);
