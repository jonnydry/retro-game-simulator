/**
 * Touch key state for built-in games.
 * Updated by on-screen touch controls; merged into keys by main.js.
 */
const touchKeys = {};
const TOUCH_KEY_CHANGE = 'retrophoria-touchkeychange';

export function setTouchKey(key, pressed) {
  touchKeys[key] = pressed;
  window.dispatchEvent(new CustomEvent(TOUCH_KEY_CHANGE));
}

export function getTouchKeyChangeEvent() {
  return TOUCH_KEY_CHANGE;
}

export function getTouchKeys() {
  return { ...touchKeys };
}

export function clearTouchKeys() {
  for (const key of Object.keys(touchKeys)) {
    touchKeys[key] = false;
  }
}
