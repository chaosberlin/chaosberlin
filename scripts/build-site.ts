import { mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import { validateRequest } from '../src/validation';

// Publish only explicit public assets. Never copy server code or environment files.
await mkdir('dist', { recursive: true });
const result = await Bun.build({ entrypoints: ['portal.js'], outdir: 'dist', target: 'browser', minify: true });
if (!result.success) throw new AggregateError(result.logs, 'Frontend build failed');
for (const file of ['index.html', 'index.css', 'CNAME']) await copyFile(file, `dist/${file}`);
const registry = [];
for (const file of (await readdir('requests')).sort()) {
  if (!file.endsWith('.json') || file === 'example.json') continue;
  const result = validateRequest(await Bun.file(`requests/${file}`).json());
  if (!result.ok) throw new Error(`Invalid request ${file}: ${result.errors.join(', ')}`);
  registry.push(result.value);
}
await writeFile('dist/registry.json', JSON.stringify(registry, null, 2) + '\n');
console.log(`Built static site with ${registry.length} published requests.`);
