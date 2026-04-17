import Phaser from 'phaser';
import { RARITY_COLORS } from '../creatures/data.js';

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  create() {
    this.selectedIndex = -1;
    this.buildUI();
  }

  buildUI() {
    // Clear everything and rebuild
    this.children.removeAll(true);
    if (this.listContainer) { this.listContainer.destroy(); this.listContainer = null; }
    if (this.deleteBar) { this.deleteBar.destroy(); this.deleteBar = null; }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const playerData = this.registry.get('playerData');

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a23, 0.95);

    // Title
    this.add.text(w / 2, 25, 'CREATURE COLLECTION', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Close button (touch-friendly)
    const closeBtn = this.add.text(w - 15, 15, '✕', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(200);
    closeBtn.on('pointerdown', () => this.closeInventory());

    // Stats bar
    this.add.text(20, 55, `Orbs: ${playerData.orbs}  |  Gold: ${playerData.gold}  |  Creatures: ${playerData.creatures.length}`, {
      fontSize: '12px', color: '#aaaaaa',
    });

    // Scrollable creature list
    this.scrollY = 0;
    this.listTop = 85;
    this.listBottom = h - 45;
    this.cardH = 70;
    this.cardGap = 8;

    this.listContainer = this.add.container(0, 0);

    const maskShape = this.make.graphics({ add: false });
    maskShape.fillRect(0, this.listTop, w, this.listBottom - this.listTop);
    this.listContainer.setMask(maskShape.createGeometryMask());

    if (playerData.creatures.length === 0) {
      this.listContainer.add(this.add.text(w / 2, h / 2, 'No creatures captured yet!\nExplore tall grass to find creatures.', {
        fontSize: '14px', color: '#666666', align: 'center',
      }).setOrigin(0.5));
      this.maxScroll = 0;
    } else {
      playerData.creatures.forEach((creature, i) => {
        const y = this.listTop + i * (this.cardH + this.cardGap);
        const isSelected = i === this.selectedIndex;

        // Card background — highlight if selected
        const card = this.add.rectangle(w / 2, y + this.cardH / 2, w - 40, this.cardH,
          isSelected ? 0x2a3a5e : 0x16213e)
          .setStrokeStyle(2, isSelected ? 0xffffff : (RARITY_COLORS[creature.rarity] || 0xaaaaaa))
          .setInteractive({ useHandCursor: true });

        card.on('pointerdown', () => {
          if (this.selectedIndex === i) {
            this.selectedIndex = -1; // deselect
          } else {
            this.selectedIndex = i;
          }
          this.buildUI();
        });

        this.listContainer.add(card);

        // Creature color circle
        this.listContainer.add(this.add.circle(45, y + this.cardH / 2, 18, creature.color)
          .setStrokeStyle(1, 0xffffff, 0.5));

        // Name
        this.listContainer.add(this.add.text(75, y + 8, `${creature.name}`, {
          fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
        }));

        // Rarity + type
        const rarityHex = '#' + (RARITY_COLORS[creature.rarity] || 0xaaaaaa).toString(16).padStart(6, '0');
        this.listContainer.add(this.add.text(75, y + 26, `Lv.${creature.level} | ${creature.rarity.toUpperCase()} | ${creature.type}`, {
          fontSize: '10px', color: rarityHex,
        }));

        // HP bar
        const barX = 75;
        const barY = y + 46;
        const barW = 100;
        this.listContainer.add(this.add.rectangle(barX + barW / 2, barY, barW, 6, 0x333333));
        const hpRatio = creature.hp / creature.maxHp;
        const barColor = hpRatio > 0.5 ? 0x4caf50 : hpRatio > 0.25 ? 0xffc107 : 0xf44336;
        this.listContainer.add(this.add.rectangle(barX + (barW * hpRatio) / 2, barY, barW * hpRatio, 4, barColor));
        this.listContainer.add(this.add.text(barX + barW + 8, barY, `${creature.hp}/${creature.maxHp}`, {
          fontSize: '9px', color: '#aaa',
        }).setOrigin(0, 0.5));

        // Stats
        this.listContainer.add(this.add.text(w - 30, y + 10, `ATK ${creature.atk}`, {
          fontSize: '10px', color: '#ef5350',
        }).setOrigin(1, 0));
        this.listContainer.add(this.add.text(w - 30, y + 24, `DEF ${creature.def}`, {
          fontSize: '10px', color: '#42a5f5',
        }).setOrigin(1, 0));
        this.listContainer.add(this.add.text(w - 30, y + 38, `SPD ${creature.spd}`, {
          fontSize: '10px', color: '#66bb6a',
        }).setOrigin(1, 0));

        // XP
        this.listContainer.add(this.add.text(w - 30, y + 52, `XP ${creature.xp}/${creature.xpToNext}`, {
          fontSize: '8px', color: '#888',
        }).setOrigin(1, 0));
      });

      this.maxScroll = Math.max(0, playerData.creatures.length * (this.cardH + this.cardGap) - (this.listBottom - this.listTop));
    }

    // Delete bar — only show when a creature is selected
    if (this.selectedIndex >= 0 && playerData.creatures.length > 0) {
      this.deleteBar = this.add.container(0, 0);

      const barBg = this.add.rectangle(w / 2, this.listBottom + 2, w - 40, 30, 0x1a1a2e)
        .setStrokeStyle(1, 0x666666);
      this.deleteBar.add(barBg);

      const creature = playerData.creatures[this.selectedIndex];

      if (playerData.creatures.length <= 1) {
        // Can't delete last creature
        this.deleteBar.add(this.add.text(w / 2, this.listBottom + 2, "Can't delete your last creature!", {
          fontSize: '10px', color: '#ff8a80',
        }).setOrigin(0.5));
      } else {
        const delBtn = this.add.rectangle(w / 2, this.listBottom + 2, 200, 26, 0xc62828, 0.9)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(1, 0xffffff, 0.3);
        const delLabel = this.add.text(w / 2, this.listBottom + 2, `DELETE ${creature.name}`, {
          fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        delBtn.on('pointerover', () => delBtn.setFillStyle(0xd32f2f, 1));
        delBtn.on('pointerout', () => delBtn.setFillStyle(0xc62828, 0.9));
        delBtn.on('pointerdown', () => {
          playerData.creatures.splice(this.selectedIndex, 1);
          this.registry.set('playerData', playerData);
          const worldScene = this.scene.get('World');
          if (worldScene && worldScene.saveToServer) worldScene.saveToServer();
          this.selectedIndex = -1;
          this.scrollY = 0;
          this.buildUI();
        });
        this.deleteBar.add([delBtn, delLabel]);
      }
    }

    // Scroll hint
    if (this.maxScroll > 0) {
      this.add.text(w / 2, h - 28, 'W/S or Up/Down to scroll', {
        fontSize: '9px', color: '#666666',
      }).setOrigin(0.5);
    }

    // Close instruction
    this.add.text(w / 2, h - 12, 'Press I or ESC to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
    });
    this.input.keyboard.once('keydown-I', () => this.closeInventory());
    this.input.keyboard.once('keydown-ESC', () => this.closeInventory());

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScroll || 0);
      this.listContainer.y = -this.scrollY;
    });

    // Touch drag scrolling
    this.dragStartY = null;
    this.input.on('pointerdown', (pointer) => { this.dragStartY = pointer.y; this.dragScrollStart = this.scrollY; });
    this.input.on('pointermove', (pointer) => {
      if (this.dragStartY !== null && pointer.isDown) {
        const dy = this.dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.dragScrollStart + dy, 0, this.maxScroll || 0);
        this.listContainer.y = -this.scrollY;
      }
    });
    this.input.on('pointerup', () => { this.dragStartY = null; });
  }

  update() {
    if (!this.maxScroll || this.maxScroll <= 0) return;

    const scrollSpeed = 4;
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.scrollY = Math.max(0, this.scrollY - scrollSpeed);
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.scrollY = Math.min(this.maxScroll, this.scrollY + scrollSpeed);
    }
    this.listContainer.y = -this.scrollY;
  }

  closeInventory() {
    this.scene.stop('Inventory');
    this.scene.resume('World');
  }
}
