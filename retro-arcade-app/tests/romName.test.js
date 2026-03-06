import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeRomDisplayName } from '../src/lib/utils/romName.js';
import { getThumbnailUrl } from '../src/lib/services/thumbnailService.js';

test('normalizeRomDisplayName strips nested ROM and archive extensions', () => {
  assert.equal(normalizeRomDisplayName('Pokemon Emerald.gba.zip'), 'Pokemon Emerald');
});

test('normalizeRomDisplayName keeps plain titles intact', () => {
  assert.equal(normalizeRomDisplayName('Chrono Trigger'), 'Chrono Trigger');
});

test('getThumbnailUrl normalizes stored ROM names before building the URL', () => {
  assert.equal(
    getThumbnailUrl('Pokemon Emerald.gba.zip', 'gba'),
    'https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy%20Advance/Named_Boxarts/Pokemon%20Emerald.png'
  );
});
