import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateDownloadUrl,
  resolveRedirectUrl,
  assertSuccessfulStatus,
  ensureMinSize,
  ensureSha256,
  main
} from '../scripts/setup-dreamcast.js';

test('validateDownloadUrl allows expected HTTPS hosts', () => {
  const safe = validateDownloadUrl('https://cdn.emulatorjs.org/stable/data/loader.js');
  assert.equal(safe, 'https://cdn.emulatorjs.org/stable/data/loader.js');
});

test('validateDownloadUrl blocks non-https URLs', () => {
  assert.throws(
    () => validateDownloadUrl('http://cdn.emulatorjs.org/stable/data/loader.js'),
    /Only HTTPS download URLs are allowed/
  );
});

test('validateDownloadUrl blocks non-allowlisted hosts', () => {
  assert.throws(
    () => validateDownloadUrl('https://evil.example.com/loader.js'),
    /not allowlisted/
  );
});

test('resolveRedirectUrl resolves relative redirect targets', () => {
  const next = resolveRedirectUrl(
    'https://cdn.emulatorjs.org/stable/data/loader.js',
    302,
    '../next.js',
    0,
    5
  );
  assert.equal(next, 'https://cdn.emulatorjs.org/stable/next.js');
});

test('resolveRedirectUrl throws for missing redirect location', () => {
  assert.throws(
    () => resolveRedirectUrl('https://cdn.emulatorjs.org/a', 302, '', 0, 5),
    /Redirect without location header/
  );
});

test('resolveRedirectUrl throws when redirect limit is exceeded', () => {
  assert.throws(
    () => resolveRedirectUrl('https://cdn.emulatorjs.org/a', 302, '/b', 5, 5),
    /Too many redirects/
  );
});

test('resolveRedirectUrl blocks redirects to non-allowlisted hosts', () => {
  assert.throws(
    () =>
      resolveRedirectUrl(
        'https://cdn.emulatorjs.org/stable/data/loader.js',
        302,
        'https://evil.example.com/payload.js',
        0
      ),
    /not allowlisted/
  );
});

test('assertSuccessfulStatus accepts 2xx and rejects non-2xx', () => {
  assert.doesNotThrow(() => assertSuccessfulStatus(204, 'https://cdn.example.com/a'));
  assert.throws(
    () => assertSuccessfulStatus(404, 'https://cdn.example.com/a', 'not found'),
    /Request failed \(404\)/
  );
});

test('ensureMinSize rejects undersized downloads', () => {
  assert.doesNotThrow(() => ensureMinSize('loader.js', Buffer.alloc(1024), 1000));
  assert.throws(
    () => ensureMinSize('flycast-wasm.data', Buffer.alloc(128), 1000),
    /download looks incomplete/
  );
});

test('ensureSha256 validates expected checksum', () => {
  const payload = Buffer.from('hello-world');
  assert.doesNotThrow(() =>
    ensureSha256('payload', payload, 'afa27b44d43b02a9fea41d13cedc2e4016cfcf87c5dbf990e593669aa8ce286d')
  );
  assert.throws(
    () => ensureSha256('payload', payload, '0000000000000000000000000000000000000000000000000000000000000000'),
    /checksum mismatch/
  );
});

test('main setup function is import-safe for test harness', () => {
  assert.equal(typeof main, 'function');
});
