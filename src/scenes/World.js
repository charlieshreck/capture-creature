import Phaser from 'phaser';
import { spawnRandomCreature } from '../creatures/data.js';

// Tile types
const GRASS = 0;
const TALL_GRASS = 1;
const PATH = 2;
const WATER = 3;
const TREE = 4;
const WALL = 5;
const HOUSE = 6;

const TILE_SIZE = 16;
const MAP_W = 60;
const MAP_H = 60;

const TILE_KEYS = ['grass', 'tallgrass', 'path', 'water', 'tree', 'wall', 'house'];
const SOLID_TILES = new Set([WATER, TREE, WALL, HOUSE]);

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    // Initialize player state if not yet set
    if (!this.registry.get('playerData')) {
      this.registry.set('playerData', {
        creatures: [],
        orbs: 5,
        gold: 0,
      });
    }

    this.mapData = this.generateMap();
    this.drawMap();

    // Place player at the town center
    const startX = 30 * TILE_SIZE + 8;
    const startY = 30 * TILE_SIZE + 8;
    this.player = this.physics.add.sprite(startX, startY, 'player');
    this.player.setDepth(10);
    this.player.body.setSize(12, 12);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    this.cameras.main.setZoom(3);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.input.keyboard.on('keydown-I', () => {
      this.scene.launch('Inventory');
      this.scene.pause();
    });

    // Creature encounter tracking
    this.stepCounter = 0;
    this.lastTileX = -1;
    this.lastTileY = -1;

    // Launch HUD
    this.scene.launch('HUD');

    // Zone label
    this.currentZone = '';
  }

  generateMap() {
    const map = Array.from({ length: MAP_H }, () =>
      Array.from({ length: MAP_W }, () => GRASS)
    );

    // Town area (center) — paths and houses
    for (let y = 27; y < 34; y++) {
      for (let x = 27; x < 34; x++) {
        map[y][x] = PATH;
      }
    }
    // Houses around town square
    const houses = [[28, 28], [28, 32], [32, 28], [32, 32], [30, 27]];
    houses.forEach(([y, x]) => { map[y][x] = HOUSE; });

    // Main roads extending from town
    for (let i = 0; i < MAP_W; i++) {
      map[30][i] = PATH; // horizontal road
      map[i] ?  (map[i][30] = PATH) : null; // vertical road
    }

    // Forest (top-left quadrant)
    for (let y = 2; y < 22; y++) {
      for (let x = 2; x < 22; x++) {
        const r = Math.random();
        if (r < 0.35) map[y][x] = TREE;
        else if (r < 0.65) map[y][x] = TALL_GRASS;
      }
    }

    // Lake (top-right)
    for (let y = 5; y < 18; y++) {
      for (let x = 40; x < 55; x++) {
        const dx = x - 47.5, dy = y - 11.5;
        if (dx * dx / 56 + dy * dy / 36 < 1) {
          map[y][x] = WATER;
        }
      }
    }
    // Tall grass around lake
    for (let y = 3; y < 20; y++) {
      for (let x = 36; x < 58; x++) {
        if (map[y][x] === GRASS && Math.random() < 0.3) {
          map[y][x] = TALL_GRASS;
        }
      }
    }

    // Rocky mountains (bottom-right)
    for (let y = 40; y < 56; y++) {
      for (let x = 40; x < 56; x++) {
        const r = Math.random();
        if (r < 0.3) map[y][x] = WALL;
        else if (r < 0.5) map[y][x] = TALL_GRASS;
      }
    }

    // Meadow (bottom-left) — lots of tall grass
    for (let y = 40; y < 56; y++) {
      for (let x = 4; x < 24; x++) {
        if (Math.random() < 0.55) map[y][x] = TALL_GRASS;
      }
    }

    // Border walls
    for (let i = 0; i < MAP_W; i++) {
      map[0][i] = WALL;
      map[MAP_H - 1][i] = WALL;
    }
    for (let i = 0; i < MAP_H; i++) {
      map[i][0] = WALL;
      map[i][MAP_W - 1] = WALL;
    }

    // Ensure roads stay clear
    for (let i = 1; i < MAP_W - 1; i++) {
      map[30][i] = PATH;
      if (map[i]) map[i][30] = PATH;
    }

    return map;
  }

  drawMap() {
    this.tileSprites = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = this.mapData[y][x];
        const sprite = this.add.image(
          x * TILE_SIZE + 8,
          y * TILE_SIZE + 8,
          TILE_KEYS[tile]
        );
        this.tileSprites.push(sprite);
      }
    }
  }

  getZoneName(tx, ty) {
    if (tx >= 27 && tx <= 33 && ty >= 27 && ty <= 33) return 'Starter Town';
    if (tx < 24 && ty < 24) return 'Darkwood Forest';
    if (tx >= 36 && ty < 22) return 'Crystal Lake';
    if (tx >= 38 && ty >= 38) return 'Rocky Highlands';
    if (tx < 26 && ty >= 38) return 'Whispering Meadow';
    return 'Wild Path';
  }

  getZoneLevels(zone) {
    switch (zone) {
      case 'Starter Town':      return [1, 3];
      case 'Whispering Meadow': return [1, 5];
      case 'Darkwood Forest':   return [3, 8];
      case 'Crystal Lake':      return [5, 12];
      case 'Rocky Highlands':   return [8, 16];
      default:                  return [2, 6];
    }
  }

  update() {
    const speed = 80;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    // Check collision before moving
    const nextX = this.player.x + vx * (1 / 60);
    const nextY = this.player.y + vy * (1 / 60);
    const tileX = Math.floor(nextX / TILE_SIZE);
    const tileY = Math.floor(nextY / TILE_SIZE);

    if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
      if (SOLID_TILES.has(this.mapData[tileY][tileX])) {
        vx = 0;
        vy = 0;
      }
    }

    this.player.setVelocity(vx, vy);

    // Track tile changes for encounters
    const curTileX = Math.floor(this.player.x / TILE_SIZE);
    const curTileY = Math.floor(this.player.y / TILE_SIZE);

    if (curTileX !== this.lastTileX || curTileY !== this.lastTileY) {
      this.lastTileX = curTileX;
      this.lastTileY = curTileY;

      // Update zone
      const zone = this.getZoneName(curTileX, curTileY);
      if (zone !== this.currentZone) {
        this.currentZone = zone;
        this.events.emit('zone-change', zone);
      }

      // Check for encounter in tall grass
      if (
        curTileY >= 0 && curTileY < MAP_H &&
        curTileX >= 0 && curTileX < MAP_W &&
        this.mapData[curTileY][curTileX] === TALL_GRASS
      ) {
        this.stepCounter++;
        // ~15% chance per tile of tall grass
        if (this.stepCounter > 3 && Math.random() < 0.15) {
          this.stepCounter = 0;
          this.triggerEncounter(zone);
        }
      }
    }
  }

  triggerEncounter(zone) {
    const [minLvl, maxLvl] = this.getZoneLevels(zone);
    const wildCreature = spawnRandomCreature(minLvl, maxLvl);

    // Flash effect
    this.cameras.main.flash(300, 255, 255, 255);

    this.time.delayedCall(300, () => {
      this.player.setVelocity(0, 0);
      this.scene.pause();
      this.scene.launch('Battle', {
        wildCreature,
        zone,
        returnScene: 'World',
      });
    });
  }
}
