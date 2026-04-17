import Phaser from 'phaser';
import { spawnRandomCreature, RARITY_COLORS, CREATURES, createCreatureInstance } from '../creatures/data.js';

// Tile types
const GRASS = 0;
const TALL_GRASS = 1;
const PATH = 2;
const WATER = 3;
const TREE = 4;
const WALL = 5;
const HOUSE = 6;
const RECHARGE = 7;
const ORB_REFILL = 8;

const TILE_SIZE = 16;
const MAP_W = 120;
const MAP_H = 120;

const TILE_KEYS = ['grass', 'tallgrass', 'path', 'water', 'tree', 'wall', 'house', 'recharge', 'orbrefill'];
const SOLID_TILES = new Set([WATER, TREE, WALL, HOUSE]);

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    // Load saved data from server (set by Login scene) or start fresh
    this.username = this.registry.get('username') || 'guest';
    if (!this.registry.get('playerData')) {
      const serverData = this.registry.get('serverGameData');
      if (serverData && serverData.creatures && serverData.creatures.length > 0) {
        this.registry.set('playerData', serverData);
      } else {
        // New account — start fresh with a random common
        const commons = CREATURES.filter(c => c.rarity === 'common');
        const starter = createCreatureInstance(commons[Math.floor(Math.random() * commons.length)], 3);
        this.registry.set('playerData', { creatures: [starter], orbs: 5, gold: 0 });
        this.saveToServer();
      }
    }

    this.mapData = this.generateMap();
    this.drawMap();

    // Place player at the town center
    const startX = 60 * TILE_SIZE + 8;
    const startY = 60 * TILE_SIZE + 8;
    const av = this.registry.get('avatar') || { outfit: 0, hat: 0 };
    const avatarKey = `avatar_${av.outfit}_${av.hat}`;
    this.player = this.physics.add.sprite(startX, startY, avatarKey);
    this.player.setDepth(10);
    this.player.body.setSize(12, 12);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    this.cameras.main.setZoom(5);

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
    this.input.keyboard.on('keydown-X', () => {
      this.toggleMap();
    });
    this.input.keyboard.on('keydown-J', () => {
      const admins = ['albie'];
      if (admins.includes(this.username.toLowerCase())) {
        this.scene.launch('AdminPanel');
        this.scene.pause();
      }
    });
    this.mapOpen = false;

    // Tile tracking
    this.lastTileX = -1;
    this.lastTileY = -1;

    // Station cooldowns
    this.rechargeReady = true;
    this.orbRefillReady = true;

    // Spawn wild creatures on the map
    this.wildCreatures = this.physics.add.group();
    this.spawnWildCreatures();

    // Overlap detection for wild creatures — walk into them to battle
    this.physics.add.overlap(this.player, this.wildCreatures, (player, creatureSprite) => {
      this.touchCreature(creatureSprite);
    });

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
    for (let y = 55; y < 66; y++) {
      for (let x = 55; x < 66; x++) {
        map[y][x] = PATH;
      }
    }
    // Houses around town square
    const houses = [
      [56, 56], [56, 60], [56, 64],
      [60, 55], [60, 65],
      [64, 56], [64, 60], [64, 64],
    ];
    houses.forEach(([y, x]) => { map[y][x] = HOUSE; });

    // Main roads extending from town
    for (let i = 0; i < MAP_W; i++) {
      map[60][i] = PATH; // horizontal road
      map[i][60] = PATH; // vertical road
    }
    // Secondary roads
    for (let i = 0; i < MAP_W; i++) {
      map[30][i] = PATH;
      map[90][i] = PATH;
    }
    for (let i = 0; i < MAP_H; i++) {
      map[i][30] = PATH;
      map[i][90] = PATH;
    }

    // === ZONE 1: Darkwood Forest (top-left) ===
    for (let y = 2; y < 50; y++) {
      for (let x = 2; x < 50; x++) {
        if (map[y][x] !== PATH) {
          const r = Math.random();
          if (r < 0.30) map[y][x] = TREE;
          else if (r < 0.55) map[y][x] = TALL_GRASS;
        }
      }
    }

    // === ZONE 2: Crystal Lake (top-right) ===
    // Big lake
    for (let y = 10; y < 40; y++) {
      for (let x = 75; x < 110; x++) {
        const dx = x - 92, dy = y - 25;
        if (dx * dx / 200 + dy * dy / 150 < 1) {
          map[y][x] = WATER;
        }
      }
    }
    // Tall grass around lake
    for (let y = 5; y < 50; y++) {
      for (let x = 65; x < 118; x++) {
        if (map[y][x] === GRASS && Math.random() < 0.3) {
          map[y][x] = TALL_GRASS;
        }
      }
    }

    // === ZONE 3: Whispering Meadow (bottom-left) ===
    for (let y = 70; y < 115; y++) {
      for (let x = 4; x < 50; x++) {
        if (map[y][x] === GRASS && Math.random() < 0.5) {
          map[y][x] = TALL_GRASS;
        }
      }
    }

    // === ZONE 4: Rocky Highlands (bottom-right) ===
    for (let y = 70; y < 115; y++) {
      for (let x = 70; x < 115; x++) {
        if (map[y][x] !== PATH) {
          const r = Math.random();
          if (r < 0.25) map[y][x] = WALL;
          else if (r < 0.45) map[y][x] = TALL_GRASS;
        }
      }
    }

    // === ZONE 5: Frozen Wastes (top-center) ===
    for (let y = 2; y < 25; y++) {
      for (let x = 45; x < 75; x++) {
        if (map[y][x] === GRASS && Math.random() < 0.35) {
          map[y][x] = TALL_GRASS;
        }
      }
    }
    // Frozen ponds
    for (let y = 6; y < 16; y++) {
      for (let x = 50; x < 65; x++) {
        const dx = x - 57, dy = y - 11;
        if (dx * dx / 40 + dy * dy / 20 < 1) {
          map[y][x] = WATER;
        }
      }
    }

    // === ZONE 6: Shadow Marsh (bottom-center) ===
    for (let y = 95; y < 115; y++) {
      for (let x = 45; x < 75; x++) {
        if (map[y][x] !== PATH) {
          const r = Math.random();
          if (r < 0.15) map[y][x] = WATER;
          else if (r < 0.5) map[y][x] = TALL_GRASS;
          else if (r < 0.6) map[y][x] = TREE;
        }
      }
    }

    // === ZONE 7: Sunlit Peaks (center-right) ===
    for (let y = 45; y < 75; y++) {
      for (let x = 95; x < 115; x++) {
        if (map[y][x] !== PATH) {
          const r = Math.random();
          if (r < 0.2) map[y][x] = WALL;
          else if (r < 0.4) map[y][x] = TALL_GRASS;
        }
      }
    }

    // === ZONE 8: Ancient Grove (center-left) ===
    for (let y = 45; y < 75; y++) {
      for (let x = 4; x < 25; x++) {
        if (map[y][x] !== PATH) {
          const r = Math.random();
          if (r < 0.4) map[y][x] = TREE;
          else if (r < 0.6) map[y][x] = TALL_GRASS;
        }
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
      map[60][i] = PATH;
      map[i][60] = PATH;
      map[30][i] = PATH;
      map[90][i] = PATH;
      map[i][30] = PATH;
      map[i][90] = PATH;
    }

    // Recharge stations — one per zone (heals creatures)
    map[59][60] = RECHARGE;  // Starter Town
    map[85][20] = RECHARGE;  // Whispering Meadow
    map[20][20] = RECHARGE;  // Darkwood Forest
    map[8][70] = RECHARGE;   // Crystal Lake (on grass, west of lake)
    map[85][95] = RECHARGE;  // Rocky Highlands
    map[10][60] = RECHARGE;  // Frozen Wastes
    map[97][60] = RECHARGE;  // Shadow Marsh (on road)
    map[60][105] = RECHARGE; // Sunlit Peaks
    map[60][15] = RECHARGE;  // Ancient Grove

    // Orb refill stations — spread apart from recharge pads
    map[59][62] = ORB_REFILL;  // Starter Town
    map[80][15] = ORB_REFILL;  // Whispering Meadow
    map[15][25] = ORB_REFILL;  // Darkwood Forest
    map[45][110] = ORB_REFILL; // Crystal Lake (on grass, south of lake)
    map[80][100] = ORB_REFILL; // Rocky Highlands
    map[15][55] = ORB_REFILL;  // Frozen Wastes
    map[97][55] = ORB_REFILL;  // Shadow Marsh (near road)
    map[55][110] = ORB_REFILL; // Sunlit Peaks
    map[55][10] = ORB_REFILL;  // Ancient Grove

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
    if (tx >= 54 && tx <= 66 && ty >= 54 && ty <= 66) return 'Starter Town';
    if (tx < 50 && ty < 50) return 'Darkwood Forest';
    if (tx >= 65 && ty < 50) return 'Crystal Lake';
    if (tx >= 70 && ty >= 70) return 'Rocky Highlands';
    if (tx < 50 && ty >= 70) return 'Whispering Meadow';
    if (tx >= 45 && tx <= 75 && ty < 25) return 'Frozen Wastes';
    if (tx >= 45 && tx <= 75 && ty >= 95) return 'Shadow Marsh';
    if (tx >= 95 && ty >= 45 && ty <= 75) return 'Sunlit Peaks';
    if (tx < 25 && ty >= 45 && ty <= 75) return 'Ancient Grove';
    return 'Wild Path';
  }

  update() {
    // Freeze movement while map is open
    if (this.mapOpen) {
      this.player.setVelocity(0, 0);
      return;
    }

    const speed = 80;
    let vx = 0, vy = 0;

    const touchDir = this.registry.get('touchDir') || { x: 0, y: 0 };
    if (this.cursors.left.isDown || this.wasd.left.isDown || touchDir.x < 0) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown || touchDir.x > 0) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown || touchDir.y < 0) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown || touchDir.y > 0) vy = speed;

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

      // Check for recharge station
      if (
        curTileY >= 0 && curTileY < MAP_H &&
        curTileX >= 0 && curTileX < MAP_W &&
        this.mapData[curTileY][curTileX] === RECHARGE
      ) {
        this.useRechargeStation();
      }

      // Check for orb refill station
      if (
        curTileY >= 0 && curTileY < MAP_H &&
        curTileX >= 0 && curTileX < MAP_W &&
        this.mapData[curTileY][curTileX] === ORB_REFILL
      ) {
        this.useOrbRefill();
      }
    }

    // Update name tags to follow creatures
    this.wildCreatures.children.iterate(sprite => {
      if (!sprite || !sprite.active) return;
      const tag = sprite.getData('tag');
      if (tag) { tag.x = sprite.x; tag.y = sprite.y - 10; }
    });
  }

  useRechargeStation() {
    if (!this.rechargeReady) return;

    const playerData = this.registry.get('playerData');
    if (playerData.creatures.length === 0) return;

    // Check if any creature needs healing
    const needsHeal = playerData.creatures.some(c => c.hp < c.maxHp);
    if (!needsHeal) return;

    // Heal all creatures
    playerData.creatures.forEach(c => { c.hp = c.maxHp; });
    this.registry.set('playerData', playerData);

    // Green flash effect
    this.cameras.main.flash(400, 100, 255, 100);

    // Show message
    this.showPopup('All creatures recharged!', 0x00e676);

    // Cooldown
    this.rechargeReady = false;
    this.time.delayedCall(3000, () => { this.rechargeReady = true; });
  }

  useOrbRefill() {
    if (!this.orbRefillReady) return;

    const playerData = this.registry.get('playerData');
    if (playerData.orbs >= 5) return;

    playerData.orbs = 5;
    this.registry.set('playerData', playerData);
    this.saveGame();

    // Red flash effect
    this.cameras.main.flash(400, 255, 100, 100);

    this.showPopup('Orbs restored to 5!', 0xf44336);

    this.orbRefillReady = false;
    this.time.delayedCall(3000, () => { this.orbRefillReady = true; });
  }

  spawnWildCreatures() {
    // Define spawn zones with their tile bounds and level ranges
    const zones = [
      { name: 'Whispering Meadow', x1: 6,  y1: 72,  x2: 48,  y2: 112, min: 1, max: 5,  count: 25 },
      { name: 'Darkwood Forest',   x1: 6,  y1: 6,   x2: 48,  y2: 48,  min: 3, max: 8,  count: 25 },
      { name: 'Crystal Lake',      x1: 67, y1: 6,   x2: 112, y2: 48,  min: 5, max: 12, count: 25 },
      { name: 'Rocky Highlands',   x1: 72, y1: 72,  x2: 112, y2: 112, min: 8, max: 16, count: 25 },
      { name: 'Frozen Wastes',     x1: 47, y1: 6,   x2: 73,  y2: 25,  min: 6, max: 14, count: 18 },
      { name: 'Shadow Marsh',      x1: 47, y1: 95,  x2: 73,  y2: 112, min: 10, max: 18, count: 18 },
      { name: 'Sunlit Peaks',      x1: 95, y1: 47,  x2: 112, y2: 73,  min: 12, max: 20, count: 18 },
      { name: 'Ancient Grove',     x1: 6,  y1: 47,  x2: 25,  y2: 73,  min: 7, max: 15, count: 18 },
      { name: 'Wild Path',         x1: 52, y1: 52,  x2: 68,  y2: 68,  min: 2, max: 6,  count: 12 },
    ];

    zones.forEach(zone => {
      // Find walkable tiles in this zone
      const spots = [];
      for (let y = zone.y1; y < zone.y2; y++) {
        for (let x = zone.x1; x < zone.x2; x++) {
          const tile = this.mapData[y][x];
          if (tile === GRASS || tile === TALL_GRASS) {
            spots.push({ x, y });
          }
        }
      }
      if (spots.length === 0) return;

      for (let i = 0; i < zone.count && spots.length > 0; i++) {
        const idx = Math.floor(Math.random() * spots.length);
        const pos = spots.splice(idx, 1)[0];

        const creature = spawnRandomCreature(zone.min, zone.max);
        const sprite = this.physics.add.sprite(
          pos.x * TILE_SIZE + 8,
          pos.y * TILE_SIZE + 8,
          `creature_${creature.id}`
        );
        sprite.setDepth(8);
        sprite.body.setSize(12, 12);
        sprite.body.setImmovable(true);
        sprite.setData('creature', creature);
        sprite.setData('zone', zone.name);

        // Name tag above creature
        const rarityColor = '#' + (RARITY_COLORS[creature.rarity] || 0xaaaaaa).toString(16).padStart(6, '0');
        const tag = this.add.text(sprite.x, sprite.y - 10,
          `${creature.name} [${creature.rarity}]`, {
          fontFamily: 'Arial, sans-serif', fontSize: '4px', color: rarityColor,
          align: 'center', backgroundColor: '#000000bb', padding: { x: 2, y: 1 },
          resolution: 3,
        }).setOrigin(0.5, 1).setDepth(9);
        sprite.setData('tag', tag);

        this.wildCreatures.add(sprite);

        // Start wandering behavior
        this.startWandering(sprite);
      }
    });
  }

  startWandering(sprite) {
    // Pick a random direction and walk for a bit, then pause
    const wander = () => {
      if (!sprite.active) return;

      const directions = [
        { vx: 0, vy: -20 },  // up
        { vx: 0, vy: 20 },   // down
        { vx: -20, vy: 0 },  // left
        { vx: 20, vy: 0 },   // right
        { vx: 0, vy: 0 },    // idle
        { vx: 0, vy: 0 },    // idle (more likely to pause)
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];

      // If creature is currently on a solid tile (e.g. drifted into water), push it back
      const curTX = Math.floor(sprite.x / TILE_SIZE);
      const curTY = Math.floor(sprite.y / TILE_SIZE);
      if (SOLID_TILES.has(this.mapData[curTY]?.[curTX])) {
        sprite.body.setVelocity(-dir.vx || 20, -dir.vy || 20);
        this.time.delayedCall(500, wander);
        return;
      }

      // Check if the creature would walk into a solid tile or near the boundary
      const nextTX = Math.floor((sprite.x + dir.vx * 1.5) / TILE_SIZE);
      const nextTY = Math.floor((sprite.y + dir.vy * 1.5) / TILE_SIZE);
      const BORDER_MARGIN = 4;
      if (nextTX >= BORDER_MARGIN && nextTX < MAP_W - BORDER_MARGIN &&
          nextTY >= BORDER_MARGIN && nextTY < MAP_H - BORDER_MARGIN &&
          !SOLID_TILES.has(this.mapData[nextTY]?.[nextTX])) {
        sprite.body.setVelocity(dir.vx, dir.vy);
      } else {
        sprite.body.setVelocity(0, 0);
      }

      // Change direction again after 1-3 seconds
      this.time.delayedCall(1000 + Math.random() * 2000, wander);
    };

    // Stagger start times so they don't all move at once
    this.time.delayedCall(Math.random() * 2000, wander);
  }

  touchCreature(creatureSprite) {
    if (!creatureSprite.active) return;

    const creature = creatureSprite.getData('creature');
    const zone = creatureSprite.getData('zone');

    // Check for a nearby creature that could help in battle
    let helperCreature = null;
    const HELPER_RANGE = 80; // ~5 tiles
    const children = this.wildCreatures.getChildren();
    let closestDist = HELPER_RANGE;
    let closestSprite = null;
    for (const other of children) {
      if (!other.active || other === creatureSprite) continue;
      const dist = Phaser.Math.Distance.Between(creatureSprite.x, creatureSprite.y, other.x, other.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestSprite = other;
      }
    }
    if (closestSprite) {
      helperCreature = closestSprite.getData('creature');
      const helperTag = closestSprite.getData('tag');
      if (helperTag) helperTag.destroy();
      closestSprite.destroy();
    }

    // Remove name tags and sprite from the map
    const tag = creatureSprite.getData('tag');
    if (tag) tag.destroy();
    creatureSprite.destroy();

    // Flash and start battle
    this.cameras.main.flash(300, 255, 255, 255);

    this.time.delayedCall(300, () => {
      this.player.setVelocity(0, 0);
      this.scene.pause();
      this.scene.launch('Battle', {
        wildCreature: creature,
        helperCreature,
        zone,
        returnScene: 'World',
      });
    });
  }

  saveGame() {
    this.saveToServer();
  }

  saveToServer() {
    const playerData = this.registry.get('playerData');
    const username = this.registry.get('username');
    if (playerData && username) {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gameData: playerData }),
      }).catch(() => {});
    }
  }

  showPopup(text, color) {
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const popup = this.add.text(cam.width / zoom / 2, cam.height / zoom - 20, text, {
      fontSize: '4px', color: Phaser.Display.Color.IntegerToColor(color).rgba,
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: popup,
      alpha: 0,
      y: popup.y - 15,
      duration: 2000,
      onComplete: () => popup.destroy(),
    });
  }

  toggleMap() {
    if (this.mapOpen) {
      this.closeMap();
    } else {
      this.openMap();
    }
  }

  openMap() {
    this.mapOpen = true;
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    this.mapContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(500);

    // Dark background
    this.mapContainer.add(this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a, 1).setScrollFactor(0));

    // Fit entire 120x120 map into screen with padding for labels
    const padding = 40;
    const mapSize = Math.min(w, h) - padding * 2;
    const scale = mapSize / MAP_W;
    const ox = (w - mapSize) / 2;
    const oy = padding;

    // Draw all tiles
    const gfx = this.add.graphics().setScrollFactor(0);
    const tileColors = {
      [GRASS]: 0x4caf50,
      [TALL_GRASS]: 0x2e7d32,
      [PATH]: 0xd7ccc8,
      [WATER]: 0x1565c0,
      [TREE]: 0x1b5e20,
      [WALL]: 0x616161,
      [HOUSE]: 0xef5350,
      [RECHARGE]: 0x00e676,
      [ORB_REFILL]: 0xf44336,
    };
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = this.mapData[y][x];
        gfx.fillStyle(tileColors[tile] || 0x333333, 1);
        gfx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    this.mapContainer.add(gfx);

    // Heal pad markers — bright green with black outline so they pop
    const markerGfx = this.add.graphics().setScrollFactor(0);
    const rechargePositions = [
      [60, 59], [20, 85], [20, 20], [70, 8], [95, 85], [60, 10], [60, 97], [105, 60], [15, 60],
    ];
    rechargePositions.forEach(([px, py]) => {
      const mx = ox + px * scale + scale / 2;
      const my = oy + py * scale + scale / 2;
      markerGfx.fillStyle(0x000000); markerGfx.fillCircle(mx, my, 7);
      markerGfx.fillStyle(0x00ff00); markerGfx.fillCircle(mx, my, 5);
      markerGfx.fillStyle(0xffffff); markerGfx.fillCircle(mx, my, 2);
    });

    // Orb pad markers — bright red with black outline
    const orbPositions = [
      [62, 59], [15, 80], [25, 15], [110, 45], [100, 80], [55, 15], [55, 97], [110, 55], [10, 55],
    ];
    orbPositions.forEach(([px, py]) => {
      const mx = ox + px * scale + scale / 2;
      const my = oy + py * scale + scale / 2;
      markerGfx.fillStyle(0x000000); markerGfx.fillCircle(mx, my, 7);
      markerGfx.fillStyle(0xff0000); markerGfx.fillCircle(mx, my, 5);
      markerGfx.fillStyle(0xffffff); markerGfx.fillCircle(mx, my, 2);
    });

    // Player marker — bright blue, biggest dot
    const playerTX = Math.floor(this.player.x / TILE_SIZE);
    const playerTY = Math.floor(this.player.y / TILE_SIZE);
    const pmx = ox + playerTX * scale + scale / 2;
    const pmy = oy + playerTY * scale + scale / 2;
    markerGfx.fillStyle(0x000000); markerGfx.fillCircle(pmx, pmy, 9);
    markerGfx.fillStyle(0x2196f3); markerGfx.fillCircle(pmx, pmy, 7);
    markerGfx.fillStyle(0xffffff); markerGfx.fillCircle(pmx, pmy, 3);

    this.mapContainer.add(markerGfx);

    // Zone labels
    const zones = [
      { name: 'Starter Town', x: 60, y: 60 },
      { name: 'Darkwood Forest', x: 25, y: 25 },
      { name: 'Crystal Lake', x: 90, y: 25 },
      { name: 'Whispering Meadow', x: 25, y: 90 },
      { name: 'Rocky Highlands', x: 90, y: 90 },
      { name: 'Frozen Wastes', x: 60, y: 12 },
      { name: 'Shadow Marsh', x: 60, y: 105 },
      { name: 'Sunlit Peaks', x: 105, y: 60 },
      { name: 'Ancient Grove', x: 15, y: 60 },
    ];
    zones.forEach(z => {
      this.mapContainer.add(this.add.text(
        ox + z.x * scale, oy + z.y * scale, z.name, {
          fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
          backgroundColor: '#000000cc', padding: { x: 3, y: 1 },
        }).setOrigin(0.5).setScrollFactor(0));
    });

    // Title
    this.mapContainer.add(this.add.text(w / 2, 12, 'WORLD MAP', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0));

    // Legend
    const legendY = oy + mapSize + 12;
    const legendBg = this.add.rectangle(w / 2, legendY, 280, 20, 0x000000, 0.8).setScrollFactor(0);
    this.mapContainer.add(legendBg);
    [
      { color: 0x2196f3, label: 'You' },
      { color: 0x00ff00, label: 'Heal Pad' },
      { color: 0xff0000, label: 'Orb Pad' },
    ].forEach((item, i) => {
      const lx = w / 2 - 100 + i * 80;
      this.mapContainer.add(this.add.circle(lx, legendY, 4, item.color)
        .setStrokeStyle(1, 0xffffff).setScrollFactor(0));
      this.mapContainer.add(this.add.text(lx + 7, legendY, item.label, {
        fontSize: '8px', color: '#cccccc',
      }).setOrigin(0, 0.5).setScrollFactor(0));
    });

    // Close hint
    this.mapContainer.add(this.add.text(w / 2, legendY + 14, 'Press X or tap ✕ to close', {
      fontSize: '8px', color: '#666666',
    }).setOrigin(0.5).setScrollFactor(0));

    // Close button (touch-friendly)
    const closeBtn = this.add.text(w - 15, 10, '✕', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true }).setDepth(501);
    closeBtn.on('pointerdown', () => this.closeMap());
    this.mapContainer.add(closeBtn);
  }

  closeMap() {
    this.mapOpen = false;
    if (this.mapContainer) {
      this.mapContainer.destroy();
      this.mapContainer = null;
    }
  }

}
