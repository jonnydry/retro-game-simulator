# Retro Game Simulator - Specification

## Project Overview
- **Project name**: Retro Arcade
- **Type**: Single-page web application (HTML/CSS/JS)
- **Core functionality**: A retro game simulator with playable classic games, ROM emulation, and a sidebar game selector
- **Target users**: Casual gamers, retro gaming enthusiasts

## UI/UX Specification

### Layout Structure
- **Sidebar** (left): 220px width (CSS variable `--sidebar-width`), scrollable game list
- **Main area** (right): Flexible width, contains game canvas and controls
- **Responsive**: Sidebar collapses to hamburger menu on mobile (<768px)

### Visual Design

#### Color Palette (current implementation)
- **Background**: #0d0d12 (var(--bg-primary))
- **Sidebar background**: #14141c (var(--bg-secondary))
- **Primary accent**: #6366f1 (indigo)
- **Secondary accent**: #8b5cf6 (purple)
- **Tertiary accent**: #22d3ee (cyan)
- **Text primary**: #f1f5f9
- **Text secondary**: #94a3b8

#### Typography
- **Headings**: "Rajdhani" (Google Font)
- **Body/UI**: "Exo 2" (Google Font)
- **Game title sizes**: 13px (sidebar), 20px (main)

#### Visual Effects
- Scanline overlay on game canvas
- Neon glow effects on hover (box-shadow with accent colors)
- CRT-style game display
- Smooth transitions (0.2s ease)
- Respects `prefers-reduced-motion` for accessibility

### Components

#### Sidebar
- Logo/title at top
- Search/filter input
- Game category select (Built-in, Freedoom, Load ROM)
- Game list with emoji-based icons
- Each game card shows: icon, title, year
- Free homebrew game links
- ROM upload section (system select + file picker)
- Settings button

#### Game Display Area
- Game title header
- Score display
- Canvas/emulator container with CRT bezel effect
- On-screen touch controls (d-pad, action button) for mobile

#### Control Panel
- Start/Pause button
- Sound toggle
- Fullscreen button
- Resolution scale select (Auto, 1x-4x)
- Keyboard shortcut hint
- Gamepad indicator
- Controls guide (per-game keyboard mapping)

## Functionality Specification

### Core Features

#### 15 Built-in Games (JavaScript-based)
1. Pong (1972)
2. Snake (1976)
3. Space Invaders (1978)
4. Tetris (Demo)
5. Breakout (1976)
6. Asteroids (1979)
7. Neon Sprint
8. Frogger (1981)
9. Missile Command (1980)
10. Minesweeper (1989)
11. Pac-Man (1980)
12. Donkey Kong (1981)
13. Q*bert (1982)
14. Centipede (1981)
15. Galaga (1981)

#### ROM Emulation (EmulatorJS)
- Supports NES, SNES, Game Boy, GBA, Genesis, SMS, N64, PlayStation, PC Engine, Neo Geo Pocket, WonderSwan
- Load ROM files via file picker
- ROM library saved to localStorage

#### Freedoom
- Browser-based Doom via external iframe (webdoom)
- Full-screen overlay mode

#### User Interactions
- Click game in sidebar to load
- Keyboard controls per game (see controls guide)
- Touch controls for mobile
- Gamepad support
- Sound on/off toggle
- Pause/Resume functionality
- Custom modal dialogs (replaces native alert/confirm)

#### Accessibility
- Skip link for screen readers
- Focus-visible indicators for keyboard users
- ARIA labels on canvas, buttons, modals
- Settings modal and dialog modal with proper roles

### Edge Cases
- Handle window resize (canvas scaling)
- Pause game when switching
- Reset game state on restart
- ROM extension validation with user override option

## Acceptance Criteria
- [x] Sidebar displays all games with names and icons
- [x] Clicking a game loads it in the main area
- [x] Built-in games are playable with keyboard/touch/gamepad
- [x] All games track and display score (where applicable)
- [x] CRT/retro visual effects visible
- [x] Hover effects on interactive elements
- [x] Mobile responsive layout with touch controls
- [x] ROM loading with system selection
- [x] Freedoom playable in fullscreen
- [x] High scores persist in localStorage
- [x] Settings (sound, hints) persist
- [x] Custom dialogs for alerts and confirmations
- [x] Reduced motion support for accessibility
