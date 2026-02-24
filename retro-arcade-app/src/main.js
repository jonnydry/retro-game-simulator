import { mount } from 'svelte'
import './app.css'
import './styles/global.css'
import App from './App.svelte'
import { keys, currentGame, isPaused } from './lib/stores/gameStore.js'
import { currentView } from './lib/stores/viewStore.js'

const app = mount(App, {
  target: document.getElementById('app'),
})

const keyboardKeys = {}
let _currentGame, _currentView, _isPaused
currentGame.subscribe((v) => (_currentGame = v))
currentView.subscribe((v) => (_currentView = v))
isPaused.subscribe((v) => (_isPaused = v))

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
    e.preventDefault()
  }
  if (e.key === ' ' || e.key === 'Space') {
    const builtin = ['pong', 'snake', 'breakout'].includes(_currentGame)
    if (_currentView === 'play' && builtin && (_isPaused || document.querySelector('.press-start.show'))) {
      window.__togglePause?.()
    }
  }
  const key = e.key === 'Space' ? ' ' : e.key
  keyboardKeys[e.key] = true
  keyboardKeys[key] = true
  keys.update((k) => ({ ...k, [e.key]: true, [key]: true }))
})

document.addEventListener('keyup', (e) => {
  const key = e.key === 'Space' ? ' ' : e.key
  keyboardKeys[e.key] = false
  keyboardKeys[key] = false
  keys.update((k) => {
    const next = { ...k }
    delete next[e.key]
    delete next[key]
    return next
  })
})

const GAMEPAD_DEADZONE = 0.15
let gamepadInterval = null

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
  keys.update((k) => ({
    ...k,
    ArrowUp: keyboardKeys['ArrowUp'] || up,
    ArrowDown: keyboardKeys['ArrowDown'] || down,
    ArrowLeft: keyboardKeys['ArrowLeft'] || left,
    ArrowRight: keyboardKeys['ArrowRight'] || right,
    ' ': keyboardKeys[' '] || keyboardKeys['Space'] || action
  }))
}

window.addEventListener('gamepadconnected', () => {
  if (!gamepadInterval) gamepadInterval = setInterval(pollGamepads, 16)
})
window.addEventListener('gamepaddisconnected', () => {
  const gps = navigator.getGamepads?.()
  if (!gps?.some((g) => g) && gamepadInterval) {
    clearInterval(gamepadInterval)
    gamepadInterval = null
  }
})
if (navigator.getGamepads?.()?.some((g) => g)) {
  gamepadInterval = setInterval(pollGamepads, 16)
}

export default app
