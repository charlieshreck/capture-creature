import Phaser from 'phaser';
import { MOVES, TYPE_CHART, RARITY_COLORS, createCreatureInstance, CREATURES } from '../creatures/data.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.wildCreature = data.wildCreature;
    this.helperCreature = data.helperCreature || null;
    this.zone = data.zone;
    this.returnScene = data.returnScene;
    this.battleOver = false;
    this.playerTurn = true;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Scroll keys for creature lists
    this.scrollKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
    });
    this.scrollCursors = this.input.keyboard.createCursorKeys();

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a2e);

    // Get player's active creature (first alive) or give a starter
    const playerData = this.registry.get('playerData');
    if (playerData.creatures.length === 0) {
      // Give starter creature
      const starter = createCreatureInstance(CREATURES[0], 3); // Mossbug lvl 3
      playerData.creatures.push(starter);
      this.registry.set('playerData', playerData);
    }

    this.playerCreature = playerData.creatures.find(c => c.hp > 0);
    if (!this.playerCreature) {
      // All fainted — heal first creature
      playerData.creatures[0].hp = playerData.creatures[0].maxHp;
      this.playerCreature = playerData.creatures[0];
    }

    // Wild creature display (right side)
    this.drawCreaturePanel(w * 0.7, 100, this.wildCreature, 'wild');

    // Player creature display (left side)
    this.drawCreaturePanel(w * 0.3, 260, this.playerCreature, 'player');

    // Helper creature display (top-left, smaller)
    if (this.helperCreature) {
      const hx = w * 0.25;
      const hy = 80;
      const helperContainer = this.add.container(0, 0);
      const helperSprite = this.add.image(hx, hy, `creature_${this.helperCreature.id}`);
      helperSprite.setScale(2.5);
      helperContainer.add(helperSprite);
      this.helperSprite = helperSprite;

      const hRarityColor = Phaser.Display.Color.IntegerToColor(
        RARITY_COLORS[this.helperCreature.rarity]
      ).rgba;
      helperContainer.add(this.add.text(hx, hy - 28, `${this.helperCreature.name} Lv.${this.helperCreature.level}`, {
        fontSize: '10px', color: hRarityColor,
      }).setOrigin(0.5));
      helperContainer.add(this.add.text(hx, hy + 24, 'OPPONENTS FRIEND', {
        fontSize: '8px', color: '#ff8a80', fontStyle: 'bold',
      }).setOrigin(0.5));
      this.helperPanel = helperContainer;
    }

    // Battle log
    let logMsg = `A wild ${this.wildCreature.name} appeared!`;
    if (this.helperCreature) logMsg += ` Its friend ${this.helperCreature.name} joined the fight!`;
    this.logText = this.add.text(20, h - 180, logMsg, {
      fontSize: '14px', color: '#ffffff', wordWrap: { width: w - 40 },
    });

    // Action buttons
    this.drawActionMenu();

    // Zone info
    this.add.text(w / 2, 15, this.zone, {
      fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);
  }

  drawCreaturePanel(x, y, creature, tag) {
    // Use a container so we can destroy and redraw the panel easily
    const container = this.add.container(0, 0);

    // Creature sprite — use the pixel art texture scaled up
    const sprite = this.add.image(x, y, `creature_${creature.id}`);
    sprite.setScale(4);
    container.add(sprite);

    // Name + level
    const rarityColor = Phaser.Display.Color.IntegerToColor(
      RARITY_COLORS[creature.rarity]
    ).rgba;
    container.add(this.add.text(x, y - 42, `${creature.name} Lv.${creature.level}`, {
      fontSize: '13px', color: rarityColor,
    }).setOrigin(0.5));

    // Rarity badge
    container.add(this.add.text(x, y - 56, creature.rarity.toUpperCase(), {
      fontSize: '9px', color: rarityColor,
    }).setOrigin(0.5));

    // HP bar background
    const barW = 80;
    container.add(this.add.rectangle(x, y + 38, barW + 2, 8, 0x333333));

    // HP bar fill
    const hpRatio = creature.hp / creature.maxHp;
    const barColor = hpRatio > 0.5 ? 0x4caf50 : hpRatio > 0.25 ? 0xffc107 : 0xf44336;
    const hpBar = this.add.rectangle(
      x - barW / 2 + (barW * hpRatio) / 2,
      y + 38,
      barW * hpRatio,
      6,
      barColor
    );
    container.add(hpBar);

    // HP text
    const hpText = this.add.text(x, y + 50, `${creature.hp}/${creature.maxHp}`, {
      fontSize: '10px', color: '#cccccc',
    }).setOrigin(0.5);
    container.add(hpText);

    // Store references for updates
    if (tag === 'wild') {
      this.wildHpBar = hpBar;
      this.wildHpText = hpText;
      this.wildSprite = sprite;
      this.wildPanel = container;
    } else {
      this.playerHpBar = hpBar;
      this.playerHpText = hpText;
      this.playerSprite = sprite;
      this.playerPanel = container;
    }
  }

  drawActionMenu() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const baseY = h - 120;

    // Menu background
    this.add.rectangle(w / 2, baseY + 50, w - 20, 110, 0x16213e).setStrokeStyle(1, 0x0f3460);

    // Fight button
    this.createButton(w * 0.25, baseY + 20, 'FIGHT', 0xe94560, () => this.showMoves());

    // Capture button
    const playerData = this.registry.get('playerData');
    this.createButton(w * 0.75, baseY + 20, `CAPTURE (${playerData.orbs})`, 0xf44336, () => this.attemptCapture());

    // Run button
    this.createButton(w * 0.25, baseY + 60, 'RUN', 0x607d8b, () => this.attemptRun());

    // Creatures button
    this.createButton(w * 0.75, baseY + 60, 'CREATURES', 0x4caf50, () => this.showCreatureSwitch());
  }

  createButton(x, y, text, color, callback) {
    const btn = this.add.rectangle(x, y, 150, 30, color, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffffff, 0.3);

    this.add.text(x, y, text, {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(color, 1));
    btn.on('pointerout', () => btn.setFillStyle(color, 0.9));
    btn.on('pointerdown', () => {
      if (!this.battleOver && this.playerTurn) callback();
    });

    return btn;
  }

  showMoves() {
    // Clear existing move buttons if any
    if (this.moveContainer) this.moveContainer.destroy();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.moveContainer = this.add.container(0, 0);

    // Overlay — tap to go back
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5).setInteractive();
    overlay.on('pointerdown', () => this.moveContainer.destroy());
    this.moveContainer.add(overlay);

    const moves = this.playerCreature.moves;
    const startY = h / 2 - (moves.length * 20);

    moves.forEach((moveName, i) => {
      const move = MOVES[moveName];
      const my = startY + i * 44;

      const btn = this.add.rectangle(w / 2, my, 250, 36, 0x1a1a2e)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x0f3460);

      const label = this.add.text(w / 2, my - 5, moveName, {
        fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5);

      const info = this.add.text(w / 2, my + 10, `${move.type} | Power: ${move.power} | Acc: ${move.accuracy}%`, {
        fontSize: '9px', color: '#888888',
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        this.moveContainer.destroy();
        this.moveContainer = null;
        this.executePlayerMove(moveName);
      });

      this.moveContainer.add([btn, label, info]);
    });
  }

  executePlayerMove(moveName) {
    this.playerTurn = false;
    const move = MOVES[moveName];

    // Accuracy check
    if (Math.random() * 100 > move.accuracy) {
      this.setLog(`${this.playerCreature.name} used ${moveName}... but missed!`);
      this.time.delayedCall(800, () => this.enemyTurn());
      return;
    }

    if (move.heal) {
      this.playerCreature.hp = Math.min(this.playerCreature.maxHp, this.playerCreature.hp + move.heal);
      this.updateHpDisplay('player');
      this.setLog(`${this.playerCreature.name} used ${moveName} and healed ${move.heal} HP!`);
      this.time.delayedCall(800, () => this.enemyTurn());
      return;
    }

    const damage = this.calculateDamage(this.playerCreature, this.wildCreature, move);
    this.wildCreature.hp = Math.max(0, this.wildCreature.hp - damage.total);
    this.updateHpDisplay('wild');

    // Move animation
    this.playMoveAnimation(moveName, move, this.playerSprite.x, this.playerSprite.y, this.wildSprite.x, this.wildSprite.y);

    // Hit flash
    this.tweens.add({
      targets: this.wildSprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    let msg = `${this.playerCreature.name} used ${moveName} for ${damage.total} damage!`;
    if (damage.effective > 1) msg += ' Super effective!';
    else if (damage.effective < 1) msg += ' Not very effective...';
    this.setLog(msg);

    if (this.wildCreature.hp <= 0) {
      this.time.delayedCall(600, () => this.onWildFainted());
    } else {
      this.time.delayedCall(800, () => this.enemyTurn());
    }
  }

  afterEnemyTurn() {
    // After the main enemy attacks, helper gets a turn if it exists
    if (this.helperCreature && this.playerCreature.hp > 0 && !this.battleOver) {
      this.time.delayedCall(600, () => this.helperTurn());
    } else {
      this.playerTurn = true;
    }
  }

  enemyTurn() {
    if (this.battleOver) return;

    const moves = this.wildCreature.moves;
    const moveName = moves[Math.floor(Math.random() * moves.length)];
    const move = MOVES[moveName];

    if (Math.random() * 100 > move.accuracy) {
      this.setLog(`Wild ${this.wildCreature.name} used ${moveName}... but missed!`);
      this.time.delayedCall(800, () => this.afterEnemyTurn());
      return;
    }

    if (move.heal) {
      this.wildCreature.hp = Math.min(this.wildCreature.maxHp, this.wildCreature.hp + move.heal);
      this.updateHpDisplay('wild');
      this.setLog(`Wild ${this.wildCreature.name} healed!`);
      this.time.delayedCall(800, () => this.afterEnemyTurn());
      return;
    }

    const damage = this.calculateDamage(this.wildCreature, this.playerCreature, move);
    this.playerCreature.hp = Math.max(0, this.playerCreature.hp - damage.total);
    this.updateHpDisplay('player');

    // Move animation
    this.playMoveAnimation(moveName, move, this.wildSprite.x, this.wildSprite.y, this.playerSprite.x, this.playerSprite.y);

    this.tweens.add({
      targets: this.playerSprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    let msg = `Wild ${this.wildCreature.name} used ${moveName} for ${damage.total} damage!`;
    if (damage.effective > 1) msg += ' Super effective!';
    else if (damage.effective < 1) msg += ' Not very effective...';
    this.setLog(msg);

    if (this.playerCreature.hp <= 0) {
      this.time.delayedCall(600, () => this.onPlayerFainted());
    } else {
      this.time.delayedCall(800, () => this.afterEnemyTurn());
    }
  }

  helperTurn() {
    if (this.battleOver || !this.helperCreature || this.playerCreature.hp <= 0) {
      this.playerTurn = true;
      return;
    }

    const moves = this.helperCreature.moves;
    const moveName = moves[Math.floor(Math.random() * moves.length)];
    const move = MOVES[moveName];

    if (Math.random() * 100 > move.accuracy) {
      this.setLog(`${this.helperCreature.name} used ${moveName}... but missed!`);
      this.time.delayedCall(800, () => { this.playerTurn = true; });
      return;
    }

    if (move.heal) {
      // Helper heals the wild creature instead of itself
      this.wildCreature.hp = Math.min(this.wildCreature.maxHp, this.wildCreature.hp + move.heal);
      this.updateHpDisplay('wild');
      this.setLog(`${this.helperCreature.name} healed ${this.wildCreature.name}!`);
      this.time.delayedCall(800, () => { this.playerTurn = true; });
      return;
    }

    const damage = this.calculateDamage(this.helperCreature, this.playerCreature, move);
    this.playerCreature.hp = Math.max(0, this.playerCreature.hp - damage.total);
    this.updateHpDisplay('player');

    // Move animation from helper position
    this.playMoveAnimation(moveName, move, this.helperSprite.x, this.helperSprite.y, this.playerSprite.x, this.playerSprite.y);

    this.tweens.add({
      targets: this.playerSprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    let msg = `${this.helperCreature.name} used ${moveName} for ${damage.total} damage!`;
    if (damage.effective > 1) msg += ' Super effective!';
    else if (damage.effective < 1) msg += ' Not very effective...';
    this.setLog(msg);

    if (this.playerCreature.hp <= 0) {
      this.time.delayedCall(600, () => this.onPlayerFainted());
    } else {
      this.time.delayedCall(800, () => { this.playerTurn = true; });
    }
  }

  calculateDamage(attacker, defender, move) {
    const baseDmg = ((2 * attacker.level / 5 + 2) * move.power * attacker.atk / defender.def / 50) + 2;
    const effectiveness = TYPE_CHART[move.type]?.[defender.type] || 1;
    const randomFactor = 0.85 + Math.random() * 0.15;
    const total = Math.max(1, Math.floor(baseDmg * effectiveness * randomFactor));
    return { total, effective: effectiveness };
  }

  attemptCapture() {
    const playerData = this.registry.get('playerData');
    if (playerData.orbs <= 0) {
      this.setLog('No capture orbs left!');
      return;
    }

    this.playerTurn = false;
    playerData.orbs--;
    this.registry.set('playerData', playerData);

    // Capture formula: lower HP + lower rarity = easier catch
    const hpRatio = this.wildCreature.hp / this.wildCreature.maxHp;
    const rarityMod = { common: 1, uncommon: 0.7, rare: 0.4, epic: 0.25, mythic: 0.15, legendary: 0.1, godly: 0.05, beast: 0.02 };
    const captureRate = (1 - hpRatio * 0.6) * (rarityMod[this.wildCreature.rarity] || 0.5);

    this.setLog('Throwing capture orb...');

    // Shake animation
    this.tweens.add({
      targets: this.wildSprite,
      x: this.wildSprite.x - 5,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (Math.random() < captureRate) {
          this.setLog(`Captured ${this.wildCreature.name}!`);
          playerData.creatures.push({ ...this.wildCreature });
          this.registry.set('playerData', playerData);
          this.battleOver = true;
          this.time.delayedCall(1500, () => this.endBattle());
        } else {
          this.setLog(`${this.wildCreature.name} broke free!`);
          this.time.delayedCall(800, () => this.enemyTurn());
        }
      },
    });
  }

  attemptRun() {
    this.playerTurn = false;
    const escapeChance = 0.5 + (this.playerCreature.spd - this.wildCreature.spd) * 0.02;
    if (Math.random() < Math.max(0.2, Math.min(0.95, escapeChance))) {
      this.setLog('Got away safely!');
      this.battleOver = true;
      this.time.delayedCall(800, () => this.endBattle());
    } else {
      this.setLog("Couldn't escape!");
      this.time.delayedCall(800, () => this.enemyTurn());
    }
  }

  showCreatureSwitch() {
    // Simple creature list — swap active creature
    const playerData = this.registry.get('playerData');
    if (playerData.creatures.length <= 1) {
      this.setLog('No other creatures to switch to!');
      return;
    }

    if (this.switchContainer) this.switchContainer.destroy();
    this.switchScrollY = 0;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.switchContainer = this.add.container(0, 0);

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setInteractive();
    overlay.on('pointerdown', () => { this.switchContainer.destroy(); this.switchContainer = null; });
    this.switchContainer.add(overlay);

    const title = this.add.text(w / 2, 18, 'Pick a creature', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.switchContainer.add(title);

    // Scrollable list container
    const listTop = 45;
    const listH = h - 60;
    const cardH = 46;
    this.switchList = this.add.container(0, 0);
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(0, listTop, w, listH);
    this.switchList.setMask(maskGfx.createGeometryMask());

    playerData.creatures.forEach((c, i) => {
      const cy = listTop + i * cardH;
      const isActive = c === this.playerCreature;
      const alive = c.hp > 0;
      const bg = this.add.rectangle(w / 2, cy + cardH / 2, 280, 38, isActive ? 0x1b5e20 : 0x1a1a2e)
        .setStrokeStyle(1, alive ? 0x4caf50 : 0x666666);

      if (alive && !isActive) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          this.playerCreature = c;
          this.switchContainer.destroy();
          this.switchContainer = null;
          this.switchList = null;
          this.setLog(`Go, ${c.name}!`);

          if (this.playerPanel) this.playerPanel.destroy();
          const w2 = this.cameras.main.width;
          this.drawCreaturePanel(w2 * 0.3, 260, this.playerCreature, 'player');

          this.playerTurn = false;
          this.time.delayedCall(800, () => this.enemyTurn());
        });
      }

      const label = this.add.text(w / 2 - 100, cy + cardH / 2,
        `${c.name} Lv.${c.level}  HP: ${c.hp}/${c.maxHp}${isActive ? ' (active)' : ''}`, {
          fontSize: '11px', color: alive ? '#fff' : '#666',
        }).setOrigin(0, 0.5);

      this.switchList.add([bg, label]);
    });

    this.switchContainer.add(this.switchList);
    this.switchMaxScroll = Math.max(0, playerData.creatures.length * cardH - listH);

    // Mouse wheel scroll
    this.switchWheelFn = (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.switchList) return;
      this.switchScrollY = Phaser.Math.Clamp(this.switchScrollY + deltaY * 0.5, 0, this.switchMaxScroll);
      this.switchList.y = -this.switchScrollY;
    };
    this.input.on('wheel', this.switchWheelFn);
  }

  onWildFainted() {
    this.battleOver = true;
    this.setLog(`Wild ${this.wildCreature.name} fainted! +${this.wildCreature.level * 10} XP`);

    // Award XP
    const xpGain = this.wildCreature.level * 10;
    this.playerCreature.xp += xpGain;

    // Level up check
    while (this.playerCreature.xp >= this.playerCreature.xpToNext) {
      this.playerCreature.xp -= this.playerCreature.xpToNext;
      this.playerCreature.level++;
      const mult = 1 + (this.playerCreature.level - 1) * 0.12;
      const template = CREATURES.find(c => c.id === this.playerCreature.id);
      this.playerCreature.maxHp = Math.floor(template.baseHp * mult);
      this.playerCreature.hp = this.playerCreature.maxHp; // Full heal on level up
      this.playerCreature.atk = Math.floor(template.baseAtk * mult);
      this.playerCreature.def = Math.floor(template.baseDef * mult);
      this.playerCreature.spd = Math.floor(template.baseSpd * mult);
      this.playerCreature.xpToNext = this.playerCreature.level * 25;
      this.setLog(`${this.playerCreature.name} grew to level ${this.playerCreature.level}!`);
    }

    // Gold reward
    const playerData = this.registry.get('playerData');
    const goldGain = this.wildCreature.level * 5;
    playerData.gold += goldGain;
    this.registry.set('playerData', playerData);

    this.time.delayedCall(1500, () => this.showCapturePrompt());
  }

  showCapturePrompt() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const playerData = this.registry.get('playerData');

    this.setLog(`Capture ${this.wildCreature.name}? (${playerData.orbs} orbs left)`);

    if (this.capturePrompt) this.capturePrompt.destroy();
    this.capturePrompt = this.add.container(0, 0);

    // Dark overlay behind the prompt
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5);

    // Box in the center
    const box = this.add.rectangle(w / 2, h / 2, 280, 140, 0x16213e)
      .setStrokeStyle(2, 0x0f3460);

    // Title text
    const title = this.add.text(w / 2, h / 2 - 45, `Capture ${this.wildCreature.name}?`, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Orb count
    const orbInfo = this.add.text(w / 2, h / 2 - 20, `Orbs: ${playerData.orbs}`, {
      fontSize: '12px', color: '#ff8a80',
    }).setOrigin(0.5);

    // Capture button
    const capBtn = this.add.rectangle(w / 2, h / 2 + 15, 200, 32, 0xf44336, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffffff, 0.3);
    const capLabel = this.add.text(w / 2, h / 2 + 15, 'CAPTURE', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    capBtn.on('pointerover', () => capBtn.setFillStyle(0xf44336, 1));
    capBtn.on('pointerout', () => capBtn.setFillStyle(0xf44336, 0.9));
    capBtn.on('pointerdown', () => {
      this.capturePrompt.destroy();
      this.capturePrompt = null;
      if (playerData.orbs <= 0) {
        this.setLog('No capture orbs left!');
        this.time.delayedCall(1000, () => this.endBattle());
        return;
      }
      playerData.orbs--;
      playerData.creatures.push({ ...this.wildCreature, hp: this.wildCreature.maxHp });
      this.registry.set('playerData', playerData);
      this.setLog(`Captured ${this.wildCreature.name}!`);
      this.time.delayedCall(1500, () => this.endBattle());
    });

    // Leave button
    const leaveBtn = this.add.rectangle(w / 2, h / 2 + 52, 200, 32, 0x607d8b, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffffff, 0.3);
    const leaveLabel = this.add.text(w / 2, h / 2 + 52, 'LEAVE', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    leaveBtn.on('pointerover', () => leaveBtn.setFillStyle(0x607d8b, 1));
    leaveBtn.on('pointerout', () => leaveBtn.setFillStyle(0x607d8b, 0.9));
    leaveBtn.on('pointerdown', () => {
      this.capturePrompt.destroy();
      this.capturePrompt = null;
      this.endBattle();
    });

    this.capturePrompt.add([overlay, box, title, orbInfo, capBtn, capLabel, leaveBtn, leaveLabel]);
  }

  onPlayerFainted() {
    this.battleOver = true;
    this.setLog(`${this.playerCreature.name} fainted!`);

    const playerData = this.registry.get('playerData');
    const alive = playerData.creatures.filter(c => c.hp > 0);

    if (alive.length === 0) {
      this.setLog('All creatures fainted! Returning to town...');
      playerData.creatures.forEach(c => { c.hp = Math.floor(c.maxHp * 0.5); });
      this.registry.set('playerData', playerData);
      this.time.delayedCall(2000, () => this.endBattle());
    } else {
      this.time.delayedCall(1500, () => this.showFaintedPrompt(alive));
    }
  }

  showFaintedPrompt(alive) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (this.faintedPrompt) this.faintedPrompt.destroy();
    this.faintedPrompt = this.add.container(0, 0);

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5);

    const box = this.add.rectangle(w / 2, h / 2, 280, 140, 0x16213e)
      .setStrokeStyle(2, 0x0f3460);

    const title = this.add.text(w / 2, h / 2 - 45, `${this.playerCreature.name} fainted!`, {
      fontSize: '16px', color: '#ff8a80', fontStyle: 'bold',
    }).setOrigin(0.5);

    const info = this.add.text(w / 2, h / 2 - 20, `${alive.length} creature${alive.length > 1 ? 's' : ''} remaining`, {
      fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);

    // Continue button — opens creature picker
    const contBtn = this.add.rectangle(w / 2, h / 2 + 15, 200, 32, 0x4caf50, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffffff, 0.3);
    const contLabel = this.add.text(w / 2, h / 2 + 15, 'CONTINUE', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    contBtn.on('pointerover', () => contBtn.setFillStyle(0x4caf50, 1));
    contBtn.on('pointerout', () => contBtn.setFillStyle(0x4caf50, 0.9));
    contBtn.on('pointerdown', () => {
      this.faintedPrompt.destroy();
      this.faintedPrompt = null;
      this.showFaintedCreaturePicker();
    });

    // Leave button — flee the battle
    const leaveBtn = this.add.rectangle(w / 2, h / 2 + 52, 200, 32, 0x607d8b, 0.9)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffffff, 0.3);
    const leaveLabel = this.add.text(w / 2, h / 2 + 52, 'LEAVE', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    leaveBtn.on('pointerover', () => leaveBtn.setFillStyle(0x607d8b, 1));
    leaveBtn.on('pointerout', () => leaveBtn.setFillStyle(0x607d8b, 0.9));
    leaveBtn.on('pointerdown', () => {
      this.faintedPrompt.destroy();
      this.faintedPrompt = null;
      this.endBattle();
    });

    this.faintedPrompt.add([overlay, box, title, info, contBtn, contLabel, leaveBtn, leaveLabel]);
  }

  showFaintedCreaturePicker() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const playerData = this.registry.get('playerData');

    if (this.faintedPicker) this.faintedPicker.destroy();
    this.faintedScrollY = 0;
    this.faintedPicker = this.add.container(0, 0);

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setInteractive();
    this.faintedPicker.add(overlay);

    const title = this.add.text(w / 2, 18, 'Pick a creature with health', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.faintedPicker.add(title);

    // Warning text that shows when they pick a dead one
    const warning = this.add.text(w / 2, 38, '', {
      fontSize: '11px', color: '#ff8a80',
    }).setOrigin(0.5);
    this.faintedPicker.add(warning);

    // Scrollable list
    const listTop = 55;
    const listH = h - 70;
    const cardH = 46;
    this.faintedList = this.add.container(0, 0);
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(0, listTop, w, listH);
    this.faintedList.setMask(maskGfx.createGeometryMask());

    playerData.creatures.forEach((c, i) => {
      const cy = listTop + i * cardH;
      const isAlive = c.hp > 0;
      const bg = this.add.rectangle(w / 2, cy + cardH / 2, 280, 38, isAlive ? 0x1a1a2e : 0x2a1a1a)
        .setStrokeStyle(1, isAlive ? 0x4caf50 : 0x666666)
        .setInteractive({ useHandCursor: true });

      bg.on('pointerdown', () => {
        if (!isAlive) {
          warning.setText(`${c.name} has no health! Pick another.`);
          return;
        }

        this.faintedPicker.destroy();
        this.faintedPicker = null;
        this.faintedList = null;
        this.battleOver = false;
        this.playerCreature = c;

        if (this.playerPanel) this.playerPanel.destroy();
        const w2 = this.cameras.main.width;
        this.drawCreaturePanel(w2 * 0.3, 260, this.playerCreature, 'player');

        this.setLog(`Go, ${c.name}!`);
        this.time.delayedCall(800, () => { this.playerTurn = true; });
      });

      const hpColor = isAlive ? '#fff' : '#666';
      const status = isAlive ? '' : ' (fainted)';
      const label = this.add.text(w / 2 - 100, cy + cardH / 2,
        `${c.name} Lv.${c.level}  HP: ${c.hp}/${c.maxHp}${status}`, {
          fontSize: '11px', color: hpColor,
        }).setOrigin(0, 0.5);

      this.faintedList.add([bg, label]);
    });

    this.faintedPicker.add(this.faintedList);
    this.faintedMaxScroll = Math.max(0, playerData.creatures.length * cardH - listH);

    this.faintedWheelFn = (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.faintedList) return;
      this.faintedScrollY = Phaser.Math.Clamp(this.faintedScrollY + deltaY * 0.5, 0, this.faintedMaxScroll);
      this.faintedList.y = -this.faintedScrollY;
    };
    this.input.on('wheel', this.faintedWheelFn);
  }

  updateHpDisplay(who) {
    const creature = who === 'wild' ? this.wildCreature : this.playerCreature;
    const hpBar = who === 'wild' ? this.wildHpBar : this.playerHpBar;
    const hpText = who === 'wild' ? this.wildHpText : this.playerHpText;
    const barW = 80;

    const ratio = Math.max(0, creature.hp / creature.maxHp);
    const barColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffc107 : 0xf44336;

    hpBar.width = barW * ratio;
    hpBar.x = hpBar.x; // force redraw
    hpBar.setFillStyle(barColor);
    hpText.setText(`${creature.hp}/${creature.maxHp}`);
  }

  setLog(msg) {
    this.logText.setText(msg);
  }

  update() {
    const speed = 4;
    const up = this.scrollKeys.up.isDown || this.scrollCursors.up.isDown;
    const down = this.scrollKeys.down.isDown || this.scrollCursors.down.isDown;

    // Scroll creature switch list
    if (this.switchList && this.switchMaxScroll > 0) {
      if (up) this.switchScrollY = Math.max(0, this.switchScrollY - speed);
      if (down) this.switchScrollY = Math.min(this.switchMaxScroll, this.switchScrollY + speed);
      this.switchList.y = -this.switchScrollY;
    }

    // Scroll fainted creature picker
    if (this.faintedList && this.faintedMaxScroll > 0) {
      if (up) this.faintedScrollY = Math.max(0, this.faintedScrollY - speed);
      if (down) this.faintedScrollY = Math.min(this.faintedMaxScroll, this.faintedScrollY + speed);
      this.faintedList.y = -this.faintedScrollY;
    }
  }

  playMoveAnimation(moveName, move, fromX, fromY, targetX, targetY) {
    // Helper to spawn and tween a shape
    const spawn = (shape, tweenConfig) => {
      this.tweens.add({ targets: shape, onComplete: () => shape.destroy(), ...tweenConfig });
    };

    switch (moveName) {
      // === NORMAL MOVES ===
      case 'Tackle': {
        // Attacker lunges forward — big white impact circle
        const impact = this.add.circle(targetX, targetY, 8, 0xffffff).setDepth(50);
        spawn(impact, { scaleX: 3, scaleY: 3, alpha: 0, duration: 250 });
        // Shake lines
        for (let i = 0; i < 3; i++) {
          const line = this.add.rectangle(targetX + (i - 1) * 15, targetY - 15, 2, 20, 0xffffff).setDepth(50);
          spawn(line, { y: targetY + 15, alpha: 0, duration: 200, delay: i * 40 });
        }
        break;
      }
      case 'Scratch': {
        // Three diagonal claw marks
        for (let i = 0; i < 3; i++) {
          const claw = this.add.rectangle(targetX - 12 + i * 12, targetY - 15, 3, 30, 0xffffff)
            .setDepth(50).setRotation(-0.3);
          spawn(claw, { alpha: 0, scaleX: 0.5, duration: 300, delay: i * 60 });
        }
        break;
      }
      case 'Quick Strike': {
        // Fast dash line from attacker to target
        const dash = this.add.rectangle((fromX + targetX) / 2, (fromY + targetY) / 2,
          Math.hypot(targetX - fromX, targetY - fromY), 3, 0xffffff)
          .setDepth(50).setRotation(Math.atan2(targetY - fromY, targetX - fromX));
        spawn(dash, { alpha: 0, scaleY: 0, duration: 200 });
        const hit = this.add.circle(targetX, targetY, 5, 0xffff00).setDepth(50);
        spawn(hit, { scaleX: 2, scaleY: 2, alpha: 0, duration: 200, delay: 100 });
        break;
      }
      case 'Splash': {
        // Weak little water drops falling
        for (let i = 0; i < 4; i++) {
          const drop = this.add.circle(targetX + (Math.random() - 0.5) * 30, targetY - 20, 2, 0x81d4fa).setDepth(50);
          spawn(drop, { y: targetY + 20, alpha: 0, duration: 400, delay: i * 60 });
        }
        break;
      }

      // === FIRE MOVES ===
      case 'Ember': {
        // Small fireballs arc toward target
        for (let i = 0; i < 5; i++) {
          const ball = this.add.circle(fromX, fromY, 3 + Math.random() * 2, [0xff6b35, 0xff3d00, 0xffab00][i % 3]).setDepth(50);
          spawn(ball, {
            x: targetX + (Math.random() - 0.5) * 25, y: targetY + (Math.random() - 0.5) * 20,
            alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300, delay: i * 50,
          });
        }
        break;
      }
      case 'Flame Fang': {
        // Flaming jaws bite — two arcs snap shut on target
        const jawL = this.add.circle(targetX - 25, targetY, 10, 0xff3d00).setDepth(50);
        const jawR = this.add.circle(targetX + 25, targetY, 10, 0xff3d00).setDepth(50);
        spawn(jawL, { x: targetX - 3, scaleX: 0.5, scaleY: 0.5, alpha: 0, duration: 250 });
        spawn(jawR, { x: targetX + 3, scaleX: 0.5, scaleY: 0.5, alpha: 0, duration: 250 });
        // Fire sparks burst from bite
        for (let i = 0; i < 6; i++) {
          const spark = this.add.circle(targetX, targetY, 2, 0xffab00).setDepth(51).setAlpha(0);
          const a = Math.random() * Math.PI * 2;
          spawn(spark, { x: targetX + Math.cos(a) * 25, y: targetY + Math.sin(a) * 25, alpha: 1, duration: 300, delay: 200 });
        }
        break;
      }
      case 'Inferno Blast': {
        // Massive fire explosion on target
        const core = this.add.circle(targetX, targetY, 5, 0xffffff).setDepth(51);
        spawn(core, { scaleX: 4, scaleY: 4, alpha: 0, duration: 400 });
        for (let i = 0; i < 10; i++) {
          const flame = this.add.circle(targetX, targetY, 4 + Math.random() * 4, [0xff3d00, 0xff6b35, 0xffab00][i % 3]).setDepth(50);
          const a = Math.random() * Math.PI * 2;
          spawn(flame, { x: targetX + Math.cos(a) * 45, y: targetY + Math.sin(a) * 45, alpha: 0, duration: 400 + Math.random() * 200 });
        }
        this.cameras.main.shake(300, 0.01);
        break;
      }

      // === WATER MOVES ===
      case 'Bubble': {
        // Bubbles float up from target
        for (let i = 0; i < 6; i++) {
          const bub = this.add.circle(targetX + (Math.random() - 0.5) * 30, targetY + 10, 3 + Math.random() * 3, 0x81d4fa)
            .setDepth(50).setAlpha(0.7);
          spawn(bub, { y: targetY - 30 - Math.random() * 20, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500, delay: i * 50 });
        }
        break;
      }
      case 'Claw Crush': {
        // Big blue claw smash down
        const clawL = this.add.rectangle(targetX - 15, targetY - 25, 6, 18, 0x0288d1).setDepth(50).setRotation(0.3);
        const clawR = this.add.rectangle(targetX + 15, targetY - 25, 6, 18, 0x0288d1).setDepth(50).setRotation(-0.3);
        spawn(clawL, { y: targetY, rotation: 0, alpha: 0, duration: 250 });
        spawn(clawR, { y: targetY, rotation: 0, alpha: 0, duration: 250 });
        const crush = this.add.circle(targetX, targetY, 5, 0x29b6f6).setDepth(50).setAlpha(0);
        spawn(crush, { scaleX: 3, scaleY: 3, alpha: 0.8, duration: 200, delay: 200 });
        break;
      }
      case 'Storm Surge': {
        // Wall of water sweeps from left to right
        for (let i = 0; i < 8; i++) {
          const wave = this.add.rectangle(targetX - 50, targetY + (i - 4) * 8, 12, 6, [0x29b6f6, 0x0288d1][i % 2])
            .setDepth(50).setAlpha(0.8);
          spawn(wave, { x: targetX + 50, alpha: 0, scaleY: 2, duration: 350, delay: i * 30 });
        }
        break;
      }
      case 'Tidal Wave': {
        // Huge wave crashes down from above
        const wave = this.add.rectangle(targetX, targetY - 60, 60, 15, 0x0288d1).setDepth(50);
        spawn(wave, { y: targetY, scaleY: 3, alpha: 0, duration: 350 });
        for (let i = 0; i < 8; i++) {
          const splash = this.add.circle(targetX + (Math.random() - 0.5) * 50, targetY, 3, 0x81d4fa).setDepth(50).setAlpha(0);
          spawn(splash, { y: targetY + 20 + Math.random() * 15, alpha: 0.8, duration: 300, delay: 300 + i * 20 });
        }
        this.cameras.main.shake(200, 0.008);
        break;
      }

      // === GRASS MOVES ===
      case 'Vine Whip': {
        // Green vine lashes from attacker to target
        for (let i = 0; i < 4; i++) {
          const seg = this.add.rectangle(
            fromX + (targetX - fromX) * (i / 4), fromY + (targetY - fromY) * (i / 4),
            8, 4, 0x2e7d32
          ).setDepth(50).setRotation(Math.atan2(targetY - fromY, targetX - fromX));
          spawn(seg, { alpha: 0, duration: 400, delay: i * 50 });
        }
        const whipHit = this.add.circle(targetX, targetY, 6, 0x4caf50).setDepth(50).setAlpha(0);
        spawn(whipHit, { alpha: 1, scaleX: 2, scaleY: 2, duration: 200, delay: 200 });
        break;
      }
      case 'Thorn Barrage': {
        // Many small thorns fly at target from all angles
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 20;
          const thorn = this.add.rectangle(
            targetX + Math.cos(a) * dist, targetY + Math.sin(a) * dist,
            2, 6, [0x4caf50, 0x2e7d32][i % 2]
          ).setDepth(50).setRotation(a + Math.PI);
          spawn(thorn, { x: targetX + (Math.random() - 0.5) * 10, y: targetY + (Math.random() - 0.5) * 10, alpha: 0, duration: 250, delay: i * 25 });
        }
        break;
      }

      // === ELECTRIC MOVES ===
      case 'Spark': {
        // Small electric zap on target
        for (let i = 0; i < 4; i++) {
          const zap = this.add.rectangle(targetX + (Math.random() - 0.5) * 20, targetY, 2, 12 + Math.random() * 8, 0xffee58)
            .setDepth(50).setRotation((Math.random() - 0.5) * 0.8);
          spawn(zap, { alpha: 0, scaleX: 2, duration: 150, delay: i * 40 });
        }
        break;
      }
      case 'Thunder Pounce': {
        // Lightning bolt strikes then attacker shape lunges
        const bolt = this.add.rectangle(targetX, targetY - 40, 4, 50, 0xffff00).setDepth(50);
        spawn(bolt, { scaleX: 3, alpha: 0, duration: 200 });
        const pounce = this.add.circle(fromX, fromY, 8, 0xfdd835).setDepth(50);
        spawn(pounce, { x: targetX, y: targetY, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 300, delay: 150 });
        this.cameras.main.shake(150, 0.005);
        break;
      }

      // === ICE MOVES ===
      case 'Ice Shard': {
        // Sharp ice crystals fly at target
        for (let i = 0; i < 5; i++) {
          const shard = this.add.rectangle(fromX, fromY, 3, 10, [0x80deea, 0x4dd0e1, 0xffffff][i % 3])
            .setDepth(50).setRotation(Math.atan2(targetY - fromY, targetX - fromX));
          spawn(shard, {
            x: targetX + (Math.random() - 0.5) * 20, y: targetY + (Math.random() - 0.5) * 15,
            alpha: 0, duration: 250, delay: i * 50,
          });
        }
        break;
      }
      case 'Frost Breath': {
        // Cone of icy mist from attacker toward target
        for (let i = 0; i < 8; i++) {
          const frost = this.add.circle(fromX, fromY, 4 + Math.random() * 4, [0x80deea, 0xb3e5fc, 0xffffff][i % 3])
            .setDepth(50).setAlpha(0.7);
          const spread = (Math.random() - 0.5) * 40;
          spawn(frost, {
            x: targetX + spread, y: targetY + (Math.random() - 0.5) * 20,
            scaleX: 2, scaleY: 2, alpha: 0, duration: 400, delay: i * 30,
          });
        }
        break;
      }
      case 'Blizzard': {
        // Huge snowstorm — lots of white/blue particles swirling
        for (let i = 0; i < 15; i++) {
          const snow = this.add.circle(
            targetX + (Math.random() - 0.5) * 80, targetY - 40,
            2 + Math.random() * 3, [0xffffff, 0x80deea, 0x4dd0e1][i % 3]
          ).setDepth(50).setAlpha(0.8);
          spawn(snow, {
            x: snow.x + (Math.random() - 0.5) * 40, y: targetY + 30,
            alpha: 0, duration: 500, delay: i * 30,
          });
        }
        this.cameras.main.shake(300, 0.008);
        break;
      }

      // === ROCK MOVES ===
      case 'Rock Throw': {
        // Single big rock hurled at target
        const rock = this.add.rectangle(fromX, fromY - 10, 10, 10, 0x8d6e63).setDepth(50).setRotation(0.5);
        spawn(rock, { x: targetX, y: targetY, rotation: Math.PI * 2, duration: 300 });
        const smash = this.add.circle(targetX, targetY, 5, 0xa1887f).setDepth(50).setAlpha(0);
        spawn(smash, { scaleX: 3, scaleY: 3, alpha: 0.8, duration: 200, delay: 280 });
        break;
      }
      case 'Iron Tail': {
        // Metallic tail sweep across target
        const tail = this.add.rectangle(targetX - 30, targetY, 35, 5, 0xbdbdbd).setDepth(50);
        spawn(tail, { x: targetX + 30, rotation: 0.5, alpha: 0, duration: 200 });
        const clang = this.add.circle(targetX, targetY, 4, 0xffffff).setDepth(51);
        spawn(clang, { scaleX: 3, scaleY: 3, alpha: 0, duration: 200, delay: 100 });
        break;
      }
      case 'Earthquake': {
        // Screen shakes, ground cracks rise from below
        for (let i = 0; i < 6; i++) {
          const crack = this.add.rectangle(targetX + (i - 3) * 12, targetY + 20, 3, 15 + Math.random() * 15, 0x5d4037)
            .setDepth(50).setAlpha(0);
          spawn(crack, { y: targetY - 5, alpha: 0.9, duration: 300, delay: i * 40 });
        }
        this.cameras.main.shake(400, 0.015);
        break;
      }
      case 'Ancient Power': {
        // Glowing rocks orbit then slam into target
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const orb = this.add.circle(targetX + Math.cos(a) * 35, targetY + Math.sin(a) * 35, 5, [0x8d6e63, 0xffab00][i % 2])
            .setDepth(50);
          spawn(orb, { x: targetX, y: targetY, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 400, delay: i * 60 });
        }
        const burst = this.add.circle(targetX, targetY, 5, 0xffab00).setDepth(51).setAlpha(0);
        spawn(burst, { scaleX: 4, scaleY: 4, alpha: 0.7, duration: 300, delay: 350 });
        this.cameras.main.shake(200, 0.008);
        break;
      }
      case 'Crystal Bash': {
        // Crystal chunks slam forward
        for (let i = 0; i < 4; i++) {
          const crystal = this.add.rectangle(fromX, fromY, 5, 12, [0xce93d8, 0xba68c8, 0xffffff][i % 3])
            .setDepth(50).setRotation(Math.random() * Math.PI);
          spawn(crystal, { x: targetX + (i - 1.5) * 10, y: targetY, rotation: crystal.rotation + Math.PI, alpha: 0, duration: 300, delay: i * 40 });
        }
        break;
      }
      case 'Sand Blast': {
        // Spray of sand particles
        for (let i = 0; i < 10; i++) {
          const grain = this.add.circle(fromX, fromY, 1 + Math.random() * 2, [0xd4a057, 0xa1887f, 0xfdd835][i % 3]).setDepth(50);
          spawn(grain, {
            x: targetX + (Math.random() - 0.5) * 40, y: targetY + (Math.random() - 0.5) * 25,
            alpha: 0, duration: 300, delay: i * 20,
          });
        }
        break;
      }

      // === WIND MOVES ===
      case 'Gust': {
        // Light wind streaks across target
        for (let i = 0; i < 4; i++) {
          const streak = this.add.rectangle(targetX - 35, targetY + (i - 1.5) * 10, 25, 2, [0x80cbc4, 0xb2dfdb][i % 2])
            .setDepth(50).setAlpha(0.8);
          spawn(streak, { x: targetX + 35, alpha: 0, scaleX: 1.5, duration: 250, delay: i * 50 });
        }
        break;
      }
      case 'Wing Slash': {
        // Two wing arcs slash across target in X pattern
        const slashL = this.add.rectangle(targetX - 20, targetY - 20, 4, 35, 0x4db6ac).setDepth(50).setRotation(0.7);
        const slashR = this.add.rectangle(targetX + 20, targetY - 20, 4, 35, 0x4db6ac).setDepth(50).setRotation(-0.7);
        spawn(slashL, { x: targetX + 10, y: targetY + 10, alpha: 0, duration: 200 });
        spawn(slashR, { x: targetX - 10, y: targetY + 10, alpha: 0, duration: 200, delay: 80 });
        break;
      }
      case 'Tornado': {
        // Spinning funnel rises up around target
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 4;
          const r = 5 + i * 2;
          const debris = this.add.circle(targetX + Math.cos(a) * r, targetY + 20 - i * 4, 3, [0x80cbc4, 0x4db6ac, 0xb2dfdb][i % 3])
            .setDepth(50);
          spawn(debris, {
            x: targetX + Math.cos(a + Math.PI) * r, y: targetY + 10 - i * 4,
            alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 500, delay: i * 30,
          });
        }
        this.cameras.main.shake(250, 0.008);
        break;
      }

      // === DARK MOVES ===
      case 'Shadow Bite': {
        // Dark jaws chomp on target
        const topJaw = this.add.circle(targetX, targetY - 18, 8, 0x4a148c).setDepth(50);
        const botJaw = this.add.circle(targetX, targetY + 18, 8, 0x4a148c).setDepth(50);
        spawn(topJaw, { y: targetY - 3, alpha: 0, duration: 200 });
        spawn(botJaw, { y: targetY + 3, alpha: 0, duration: 200 });
        break;
      }
      case 'Dark Pulse': {
        // Expanding dark rings from attacker to target
        for (let i = 0; i < 4; i++) {
          const ring = this.add.circle(fromX + (targetX - fromX) * (i / 4), fromY + (targetY - fromY) * (i / 4), 4, 0x7b1fa2)
            .setDepth(50).setAlpha(0.8);
          spawn(ring, { scaleX: 3, scaleY: 3, alpha: 0, duration: 350, delay: i * 70 });
        }
        break;
      }
      case 'Nightmare': {
        // Dark swirling vortex sucks into target
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const ghost = this.add.circle(targetX + Math.cos(a) * 40, targetY + Math.sin(a) * 40, 5, [0x4a148c, 0x311b92][i % 2])
            .setDepth(50).setAlpha(0.8);
          spawn(ghost, { x: targetX, y: targetY, scaleX: 0.1, scaleY: 0.1, alpha: 0, duration: 500, delay: i * 50 });
        }
        // Screen tint briefly
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x1a0033).setDepth(49).setAlpha(0);
        spawn(overlay, { alpha: 0.3, duration: 300, yoyo: true });
        break;
      }
      case 'Void Rend': {
        // Reality tears — jagged black/purple slash across target
        const tear = this.add.rectangle(targetX, targetY, 4, 50, 0x000000).setDepth(51).setRotation(0.5);
        spawn(tear, { scaleX: 3, alpha: 0, duration: 400 });
        for (let i = 0; i < 5; i++) {
          const shard = this.add.rectangle(targetX, targetY, 3, 8, 0x7b1fa2).setDepth(50);
          const a = Math.random() * Math.PI * 2;
          spawn(shard, { x: targetX + Math.cos(a) * 30, y: targetY + Math.sin(a) * 30, rotation: a, alpha: 0, duration: 300, delay: 150 });
        }
        this.cameras.main.shake(200, 0.01);
        break;
      }

      // === LIGHT MOVES ===
      case 'Light Beam': {
        // Beam of light shoots from attacker to target
        const beam = this.add.rectangle((fromX + targetX) / 2, (fromY + targetY) / 2,
          Math.hypot(targetX - fromX, targetY - fromY), 6, 0xffd700)
          .setDepth(50).setRotation(Math.atan2(targetY - fromY, targetX - fromX));
        spawn(beam, { scaleY: 3, alpha: 0, duration: 350 });
        const glow = this.add.circle(targetX, targetY, 10, 0xffffff).setDepth(51).setAlpha(0.7);
        spawn(glow, { scaleX: 2, scaleY: 2, alpha: 0, duration: 300, delay: 100 });
        break;
      }
      case 'Solar Flare': {
        // Blinding flash then sun rays expand
        const flash = this.add.circle(targetX, targetY, 10, 0xffffff).setDepth(51).setAlpha(0.9);
        spawn(flash, { scaleX: 5, scaleY: 5, alpha: 0, duration: 400 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const ray = this.add.rectangle(targetX, targetY, 3, 20, 0xffd700).setDepth(50).setRotation(a);
          spawn(ray, {
            x: targetX + Math.cos(a) * 35, y: targetY + Math.sin(a) * 35,
            alpha: 0, duration: 350, delay: 100,
          });
        }
        break;
      }
      case 'Moonbeam': {
        // Soft beam descends from above
        const moon = this.add.rectangle(targetX, targetY - 50, 6, 60, 0xfff176).setDepth(50).setAlpha(0.6);
        spawn(moon, { scaleX: 2, alpha: 0, duration: 500 });
        const glow = this.add.circle(targetX, targetY, 12, 0xffe082).setDepth(49).setAlpha(0);
        spawn(glow, { alpha: 0.5, scaleX: 2, scaleY: 2, duration: 400, delay: 100 });
        break;
      }
      case 'Heal Pulse': {
        // Green/gold sparkles rise up around target (healing)
        for (let i = 0; i < 8; i++) {
          const sparkle = this.add.circle(targetX + (Math.random() - 0.5) * 30, targetY + 10, 3, [0x4caf50, 0xffd700, 0xffffff][i % 3])
            .setDepth(50);
          spawn(sparkle, { y: targetY - 25 - Math.random() * 15, alpha: 0, duration: 500, delay: i * 40 });
        }
        break;
      }
      case 'Divine Wrath': {
        // Massive gold/white beams rain down + huge flash
        const whiteout = this.add.rectangle(400, 300, 800, 600, 0xffffff).setDepth(52).setAlpha(0);
        spawn(whiteout, { alpha: 0.6, duration: 200, yoyo: true });
        for (let i = 0; i < 6; i++) {
          const beam = this.add.rectangle(targetX + (i - 2.5) * 12, targetY - 50, 4, 70, [0xffd700, 0xffffff][i % 2])
            .setDepth(51).setAlpha(0);
          spawn(beam, { alpha: 0.9, scaleX: 2, duration: 200, delay: 100 + i * 40 });
        }
        const explosion = this.add.circle(targetX, targetY, 8, 0xffd700).setDepth(51).setAlpha(0);
        spawn(explosion, { scaleX: 5, scaleY: 5, alpha: 0.8, duration: 400, delay: 300 });
        this.cameras.main.shake(400, 0.015);
        break;
      }

      // === BEAST MOVE ===
      case 'Cataclysm': {
        // Total destruction — screen goes dark, red lightning, massive explosion
        const darkness = this.add.rectangle(400, 300, 800, 600, 0x000000).setDepth(49).setAlpha(0);
        spawn(darkness, { alpha: 0.5, duration: 200, yoyo: true, hold: 300 });
        for (let i = 0; i < 8; i++) {
          const bolt = this.add.rectangle(targetX + (Math.random() - 0.5) * 60, targetY - 50, 3, 40 + Math.random() * 30, 0xff0000)
            .setDepth(51).setRotation((Math.random() - 0.5) * 0.4);
          spawn(bolt, { y: targetY, alpha: 0, scaleX: 2, duration: 200, delay: 100 + i * 40 });
        }
        const nuke = this.add.circle(targetX, targetY, 5, 0xff0000).setDepth(52).setAlpha(0);
        spawn(nuke, { scaleX: 6, scaleY: 6, alpha: 0.9, duration: 500, delay: 350 });
        const ring = this.add.circle(targetX, targetY, 5, 0xff4444).setDepth(51).setAlpha(0);
        spawn(ring, { scaleX: 8, scaleY: 8, alpha: 0.5, duration: 600, delay: 400 });
        this.cameras.main.shake(500, 0.02);
        break;
      }

      // === FALLBACK — type-based generic ===
      default: {
        const type = move.type || 'normal';
        const typeColors = {
          fire: 0xff3d00, water: 0x29b6f6, grass: 0x4caf50, electric: 0xffee58,
          ice: 0x80deea, rock: 0x8d6e63, wind: 0x80cbc4, dark: 0x7b1fa2,
          light: 0xffd700, normal: 0xffffff,
        };
        const col = typeColors[type] || 0xffffff;
        for (let i = 0; i < 6; i++) {
          const p = this.add.circle(fromX, fromY, 3 + Math.random() * 3, col).setDepth(50);
          spawn(p, {
            x: targetX + (Math.random() - 0.5) * 30, y: targetY + (Math.random() - 0.5) * 20,
            alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300, delay: i * 40,
          });
        }
        break;
      }
    }
  }

  endBattle() {
    // Save progress after every battle
    const worldScene = this.scene.get('World');
    if (worldScene && worldScene.saveToServer) worldScene.saveToServer();
    this.scene.stop('Battle');
    this.scene.resume(this.returnScene);
  }
}
