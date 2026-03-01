# Retro Arcade App

The Retro Arcade web application with built-in classic games and ROM emulation (EmulatorJS) in a single-page Svelte + Vite app.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run smoke tests |
| `npm run audit:prod` | Audit production dependencies for high-severity issues |
| `npm run preview` | Preview production build |
| `npm run setup-dreamcast` | Fetch and configure Dreamcast (flycast-wasm) support |

## Dreamcast Setup

Dreamcast ROM support requires a one-time setup:

```bash
npm run setup-dreamcast
```

This downloads EmulatorJS files, the flycast core, and WebGL2 patches to `public/dreamcast-data/`. Most Dreamcast games also need BIOS files in `public/dreamcast-data/bios/dc/` (`dc_boot.bin`, `dc_flash.bin`).

## Tech Stack

- Svelte 5
- Vite 7
- EmulatorJS

## Current Scope

- Built-in games: Pong, Snake, Breakout
- ROM library persistence: IndexedDB
- Target platform: desktop browsers (keyboard + gamepad first)

## Security

- See [`SECURITY.md`](./SECURITY.md) for hardening details and operational checks.
