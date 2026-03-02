# Capture Creature - Browser Game

## Project Overview
A browser-based creature capture game built with Phaser.js. Players explore a procedural world, encounter wild creatures in tall grass, battle them turn-based style, and capture them with orbs.

## Tech Stack
- Game Engine: Phaser 3 (2D, browser-based)
- Build Tool: Vite 6
- Server: Express (serves built static files)
- Runtime: Node.js 22 LTS
- No external assets - all textures generated procedurally in Boot.js

## Project Structure
- index.html - Entry point
- src/main.js - Phaser game config, scene registration
- src/scenes/Boot.js - Asset loading, procedural texture generation
- src/scenes/World.js - Map exploration, movement, encounters
- src/scenes/Battle.js - Turn-based battle system
- src/scenes/Inventory.js - Creature collection viewer
- src/scenes/HUD.js - Overlay (zone name, orb count, controls)
- src/creatures/data.js - Creature database, moves, types, spawn logic
- server/index.js - Express production server
- dist/ - Built output (git-ignored)

## Development Commands
- npm run dev - Vite dev server with hot reload (port 3000)
- npm run build - Production build to dist/
- npm run serve - Serve production build

## Game Mechanics

### Zones and Difficulty
- Starter Town (Lv 1-3), Whispering Meadow (Lv 1-5), Darkwood Forest (Lv 3-8)
- Crystal Lake (Lv 5-12), Rocky Highlands (Lv 8-16)

### Creature Rarity
- Common (60% spawn), Uncommon (25%), Rare (10%), Legendary (5%)

### Battle System
- Turn-based, speed determines order
- Type effectiveness chart (9 types: fire, water, grass, electric, rock, wind, dark, light, ice)
- Damage formula uses attacker level, ATK, defender DEF, move power, type bonus

### Capture Formula
- Success = (1 - hpRatio * 0.6) * rarityModifier
- Rarity mods: common=1.0, uncommon=0.7, rare=0.4, legendary=0.15

## Hosting
- LXC 103 on Hikurangi (10.10.0.105)
- systemd: capture-creature.service (port 3000)
- Domain: TBD (shreck.io)

## Git Workflow
- git add specific files
- git commit -m "feat: description"
- git push origin main

## Coding Guidelines
- Keep it fun and accessible - this is Albie's project
- Prefer simple, readable code over clever abstractions
- All game data in data.js - easy to add new creatures/moves
- Procedural textures in Boot.js - no external asset dependencies yet
- Test changes with npm run dev before committing
