// static server with precompressed brotli, port 8765 (not 3000 / 43117)
import http from 'node:http'; import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const dir = new URL('../web/', import.meta.url).pathname;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.tar': 'application/x-tar' };
const cache = new Map();
http.createServer((req, res) => {
  const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  let br = cache.get(f);
  if (!br) { br = zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: fs.statSync(f).size } }); cache.set(f, br); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'content-encoding': 'br', 'content-length': br.length, 'cache-control': 'no-store' });
  res.end(br);
}).listen(8765, '127.0.0.1', () => console.log('up'));
