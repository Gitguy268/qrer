// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let server;
async function localURL() {
  if (process.env.QRER_URL) return process.env.QRER_URL;
  server = spawn(process.env.PYTHON || 'python3', ['serve.py', '--port', '0'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stderr.on('data', (chunk) => {
    logs = (logs + chunk).slice(-4000);
  });
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(
      () => reject(new Error('Local test server did not start. ' + logs)),
      10000,
    );
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Local test server exited (${code}). ${logs}`));
    });
    server.stdout.on('data', (chunk) => {
      output += chunk;
      const url = output.match(/Qrer: (http:\/\/127\.0\.0\.1:\d+\/)/)?.[1];
      if (url) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
  });
}

async function run(file, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/' + file + '.cjs'], {
      cwd: root,
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} failed (${code}).`)),
    );
  });
}

try {
  const env = {
    ...process.env,
    QRER_URL: await localURL(),
    QRER_TEST_OUTPUT:
      process.env.QRER_TEST_OUTPUT || (await mkdtemp(path.join(tmpdir(), 'qrer-tests-'))),
  };
  const suites = process.argv.includes('--webkit')
    ? ['portable']
    : ['smoke', 'decode', 'features', 'glass', 'retro', 'editing', 'concurrency', 'pictures'];
  for (const suite of suites) await run(suite, env);
  console.log('Browser test artifacts: ' + env.QRER_TEST_OUTPUT);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server?.kill();
}
