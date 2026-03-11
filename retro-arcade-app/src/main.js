import { mount } from 'svelte'
import './app.css'
import './styles/global.css'
import App from './App.svelte'
import { keys, currentGame, currentRomId, isPaused, pendingRomLoadId } from './lib/stores/gameStore.js'
import { currentView } from './lib/stores/viewStore.js'
import { togglePlayPause } from './lib/services/appController.js'
import { getTouchKeys, clearTouchKeys, getTouchKeyChangeEvent } from './lib/input/touchKeys.js'

const app = mount(App, {
  target: document.getElementById('app'),
})

const keyboardKeys = {}
const gamepadState = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false
}
let publishedKeys = {}
let _currentGame, _currentView, _isPaused, _currentRomId, _pendingRomLoadId
currentGame.subscribe((v) => (_currentGame = v))
isPaused.subscribe((v) => (_isPaused = v))
currentRomId.subscribe((v) => (_currentRomId = v))
pendingRomLoadId.subscribe((v) => (_pendingRomLoadId = v))

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))
  )
}

function sameKeySet(a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!b[key]) return false
  }
  return true
}

function buildMergedKeys() {
  const merged = {}
  for (const [key, isPressed] of Object.entries(keyboardKeys)) {
    if (isPressed) merged[key] = true
  }
  if (gamepadState.ArrowUp) merged.ArrowUp = true
  if (gamepadState.ArrowDown) merged.ArrowDown = true
  if (gamepadState.ArrowLeft) merged.ArrowLeft = true
  if (gamepadState.ArrowRight) merged.ArrowRight = true
  if (gamepadState.Space) {
    merged[' '] = true
    merged.Space = true
  }
  const tk = getTouchKeys()
  for (const [key, isPressed] of Object.entries(tk)) {
    if (isPressed) merged[key] = true
  }
  return merged
}

function publishKeysIfChanged() {
  const next = buildMergedKeys()
  if (sameKeySet(next, publishedKeys)) return
  publishedKeys = next
  keys.set(next)
}

function clearKeyboardState() {
  for (const key of Object.keys(keyboardKeys)) {
    keyboardKeys[key] = false
  }
  publishKeysIfChanged()
}

document.addEventListener('keydown', (e) => {
  const inPlayView = _currentView === 'play'
  const editable = isEditableTarget(e.target)
  if (
    inPlayView &&
    !editable &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)
  ) {
    e.preventDefault()
  }
  if (editable) return

  if ((e.key === ' ' || e.key === 'Space') && !e.repeat) {
    const builtin = ['pong', 'snake', 'breakout'].includes(_currentGame)
    const breakoutRunning = _currentGame === 'breakout' && !_isPaused && !document.querySelector('.press-start.show')
    const romActive = !_pendingRomLoadId && _currentGame === null && (_currentRomId || window.EJS_emulator)
    if (_currentView === 'play' && !breakoutRunning && (builtin || romActive)) {
      togglePlayPause()
    }
  }
  const key = e.key === 'Space' ? ' ' : e.key
  keyboardKeys[e.key] = true
  keyboardKeys[key] = true
  if (key === ' ') keyboardKeys.Space = true
  publishKeysIfChanged()
})

document.addEventListener('keyup', (e) => {
  const key = e.key === 'Space' ? ' ' : e.key
  keyboardKeys[e.key] = false
  keyboardKeys[key] = false
  if (key === ' ') keyboardKeys.Space = false
  publishKeysIfChanged()
})

window.addEventListener('blur', () => {
  clearKeyboardState()
  clearTouchKeys()
})

window.addEventListener(getTouchKeyChangeEvent(), () => {
  publishKeysIfChanged()
})

const GAMEPAD_DEADZONE = 0.15
let gamepadInterval = null

function clearGamepadState() {
  const hadPressed =
    gamepadState.ArrowUp ||
    gamepadState.ArrowDown ||
    gamepadState.ArrowLeft ||
    gamepadState.ArrowRight ||
    gamepadState.Space

  gamepadState.ArrowUp = false
  gamepadState.ArrowDown = false
  gamepadState.ArrowLeft = false
  gamepadState.ArrowRight = false
  gamepadState.Space = false

  if (hadPressed) publishKeysIfChanged()
}

function hasConnectedGamepads() {
  return !!navigator.getGamepads?.()?.some((g) => g)
}

function shouldPollGamepads() {
  return _currentView === 'play' && document.visibilityState === 'visible' && hasConnectedGamepads()
}

function stopGamepadPolling() {
  if (gamepadInterval) {
    clearInterval(gamepadInterval)
    gamepadInterval = null
  }
  clearGamepadState()
}

function syncGamepadPolling() {
  if (shouldPollGamepads()) {
    if (!gamepadInterval) {
      pollGamepads()
      gamepadInterval = setInterval(pollGamepads, 16)
    }
    return
  }

  stopGamepadPolling()
}

function pollGamepads() {
  const gamepads = navigator.getGamepads?.()
  if (!gamepads) return
  let up = false, down = false, left = false, right = false, action = false
  for (const gp of gamepads) {
    if (!gp) continue
    const axes = gp.axes || []
    const buttons = gp.buttons || []
    up = up || (buttons[12]?.pressed) || (axes[1] < -GAMEPAD_DEADZONE)
    down = down || (buttons[13]?.pressed) || (axes[1] > GAMEPAD_DEADZONE)
    left = left || (buttons[14]?.pressed) || (axes[0] < -GAMEPAD_DEADZONE)
    right = right || (buttons[15]?.pressed) || (axes[0] > GAMEPAD_DEADZONE)
    action = action || buttons[0]?.pressed || buttons[1]?.pressed || buttons[2]?.pressed || buttons[3]?.pressed || buttons[9]?.pressed
  }
  const changed =
    gamepadState.ArrowUp !== up ||
    gamepadState.ArrowDown !== down ||
    gamepadState.ArrowLeft !== left ||
    gamepadState.ArrowRight !== right ||
    gamepadState.Space !== action
  if (!changed) return
  gamepadState.ArrowUp = up
  gamepadState.ArrowDown = down
  gamepadState.ArrowLeft = left
  gamepadState.ArrowRight = right
  gamepadState.Space = action
  publishKeysIfChanged()
}

window.addEventListener('gamepadconnected', syncGamepadPolling)
window.addEventListener('gamepaddisconnected', syncGamepadPolling)
document.addEventListener('visibilitychange', syncGamepadPolling)
currentView.subscribe((v) => {
  _currentView = v
  syncGamepadPolling()
})
syncGamepadPolling()

export default app
