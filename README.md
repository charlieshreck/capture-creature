# Capture Creature

A browser-based creature capture game built with Phaser.js. Explore maps, encounter wild creatures in tall grass, battle them, and build your collection!

## Features

- **Explore** a procedurally generated world with 5 distinct zones
- **16 creatures** across 4 rarity tiers (Common, Uncommon, Rare, Legendary)
- **Turn-based battles** with type effectiveness and accuracy
- **Capture system** — weaken creatures then throw orbs to catch them
- **Leveling** — earn XP from battles, creatures grow stronger
- **9 elemental types** with a full effectiveness chart

## Zones

| Zone | Level Range | Biome |
|------|------------|-------|
| Starter Town | 1-3 | Safe hub, paths and houses |
| Whispering Meadow | 1-5 | Dense tall grass, easy encounters |
| Darkwood Forest | 3-8 | Trees and shadows, moderate difficulty |
| Crystal Lake | 5-12 | Water and shores, tougher creatures |
| Rocky Highlands | 8-16 | Mountains and rocks, hardest zone |

## Controls

- **WASD / Arrow keys** — Move
- **I** — Open inventory / creature collection
- **Mouse** — Battle actions (Fight, Capture, Run)

## Development

```bash
npm install
npm run dev       # Start dev server (hot reload)
npm run build     # Build for production
npm run serve     # Serve production build
```

## Tech Stack

- [Phaser 3](https://phaser.io) — Game engine
- [Vite](https://vitejs.dev) — Build tool
- Express — Production server
- All assets procedurally generated (no external sprites needed)
