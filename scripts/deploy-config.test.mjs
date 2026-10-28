import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');
const compose = read('deploy/compose.yaml');

const service = (name) => {
  const start = compose.indexOf(`\n  ${name}:\n`);
  const rest = compose.slice(start + 1);
  const next = rest.slice(rest.indexOf('\n') + 1).search(/^ {2}\S|^\S/m);
  return next === -1 ? rest : rest.slice(0, rest.indexOf('\n') + 1 + next);
};

describe('deploy/compose.yaml', () => {
  it('has the three services', () => {
    for (const name of ['web', 'server', 'caddy']) expect(service(name)).toContain(`  ${name}:`);
  });

  it('publishes no host port 3000 or 43117', () => {
    expect(compose).not.toContain('43117');
    expect(compose).not.toMatch(/^\s+- "?(\$\{[^}]*\})?3000:/m);
  });

  it('hardens all three services', () => {
    for (const name of ['web', 'server', 'caddy']) {
      const block = service(name);
      expect(block).toContain('read_only: true');
      expect(block).toContain('cap_drop: [ALL]');
      expect(block).toContain('no-new-privileges:true');
    }
  });

  it('gives the web app an absolute server URL and a writable cache', () => {
    expect(service('web')).toMatch(/IYNK_SERVER_URL: https:\/\//);
    expect(service('web')).toContain('- /app/.next/cache');
  });

  it('keeps certificates and config on volumes, with HTTP/3 on the same port variable', () => {
    const caddy = service('caddy');
    expect(caddy).toContain('caddy_data:/data');
    expect(caddy).toContain('caddy_config:/config');
    expect(caddy).toContain('"${IYNK_HTTPS_PORT:-443}:443/udp"');
  });

  it('requires IYNK_DOMAIN', () => {
    expect(compose).toContain('${IYNK_DOMAIN:?');
  });
});

describe('deploy/Caddyfile', () => {
  it('sends the server paths to the server and the rest to the web app', () => {
    const caddyfile = read('deploy/Caddyfile');
    expect(caddyfile).toContain('@server path /v1/* /ws /healthz /readyz');
    expect(caddyfile).toContain('reverse_proxy server:8787');
    expect(caddyfile).toContain('reverse_proxy web:3000');
    expect(caddyfile).toContain('Cache-Control "no-store"');
  });
});

describe('deploy/Dockerfile.server', () => {
  it('creates the data directory before dropping root', () => {
    const dockerfile = read('deploy/Dockerfile.server');
    const mkdir = dockerfile.indexOf('mkdir -m 700 /data');
    expect(mkdir).toBeGreaterThan(-1);
    expect(mkdir).toBeLessThan(dockerfile.indexOf('USER node'));
  });
});
