import test from 'node:test';
import assert from 'node:assert/strict';

import { inferSystemFromFolderPath } from '../src/lib/services/pathSystemInference.js';

test('infers GBA from folder path', () => {
  assert.equal(inferSystemFromFolderPath('ROMs/GBA/Pokemon Emerald.zip'), 'gba');
});

test('infers PlayStation from composite folder segment', () => {
  assert.equal(inferSystemFromFolderPath('roms/playstation-classics/Final Fantasy VII.zip'), 'psx');
});

test('infers N64 from prefixed/suffixed folder segment', () => {
  assert.equal(inferSystemFromFolderPath('archive/nintendo-64-usa/Zelda.zip'), 'n64');
});

test('infers Dreamcast when path includes dreamcast folder', () => {
  assert.equal(inferSystemFromFolderPath('imports/Sega/Dreamcast/Sonic Adventure.zip'), 'dreamcast');
});

test('returns null for unrelated folder names', () => {
  assert.equal(inferSystemFromFolderPath('misc/random-zip-files/game.zip'), null);
});

