import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve('public'), types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(4517, '127.0.0.1');
