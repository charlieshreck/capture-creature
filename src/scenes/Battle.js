import Phaser from 'phaser';
import { MOVES, TYPE_CHART, RARITY_COLORS, createCreatureInstance, CREATURES } from '../creatures/data.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.wildCreature = data.wildCreature;
    this.zone = data.zone;
    this.returnScene = data.returnScene;
    this.battleOver = false;
    this.playerTurn = true;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

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

    // Battle log
    this.logText = this.add.text(20, h - 180, `A wild ${this.wildCreature.name} appeared!`, {
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
    // Creature sprite (colored circle for now)
    const sprite = this.add.circle(x, y, 24, creature.color);
    sprite.setStrokeStyle(2, 0xffffff);

    // Name + level
    const rarityColor = Phaser.Display.Color.IntegerToColor(
      RARITY_COLORS[creature.rarity]
    ).rgba;
    this.add.text(x, y - 42, `${creature.name} Lv.${creature.level}`, {
      fontSize: '13px', color: rarityColor,
    }).setOrigin(0.5);

    // Rarity badge
    this.add.text(x, y - 56, creature.rarity.toUpperCase(), {
      fontSize: '9px', color: rarityColor,
    }).setOrigin(0.5);

    // HP bar background
    const barW = 80;
    this.add.rectangle(x, y + 38, barW + 2, 8, 0x333333);

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

    // HP text
    const hpText = this.add.text(x, y + 50, `${creature.hp}/${creature.maxHp}`, {
      fontSize: '10px', color: '#cccccc',
    }).setOrigin(0.5);

    // Store references for updates
    if (tag === 'wild') {
      this.wildHpBar = hpBar;
      this.wildHpText = hpText;
      this.wildSprite = sprite;
    } else {
      this.playerHpBar = hpBar;
      this.playerHpText = hpText;
      this.playerSprite = sprite;
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

    // Overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5).setInteractive();
    this.moveContainer.add(overlay);

    const moves = this.playerCreature.moves;
    const startY = h / 2 - (moves.length * 20);

    // Back button
    const backBtn = this.add.rectangle(w / 2, startY - 30, 100, 24, 0x607d8b)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, startY - 30, 'BACK', {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5);
    backBtn.on('pointerdown', () => this.moveContainer.destroy());
    this.moveContainer.add(backBtn);
    this.moveContainer.add(this.moveContainer.list[this.moveContainer.list.length - 1]);

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

  enemyTurn() {
    if (this.battleOver) return;

    const moves = this.wildCreature.moves;
    const moveName = moves[Math.floor(Math.random() * moves.length)];
    const move = MOVES[moveName];

    if (Math.random() * 100 > move.accuracy) {
      this.setLog(`Wild ${this.wildCreature.name} used ${moveName}... but missed!`);
      this.time.delayedCall(800, () => { this.playerTurn = true; });
      return;
    }

    if (move.heal) {
      this.wildCreature.hp = Math.min(this.wildCreature.maxHp, this.wildCreature.hp + move.heal);
      this.updateHpDisplay('wild');
      this.setLog(`Wild ${this.wildCreature.name} healed!`);
      this.time.delayedCall(800, () => { this.playerTurn = true; });
      return;
    }

    const damage = this.calculateDamage(this.wildCreature, this.playerCreature, move);
    this.playerCreature.hp = Math.max(0, this.playerCreature.hp - damage.total);
    this.updateHpDisplay('player');

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
    const rarityMod = { common: 1, uncommon: 0.7, rare: 0.4, legendary: 0.15 };
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

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.switchContainer = this.add.container(0, 0);

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setInteractive();
    this.switchContainer.add(overlay);

    const backBtn = this.add.rectangle(w / 2, 30, 100, 24, 0x607d8b)
      .setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(w / 2, 30, 'BACK', { fontSize: '11px', color: '#fff' }).setOrigin(0.5);
    backBtn.on('pointerdown', () => this.switchContainer.destroy());
    this.switchContainer.add([backBtn, backLabel]);

    playerData.creatures.forEach((c, i) => {
      const cy = 70 + i * 46;
      const isActive = c === this.playerCreature;
      const alive = c.hp > 0;
      const bg = this.add.rectangle(w / 2, cy, 280, 38, isActive ? 0x1b5e20 : 0x1a1a2e)
        .setStrokeStyle(1, alive ? 0x4caf50 : 0x666666);

      if (alive && !isActive) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          // Swap costs a turn
          this.playerCreature = c;
          this.switchContainer.destroy();
          this.setLog(`Go, ${c.name}!`);
          this.playerTurn = false;
          // Redraw panels
          this.scene.restart({
            wildCreature: this.wildCreature,
            zone: this.zone,
            returnScene: this.returnScene,
          });
        });
      }

      const label = this.add.text(w / 2 - 100, cy,
        `${c.name} Lv.${c.level}  HP: ${c.hp}/${c.maxHp}${isActive ? ' (active)' : ''}`, {
          fontSize: '11px', color: alive ? '#fff' : '#666',
        }).setOrigin(0, 0.5);

      this.switchContainer.add([bg, label]);
    });
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

    this.time.delayedCall(2000, () => this.endBattle());
  }

  onPlayerFainted() {
    this.battleOver = true;
    this.setLog(`${this.playerCreature.name} fainted!`);

    // Check if any other creatures alive
    const playerData = this.registry.get('playerData');
    const alive = playerData.creatures.filter(c => c.hp > 0);
    if (alive.length === 0) {
      this.setLog('All creatures fainted! Returning to town...');
      // Heal all creatures
      playerData.creatures.forEach(c => { c.hp = Math.floor(c.maxHp * 0.5); });
      this.registry.set('playerData', playerData);
    }

    this.time.delayedCall(2000, () => this.endBattle());
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

  endBattle() {
    this.scene.stop('Battle');
    this.scene.resume(this.returnScene);
  }
}
