# Retro Arcade

A browser-based retro game simulator combining built-in classic games, ROM emulation, and Freedoom—all playable in the browser.

## Features

- **15 built-in games**: Pong, Snake, Space Invaders, Tetris, Breakout, Asteroids, Neon Sprint, Frogger, Missile Command, Minesweeper, Pac-Man, Donkey Kong, Q*bert, Centipede, Galaga
- **ROM emulation** (EmulatorJS): NES, SNES, Game Boy, GBA, Genesis, Master System, N64, PlayStation, PC Engine, Neo Geo Pocket, WonderSwan, and Dreamcast (optional setup)
- **Freedoom**: Browser-based Doom via webdoom
- **CRT-style visuals**: Scanlines, bezel effects, neon accents
- **Mobile-friendly**: Touch controls, responsive sidebar
- **Gamepad support** and keyboard controls
- **ROM library**: Saved to localStorage with watch folder support

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
