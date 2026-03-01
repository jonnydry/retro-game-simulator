import { DREAMCAST_SYSTEM_ID } from '../config/systems.js';

const SYSTEM_PATH_ALIASES = {
  nes: ['nes', 'nintendo-entertainment-system', 'famicom'],
  snes: ['snes', 'super-nintendo', 'super-famicom'],
  gb: ['gb', 'game-boy'],
  gbc: ['gbc', 'game-boy-color'],
  gba: ['gba', 'game-boy-advance'],
  genesis: ['genesis', 'mega-drive', 'megadrive', 'sega-genesis'],
  sms: ['sms', 'master-system', 'mark-iii'],
  n64: ['n64', 'nintendo-64'],
  psx: ['psx', 'ps1', 'playstation'],
  pce: ['pce', 'pc-engine', 'turbografx', 'turbografx-16'],
  ngp: ['ngp', 'neo-geo-pocket'],
  ws: ['ws', 'wonderswan'],
  [DREAMCAST_SYSTEM_ID]: ['dreamcast']
};

function normalizePathSegment(segment) {
  return segment
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function inferSystemFromFolderPath(pathValue) {
  if (!pathValue) return null;
  const segments = pathValue
    .split('/')
    .map((segment) => normalizePathSegment(segment))
    .filter(Boolean);

  for (const segment of segments) {
    for (const [system, aliases] of Object.entries(SYSTEM_PATH_ALIASES)) {
      const match = aliases.some(
        (alias) =>
          segment === alias ||
          segment.startsWith(`${alias}-`) ||
          segment.endsWith(`-${alias}`) ||
          segment.includes(`-${alias}-`)
      );
      if (match) return system;
    }
  }
  return null;
}
