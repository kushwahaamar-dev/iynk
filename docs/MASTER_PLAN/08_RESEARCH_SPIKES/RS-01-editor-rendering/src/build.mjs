import * as esbuild from 'esbuild';
import fs from 'fs';
await esbuild.build({ entryPoints: ['src/bench.js'], bundle: true, format: 'esm', outfile: 'public/bench.js', minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.js': 'jsx' }, logLevel: 'info' });
fs.copyFileSync('src/index.html', 'public/index.html');
