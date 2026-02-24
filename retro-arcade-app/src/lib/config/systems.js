export const systemOrder = ['nes', 'snes', 'gb', 'gbc', 'gba', 'genesis', 'sms', 'n64', 'psx', 'pce', 'ngp', 'ws'];

export const systemDisplayNames = {
  nes: 'NES', snes: 'SNES', gb: 'Game Boy', gbc: 'Game Boy Color',
  gba: 'Game Boy Advance', genesis: 'Genesis', sms: 'Master System',
  n64: 'N64', psx: 'PlayStation', pce: 'PC Engine',
  ngp: 'Neo Geo Pocket', ws: 'WonderSwan'
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
  builtin: { width: 640, height: 480 }
};

export const systemIcons = {
  nes: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="32" rx="4" fill="#dc3545"/><rect x="8" y="12" width="48" height="24" rx="2" fill="#6c757d"/><rect x="12" y="16" width="40" height="16" fill="#212529"/></svg>',
  snes: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="12" width="60" height="24" rx="6" fill="#6f42c1"/><rect x="6" y="16" width="52" height="16" rx="4" fill="#4a3c6a"/><rect x="12" y="20" width="40" height="8" fill="#2d1f4e"/></svg>',
  gb: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="6" fill="#6c757d"/><rect x="12" y="12" width="24" height="24" fill="#198754"/><rect x="16" y="40" width="16" height="8" rx="2" fill="#495057"/></svg>',
  gbc: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="6" fill="#6f42c1"/><rect x="12" y="12" width="24" height="24" fill="#0d6efd"/><rect x="16" y="40" width="16" height="8" rx="2" fill="#5a4d6e"/></svg>',
  gba: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="12" width="56" height="24" rx="4" fill="#adb5bd"/><rect x="8" y="16" width="48" height="16" rx="2" fill="#495057"/><rect x="12" y="20" width="40" height="8" fill="#212529"/></svg>',
  genesis: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="32" rx="2" fill="#212529"/><rect x="8" y="12" width="48" height="24" fill="#0d0d0d"/><rect x="12" y="16" width="40" height="16" fill="#1a1a1a"/><rect x="52" y="20" width="8" height="8" rx="1" fill="#333"/></svg>',
  sms: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="56" height="28" rx="2" fill="#212529"/><rect x="8" y="14" width="48" height="20" fill="#0d0d0d"/><rect x="12" y="18" width="36" height="12" fill="#1a1a1a"/></svg>',
  n64: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 4L8 44h48L32 4z" fill="#6c757d"/><path d="M32 12L16 40h32L32 12z" fill="#495057"/><path d="M28 24l-8 16h16l-8-16z" fill="#212529"/></svg>',
  psx: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="52" height="32" rx="4" fill="#6c757d"/><rect x="10" y="12" width="44" height="24" rx="2" fill="#495057"/><rect x="14" y="16" width="36" height="16" fill="#212529"/><circle cx="32" cy="24" r="4" fill="#adb5bd"/></svg>',
  pce: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="56" height="28" rx="4" fill="#fd7e14"/><rect x="8" y="14" width="48" height="20" rx="2" fill="#ffc107"/><rect x="12" y="18" width="40" height="12" fill="#e0a800"/></svg>',
  ngp: '<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="32" height="56" rx="8" fill="#212529"/><rect x="12" y="12" width="24" height="24" fill="#0d0d0d"/><rect x="16" y="40" width="16" height="8" rx="2" fill="#333"/></svg>',
  ws: '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="56" height="32" rx="6" fill="#f8f9fa"/><rect x="8" y="12" width="48" height="24" rx="4" fill="#e9ecef"/><rect x="12" y="16" width="40" height="16" fill="#dee2e6"/></svg>'
};
