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
import http from 'http';
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
const WEBGL2_PATCH_URL =
  'https://raw.githubusercontent.com/nasomers/flycast-wasm/main/patches/webgl2-compat.js';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { redirect: true }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function writeFile(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
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

async function main() {
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
  const patched = patchEmulator(emuBuf);
  writeFile(path.join(OUT_DIR, 'emulator.min.js'), patched);
  console.log('  ✓ emulator.min.js (patched for flycast)');

  // 3. Fetch loader.js
  console.log('  Fetching loader.js...');
  const loader = await fetchUrl(`${EJS_CDN}/loader.js`);
  writeFile(path.join(OUT_DIR, 'loader.js'), loader);
  console.log('  ✓ loader.js');

  // 4. Fetch emulator.min.css
  console.log('  Fetching emulator.min.css...');
  const css = await fetchUrl(`${EJS_CDN}/emulator.min.css`);
  writeFile(path.join(OUT_DIR, 'emulator.min.css'), css);
  console.log('  ✓ emulator.min.css');

  // 5. Download flycast-wasm.data (~1.4MB)
  console.log('  Downloading flycast-wasm.data (~1.4MB)...');
  const flycast = await fetchUrl(FLYCAST_RELEASE);
  writeFile(path.join(CORES_DIR, 'flycast-wasm.data'), flycast);
  console.log('  ✓ cores/flycast-wasm.data');

  // 6. WebGL2 compatibility patch (injected at runtime from emulator.js)
  console.log('  Fetching webgl2-compat.js...');
  const webgl2 = await fetchUrl(WEBGL2_PATCH_URL);
  writeFile(path.join(OUT_DIR, 'webgl2-compat.js'), webgl2);
  console.log('  ✓ webgl2-compat.js');

  console.log('\nDreamcast setup complete. Restart the dev server and load a Dreamcast ROM.');
  console.log('Note: You need Dreamcast BIOS files (dc_boot.bin, dc_flash.bin) for most games.');
}

main().catch((err) => {
  console.error('Dreamcast setup failed:', err.message);
  process.exit(1);
});
