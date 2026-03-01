#!/usr/bin/env node
/**
 * Sets up Dreamcast (flycast-wasm) support for EmuPhoria.
 * Fetches EmulatorJS files, patches for flycast WebGL2, downloads the flycast core,
 * and writes everything to public/dreamcast-data/
 *
 * Run: node scripts/setup-dreamcast.js
 * Or: npm run setup-dreamcast
 */

import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'dreamcast-data');
const CORES_DIR = path.join(OUT_DIR, 'cores');

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data';
const FLYCAST_RELEASE =
  'https://github.com/nasomers/flycast-wasm/releases/download/v1.0.0/flycast-wasm.data';
const WEBGL2_PATCH_REF = process.env.DREAMCAST_WEBGL2_PATCH_REF || 'v1.0.0';
const WEBGL2_PATCH_URL =
  `https://raw.githubusercontent.com/nasomers/flycast-wasm/${WEBGL2_PATCH_REF}/patches/webgl2-compat.js`;
const EXPECTED_FLYCAST_SHA256 =
  (process.env.DREAMCAST_FLYCAST_SHA256 ||
    '82c44a8b309ebe5dee44e445c0629cdb35cc2cb5252817943e1ede4ab3a07424').toLowerCase();
const EXPECTED_WEBGL2_PATCH_SHA256 =
  (process.env.DREAMCAST_WEBGL2_PATCH_SHA256 ||
    'f54e5c672a410691425c65e508ff441aa24cec212da670b9679c0c8b69b8fa52').toLowerCase();
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 30000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'cdn.emulatorjs.org',
  'github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com'
]);

export function validateDownloadUrl(url, allowedHosts = ALLOWED_DOWNLOAD_HOSTS) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid download URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Only HTTPS download URLs are allowed: ${url}`);
  }
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Download host is not allowlisted: ${parsed.hostname}`);
  }
  return parsed.toString();
}

export function resolveRedirectUrl(
  url,
  status,
  location,
  redirectCount,
  maxRedirects = MAX_REDIRECTS,
  allowedHosts = ALLOWED_DOWNLOAD_HOSTS
) {
  if (!REDIRECT_STATUSES.has(status)) return null;
  if (redirectCount >= maxRedirects) {
    throw new Error(`Too many redirects while fetching: ${url}`);
  }
  if (!location) {
    throw new Error(`Redirect without location header for: ${url}`);
  }
  return validateDownloadUrl(new URL(location, url).toString(), allowedHosts);
}

export function assertSuccessfulStatus(status, url, bodyPreview = '') {
  if (status >= 200 && status < 300) return;
  throw new Error(`Request failed (${status}) for ${url}${bodyPreview ? `: ${bodyPreview}` : ''}`);
}

export function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    let safeUrl;
    try {
      safeUrl = validateDownloadUrl(url);
    } catch (err) {
      reject(err);
      return;
    }
    const req = https.get(safeUrl, (res) => {
      const status = res.statusCode || 0;
      try {
        const nextUrl = resolveRedirectUrl(safeUrl, status, res.headers.location, redirectCount);
        if (nextUrl) {
          res.resume();
          fetchUrl(nextUrl, redirectCount + 1).then(resolve).catch(reject);
          return;
        }
      } catch (err) {
        res.resume();
        reject(err);
        return;
      }

      if (status < 200 || status >= 300) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8').slice(0, 160);
          try {
            assertSuccessfulStatus(status, safeUrl, body);
            reject(new Error(`Request failed (${status}) for ${safeUrl}`));
          } catch (err) {
            reject(err);
          }
        });
        res.on('error', reject);
        return;
      }

      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${safeUrl}`));
    });
    req.on('error', reject);
  });
}

function writeFile(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}

export function ensureMinSize(label, data, minBytes) {
  if (!data || data.length < minBytes) {
    throw new Error(`${label} download looks incomplete (${data?.length || 0} bytes)`);
  }
}

export function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function ensureSha256(label, data, expectedSha256) {
  if (!expectedSha256) return;
  const actual = sha256Hex(data).toLowerCase();
  const expected = expectedSha256.toLowerCase();
  if (actual !== expected) {
    throw new Error(`${label} checksum mismatch. expected=${expected} actual=${actual}`);
  }
}

// Patch emulator.min.js to add flycast to requiresWebGL2
function patchEmulator(buf) {
  const str = buf.toString('utf8');
  // EmulatorJS uses requiresWebGL2 for core file selection
  // Pattern: ["ppsspp"] or similar - add "flycast"
  const patterns = [
    [/"ppsspp"\]/, '"ppsspp","flycast"]'],
    [/"ppsspp",\s*\]/, '"ppsspp","flycast"]'],
    [/requiresWebGL2\s*=\s*\[\s*"ppsspp"\s*\]/, 'requiresWebGL2=["ppsspp","flycast"]'],
  ];
  for (const [from, to] of patterns) {
    if (from.test(str)) {
      return Buffer.from(str.replace(from, to), 'utf8');
    }
  }
  // Fallback: try to find any requiresWebGL2 array
  const match = str.match(/(requiresWebGL2\s*=\s*\[)([^\]]*)(\])/);
  if (match) {
    const inner = match[2].trim();
    const replacement = inner
      ? inner + ',"flycast"'
      : '"flycast"';
    return Buffer.from(str.replace(match[0], match[1] + replacement + match[3]), 'utf8');
  }
  console.warn('Could not find requiresWebGL2 in emulator.min.js - Dreamcast may not load correctly');
  return buf;
}

export async function main() {
  console.log('Setting up Dreamcast (flycast-wasm) support...\n');

  fs.mkdirSync(CORES_DIR, { recursive: true });

  // 1. cores.json with flycast entry
  const coresJson = [
    {
      name: 'flycast',
      extensions: ['cdi', 'gdi', 'chd', 'cue', 'iso', 'elf', 'bin', 'lst', 'zip', '7z', 'dat'],
      options: { defaultWebGL2: true },
      save: 'state',
      license: 'GPLv2',
      repo: 'https://github.com/flyinghead/flycast'
    }
  ];
  writeFile(path.join(CORES_DIR, 'cores.json'), JSON.stringify(coresJson, null, 2));
  console.log('  ✓ cores/cores.json');

  // 2. Fetch and patch emulator.min.js
  console.log('  Fetching emulator.min.js...');
  const emuBuf = await fetchUrl(`${EJS_CDN}/emulator.min.js`);
  ensureMinSize('emulator.min.js', emuBuf, 10000);
  const patched = patchEmulator(emuBuf);
  if (!patched.toString('utf8').includes('flycast')) {
    throw new Error('Failed to patch emulator.min.js with flycast support');
  }
  writeFile(path.join(OUT_DIR, 'emulator.min.js'), patched);
  console.log('  ✓ emulator.min.js (patched for flycast)');

  // 3. Fetch loader.js
  console.log('  Fetching loader.js...');
  const loader = await fetchUrl(`${EJS_CDN}/loader.js`);
  ensureMinSize('loader.js', loader, 1000);
  writeFile(path.join(OUT_DIR, 'loader.js'), loader);
  console.log('  ✓ loader.js');

  // 4. Fetch emulator.min.css
  console.log('  Fetching emulator.min.css...');
  const css = await fetchUrl(`${EJS_CDN}/emulator.min.css`);
  ensureMinSize('emulator.min.css', css, 300);
  writeFile(path.join(OUT_DIR, 'emulator.min.css'), css);
  console.log('  ✓ emulator.min.css');

  // 5. Download flycast-wasm.data (~1.4MB)
  console.log('  Downloading flycast-wasm.data (~1.4MB)...');
  const flycast = await fetchUrl(FLYCAST_RELEASE);
  ensureMinSize('flycast-wasm.data', flycast, 1000000);
  ensureSha256('flycast-wasm.data', flycast, EXPECTED_FLYCAST_SHA256);
  writeFile(path.join(CORES_DIR, 'flycast-wasm.data'), flycast);
  console.log('  ✓ cores/flycast-wasm.data');

  // 6. WebGL2 compatibility patch (injected at runtime from emulator.js)
  console.log(`  Fetching webgl2-compat.js (${WEBGL2_PATCH_REF})...`);
  const webgl2 = await fetchUrl(WEBGL2_PATCH_URL);
  ensureMinSize('webgl2-compat.js', webgl2, 100);
  ensureSha256('webgl2-compat.js', webgl2, EXPECTED_WEBGL2_PATCH_SHA256);
  writeFile(path.join(OUT_DIR, 'webgl2-compat.js'), webgl2);
  console.log('  ✓ webgl2-compat.js');

  console.log('\nDreamcast setup complete. Restart the dev server and load a Dreamcast ROM.');
  console.log('Note: You need Dreamcast BIOS files (dc_boot.bin, dc_flash.bin) for most games.');
}

const isDirectExecution = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  main().catch((err) => {
    console.error('Dreamcast setup failed:', err.message);
    process.exit(1);
  });
}
