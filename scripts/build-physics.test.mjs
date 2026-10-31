// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BuildError, PIN, buildPhysics, deriveSplit } from './build-physics.mjs';

const wasm = Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
const literal = (bytes) => `oC.toByteArray("${bytes.toString('base64')}")`;
const code = (error) => (error instanceof BuildError ? error.code : error);

function tempRoot(lockIntegrity = PIN.integrity) {
  const root = mkdtempSync(join(tmpdir(), 'physics-'));
  mkdirSync(join(root, 'src', 'sim-host', 'engines', 'physics'), { recursive: true });
  cpSync(join(process.cwd(), 'src', 'sim-host', 'engines', 'physics', 'rapier.manifest.json'), join(root, 'src', 'sim-host', 'engines', 'physics', 'rapier.manifest.json'));
  mkdirSync(join(root, 'node_modules', '@dimforge'), { recursive: true });
  symlinkSync(join(process.cwd(), 'node_modules', PIN.npm), join(root, 'node_modules', PIN.npm));
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ packages: { [`node_modules/${PIN.npm}`]: { integrity: lockIntegrity } } }));
  return root;
}

describe('deriveSplit', () => {
  it('replaces the embedded literal with the URL', () => {
    const { js } = deriveSplit(`a;let x=${literal(wasm)};b`, wasm);
    expect(js).toBe('a;let x=(globalThis.__IYNK_RAPIER_WASM__ ?? new URL("rapier_wasm3d_bg.wasm", import.meta.url));b');
  });

  it('refuses zero and two literals', () => {
    expect(() => deriveSplit('no wasm here', wasm)).toThrow(expect.objectContaining({ code: 'no-call' }));
    expect(() => deriveSplit(`${literal(wasm)};${literal(wasm)}`, wasm)).toThrow(expect.objectContaining({ code: 'two-calls' }));
  });

  it('refuses a wasm file that differs from the embedded one', () => {
    const flipped = Buffer.from(wasm);
    flipped[4] ^= 1;
    expect(() => deriveSplit(literal(wasm), flipped)).toThrow(expect.objectContaining({ code: 'wasm-mismatch' }));
  });
});

describe('buildPhysics', () => {
  it('refuses a lockfile with another integrity', async () => {
    await expect(buildPhysics({ root: tempRoot('sha512-other') })).rejects.toSatisfy((e) => code(e) === 'integrity');
  });

  it('writes files that match the pins and the manifest, and --check catches a tampered file', async () => {
    const root = tempRoot();
    const pins = JSON.parse(readFileSync(join(root, 'src/sim-host/engines/physics/rapier.manifest.json'), 'utf8')).pins;
    const { files, totalBrotli } = await buildPhysics({ root });
    const byName = Object.fromEntries(files.map((f) => [f.path.split('/')[1], f]));
    expect(byName['rapier_wasm3d_bg.wasm'].sha256).toBe(pins.wasmSha256);
    expect(byName['rapier.split.mjs'].sha256).toBe(pins.jsSha256);
    expect(totalBrotli).toBeLessThanOrEqual(1_000_000);

    const listed = JSON.parse(readFileSync(join(root, 'public/engines/manifest.json'), 'utf8')).engines;
    expect(listed.map((e) => e.id)).toEqual(['rapier']);
    expect(listed[0].files).toEqual(files);
    const committed = JSON.parse(readFileSync(join(root, 'src/sim-host/engines/physics/rapier.manifest.json'), 'utf8'));
    expect(committed.files).toEqual(files);

    await expect(buildPhysics({ root, check: true })).resolves.toMatchObject({ totalBrotli });
    writeFileSync(join(root, 'public/engines/rapier@0.21.0/rapier.split.mjs'), 'tampered');
    await expect(buildPhysics({ root, check: true })).rejects.toSatisfy((e) => code(e) === 'pin-mismatch');
  }, 300_000);
});
