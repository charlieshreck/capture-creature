import Phaser from 'phaser';
import { TILE, BLOCK, BLOCK_HP, cartToIso, isoToCart, isoDepth, TILE_W, TILE_H } from '../iso/IsoUtils.js';
import { generateMap } from '../iso/MapData.js';
import { WEAPONS, DEFAULT_LOADOUT } from '../iso/Weapons.js';
import { Bot } from '../iso/Bot.js';
import { ShopOverlay } from '../iso/Shop.js';

export class SafeBlastScene extends Phaser.Scene {
  constructor() {
    super('SafeBlast');
  }

  init(data) {
    this.level = data.level || 1;
  }

  create() {
    this.gameOver = false;
    this.mapData = generateMap(this.level);
    const map = this.mapData;

    // Center the map on screen
    const cam = this.cameras.main;
    const mapCenter = cartToIso(map.width / 2, map.height / 2);
    this.mapOffsetX = cam.width / 2 - mapCenter.x;
    this.mapOffsetY = 100; // Leave room at top

    // Player state
    this.playerCartX = map.blueSpawn.x + 0.5;
    this.playerCartY = map.blueSpawn.y + 0.5;
    this.playerHp = 100;
    this.playerMaxHp = 100;
    this.playerAlive = true;
    this.playerSpeed = 120;
    this.attackCooldown = 0;
    this.matchCoins = 0;
    this.activeSlot = 1;
    this.loadout = { ...DEFAULT_LOADOUT };
    this.blockInventory = { 10: 0, 11: 0, 12: 0, 13: 0 };
    this.placingBlocks = false;
    this.lastDirX = 1;
    this.lastDirY = 0;

    // Safe HP tracking
    this.safeHp = {};
    this.safeHp[`${map.blueSafe.x},${map.blueSafe.y}`] = BLOCK_HP[BLOCK.SAFE_BLUE];
    this.safeHp[`${map.redSafe.x},${map.redSafe.y}`] = BLOCK_HP[BLOCK.SAFE_RED];

    // Block HP tracking
    this.blockHpMap = {};
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const b = map.blocks[y][x];
        if (b !== BLOCK.NONE) {
          this.blockHpMap[`${x},${y}`] = BLOCK_HP[b] || 40;
        }
      }
    }

    // Render the isometric map
    this.groundSprites = {};
    this.blockSprites = {};
    this.renderMap();

    // Player sprite
    const avatar = this.registry.get('avatar') || { outfit: 0, hat: 0 };
    const avKey = `avatar3d_${avatar.outfit}_${avatar.hat}`;
    this.playerSprite = this.add.image(0, 0, avKey).setScale(0.7);
    this.playerNameTag = this.add.text(0, 0, this.registry.get('username') || 'Player', {
      fontSize: '8px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5);
    this.playerHpBarBg = this.add.rectangle(0, 0, 30, 4, 0x333333).setStrokeStyle(1, 0x111111);
    this.playerHpBar = this.add.rectangle(0, 0, 30, 4, 0x4caf50);

    // AI Bots
    this.bots = [];
    // Blue team bot (ally)
    const allyBot = new Bot(this, 'blue', Math.max(1, this.level - 3), map.blueSpawn.x, map.blueSpawn.y + 1);
    allyBot.createSprite(avKey);
    this.bots.push(allyBot);

    // Red team bots (enemies)
    const enemy1 = new Bot(this, 'red', this.level, map.redSpawn.x, map.redSpawn.y);
    enemy1.createSprite('sb_enemy');
    this.bots.push(enemy1);

    const enemy2 = new Bot(this, 'red', this.level, map.redSpawn.x, map.redSpawn.y - 1);
    enemy2.createSprite('sb_enemy');
    this.bots.push(enemy2);

    // Resource generators
    this.generators = map.generators.map(g => ({
      ...g,
      timer: g.interval,
      items: [],
      value: g.type === 'gold' ? 10 : g.type === 'silver' ? 5 : 1,
    }));
    this.coinItems = [];

    // Shop overlay
    this.shop = new ShopOverlay(this);

    // Camera setup
    const worldW = map.width * TILE_W;
    const worldH = map.height * TILE_H + 200;
    this.cameras.main.setBounds(
      this.mapOffsetX - worldW / 2 - 100,
      -100,
      worldW + 200,
      worldH + 200
    );

    // Input
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Number keys for weapon slots
    this.input.keyboard.on('keydown-ONE', () => this.switchSlot(1));
    this.input.keyboard.on('keydown-TWO', () => this.switchSlot(2));
    this.input.keyboard.on('keydown-THREE', () => this.switchSlot(3));
    this.input.keyboard.on('keydown-FOUR', () => this.switchSlot(4));
    this.input.keyboard.on('keydown-B', () => this.shop.toggle());
    this.input.keyboard.on('keydown-Q', () => this.toggleBlockPlace());

    // Click/tap to attack or mine
    this.input.on('pointerdown', (pointer) => {
      if (this.shop.visible) return;
      if (pointer.y > this.cameras.main.height - 60) return; // HUD area
      this.useWeapon(pointer);
    });

    // Touch joystick state
    this.touchDir = { x: 0, y: 0 };
    this.joystickActive = false;

    // Build HUD
    this.createHUD();

    // Level label
    this.add.text(this.cameras.main.width / 2, 8, `SAFE BLAST — ${map.name}`, {
      fontSize: '14px', color: '#ff6644', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Back button
    const backBtn = this.add.text(10, 8, '← BACK', {
      fontSize: '10px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.shop.destroy();
      this.scene.start('BrainrotHub');
    });
  }

  renderMap() {
    const map = this.mapData;
    const ox = this.mapOffsetX;
    const oy = this.mapOffsetY;

    // Ground tiles
    const tileTextures = {
      [TILE.GRASS]: 'iso_grass',
      [TILE.STONE]: 'iso_stone',
      [TILE.WOOD]: 'iso_wood',
      [TILE.SAND]: 'iso_sand',
      [TILE.WATER]: 'iso_water',
      [TILE.GENERATOR]: 'iso_generator',
      [TILE.GOLD_GEN]: 'iso_gold_gen',
    };

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.ground[y][x];
        if (tile === TILE.VOID) continue;

        const tex = tileTextures[tile];
        if (!tex) continue;

        const iso = cartToIso(x, y);
        const sprite = this.add.image(iso.x + ox, iso.y + oy, tex);
        sprite.setDepth(isoDepth(x, y, 0));
        this.groundSprites[`${x},${y}`] = sprite;
      }
    }

    // Block sprites (including safes)
    const blockTextures = {
      [BLOCK.WOOL]: 'iso_block_wool',
      [BLOCK.WOOD]: 'iso_block_wood',
      [BLOCK.STONE]: 'iso_block_stone',
      [BLOCK.OBSIDIAN]: 'iso_block_obsidian',
      [BLOCK.SAFE_BLUE]: 'iso_safe_blue',
      [BLOCK.SAFE_RED]: 'iso_safe_red',
    };

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const block = map.blocks[y][x];
        if (block === BLOCK.NONE) continue;

        const tex = blockTextures[block];
        if (!tex) continue;

        const iso = cartToIso(x, y);
        const sprite = this.add.image(iso.x + ox, iso.y + oy - 16, tex);
        sprite.setDepth(isoDepth(x, y, 0.3));
        this.blockSprites[`${x},${y}`] = sprite;
      }
    }
  }

  createHUD() {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Hotbar (bottom center)
    this.hotbarSlots = [];
    this.hotbarIcons = [];
    this.hotbarNumbers = [];
    const barY = h - 28;
    const barStartX = w / 2 - 78;

    for (let i = 1; i <= 4; i++) {
      const sx = barStartX + (i - 1) * 40;
      const bgTex = i === this.activeSlot ? 'hotbar_active' : 'hotbar_slot';
      const slot = this.add.image(sx, barY, bgTex).setScrollFactor(0).setDepth(100)
        .setInteractive({ useHandCursor: true });
      slot.on('pointerdown', () => this.switchSlot(i));
      this.hotbarSlots.push(slot);

      // Weapon icon
      const weaponId = this.loadout[i];
      if (weaponId && WEAPONS[weaponId]) {
        const icon = this.add.image(sx, barY, WEAPONS[weaponId].texture)
          .setScrollFactor(0).setDepth(101).setScale(1.5);
        this.hotbarIcons.push(icon);
      } else {
        this.hotbarIcons.push(null);
      }

      // Number label
      const num = this.add.text(sx - 14, barY - 14, `${i}`, {
        fontSize: '8px', color: '#888888',
      }).setScrollFactor(0).setDepth(101);
      this.hotbarNumbers.push(num);
    }

    // HP display (top left)
    this.hudHpText = this.add.text(10, 28, 'HP: 100', {
      fontSize: '11px', color: '#4caf50', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 4, y: 2 },
    }).setScrollFactor(0).setDepth(100);

    // Coins display (top right)
    this.hudCoinsText = this.add.text(w - 10, 28, 'Coins: 0', {
      fontSize: '11px', color: '#ffdd00', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 4, y: 2 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Shop button
    const shopBtn = this.add.text(w - 10, 50, 'SHOP [B]', {
      fontSize: '10px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100)
      .setInteractive({ useHandCursor: true });
    shopBtn.on('pointerdown', () => this.shop.toggle());

    // Block place button
    this.blockBtn = this.add.text(w - 10, 72, 'BLOCKS [Q]', {
      fontSize: '10px', color: '#66bb6a', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100)
      .setInteractive({ useHandCursor: true });
    this.blockBtn.on('pointerdown', () => this.toggleBlockPlace());

    // Touch joystick (bottom left)
    this.joystickBase = this.add.circle(70, h - 70, 40, 0x333333, 0.4)
      .setScrollFactor(0).setDepth(100);
    this.joystickNub = this.add.circle(70, h - 70, 16, 0x888888, 0.6)
      .setScrollFactor(0).setDepth(101);

    // Touch joystick input
    this.joystickBase.setInteractive();
    this.joystickBase.on('pointerdown', (pointer) => {
      this.joystickActive = true;
    });
    this.input.on('pointermove', (pointer) => {
      if (this.joystickActive && pointer.isDown) {
        const dx = pointer.x - 70;
        const dy = pointer.y - (h - 70);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 35;
        const clampDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        this.joystickNub.x = 70 + Math.cos(angle) * clampDist;
        this.joystickNub.y = (h - 70) + Math.sin(angle) * clampDist;
        if (dist > 5) {
          this.touchDir.x = dx / maxDist;
          this.touchDir.y = dy / maxDist;
        } else {
          this.touchDir.x = 0;
          this.touchDir.y = 0;
        }
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (this.joystickActive) {
        this.joystickActive = false;
        this.joystickNub.x = 70;
        this.joystickNub.y = h - 70;
        this.touchDir.x = 0;
        this.touchDir.y = 0;
      }
    });

    // Touch attack button (bottom right)
    const atkBtn = this.add.circle(w - 60, h - 70, 30, 0xc62828, 0.6)
      .setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    this.add.text(w - 60, h - 70, 'ATK', {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    atkBtn.on('pointerdown', () => {
      // Attack in facing direction
      this.useWeaponForward();
    });
  }

  switchSlot(slot) {
    this.activeSlot = slot;
    this.placingBlocks = false;
    this.updateHotbar();
  }

  updateHotbar() {
    for (let i = 0; i < 4; i++) {
      const tex = (i + 1) === this.activeSlot ? 'hotbar_active' : 'hotbar_slot';
      this.hotbarSlots[i].setTexture(tex);
    }
  }

  toggleBlockPlace() {
    this.placingBlocks = !this.placingBlocks;
    this.blockBtn.setColor(this.placingBlocks ? '#ffffff' : '#66bb6a');
    this.blockBtn.setBackgroundColor(this.placingBlocks ? '#2e7d32' : '#1a1a2e');
  }

  // Movement collision check
  canMoveTo(nx, ny) {
    const map = this.mapData;
    const tileX = Math.floor(nx);
    const tileY = Math.floor(ny);
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return false;
    const ground = map.ground[tileY][tileX];
    if (ground === TILE.VOID || ground === TILE.WATER) return false;
    const block = map.blocks[tileY][tileX];
    if (block !== BLOCK.NONE) return false;
    return true;
  }

  useWeapon(pointer) {
    if (this.gameOver || !this.playerAlive || this.attackCooldown > 0) return;

    const weaponId = this.loadout[this.activeSlot];
    if (!weaponId) return;
    const weapon = WEAPONS[weaponId];

    // Get click position in world coords
    const worldX = pointer.x + this.cameras.main.scrollX;
    const worldY = pointer.y + this.cameras.main.scrollY;

    // Convert to cartesian
    const isoX = worldX - this.mapOffsetX;
    const isoY = worldY - this.mapOffsetY;
    const cart = isoToCart(isoX, isoY);

    if (weapon.type === 'melee') {
      this.meleeAttack(weapon, cart.x, cart.y);
    } else if (weapon.type === 'tool') {
      this.mineAt(weapon, Math.floor(cart.x), Math.floor(cart.y));
    } else if (weapon.type === 'ranged') {
      this.rangedAttack(weapon, cart.x, cart.y);
    } else if (weapon.type === 'explosive') {
      this.placeTNT();
    }

    this.attackCooldown = weapon.cooldown;
  }

  useWeaponForward() {
    if (this.gameOver || !this.playerAlive || this.attackCooldown > 0) return;
    const weaponId = this.loadout[this.activeSlot];
    if (!weaponId) return;
    const weapon = WEAPONS[weaponId];

    // Attack forward (in the direction player last moved)
    const tx = this.playerCartX + (this.lastDirX || 1);
    const ty = this.playerCartY + (this.lastDirY || 0);

    if (weapon.type === 'melee') {
      this.meleeAttack(weapon, tx, ty);
    } else if (weapon.type === 'tool') {
      this.mineAt(weapon, Math.floor(tx), Math.floor(ty));
    }

    this.attackCooldown = weapon.cooldown;
  }

  meleeAttack(weapon, targetX, targetY) {
    // Damage all enemies within range
    const range = weapon.range;
    for (const bot of this.bots) {
      if (!bot.alive || bot.team === 'blue') continue;
      const dx = bot.cartX - this.playerCartX;
      const dy = bot.cartY - this.playerCartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        bot.takeDamage(weapon.damage, { cartX: this.playerCartX, cartY: this.playerCartY });
        this.showDamageNumber(bot.cartX, bot.cartY, weapon.damage);
      }
    }

    // Swing animation
    this.cameras.main.shake(60, 0.003);

    // Visual slash effect
    const iso = cartToIso(targetX, targetY);
    const slash = this.add.circle(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 16,
      12, 0xff4444, 0.6).setDepth(50);
    this.tweens.add({
      targets: slash, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
      onComplete: () => slash.destroy(),
    });
  }

  mineAt(weapon, tileX, tileY) {
    const map = this.mapData;
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return;

    // Check distance
    const dist = Math.abs(tileX + 0.5 - this.playerCartX) + Math.abs(tileY + 0.5 - this.playerCartY);
    if (dist > 2.5) return;

    const block = map.blocks[tileY][tileX];
    if (block === BLOCK.NONE) return;

    const key = `${tileX},${tileY}`;

    // Check if it's a safe
    if (block === BLOCK.SAFE_BLUE || block === BLOCK.SAFE_RED) {
      // Can only mine enemy safe
      if (block === BLOCK.SAFE_BLUE) return; // Don't mine own safe
      this.damageSafe({ x: tileX, y: tileY }, weapon.minePower || 10);
    } else {
      // Mine block
      if (!this.blockHpMap[key]) this.blockHpMap[key] = BLOCK_HP[block] || 40;
      this.blockHpMap[key] -= (weapon.minePower || 10);

      if (this.blockHpMap[key] <= 0) {
        // Block destroyed
        map.blocks[tileY][tileX] = BLOCK.NONE;
        if (this.blockSprites[key]) {
          this.blockSprites[key].destroy();
          delete this.blockSprites[key];
        }
        delete this.blockHpMap[key];
        // Particles
        this.spawnParticles(tileX, tileY, 0x888888);
      } else {
        // Show crack overlay
        if (this.blockSprites[key]) {
          const ratio = this.blockHpMap[key] / (BLOCK_HP[block] || 40);
          if (ratio < 0.25) {
            this.blockSprites[key].setTint(0xff4444);
          } else if (ratio < 0.5) {
            this.blockSprites[key].setTint(0xffaa00);
          }
        }
      }
    }

    // Mining sparks
    const iso = cartToIso(tileX, tileY);
    const spark = this.add.circle(
      iso.x + this.mapOffsetX + Phaser.Math.Between(-8, 8),
      iso.y + this.mapOffsetY - 16 + Phaser.Math.Between(-8, 8),
      2, 0xffdd00
    ).setDepth(50);
    this.tweens.add({
      targets: spark, alpha: 0, y: spark.y - 15, duration: 300,
      onComplete: () => spark.destroy(),
    });
  }

  rangedAttack(weapon, targetX, targetY) {
    // Fire arrow from player toward target
    const startIso = cartToIso(this.playerCartX, this.playerCartY);
    const endIso = cartToIso(targetX, targetY);

    const arrow = this.add.image(
      startIso.x + this.mapOffsetX,
      startIso.y + this.mapOffsetY - 20,
      'iso_arrow'
    ).setDepth(50).setScale(2);

    // Rotate arrow toward target
    const angle = Math.atan2(
      endIso.y - startIso.y,
      endIso.x - startIso.x
    );
    arrow.setRotation(angle);

    this.tweens.add({
      targets: arrow,
      x: endIso.x + this.mapOffsetX,
      y: endIso.y + this.mapOffsetY - 16,
      duration: 300,
      onComplete: () => {
        arrow.destroy();
        // Check hit
        for (const bot of this.bots) {
          if (!bot.alive || bot.team === 'blue') continue;
          const dx = bot.cartX - targetX;
          const dy = bot.cartY - targetY;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            bot.takeDamage(weapon.damage, { cartX: this.playerCartX, cartY: this.playerCartY });
            this.showDamageNumber(bot.cartX, bot.cartY, weapon.damage);
            break;
          }
        }
      },
    });
  }

  placeTNT() {
    const tileX = Math.floor(this.playerCartX);
    const tileY = Math.floor(this.playerCartY);
    const iso = cartToIso(tileX, tileY);

    const tnt = this.add.image(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 8, 'iso_tnt')
      .setScale(2).setDepth(isoDepth(tileX, tileY, 0.4));

    // Fuse timer text
    const fuseText = this.add.text(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 24, '3', {
      fontSize: '12px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    let countdown = 3;
    const fuseTimer = this.time.addEvent({
      delay: 1000, repeat: 2,
      callback: () => {
        countdown--;
        fuseText.setText(`${countdown}`);
        if (countdown <= 0) {
          // EXPLODE
          tnt.destroy();
          fuseText.destroy();
          this.explodeTNT(tileX, tileY);
        }
      },
    });
  }

  explodeTNT(cx, cy) {
    const radius = 2;
    this.cameras.main.shake(200, 0.01);

    // Destroy blocks in radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= this.mapData.width || ty >= this.mapData.height) continue;

        const block = this.mapData.blocks[ty][tx];
        if (block !== BLOCK.NONE && block !== BLOCK.SAFE_BLUE && block !== BLOCK.SAFE_RED) {
          this.mapData.blocks[ty][tx] = BLOCK.NONE;
          const key = `${tx},${ty}`;
          if (this.blockSprites[key]) {
            this.blockSprites[key].destroy();
            delete this.blockSprites[key];
          }
          delete this.blockHpMap[key];
        }

        // Damage safes
        if (block === BLOCK.SAFE_RED) {
          this.damageSafe({ x: tx, y: ty }, 50);
        }

        // Damage entities
        for (const bot of this.bots) {
          if (!bot.alive) continue;
          const bd = Math.abs(bot.cartX - tx) + Math.abs(bot.cartY - ty);
          if (bd < 1.5) {
            bot.takeDamage(50, null);
          }
        }
      }
    }

    // Explosion visual
    const iso = cartToIso(cx, cy);
    const boom = this.add.circle(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 8,
      8, 0xff4444, 0.8).setDepth(50);
    this.tweens.add({
      targets: boom, alpha: 0, scaleX: 8, scaleY: 8, duration: 400,
      onComplete: () => boom.destroy(),
    });

    this.spawnParticles(cx, cy, 0xff4444, 12);
  }

  damageSafe(pos, amount) {
    const key = `${pos.x},${pos.y}`;
    if (!this.safeHp[key]) return;

    this.safeHp[key] -= amount;

    // Visual feedback
    if (this.blockSprites[key]) {
      this.blockSprites[key].setTint(0xff4444);
      this.time.delayedCall(100, () => {
        if (this.blockSprites[key]) this.blockSprites[key].clearTint();
      });
    }

    if (this.safeHp[key] <= 0) {
      this.safeHp[key] = 0;
      // Safe destroyed!
      const map = this.mapData;
      map.blocks[pos.y][pos.x] = BLOCK.NONE;
      if (this.blockSprites[key]) {
        this.blockSprites[key].setTexture('iso_safe_broken');
      }
      this.spawnParticles(pos.x, pos.y, 0xffd700, 15);

      // Check win/lose
      const blueSafeKey = `${map.blueSafe.x},${map.blueSafe.y}`;
      const redSafeKey = `${map.redSafe.x},${map.redSafe.y}`;

      if (key === redSafeKey) {
        this.endGame(true, `You cracked the safe on ${map.name}!`);
      } else if (key === blueSafeKey) {
        this.endGame(false, 'Your safe was destroyed!');
      }
    }
  }

  isSafeAlive(team) {
    const map = this.mapData;
    const safePos = team === 'blue' ? map.blueSafe : map.redSafe;
    const key = `${safePos.x},${safePos.y}`;
    return (this.safeHp[key] || 0) > 0;
  }

  getEntities(team) {
    const entities = [];
    for (const bot of this.bots) {
      if (bot.team === team) entities.push(bot);
    }
    // Include player as blue team entity
    if (team === 'blue') {
      entities.push({
        cartX: this.playerCartX,
        cartY: this.playerCartY,
        hp: this.playerHp,
        alive: this.playerAlive,
        team: 'blue',
        sprite: this.playerSprite,
        takeDamage: (amt, attacker) => this.playerTakeDamage(amt, attacker),
      });
    }
    return entities;
  }

  playerTakeDamage(amount, attacker) {
    if (!this.playerAlive) return;
    this.playerHp -= amount;
    this.showDamageNumber(this.playerCartX, this.playerCartY, amount);
    this.cameras.main.shake(80, 0.005);

    // Flash red
    this.playerSprite.setTint(0xff0000);
    this.time.delayedCall(150, () => {
      if (this.playerSprite) this.playerSprite.clearTint();
    });

    // Knockback
    if (attacker) {
      const dx = this.playerCartX - attacker.cartX;
      const dy = this.playerCartY - attacker.cartY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = this.playerCartX + (dx / len) * 0.5;
      const ny = this.playerCartY + (dy / len) * 0.5;
      if (this.canMoveTo(nx, ny)) {
        this.playerCartX = nx;
        this.playerCartY = ny;
      }
    }

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.playerAlive = false;
      this.playerSprite.setAlpha(0.3);

      // Respawn if safe alive
      if (this.isSafeAlive('blue')) {
        this.time.delayedCall(3000, () => {
          this.playerCartX = this.mapData.blueSpawn.x + 0.5;
          this.playerCartY = this.mapData.blueSpawn.y + 0.5;
          this.playerHp = this.playerMaxHp;
          this.playerAlive = true;
          this.playerSprite.setAlpha(1);
        });
      } else {
        // Check if all blue team dead
        const allyAlive = this.bots.some(b => b.team === 'blue' && b.alive);
        if (!allyAlive) {
          this.endGame(false, 'Your team was eliminated!');
        }
      }
    }
  }

  buyItem(item) {
    if ((this.matchCoins || 0) < item.cost) return;
    this.matchCoins -= item.cost;

    if (item.gives.type === 'block') {
      const blockId = item.gives.id;
      this.blockInventory[blockId] = (this.blockInventory[blockId] || 0) + item.gives.count;
    } else if (item.gives.type === 'weapon') {
      const weapon = WEAPONS[item.gives.id];
      if (weapon) {
        this.loadout[weapon.slot] = item.gives.id;
        this.updateHotbarIcons();
      }
    }
  }

  updateHotbarIcons() {
    for (let i = 0; i < 4; i++) {
      if (this.hotbarIcons[i]) {
        this.hotbarIcons[i].destroy();
        this.hotbarIcons[i] = null;
      }
      const weaponId = this.loadout[i + 1];
      if (weaponId && WEAPONS[weaponId]) {
        const cam = this.cameras.main;
        const barStartX = cam.width / 2 - 78;
        const sx = barStartX + i * 40;
        const barY = cam.height - 28;
        this.hotbarIcons[i] = this.add.image(sx, barY, WEAPONS[weaponId].texture)
          .setScrollFactor(0).setDepth(101).setScale(1.5);
      }
    }
  }

  placeBlock(tileX, tileY) {
    const map = this.mapData;
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return;
    if (map.ground[tileY][tileX] === TILE.VOID) return;
    if (map.blocks[tileY][tileX] !== BLOCK.NONE) return;
    // Distance check — can only place within 3 tiles
    const dist = Math.abs(tileX + 0.5 - this.playerCartX) + Math.abs(tileY + 0.5 - this.playerCartY);
    if (dist > 3.5) return;

    // Find first available block type in inventory
    const blockTypes = [BLOCK.WOOL, BLOCK.WOOD, BLOCK.STONE, BLOCK.OBSIDIAN];
    let placedType = null;
    for (const bt of blockTypes) {
      if ((this.blockInventory[bt] || 0) > 0) {
        placedType = bt;
        break;
      }
    }
    if (!placedType) return;

    this.blockInventory[placedType]--;
    map.blocks[tileY][tileX] = placedType;
    this.blockHpMap[`${tileX},${tileY}`] = BLOCK_HP[placedType];

    // Create sprite
    const blockTextures = {
      [BLOCK.WOOL]: 'iso_block_wool',
      [BLOCK.WOOD]: 'iso_block_wood',
      [BLOCK.STONE]: 'iso_block_stone',
      [BLOCK.OBSIDIAN]: 'iso_block_obsidian',
    };
    const tex = blockTextures[placedType];
    const iso = cartToIso(tileX, tileY);
    const sprite = this.add.image(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 16, tex);
    sprite.setDepth(isoDepth(tileX, tileY, 0.3));
    this.blockSprites[`${tileX},${tileY}`] = sprite;
  }

  showDamageNumber(cartX, cartY, amount) {
    const iso = cartToIso(cartX, cartY);
    const txt = this.add.text(iso.x + this.mapOffsetX, iso.y + this.mapOffsetY - 30,
      `-${amount}`, {
        fontSize: '12px', color: '#ff4444', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: txt, y: txt.y - 20, alpha: 0, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  spawnParticles(cartX, cartY, color, count) {
    count = count || 6;
    const iso = cartToIso(cartX, cartY);
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(
        iso.x + this.mapOffsetX + Phaser.Math.Between(-12, 12),
        iso.y + this.mapOffsetY - 8 + Phaser.Math.Between(-12, 12),
        Phaser.Math.Between(2, 4), color, 0.8
      ).setDepth(50);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-20, 20),
        y: p.y - Phaser.Math.Between(10, 30),
        alpha: 0, duration: Phaser.Math.Between(300, 600),
        onComplete: () => p.destroy(),
      });
    }
  }

  endGame(won, message) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.shop.destroy();

    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Overlay
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(200);

    const color = won ? '#66bb6a' : '#ff4444';
    this.add.text(w / 2, h / 2 - 50, won ? 'YOU WIN!' : 'YOU LOSE', {
      fontSize: '32px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(w / 2, h / 2 - 10, message, {
      fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    if (won) {
      const brData = this.registry.get('brainrotData') || { coins: 0, owned: [], bestLevels: {} };
      const multiplier = 1 + (brData.owned.length * 0.05);
      const baseCoins = this.level * 10;
      const totalCoins = Math.floor(baseCoins * multiplier);

      this.add.text(w / 2, h / 2 + 20, `+${totalCoins} coins! (×${multiplier.toFixed(2)} multiplier)`, {
        fontSize: '16px', color: '#ffdd00', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      brData.coins += totalCoins;
      brData.bestLevels[this.level] = true;
      this.registry.set('brainrotData', brData);

      const username = this.registry.get('username');
      fetch('/api/save-brainrot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, brainrotData: brData }),
      }).catch(() => {});
    }

    // Back button
    const backBtn = this.add.rectangle(w / 2, h / 2 + 70, 160, 40, 0x1565c0)
      .setStrokeStyle(2, 0x42a5f5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0).setDepth(201);
    this.add.text(w / 2, h / 2 + 70, 'BACK TO HUB', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
    backBtn.on('pointerdown', () => this.scene.start('BrainrotHub'));
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    // === Player Movement ===
    if (this.playerAlive) {
      let vx = 0;
      let vy = 0;

      // Keyboard
      if (this.cursors.left.isDown || this.cursors.a.isDown) vx = -1;
      if (this.cursors.right.isDown || this.cursors.d.isDown) vx = 1;
      if (this.cursors.up.isDown || this.cursors.w.isDown) vy = -1;
      if (this.cursors.down.isDown || this.cursors.s.isDown) vy = 1;

      // Touch joystick
      if (this.touchDir.x !== 0 || this.touchDir.y !== 0) {
        vx = this.touchDir.x;
        vy = this.touchDir.y;
      }

      // Normalize diagonal
      if (vx !== 0 && vy !== 0) {
        const len = Math.sqrt(vx * vx + vy * vy);
        vx /= len;
        vy /= len;
      }

      if (vx !== 0 || vy !== 0) {
        this.lastDirX = vx;
        this.lastDirY = vy;
      }

      const speed = this.playerSpeed * (delta / 1000);
      const nx = this.playerCartX + vx * speed;
      const ny = this.playerCartY + vy * speed;

      // Try full movement, then slide along axis
      if (this.canMoveTo(nx, ny)) {
        this.playerCartX = nx;
        this.playerCartY = ny;
      } else if (this.canMoveTo(nx, this.playerCartY)) {
        this.playerCartX = nx;
      } else if (this.canMoveTo(this.playerCartX, ny)) {
        this.playerCartY = ny;
      }

      // Block placement on click
      if (this.placingBlocks && this.input.activePointer.isDown) {
        const pointer = this.input.activePointer;
        if (pointer.y < this.cameras.main.height - 60) {
          const worldX = pointer.x + this.cameras.main.scrollX;
          const worldY = pointer.y + this.cameras.main.scrollY;
          const isoX = worldX - this.mapOffsetX;
          const isoY = worldY - this.mapOffsetY;
          const cart = isoToCart(isoX, isoY);
          this.placeBlock(Math.floor(cart.x), Math.floor(cart.y));
        }
      }
    }

    // === Update player sprite ===
    const pIso = cartToIso(this.playerCartX, this.playerCartY);
    const ox = this.mapOffsetX;
    const oy = this.mapOffsetY;
    this.playerSprite.setPosition(pIso.x + ox, pIso.y + oy - 24);
    this.playerSprite.setDepth(isoDepth(this.playerCartX, this.playerCartY, 0.5));

    this.playerNameTag.setPosition(pIso.x + ox, pIso.y + oy - 50);
    this.playerNameTag.setDepth(isoDepth(this.playerCartX, this.playerCartY, 0.6));

    // Player HP bar
    this.playerHpBarBg.setPosition(pIso.x + ox, pIso.y + oy - 42);
    this.playerHpBarBg.setDepth(isoDepth(this.playerCartX, this.playerCartY, 0.6));
    const pRatio = this.playerHp / this.playerMaxHp;
    this.playerHpBar.width = 30 * pRatio;
    this.playerHpBar.setPosition(pIso.x + ox - (30 - 30 * pRatio) / 2, pIso.y + oy - 42);
    this.playerHpBar.setDepth(isoDepth(this.playerCartX, this.playerCartY, 0.61));
    this.playerHpBar.fillColor = pRatio > 0.5 ? 0x4caf50 : pRatio > 0.25 ? 0xffc107 : 0xf44336;

    // Camera follow player
    this.cameras.main.scrollX += (pIso.x + ox - this.cameras.main.width / 2 - this.cameras.main.scrollX) * 0.08;
    this.cameras.main.scrollY += (pIso.y + oy - 24 - this.cameras.main.height / 2 - this.cameras.main.scrollY) * 0.08;

    // === Update bots ===
    for (const bot of this.bots) {
      bot.update(delta);
    }

    // === Collect coins ===
    for (let i = this.coinItems.length - 1; i >= 0; i--) {
      const coin = this.coinItems[i];
      const dx = this.playerCartX - coin.cartX;
      const dy = this.playerCartY - coin.cartY;
      if (Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8 && this.playerAlive) {
        this.matchCoins += coin.value;
        // Floating text
        const cIso = cartToIso(coin.cartX, coin.cartY);
        const ft = this.add.text(cIso.x + ox, cIso.y + oy - 20, `+${coin.value}`, {
          fontSize: '10px', color: '#ffdd00', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
          targets: ft, y: ft.y - 20, alpha: 0, duration: 600,
          onComplete: () => ft.destroy(),
        });

        coin.sprite.destroy();
        this.coinItems.splice(i, 1);
      }
    }

    // === Resource generators ===
    for (const gen of this.generators) {
      gen.timer -= delta;
      if (gen.timer <= 0 && gen.items.length < 8) {
        gen.timer = gen.interval;
        // Spawn coin
        const coinX = gen.x + Phaser.Math.FloatBetween(-0.3, 0.3);
        const coinY = gen.y + Phaser.Math.FloatBetween(-0.3, 0.3);
        const cIso = cartToIso(coinX, coinY);
        const texKey = gen.type === 'gold' ? 'iso_coin_gold' :
          gen.type === 'silver' ? 'iso_coin_silver' : 'iso_coin_bronze';
        const sprite = this.add.image(cIso.x + ox, cIso.y + oy - 4, texKey)
          .setDepth(isoDepth(coinX, coinY, 0.2));

        // Floating animation
        this.tweens.add({
          targets: sprite, y: sprite.y - 3, duration: 800,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        const coinObj = { cartX: coinX, cartY: coinY, value: gen.value, sprite };
        gen.items.push(coinObj);
        this.coinItems.push(coinObj);
      }
    }

    // === Update HUD ===
    this.hudHpText.setText(`HP: ${Math.ceil(this.playerHp)}`);
    this.hudHpText.setColor(pRatio > 0.5 ? '#4caf50' : pRatio > 0.25 ? '#ffc107' : '#f44336');
    this.hudCoinsText.setText(`Coins: ${this.matchCoins}`);
  }
}
