import { cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
await mkdir(path.join(dist, 'src'), { recursive: true });
for (const rel of [
  'index.html',
  'assets/site-config.json',
  'assets/locations.json',
  'assets/site.css',
  'assets/site.js',
  'assets/eso-logo.png',
  'src/directory.mjs',
]) {
  await cp(path.join(root, rel), path.join(dist, rel));
}
try {
  await access(path.join(root, 'assets', 'schools'));
  await cp(path.join(root, 'assets', 'schools'), path.join(dist, 'assets', 'schools'), { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
console.log('ESO_TEAM_FINDER_STATIC_BUILD_OK');
console.log('Published files are allowlisted; preview fixtures and test files are excluded.');
