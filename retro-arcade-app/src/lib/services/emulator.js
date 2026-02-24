import {
  addToRomLibrary,
  getRomFromLibrary,
  getRomBlob,
  updateRomLastPlayed
} from '$lib/services/storage.js';
import { romLibrary } from '$lib/stores/romLibraryStore.js';

const EJS_CDN = 'https://cdn.emulatorjs.org/nightly/data/';
let currentRomBlobUrl = null;
let createElementPatchRestore = null;

export const systemToCore = {
  nes: 'fceumm',
  snes: 'snes9x',
  gb: 'gambatte',
  gbc: 'gambatte',
  gba: 'mgba',
  genesis: 'genesis_plus_gx',
  sms: 'smsplus',
  n64: 'mupen64plus_next',
  psx: 'mednafen_psx_hw',
  pce: 'mednafen_pce',
  ngp: 'mednafen_ngp',
  ws: 'mednafen_wswan'
};

export const systemControlScheme = {
  nes: 'nes',
  snes: 'snes',
  gb: 'gb',
  gbc: 'gb',
  gba: 'gba',
  genesis: 'segaMD',
  sms: 'segaMS',
  n64: 'n64',
  psx: 'psx',
  pce: 'pce',
  ngp: 'ngp',
  ws: 'ws'
};

export const systemExtensions = {
  nes: ['.nes', '.zip'],
  snes: ['.sfc', '.smc', '.zip'],
  gb: ['.gb', '.zip'],
  gbc: ['.gbc', '.zip'],
  gba: ['.gba', '.zip'],
  genesis: ['.md', '.smd', '.bin', '.gen', '.zip'],
  sms: ['.sms', '.zip'],
  n64: ['.z64', '.n64', '.v64', '.zip'],
  psx: ['.bin', '.cue', '.chd', '.pbp', '.iso', '.img', '.zip'],
  pce: ['.pce', '.zip'],
  ngp: ['.ngp', '.zip'],
  ws: ['.ws', '.wsc', '.zip']
};

export const gbaDefaultControls = {
  0: {
    0: { value: 'x', value2: 'BUTTON_2' },
    1: { value: 'a', value2: 'BUTTON_4' },
    2: { value: 'v', value2: 'SELECT' },
    3: { value: 'enter', value2: 'START' },
    4: { value: 'up arrow', value2: 'DPAD_UP' },
    5: { value: 'down arrow', value2: 'DPAD_DOWN' },
    6: { value: 'left arrow', value2: 'DPAD_LEFT' },
    7: { value: 'right arrow', value2: 'DPAD_RIGHT' },
    8: { value: 'z', value2: 'BUTTON_1' },
    9: { value: 's', value2: 'BUTTON_3' },
    10: { value: 'q', value2: 'LEFT_TOP_SHOULDER' },
    11: { value: 'e', value2: 'RIGHT_TOP_SHOULDER' }
  },
  1: {},
  2: {},
  3: {}
};

export function inferSystemFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  for (const [system, exts] of Object.entries(systemExtensions)) {
    if (exts.some((ext) => lower.endsWith(ext))) return system;
  }
  return null;
}

function applyCreateElementPatch() {
  if (createElementPatchRestore) return;
  const origCE = document.createElement.bind(document);
  document.createElement = function (tagName, options) {
    const el = origCE.call(document, tagName, options);
    if (tagName?.toLowerCase() === 'iframe') {
      el.allow = (el.allow ? el.allow + '; ' : '') + 'gamepad';
    }
    return el;
  };
  createElementPatchRestore = () => {
    document.createElement = origCE;
    createElementPatchRestore = null;
  };
}

function revokeBlobUrl(url) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
  }
}

function silenceAndRemoveIframes(container) {
  const iframes = container
    ? Array.from(container.querySelectorAll('iframe'))
    : Array.from(document.querySelectorAll('.app-container iframe'));
  iframes.forEach((iframe) => {
    try {
      iframe.src = 'about:blank';
      iframe.remove();
    } catch (e) {}
  });
}

export function stopEmulator() {
  if (createElementPatchRestore) createElementPatchRestore();

  if (typeof window !== 'undefined') {
    try {
      window.EJS_volume = 0;
    } catch (e) {}
    try {
      const emu = window.EJS_emulator;
      if (emu) {
        if (typeof emu.pause === 'function') emu.pause();
        if (typeof emu.exit === 'function') emu.exit();
      }
    } catch (e) {}
  }

  const container = document.getElementById('emulator');
  silenceAndRemoveIframes(container);
  if (container) {
    container.innerHTML = '';
  }

  revokeBlobUrl(currentRomBlobUrl);
  currentRomBlobUrl = null;

  if (typeof window !== 'undefined') {
    if (window.EJS_gameUrl?.startsWith('blob:')) revokeBlobUrl(window.EJS_gameUrl);
    window.EJS_player = undefined;
    window.EJS_core = undefined;
    window.EJS_gameUrl = undefined;
    window.EJS_gameName = undefined;
    window.EJS_onGameStart = undefined;
    window.EJS_ready = undefined;
    window.EJS_volume = undefined;
  }
}

function loadEmulator(containerId, romUrl, gameName, system, callbacks) {
  const container = document.getElementById('emulator');
  if (!container) return;

  applyCreateElementPatch();
  currentRomBlobUrl = romUrl;

  window.EJS_player = '#' + containerId;
  window.EJS_core = systemToCore[system];
  window.EJS_gameUrl = romUrl;
  window.EJS_gameName = gameName;
  window.EJS_pathtodata = EJS_CDN;
  window.EJS_color = '#ff0080';
  window.EJS_startOnLoaded = true;
  window.EJS_alignStartButton = 'center';
  window.EJS_backgroundColor = '#000000';
  if (systemControlScheme[system]) window.EJS_controlScheme = systemControlScheme[system];
  if (system === 'gba') window.EJS_defaultControls = gbaDefaultControls;
  window.EJS_defaultOptions = {
    ...(window.EJS_defaultOptions || {}),
    'input_player1_joypad_index': 0
  };
  window.EJS_onGameStart = callbacks?.onGameStart;
  window.EJS_ready = callbacks?.onReady;

  const script = document.createElement('script');
  script.src = EJS_CDN + 'loader.js';
  script.onerror = callbacks?.onError;
  container.appendChild(script);
}

export async function loadRomFromFile(file, system, mode, callbacks) {
  const { showAlert, showConfirm } = await import('$lib/services/dialog.js');

  if (!system) {
    system = inferSystemFromFileName(file.name);
    if (!system) {
      await showAlert(
        'Please select a system first, or use a file with a recognized extension (.gba, .nes, .sfc, etc.)'
      );
      return;
    }
  }

  const fileName = file.name.toLowerCase();
  const validExtensions = systemExtensions[system] || [];
  const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    const proceed = await showConfirm(
      `Warning: "${file.name}" may not be a valid ${system.toUpperCase()} ROM.\n` +
        `Expected extensions: ${validExtensions.join(', ')}\n\n` +
        `Try to load anyway?`
    );
    if (!proceed) return;
  }

  stopEmulator();

  const arrayBuffer = await file.arrayBuffer();
  const romName = file.name.replace(/\.[^/.]+$/, '');
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });

  if (mode === 'import') {
    await addToRomLibrary(romName, system, blob);
    romLibrary.refresh();
  }
  const romUrl = URL.createObjectURL(blob);

  const containerId = 'emulator-' + Date.now();
  const container = document.getElementById('emulator');
  if (container) {
    container.innerHTML = `<div id="${containerId}" style="width:100%;height:100%;"></div>`;
  }

  loadEmulator(containerId, romUrl, romName, system, {
    onGameStart: callbacks?.onGameStart,
    onReady: callbacks?.onReady,
    onError: () => {
      callbacks?.onError?.('Failed to load emulator');
    }
  });
}

export async function loadRomFromLibrary(romId, callbacks) {
  const rom = getRomFromLibrary(romId);
  if (!rom) return;

  stopEmulator();

  await updateRomLastPlayed(romId);
  romLibrary.refresh();

  const blob = await getRomBlob(romId);
  if (!blob) return;
  const romUrl = URL.createObjectURL(blob);

  const containerId = 'emulator-' + Date.now();
  const container = document.getElementById('emulator');
  if (container) {
    container.innerHTML = `<div id="${containerId}" style="width:100%;height:100%;"></div>`;
  }

  loadEmulator(containerId, romUrl, rom.name, rom.system, {
    onGameStart: callbacks?.onGameStart,
    onReady: callbacks?.onReady,
    onError: () => callbacks?.onError?.('Failed to load emulator')
  });
}
