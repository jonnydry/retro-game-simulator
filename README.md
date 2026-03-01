# Retro Arcade

A browser-based retro game simulator combining built-in classic games and ROM emulation in a single-page Svelte app.

## Features

- **3 built-in games**: Pong, Snake, Breakout
- **ROM emulation** (EmulatorJS): NES, SNES, Game Boy, GBA, Genesis, Master System, N64, PlayStation, PC Engine, Neo Geo Pocket, WonderSwan, and Dreamcast (optional setup)
- **CRT-style visuals**: Scanlines, bezel effects, neon accents
- **Desktop-first UI**: Optimized for keyboard/gamepad play on desktop browsers
- **Gamepad support** and keyboard controls
- **ROM library**: Stored in IndexedDB with optional watch-folder import support

## Getting Started

```bash
cd retro-arcade-app
npm install
npm run dev
```

Open the dev server URL (typically http://localhost:5173).

### Dreamcast Support (Optional)

For Dreamcast ROM support, run:

```bash
npm run setup-dreamcast
```

Place Dreamcast BIOS files (`dc_boot.bin`, `dc_flash.bin`) in `retro-arcade-app/public/dreamcast-data/bios/dc/` for most games.

## Tech Stack

- **Svelte 5** + **Vite** (frontend)
- **EmulatorJS** (ROM emulation)
- **flycast-wasm** (Dreamcast, via setup script)

## Project Structure

| Path | Description |
|------|-------------|
| `retro-arcade-app/` | Main application (Svelte + Vite) |
| `SPEC.md` | UI/UX and functionality specification |
