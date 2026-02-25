import {
  addToRomLibrary,
  getRomFromLibrary,
  getRomBlob,
  updateRomLastPlayed
} from '$lib/services/storage.js';
import { DREAMCAST_SYSTEM_ID, defaultEnabledSystems, systemOrder } from '$lib/config/systems.js';
import { romLibrary } from '$lib/stores/romLibraryStore.js';
import { showAlert, showConfirm } from '$lib/services/dialog.js';

const DEFAULT_EJS_CDN = ensureTrailingSlash(
  import.meta.env.VITE_EMULATOR_DATA_PATH || 'https://cdn.emulatorjs.org/stable/data/'
);
const DREAMCAST_CORE = (import.meta.env.VITE_DREAMCAST_CORE || 'flycast').trim();
const DREAMCAST_FORCE_ENABLE = String(import.meta.env.VITE_DREAMCAST_FORCE_ENABLE || '').toLowerCase() === 'true';
const DREAMCAST_CUSTOM_DATA_PATH = ensureTrailingSlash(import.meta.env.VITE_DREAMCAST_DATA_PATH || '');
let currentRomBlobUrl = null;
let createElementPatchRestore = null;
let dreamcastSupportInitialized = false;
let dreamcastSupportAvailable = false;
let dreamcastDataPath = '';
const MENU_BUTTON_SELECTORS = [
  '[data-ejs="menu"]',
  '.ejs_menu_button',
  '.ejs-menu-button',
  '.ejs--menu-button',
  '[aria-label*="menu" i]',
  '[title*="menu" i]',
  '[aria-label*="settings" i]',
  '[title*="settings" i]'
];

function ensureTrailingSlash(path) {
  if (!path) return '';
  return path.endsWith('/') ? path : `${path}/`;
}

function getCoresManifestUrl(dataPath) {
  const path = ensureTrailingSlash(dataPath || DEFAULT_EJS_CDN);
  return `${path}cores/cores.json`;
}

function hasCoreInManifest(manifest, coreName) {
  if (!coreName) return false;
  if (Array.isArray(manifest)) {
    return manifest.some((entry) => entry?.name === coreName);
  }
  if (manifest && typeof manifest === 'object') {
    return Object.prototype.hasOwnProperty.call(manifest, coreName);
  }
  return false;
}

async function dataPathSupportsCore(dataPath, coreName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(getCoresManifestUrl(dataPath), { signal: controller.signal });
    if (!res.ok) return false;
    const manifest = await res.json();
    return hasCoreInManifest(manifest, coreName);
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const EMULATOR_METHODS = {
  pause: ['pause'],
  resume: ['resume', 'play', 'unpause'],
  togglePause: ['togglePause'],
  setVolume: ['setVolume', 'set_volume', 'volume'],
  reset: ['reset', 'restart', 'softReset', 'hardReset'],
  openMenu: ['openMenu', 'menu', 'toggleMenu', 'showMenu', 'openSettings', 'settings'],
  saveState: ['saveState', 'save_state', 'saveSavestate', 'saveStateSlot'],
  loadState: ['loadState', 'load_state', 'loadSavestate', 'loadStateSlot'],
  exit: ['exit']
};

export const emptyEmulatorCapabilities = Object.freeze({
  available: false,
  canPause: false,
  canResume: false,
  canTogglePause: false,
  canSetVolume: false,
  canReset: false,
  canOpenMenu: false,
  canSaveState: false,
  canLoadState: false
});

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
  ws: 'mednafen_wswan',
  [DREAMCAST_SYSTEM_ID]: DREAMCAST_CORE
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
  ws: 'ws',
  [DREAMCAST_SYSTEM_ID]: 'dreamcast'
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
  [DREAMCAST_SYSTEM_ID]: ['.cdi', '.gdi', '.chd', '.zip'],
  pce: ['.pce', '.zip'],
  ngp: ['.ngp', '.zip'],
  ws: ['.ws', '.wsc', '.zip']
};

function isDreamcastSystem(system) {
  return system === DREAMCAST_SYSTEM_ID;
}

function getDreamcastUnavailableMessage() {
  return 'Dreamcast core is not available in the current EmulatorJS data path. Set VITE_DREAMCAST_DATA_PATH or VITE_DREAMCAST_FORCE_ENABLE to enable it.';
}

function getDataPathForSystem(system) {
  if (isDreamcastSystem(system) && dreamcastSupportAvailable && dreamcastDataPath) {
    return dreamcastDataPath;
  }
  return DEFAULT_EJS_CDN;
}

export function getEnabledSystems() {
  if (dreamcastSupportAvailable) return systemOrder;
  return defaultEnabledSystems;
}

export function getEnabledSystemExtensions(enabledSystems = getEnabledSystems()) {
  const exts = {};
  for (const system of enabledSystems) {
    if (systemExtensions[system]) exts[system] = systemExtensions[system];
  }
  return exts;
}

export function isDreamcastAvailable() {
  return dreamcastSupportAvailable;
}

export async function initializeDreamcastSupport() {
  if (dreamcastSupportInitialized) return dreamcastSupportAvailable;
  dreamcastSupportInitialized = true;

  if (DREAMCAST_FORCE_ENABLE) {
    dreamcastSupportAvailable = true;
    dreamcastDataPath = DREAMCAST_CUSTOM_DATA_PATH || DEFAULT_EJS_CDN;
    return dreamcastSupportAvailable;
  }

  if (DREAMCAST_CUSTOM_DATA_PATH) {
    const hasCustomCore = await dataPathSupportsCore(DREAMCAST_CUSTOM_DATA_PATH, DREAMCAST_CORE);
    if (hasCustomCore) {
      dreamcastSupportAvailable = true;
      dreamcastDataPath = DREAMCAST_CUSTOM_DATA_PATH;
      return dreamcastSupportAvailable;
    }
  }

  const hasDefaultCore = await dataPathSupportsCore(DEFAULT_EJS_CDN, DREAMCAST_CORE);
  dreamcastSupportAvailable = hasDefaultCore;
  dreamcastDataPath = hasDefaultCore ? DEFAULT_EJS_CDN : '';
  return dreamcastSupportAvailable;
}

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

export const dreamcastDefaultControls = {
  0: {
    0: { value: 'x', value2: 'BUTTON_1' },
    1: { value: 'a', value2: 'BUTTON_4' },
    2: { value: 'v', value2: 'SELECT' },
    3: { value: 'enter', value2: 'START' },
    4: { value: 'up arrow', value2: 'DPAD_UP' },
    5: { value: 'down arrow', value2: 'DPAD_DOWN' },
    6: { value: 'left arrow', value2: 'DPAD_LEFT' },
    7: { value: 'right arrow', value2: 'DPAD_RIGHT' },
    8: { value: 'z', value2: 'BUTTON_2' },
    9: { value: 's', value2: 'BUTTON_3' },
    10: { value: 'q', value2: 'LEFT_TOP_SHOULDER' },
    11: { value: 'e', value2: 'RIGHT_TOP_SHOULDER' },
    12: { value: 'tab', value2: 'LEFT_BOTTOM_SHOULDER' },
    13: { value: 'r', value2: 'RIGHT_BOTTOM_SHOULDER' },
    16: { value: 'l', value2: 'LEFT_STICK_X:+1' },
    17: { value: 'j', value2: 'LEFT_STICK_X:-1' },
    18: { value: 'k', value2: 'LEFT_STICK_Y:+1' },
    19: { value: 'i', value2: 'LEFT_STICK_Y:-1' }
  },
  1: {},
  2: {},
  3: {}
};

export function inferSystemFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  const nonZipEntries = Object.entries(systemExtensions).map(([system, exts]) => [
    system,
    exts.filter((ext) => ext !== '.zip')
  ]);

  if (lower.endsWith('.zip')) {
    for (const [system, exts] of nonZipEntries) {
      if (exts.some((ext) => lower.endsWith(ext + '.zip'))) return system;
    }
    return null;
  }

  for (const [system, exts] of nonZipEntries) {
    if (exts.some((ext) => lower.endsWith(ext))) return system;
  }
  return null;
}

export function getEmulatorInstance() {
  if (typeof window === 'undefined') return null;
  return window.EJS_emulator || null;
}

function hasAnyMethod(target, methods) {
  if (!target || !methods?.length) return false;
  return methods.some((name) => typeof target[name] === 'function');
}

function callFirstMethod(target, methods, ...args) {
  if (!target || !methods?.length) return false;
  for (const name of methods) {
    const fn = target[name];
    if (typeof fn !== 'function') continue;
    try {
      fn.apply(target, args);
      return true;
    } catch (e) {}
  }
  return false;
}

function getMenuTriggerElement() {
  if (typeof document === 'undefined') return null;
  const container = document.getElementById('emulator');
  if (!container) return null;
  for (const selector of MENU_BUTTON_SELECTORS) {
    const el = container.querySelector(selector);
    if (el) return el;
  }
  const candidates = Array.from(
    container.querySelectorAll('button, [role="button"], [aria-label], [title]')
  );
  return (
    candidates.find((el) => {
      const text = [
        el.getAttribute?.('aria-label') || '',
        el.getAttribute?.('title') || '',
        el.textContent || ''
      ]
        .join(' ')
        .toLowerCase();
      return /\b(menu|settings|options|controls)\b/.test(text);
    }) || null
  );
}

export function getEmulatorCapabilities() {
  const emu = getEmulatorInstance();
  if (!emu) return emptyEmulatorCapabilities;

  const canPause = hasAnyMethod(emu, EMULATOR_METHODS.pause);
  const canResume = hasAnyMethod(emu, EMULATOR_METHODS.resume);
  const canTogglePause = hasAnyMethod(emu, EMULATOR_METHODS.togglePause);
  const canSetVolume = hasAnyMethod(emu, EMULATOR_METHODS.setVolume) || typeof window !== 'undefined';
  const canReset = hasAnyMethod(emu, EMULATOR_METHODS.reset);
  const canOpenMenu =
    hasAnyMethod(emu, EMULATOR_METHODS.openMenu) || Boolean(getMenuTriggerElement());
  const canSaveState = hasAnyMethod(emu, EMULATOR_METHODS.saveState);
  const canLoadState = hasAnyMethod(emu, EMULATOR_METHODS.loadState);

  return {
    available: true,
    canPause,
    canResume,
    canTogglePause,
    canSetVolume,
    canReset,
    canOpenMenu,
    canSaveState,
    canLoadState
  };
}

export function pauseEmulator() {
  const emu = getEmulatorInstance();
  if (!emu) return false;
  if (callFirstMethod(emu, EMULATOR_METHODS.pause)) return true;
  return callFirstMethod(emu, EMULATOR_METHODS.togglePause);
}

export function resumeEmulator() {
  const emu = getEmulatorInstance();
  if (!emu) return false;
  if (callFirstMethod(emu, EMULATOR_METHODS.resume)) return true;
  return callFirstMethod(emu, EMULATOR_METHODS.togglePause);
}

export function setEmulatorPaused(shouldPause) {
  return shouldPause ? pauseEmulator() : resumeEmulator();
}

export function setEmulatorVolume(rawValue) {
  const value = Number.isFinite(rawValue) ? Math.max(0, Math.min(1, rawValue)) : 1;
  if (typeof window !== 'undefined') {
    try {
      window.EJS_volume = value;
    } catch (e) {}
  }
  const emu = getEmulatorInstance();
  if (!emu) return false;
  if (callFirstMethod(emu, EMULATOR_METHODS.setVolume, value)) return true;
  return callFirstMethod(emu, EMULATOR_METHODS.setVolume, Math.round(value * 100));
}

export function resetEmulator() {
  const emu = getEmulatorInstance();
  if (!emu) return false;
  return callFirstMethod(emu, EMULATOR_METHODS.reset);
}

export function saveEmulatorState(slot = 0) {
  const emu = getEmulatorInstance();
  if (!emu) return false;
  if (callFirstMethod(emu, EMULATOR_METHODS.saveState, slot)) return true;
  return callFirstMethod(emu, EMULATOR_METHODS.saveState);
}

export function loadEmulatorState(slot = 0) {
  const emu = getEmulatorInstance();
  if (!emu) return false;
  if (callFirstMethod(emu, EMULATOR_METHODS.loadState, slot)) return true;
  return callFirstMethod(emu, EMULATOR_METHODS.loadState);
}

export function openEmulatorMenu() {
  const emu = getEmulatorInstance();
  if (callFirstMethod(emu, EMULATOR_METHODS.openMenu)) return true;
  const trigger = getMenuTriggerElement();
  if (!trigger) return false;
  try {
    trigger.click();
    return true;
  } catch (e) {
    return false;
  }
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
        callFirstMethod(emu, EMULATOR_METHODS.pause);
        callFirstMethod(emu, EMULATOR_METHODS.exit);
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
    window.EJS_controlScheme = undefined;
    window.EJS_defaultControls = undefined;
    window.EJS_defaultOptions = undefined;
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
  window.EJS_pathtodata = getDataPathForSystem(system);
  window.EJS_color = '#ff0080';
  window.EJS_startOnLoaded = true;
  window.EJS_alignStartButton = 'center';
  window.EJS_backgroundColor = '#000000';
  if (systemControlScheme[system]) window.EJS_controlScheme = systemControlScheme[system];
  if (system === 'gba') {
    window.EJS_defaultControls = gbaDefaultControls;
  } else if (isDreamcastSystem(system)) {
    // Includes trigger and analog defaults for modern controllers.
    window.EJS_defaultControls = dreamcastDefaultControls;
  } else {
    window.EJS_defaultControls = undefined;
  }
  window.EJS_defaultOptions = {
    ...(window.EJS_defaultOptions || {}),
    'input_player1_joypad_index': 0
  };
  window.EJS_onGameStart = callbacks?.onGameStart;
  window.EJS_ready = callbacks?.onReady;

  const script = document.createElement('script');
  script.src = `${window.EJS_pathtodata}loader.js`;
  script.onerror = callbacks?.onError;
  container.appendChild(script);
}

export async function loadRomFromFile(file, system, mode, callbacks) {
  if (!dreamcastSupportInitialized) {
    await initializeDreamcastSupport();
  }

  if (!system) {
    system = inferSystemFromFileName(file.name);
    if (!system) {
      await showAlert(
        'Please select a system first, or use a file with a recognized extension (.gba, .nes, .sfc, etc.)'
      );
      callbacks?.onError?.('No system selected for ROM');
      return false;
    }
  }

  if (isDreamcastSystem(system) && !dreamcastSupportAvailable) {
    const message = getDreamcastUnavailableMessage();
    await showAlert(message);
    callbacks?.onError?.(message);
    return false;
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
    if (!proceed) {
      callbacks?.onError?.('ROM load canceled');
      return false;
    }
  }

  stopEmulator();

  const arrayBuffer = await file.arrayBuffer();
  const romName = file.name.replace(/\.[^/.]+$/, '');
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });

  let romId = null;
  if (mode === 'import') {
    romId = await addToRomLibrary(romName, system, blob);
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
  return { loaded: true, romId };
}

export async function loadRomFromLibrary(romId, callbacks) {
  if (!dreamcastSupportInitialized) {
    await initializeDreamcastSupport();
  }

  const rom = getRomFromLibrary(romId);
  if (!rom) {
    callbacks?.onError?.('ROM not found in library');
    return false;
  }

  if (isDreamcastSystem(rom.system) && !dreamcastSupportAvailable) {
    const message = getDreamcastUnavailableMessage();
    await showAlert(message);
    callbacks?.onError?.(message);
    return false;
  }

  stopEmulator();

  await updateRomLastPlayed(romId);
  romLibrary.refresh();

  const blob = await getRomBlob(romId);
  if (!blob) {
    callbacks?.onError?.('ROM file data missing');
    return false;
  }
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
  return true;
}
