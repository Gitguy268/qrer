// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const config = await resolveConfig(path.join(root, 'package.json'));
const changed = [];

async function sync(name, transform) {
  const target = path.join(root, name);
  const before = await readFile(target, 'utf8');
  const after = await format(transform(before), { ...config, filepath: target });
  if (before === after) return;
  changed.push(name);
  if (!check) await writeFile(target, after);
}

const applicationFiles = (await readdir(path.join(root, 'assets')))
  .filter((name) => /\.(js|css)$/.test(name))
  .map((name) => 'assets/' + name)
  .sort();
for (const file of applicationFiles.filter((name) => name.endsWith('.js'))) {
  await sync(file, (source) =>
    source.replace(/(from\s*['"]\.\/[^'"]+\.js)(?:\?v=[\d.]+)?(['"])/g, `$1?v=${version}$2`),
  );
}
await sync('index.html', (source) => source.replace(/\?v=[\d.]+/g, '?v=' + version));
const resources = JSON.parse(
  await readFile(path.join(root, 'scripts/cache-resources.json'), 'utf8'),
);
const files = [...new Set([...resources, ...applicationFiles])].sort();
// Validate the explicit resources too; missing paths make offline installation fail.
for (const file of files.filter((name) => name !== './')) await readFile(path.join(root, file));
const revisioned = files
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => `${file}?v=${version}`);
await sync('sw.js', (source) =>
  source.replace(
    /\/\/ BEGIN GENERATED CACHE MANIFEST[\s\S]*?\/\/ END GENERATED CACHE MANIFEST/,
    `// BEGIN GENERATED CACHE MANIFEST\nconst VERSION='qrer-static-v${version}';\nconst files=${JSON.stringify([...files, ...revisioned])};\n// END GENERATED CACHE MANIFEST`,
  ),
);
if (check && changed.length) {
  console.error(
    'Release metadata is out of sync. Run npm run release:sync:\n' + changed.join('\n'),
  );
  process.exitCode = 1;
} else
  console.log(
    check
      ? 'Release assets and cache manifest are synchronized.'
      : `Synchronized ${changed.length} files for ${version}.`,
  );
