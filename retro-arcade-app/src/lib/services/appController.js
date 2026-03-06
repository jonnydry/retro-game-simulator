let playViewApi = null;
let settingsModalApi = null;
let pendingRomLoadAction = null;

const playViewWaiters = new Set();

function resolvePlayViewWaiters(api) {
  for (const waiter of playViewWaiters) {
    waiter(api);
  }
  playViewWaiters.clear();
}

export function registerPlayViewApi(api) {
  playViewApi = api;
  resolvePlayViewWaiters(api);

  return () => {
    if (playViewApi === api) {
      playViewApi = null;
    }
  };
}

export function waitForPlayViewApi(timeoutMs = 5000) {
  if (playViewApi) {
    return Promise.resolve(playViewApi);
  }

  return new Promise((resolve, reject) => {
    const waiter = (api) => {
      clearTimeout(timeoutId);
      playViewWaiters.delete(waiter);
      resolve(api);
    };

    const timeoutId = setTimeout(() => {
      playViewWaiters.delete(waiter);
      reject(new Error('Play view not ready in time'));
    }, timeoutMs);

    playViewWaiters.add(waiter);
  });
}

export function togglePlayPause() {
  if (!playViewApi?.togglePause) return false;
  playViewApi.togglePause();
  return true;
}

export function registerSettingsModalApi(api) {
  settingsModalApi = api;

  return () => {
    if (settingsModalApi === api) {
      settingsModalApi = null;
    }
  };
}

export function openSettingsModal() {
  if (!settingsModalApi?.open) return false;
  settingsModalApi.open();
  return true;
}

export function setPendingRomLoadAction(action) {
  pendingRomLoadAction = action;
}

export function clearPendingRomLoadAction(action) {
  if (!action || pendingRomLoadAction === action) {
    pendingRomLoadAction = null;
  }
}

export function startPendingRomLoad() {
  return pendingRomLoadAction?.();
}
