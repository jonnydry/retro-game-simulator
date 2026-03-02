export const DREAMCAST_SYSTEM_ID = 'dreamcast';

export const systemOrder = [
  'nes', 'snes', 'gb', 'gbc', 'gba', 'genesis',
  'sms', 'n64', 'psx', 'pce', 'ngp', 'ws', DREAMCAST_SYSTEM_ID
];

export const defaultEnabledSystems = [...systemOrder];

export const systemDisplayNames = {
  nes: 'NES', snes: 'SNES', gb: 'Game Boy', gbc: 'Game Boy Color',
  gba: 'Game Boy Advance', genesis: 'Genesis', sms: 'Master System',
  n64: 'N64', psx: 'PlayStation', pce: 'PC Engine',
  ngp: 'Neo Geo Pocket', ws: 'WonderSwan',
  [DREAMCAST_SYSTEM_ID]: 'Dreamcast'
};

export const nativeResolutions = {
  nes: { width: 256, height: 240 },
  snes: { width: 256, height: 224 },
  gb: { width: 160, height: 144 },
  gbc: { width: 160, height: 144 },
  gba: { width: 240, height: 160 },
  genesis: { width: 320, height: 224 },
  sms: { width: 256, height: 192 },
  n64: { width: 320, height: 240 },
  psx: { width: 320, height: 240 },
  pce: { width: 256, height: 242 },
  ngp: { width: 160, height: 152 },
  ws: { width: 224, height: 144 },
  [DREAMCAST_SYSTEM_ID]: { width: 640, height: 480 },
  builtin: { width: 640, height: 480 }
};

export const systemIcons = {
  nes: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="32" rx="4" fill="#dc3545"/><rect x="8" y="12" width="48" height="24" rx="2" fill="#6c757d"/><rect x="12" y="16" width="40" height="16" fill="#212529"/></svg>',
  snes: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="12" width="60" height="24" rx="6" fill="#6f42c1"/><rect x="6" y="16" width="52" height="16" rx="4" fill="#4a3c6a"/><rect x="12" y="20" width="40" height="8" fill="#2d1f4e"/></svg>',
  gb: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="6" fill="#6c757d"/><rect x="12" y="12" width="24" height="24" fill="#198754"/><rect x="16" y="40" width="16" height="8" rx="2" fill="#495057"/></svg>',
  gbc: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="6" fill="#6f42c1"/><rect x="12" y="12" width="24" height="24" fill="#0d6efd"/><rect x="16" y="40" width="16" height="8" rx="2" fill="#5a4d6e"/></svg>',
  gba: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="12" width="56" height="24" rx="4" fill="#adb5bd"/><rect x="8" y="16" width="48" height="16" rx="2" fill="#495057"/><rect x="12" y="20" width="40" height="8" fill="#212529"/></svg>',
  genesis: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="32" rx="2" fill="#1a1a1a"/><rect x="8" y="12" width="48" height="24" fill="#0d0d0d"/><rect x="12" y="16" width="40" height="16" fill="#212529"/><rect x="44" y="10" width="12" height="8" rx="1" fill="#0d6efd"/></svg>',
  sms: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="52" height="32" rx="2" fill="#1a1a1a"/><rect x="10" y="12" width="44" height="16" fill="#0d0d0d"/><rect x="10" y="30" width="44" height="4" fill="#c41e3a"/><rect x="14" y="16" width="36" height="8" fill="#2a2a2a"/></svg>',
  n64: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="52" height="32" rx="6" fill="#6c757d"/><rect x="10" y="12" width="44" height="24" rx="4" fill="#495057"/><rect x="14" y="16" width="36" height="16" fill="#212529"/><rect x="44" y="6" width="12" height="6" rx="1" fill="#FFC000"/><rect x="14" y="20" width="6" height="8" fill="#FF0000"/><rect x="22" y="20" width="6" height="8" fill="#0000FF"/><rect x="30" y="20" width="6" height="8" fill="#008000"/><rect x="38" y="20" width="6" height="8" fill="#FFC000"/></svg>',
  psx: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="52" height="32" rx="6" fill="#8b8b8b"/><rect x="10" y="12" width="44" height="24" rx="4" fill="#6b6b6b"/><line x1="14" y1="22" x2="50" y2="22" stroke="#212529" stroke-width="2"/><path d="M28 20c2-2 6-2 8 0s2 6 0 8-6 2-8 0-2-6 0-8z" fill="#DF0024"/><rect x="14" y="24" width="8" height="8" fill="#DF0024"/><rect x="24" y="24" width="8" height="8" fill="#F3C300"/><rect x="34" y="24" width="8" height="8" fill="#00AB9F"/><rect x="44" y="24" width="8" height="8" fill="#2E6DB4"/></svg>',
  pce: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="10" width="48" height="28" rx="4" fill="#fff8dc"/><rect x="12" y="18" width="40" height="6" fill="#c41e3a"/><rect x="12" y="14" width="40" height="4" fill="#2a2a2a"/><rect x="16" y="26" width="32" height="6" fill="#e8e8e8"/></svg>',
  ngp: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="8" fill="#212529"/><rect x="12" y="12" width="24" height="24" fill="#0d0d0d"/><circle cx="24" cy="40" r="6" fill="#9e9e9e"/><circle cx="24" cy="40" r="3" fill="#495057"/><rect x="10" y="50" width="28" height="4" rx="1" fill="#616161"/></svg>',
  ws: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="52" height="20" rx="8" fill="#f5f5f5"/><rect x="10" y="18" width="44" height="12" rx="4" fill="#e8e8e8"/><path d="M18 22 Q32 14 46 22" stroke="#d0d0d0" stroke-width="2" fill="none"/><rect x="24" y="20" width="16" height="8" rx="2" fill="#212529"/></svg>',
  [DREAMCAST_SYSTEM_ID]: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="52" height="32" rx="8" fill="#f0f2f5"/><rect x="10" y="12" width="44" height="24" rx="6" fill="#e0e5eb"/><path d="M32 14c8 0 15 6 15 14s-7 14-15 14-15-6-15-14c0-1 .1-2 .4-3" stroke="#ff6b00" stroke-width="2.5" fill="none"/><circle cx="24" cy="22" r="2" fill="#495057"/><circle cx="39" cy="24" r="2" fill="#495057"/><circle cx="34" cy="29" r="2" fill="#495057"/></svg>'
};
