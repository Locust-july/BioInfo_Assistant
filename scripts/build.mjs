import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/server.mjs'], bundle: true, platform: 'node', target: 'node22',
  format: 'esm', outfile: 'dist/server.mjs',
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
console.log('Built dist/server.mjs; Node.js 22+ must be available on the client PATH.');
