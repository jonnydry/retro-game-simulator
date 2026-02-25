/**
 * Fetches ROM thumbnails from the LibRetro CDN (thumbnails.libretro.com).
 * Uses Named_Boxarts for cover art. No API key required.
 */

const LIBRETRO_BASE = 'https://thumbnails.libretro.com';
const THUMB_TYPE = 'Named_Boxarts';

const systemToLibRetroFolder = {
  nes: 'Nintendo - Nintendo Entertainment System',
  snes: 'Nintendo - Super Nintendo Entertainment System',
  gb: 'Nintendo - Game Boy',
  gbc: 'Nintendo - Game Boy Color',
  gba: 'Nintendo - Game Boy Advance',
  genesis: 'Sega - Mega Drive - Genesis',
  sms: 'Sega - Master System - Mark III',
  n64: 'Nintendo - Nintendo 64',
  psx: 'Sony - PlayStation',
  dreamcast: 'Sega - Dreamcast',
  pce: 'NEC - PC Engine - TurboGrafx 16',
  ngp: 'SNK - Neo Geo Pocket',
  ngpc: 'SNK - Neo Geo Pocket Color',
  ws: 'Bandai - WonderSwan',
  wsc: 'Bandai - WonderSwan Color'
};

/**
 * Build the LibRetro thumbnail URL for a ROM.
 * Returns null if the system is not mapped.
 *
 * @param {string} romName - Display name of the ROM (e.g. "Final Fantasy VI Advance (USA)")
 * @param {string} system - System id (e.g. "gba", "nes")
 * @returns {string|null} URL to attempt, or null if system unsupported
 */
export function getThumbnailUrl(romName, system) {
  const folder = systemToLibRetroFolder[system];
  if (!folder || !romName?.trim()) return null;

  const safeName = romName.trim();
  const encodedFolder = encodeURIComponent(folder);
  const encodedFile = encodeURIComponent(safeName + '.png');

  return `${LIBRETRO_BASE}/${encodedFolder}/${THUMB_TYPE}/${encodedFile}`;
}
