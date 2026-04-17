# Capture Creature 3D - Browser Game

## Project Overview
A browser-based 3D creature adventure built with Three.js. Currently a minimal foundation: a walkable 3D world with a Roblox-style blocky character, ready to grow into the full creature-capture game.

## Tech Stack
- 3D Engine: Three.js r171 (WebGL, browser-based)
- Build Tool: Vite 6
- Server: Express (auth + static)
- Runtime: Node.js 22 LTS
- No external model assets - all geometry built from primitives (boxes, cylinders, cones)

## Project Structure
- index.html - Entry point, fullscreen canvas, HUD overlay
- src/main.js - Three.js bootstrap, render loop
- src/world.js - Scene, lighting, ground, trees, clouds
- src/player.js - Roblox-style blocky character with walk animation
- src/controls.js - WASD movement, third-person orbit camera, touch support
- server/index.js - Express server with account auth (/api/register, /api/login, /api/save)
- server/accounts.json - User account data (hashed passwords, game state)
- dist/ - Built output (git-ignored)

## Development Commands
- npm install - Install dependencies (three, vite, express)
- npm run dev - Vite dev server with hot reload (port 3000)
- npm run build - Production build to dist/
- npm run serve - Serve production build via Express

## Controls
- WASD / Arrow keys - Move character
- Mouse drag - Rotate camera around character
- Scroll wheel - Zoom camera
- Touch drag - Rotate camera (mobile)

## Hosting
- LXC 103 on Hikurangi (10.10.0.105)
- systemd: capture-creature.service (port 3000)
- Domain: TBD (shreck.io)

## Git Workflow
- git add specific files
- git commit -m "feat: description"
- git push origin main
- Branch `phaser-2d-archive` preserves the full 2D Phaser version

## Coding Guidelines
- Keep it fun and accessible - this is Albie's project
- Prefer simple, readable code over clever abstractions
- Each file does one thing (world, player, controls)
- Build geometry from primitives so no assets to manage yet
- Test with `npm run dev` before committing

## Next Steps
- Add creatures wandering the world (Three.js groups, random patrol)
- Encounter detection (distance check -> battle scene)
- Rebuild battle system as a separate 3D scene
- Rebuild inventory / HUD using DOM overlays (simpler than 3D UI)
