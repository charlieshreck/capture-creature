import Phaser from 'phaser';
import { RARITY_COLORS } from '../creatures/data.js';

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const playerData = this.registry.get('playerData');

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a23, 0.95);

    // Title
    this.add.text(w / 2, 25, 'CREATURE COLLECTION', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats bar
    this.add.text(20, 55, `Orbs: ${playerData.orbs}  |  Gold: ${playerData.gold}  |  Creatures: ${playerData.creatures.length}`, {
      fontSize: '12px', color: '#aaaaaa',
    });

    // Creature list
    if (playerData.creatures.length === 0) {
      this.add.text(w / 2, h / 2, 'No creatures captured yet!\nExplore tall grass to find creatures.', {
        fontSize: '14px', color: '#666666', align: 'center',
      }).setOrigin(0.5);
    } else {
      const startY = 85;
      const cardH = 70;

      playerData.creatures.forEach((creature, i) => {
        const y = startY + i * (cardH + 8);
        if (y > h - 60) return; // Don't overflow

        // Card background
        this.add.rectangle(w / 2, y + cardH / 2, w - 40, cardH, 0x16213e)
          .setStrokeStyle(1, RARITY_COLORS[creature.rarity]);

        // Creature color circle
        this.add.circle(45, y + cardH / 2, 18, creature.color)
          .setStrokeStyle(1, 0xffffff, 0.5);

        // Name and level
        this.add.text(75, y + 8, `${creature.name}`, {
          fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
        });

        const rarityHex = '#' + RARITY_COLORS[creature.rarity].toString(16).padStart(6, '0');
        this.add.text(75, y + 26, `Lv.${creature.level} | ${creature.rarity.toUpperCase()} | ${creature.type}`, {
          fontSize: '10px', color: rarityHex,
        });

        // HP bar
        const barX = 75;
        const barY = y + 46;
        const barW = 100;
        this.add.rectangle(barX + barW / 2, barY, barW, 6, 0x333333);
        const hpRatio = creature.hp / creature.maxHp;
        const barColor = hpRatio > 0.5 ? 0x4caf50 : hpRatio > 0.25 ? 0xffc107 : 0xf44336;
        this.add.rectangle(barX + (barW * hpRatio) / 2, barY, barW * hpRatio, 4, barColor);
        this.add.text(barX + barW + 8, barY, `${creature.hp}/${creature.maxHp}`, {
          fontSize: '9px', color: '#aaa',
        }).setOrigin(0, 0.5);

        // Stats
        this.add.text(w - 30, y + 10, `ATK ${creature.atk}`, {
          fontSize: '10px', color: '#ef5350',
        }).setOrigin(1, 0);
        this.add.text(w - 30, y + 24, `DEF ${creature.def}`, {
          fontSize: '10px', color: '#42a5f5',
        }).setOrigin(1, 0);
        this.add.text(w - 30, y + 38, `SPD ${creature.spd}`, {
          fontSize: '10px', color: '#66bb6a',
        }).setOrigin(1, 0);

        // XP bar
        const xpRatio = creature.xp / creature.xpToNext;
        this.add.text(w - 30, y + 52, `XP ${creature.xp}/${creature.xpToNext}`, {
          fontSize: '8px', color: '#888',
        }).setOrigin(1, 0);
      });
    }

    // Close instruction
    this.add.text(w / 2, h - 25, 'Press I or ESC to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Close on I or ESC
    this.input.keyboard.once('keydown-I', () => this.closeInventory());
    this.input.keyboard.once('keydown-ESC', () => this.closeInventory());
  }

  closeInventory() {
    this.scene.stop('Inventory');
    this.scene.resume('World');
  }
}
