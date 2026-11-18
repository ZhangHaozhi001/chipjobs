// Build the DeWEB (tape://) bundle: a self-contained copy of the site plus its
// data modules, with a SHA-256 manifest. On TapeOut, a site's files are stored
// byte-for-byte in a circuit container and rendered by the TapeKit kernel;
// this bundle is exactly the file set to upload (publishing is a user-wallet
// step — see SUBMISSION-PACKAGE.md). The https form serves src/ directly and
// needs no build.
// Run: node scripts/build-deweb.js
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist-deweb');

rmSync(dist, { recursive: true, force: true });
cpSync(join(src, 'tapekit-site'), join(dist, 'tapekit-site'), { recursive: true });
cpSync(join(src, 'data'), join(dist, 'data'), { recursive: true });

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dist);
files.sort();

const manifest = {
  app: 'ChipJobs',
  entry: 'tapekit-site/index.html',
  builtFrom: 'src/ (tapekit-site + data)',
  files: files.map((p) => {
    const body = readFileSync(p);
    return {
      path: relative(dist, p),
      bytes: body.length,
      sha256: createHash('sha256').update(body).digest('hex'),
    };
  }),
};

// Self-check: every relative ES-module import inside the bundle must resolve
// to a file inside the bundle (the kernel serves only what was uploaded).
const inBundle = new Set(manifest.files.map((f) => f.path));
let checked = 0;
for (const f of manifest.files) {
  if (!f.path.endsWith('.js')) continue;
  const text = readFileSync(join(dist, f.path), 'utf8');
  for (const m of text.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
    const target = relative(dist, join(dist, dirname(f.path), m[1]));
    if (!inBundle.has(target)) throw new Error(`bundle import escapes: ${f.path} -> ${m[1]}`);
    checked++;
  }
}
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`DeWEB bundle: ${manifest.files.length} files, ${checked} intra-bundle imports verified`);
for (const f of manifest.files) console.log(`  ${f.path}  ${f.bytes}B  sha256:${f.sha256.slice(0, 16)}…`);
console.log('entry:', manifest.entry);
