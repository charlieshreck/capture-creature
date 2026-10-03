# Eonsmith - Claude Code Rules

## What this is
A 3D browser city-builder. You control a **builder avatar** who physically
constructs a settlement and grows it through the ages: village → medieval →
industrial → modern → robotic future. Endless sandbox with milestone goals and
a continuous tech tree (no fixed eras gating you — you choose what to research
and build next). Inspired by Civilization 7's "grow through time" premise.

Eonsmith now lives inside Capture Creature as a card on the Game Hub. It runs
on its own page (eonsmith.html at the project root) inside an iframe opened by
src/scenes/Eonsmith.js, so its CSS and key handlers stay sealed off from the
other games. Keep its code self-contained in src/eonsmith/.

## This LXC
- VMID 103 on Hikurangi. Container IP: 10.10.0.55
- Node.js 22, Three.js, Vite 6

## Services & ports
- Served by Capture Creature's server on **port 3000** at /eonsmith.html
- After code changes: `npm run build` from the project root (no restart needed)

## Tech
- Three.js (3D). Semi-realistic look comes from PBR materials + real Sky/sun +
  soft shadows + ACES tone mapping, NOT from heavy models. Geometry is simple
  primitives for now; swap in glTF models later without changing the systems.
- Vite for bundling, as a second page in the project's vite.config.js.
  Dev: `npm run dev`, then open http://localhost:3000/eonsmith.html

## Code map
- src/data.js     ALL game data: resources, buildings, tech tree, milestones.
                  Balance/content changes go HERE first.
- src/Economy.js  Resources, unlocks, production, milestones. No 3D code.
- src/Avatar.js   The builder character: movement, walk-to, facing.
- src/BuildSystem.js  Ghost placement, validity, construction animation.
- src/Game.js     Engine: renderer, sky/lights, ground, hybrid camera, input, loop.
- src/ui.js/.css  HUD: resource bar, build menu, toasts.

## Coding style
- Keep it simple and readable for a young developer.
- Centralize game data in src/data.js (like Capture Creature's data.js).
- Comment the "why" generously.

## Roadmap / not built yet
- Visitor avatars (NPCs) who wander in to give tips or sell rare materials.
- Saving/loading a settlement.
- glTF models replacing primitive placeholders.
- Day/night cycle.

## Do NOT
- Spread to multiple villages (single settlement by design, for now).
- Overcomplicate with advanced patterns or unneeeded packages.
