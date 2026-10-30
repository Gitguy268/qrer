// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeContent } from '../../assets/content.js';
import { initialStyle, snapshot } from '../../assets/model.js';
import { createStyleHistory } from '../../assets/history.js';
import { createRevision } from '../../assets/tasks.js';
import {
  exportFilename,
  exportDimensions,
  validateExportOptions,
} from '../../assets/export-settings.js';

const fields = {
  value: '',
  network: '',
  password: '',
  security: 'WPA',
  hidden: false,
  address: '',
  subject: '',
  message: '',
};

test('content encoding preserves text exactly and rejects unsafe URL protocols', () => {
  for (const value of ['  café 🌍\n', '\tHello\r\n世界  ']) {
    assert.equal(encodeContent('text', { ...fields, value }).payload, value);
  }
  assert.ok(encodeContent('text', { ...fields, value: ' \n ' }).error);
  assert.equal(
    encodeContent('url', { ...fields, value: 'example.com/a' }).payload,
    'https://example.com/a',
  );
  for (const value of [
    'javascript:alert(1)',
    'data:text/plain,hello',
    'file:///etc/passwd',
    'https://',
  ]) {
    assert.ok(encodeContent('url', { ...fields, value }).error);
  }
});

test('Wi-Fi escapes delimiters and never includes a password for open networks', () => {
  const input = { ...fields, network: 'Studio;Guest\\', password: 'p:a,s;s', hidden: true };
  assert.equal(
    encodeContent('wifi', input).payload,
    'WIFI:T:WPA;S:Studio\\;Guest\\\\;P:p\\:a\\,s\\;s;H:true;;',
  );
  assert.equal(
    encodeContent('wifi', { ...input, security: 'nopass' }).payload,
    'WIFI:T:nopass;S:Studio\\;Guest\\\\;P:;H:true;;',
  );
  assert.ok(encodeContent('wifi', { ...input, password: '' }).error);
});

test('email subject and body cannot escape their URI parameters', () => {
  assert.equal(
    encodeContent('email', {
      ...fields,
      address: 'a@example.com',
      subject: 'A&B?',
      message: '世界\nHi',
    }).payload,
    'mailto:a@example.com?subject=A%26B%3F&body=%E4%B8%96%E7%95%8C%0AHi',
  );
});

test('render snapshots cannot be changed by later editor mutations', () => {
  const style = initialStyle();
  const spec = snapshot('draft', style);
  style.ink = '#ffffff';
  assert.notEqual(spec.style.ink, style.ink);
  assert.throws(() => {
    spec.style.label = 'changed';
  }, TypeError);
  assert.throws(() => {
    spec.payload = 'changed';
  }, TypeError);
});

test('history is bounded, copies state, groups input, and discards the redo branch', () => {
  const history = createStyleHistory({ value: 0 }, 3);
  history.record({ value: 1 }, 'slider', 0);
  history.record({ value: 2 }, 'slider', 100);
  assert.deepEqual(history.move(-1), { value: 0 });
  const restored = history.move(1);
  assert.deepEqual(restored, { value: 2 });
  restored.value = 999;
  history.record({ value: 3 }, null, 200);
  history.record({ value: 4 }, null, 300);
  assert.deepEqual(history.move(-1), { value: 3 });
  assert.deepEqual(history.move(-1), { value: 2 });
  assert.equal(history.move(-1), null);
  history.record({ value: 5 });
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.move(-1), { value: 2 });
  assert.equal(history.move(5), null);
  assert.throws(() => createStyleHistory({}, 1), RangeError);
});

test('obsolete async work cannot publish after another operation or cancellation', async () => {
  const tasks = createRevision();
  let completeOld;
  const results = [];
  const oldCurrent = tasks.begin();
  const old = new Promise((resolve) => {
    completeOld = resolve;
  }).then(() => {
    if (oldCurrent()) results.push('old');
  });
  const newCurrent = tasks.begin();
  if (newCurrent()) results.push('new');
  completeOld();
  await old;
  assert.deepEqual(results, ['new']);
  tasks.invalidate();
  assert.equal(newCurrent(), false);
});

test('safe filenames preserve Unicode and remove reserved names, controls and extensions', () => {
  const cases = [
    ['', 'qrer.png'],
    ['...', 'qrer.png'],
    ['../Guest: code.svg', '-Guest- code.png'],
    ['CON', 'qrer-CON.png'],
    ['lpt9.txt', 'qrer-lpt9.txt.png'],
    ['a\u0000b', 'a-b.png'],
    ['café 🌍.png', 'café 🌍.png'],
  ];
  for (const [input, expected] of cases) assert.equal(exportFilename(input, 'png'), expected);
  assert.equal(exportFilename('🌍'.repeat(90), 'svg'), '🌍'.repeat(80) + '.svg');
  assert.equal(exportFilename('party.gif', 'gif'), 'party.gif');
});

test('export dimensions and validation match the supported output contract', () => {
  const style = initialStyle();
  assert.deepEqual(exportDimensions(style, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(exportDimensions({ ...style, frame: 'caption' }, 512), {
    width: 463,
    height: 512,
  });
  assert.deepEqual(exportDimensions({ ...style, frame: 'caption', label: ' ' }, 512), {
    width: 512,
    height: 512,
  });
  for (const edge of [512, 1024, 2048])
    for (const type of ['png', 'svg', 'gif'])
      assert.doesNotThrow(() => validateExportOptions(type, edge));
  for (const [type, edge] of [
    ['jpg', 512],
    ['png', 0],
    ['svg', NaN],
    ['png', 512.5],
  ])
    assert.throws(() => validateExportOptions(type, edge), RangeError);
});

test('ha.mr short links round-trip and stay in the QR alphanumeric set', async () => {
  const { shortLink, loadShortener } = await import('../../assets/short-link.js');
  await loadShortener();
  for (const link of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'http://example.com',
    'https://example.com:8080/a?b=c&d=e#frag',
  ]) {
    const { payload } = shortLink(link);
    assert.match(payload, /^HTTPS:\/\/HA\.MR\/[0-9A-Z$*+\-./:]+$/);
  }
  assert.throws(() => shortLink('https://user:secret@example.com'), /password/);
});

test('art helpers dither to a binary grid and seed stipple deterministically', async () => {
  const { dither, seeded, toDarkness } = await import('../../assets/art.js');
  const grid = Float32Array.from({ length: 64 }, (_, index) => (index % 8) / 7);
  const marks = dither(grid, 8);
  assert.ok(marks.every((value) => value === 0 || value === 1));
  assert.ok(marks.some(Boolean) && !marks.every(Boolean));
  const first = seeded(42),
    second = seeded(42);
  for (let index = 0; index < 5; index++) assert.equal(first(), second());
  // A transparent pixel reads as paper; black reads as fully dark.
  assert.deepEqual(Array.from(toDarkness([0, 0, 0, 0, 0, 0, 0, 255])), [0, 1]);
});

test('GIF palette keeps exact code colours first and fits 256 entries', async () => {
  const { gifPalette } = await import('../../assets/gif.js');
  const palette = gifPalette(['#123456', '#ffffff']);
  assert.equal(palette.length, 256);
  assert.equal(palette[0], 0x123456);
  assert.equal(palette[1], 0xffffff);
});
