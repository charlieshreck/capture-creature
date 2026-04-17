import Phaser from 'phaser';
import { generateMap } from '../iso/MapData.js';

const BRAINROTS = [
  { id: 0, name: 'Skibidi', price: 50 },
  { id: 1, name: 'Gyatt', price: 100 },
  { id: 2, name: 'Rizz', price: 150 },
  { id: 3, name: 'Sigma', price: 200 },
  { id: 4, name: 'Ohio', price: 300 },
  { id: 5, name: 'Fanum Tax', price: 400 },
  { id: 6, name: 'Mewing', price: 500 },
  { id: 7, name: 'Jellybean', price: 750 },
  { id: 8, name: 'Baby Gronk', price: 1000 },
  { id: 9, name: 'Livvy Dunne', price: 2000 },
];

export class BrainrotHubScene extends Phaser.Scene {
  constructor() {
    super('BrainrotHub');
  }

  create() {
    this.brData = this.registry.get('brainrotData') || { coins: 0, owned: [], bestLevels: {} };
    this.tab = 'play';
    this.buildUI();
  }

  buildUI() {
    this.children.removeAll(true);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x1a0a0a);

    // Title
    this.add.text(w / 2, 20, 'WIN A BRAINROT', {
      fontSize: '22px', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '← BACK', {
      fontSize: '12px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Homepage'));

    // Coins display
    this.add.text(w - 15, 15, `Coins: ${this.brData.coins}`, {
      fontSize: '14px', color: '#ffdd00', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0);

    // Multiplier info
    const mult = 1 + (this.brData.owned.length * 0.05);
    if (this.brData.owned.length > 0) {
      this.add.text(w - 15, 38, `×${mult.toFixed(2)} multiplier (${this.brData.owned.length} brainrots)`, {
        fontSize: '9px', color: '#ffab40',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(1, 0);
    }

    // Tab buttons
    const playTab = this.add.rectangle(w / 2 - 80, 50, 140, 28, this.tab === 'play' ? 0xff6644 : 0x331111)
      .setStrokeStyle(1, 0xff6644)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2 - 80, 50, 'PLAY', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    playTab.on('pointerdown', () => { this.tab = 'play'; this.buildUI(); });

    const shopTab = this.add.rectangle(w / 2 + 80, 50, 140, 28, this.tab === 'shop' ? 0xff6644 : 0x331111)
      .setStrokeStyle(1, 0xff6644)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2 + 80, 50, 'SHOP', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    shopTab.on('pointerdown', () => { this.tab = 'shop'; this.buildUI(); });

    if (this.tab === 'play') {
      this.buildPlayTab(w, h);
    } else {
      this.buildShopTab(w, h);
    }
  }

  buildPlayTab(w, h) {
    this.add.text(w / 2, 85, 'SAFE BLAST — Pick a level', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const cols = 5;
    const cellW = 110;
    const cellH = 70;
    const gap = 8;
    const startX = w / 2 - (cols * (cellW + gap)) / 2 + cellW / 2;
    const startY = 115;

    for (let lvl = 1; lvl <= 20; lvl++) {
      const col = (lvl - 1) % cols;
      const row = Math.floor((lvl - 1) / cols);
      const cx = startX + col * (cellW + gap);
      const cy = startY + row * (cellH + gap);
      const coins = lvl * 10;
      const beaten = this.brData.bestLevels[lvl];

      const cell = this.add.rectangle(cx, cy, cellW, cellH, beaten ? 0x1b5e20 : 0x2a1a1a)
        .setStrokeStyle(2, beaten ? 0x66bb6a : 0x663333)
        .setInteractive({ useHandCursor: true });

      const mapInfo = generateMap(lvl);
      this.add.text(cx, cy - 22, `Level ${lvl}`, {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(cx, cy - 8, mapInfo.name, {
        fontSize: '8px', color: '#aaaaaa',
      }).setOrigin(0.5);

      this.add.text(cx, cy + 6, `${coins} coins`, {
        fontSize: '10px', color: '#ffdd00',
      }).setOrigin(0.5);

      if (beaten) {
        this.add.text(cx, cy + 18, '★ BEATEN', {
          fontSize: '9px', color: '#66bb6a',
        }).setOrigin(0.5);
      }

      cell.on('pointerover', () => cell.setStrokeStyle(3, 0xffffff));
      cell.on('pointerout', () => cell.setStrokeStyle(2, beaten ? 0x66bb6a : 0x663333));
      cell.on('pointerdown', () => {
        this.scene.start('SafeBlast', { level: lvl });
      });
    }
  }

  buildShopTab(w, h) {
    this.add.text(w / 2, 85, 'Buy brainrots with your coins!', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const cols = 5;
    const cellW = 120;
    const cellH = 90;
    const gap = 10;
    const startX = w / 2 - (cols * (cellW + gap)) / 2 + cellW / 2;
    const startY = 140;

    for (let i = 0; i < BRAINROTS.length; i++) {
      const br = BRAINROTS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cellW + gap);
      const cy = startY + row * (cellH + gap);
      const owned = this.brData.owned.includes(br.id);

      const cell = this.add.rectangle(cx, cy, cellW, cellH, owned ? 0x1a2e1a : 0x2a1a1a)
        .setStrokeStyle(2, owned ? 0x66bb6a : 0x663333);

      // Brainrot sprite
      this.add.image(cx, cy - 20, `brainrot_${br.id}`).setScale(2.5);

      // Name
      this.add.text(cx, cy + 10, br.name, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      if (owned) {
        this.add.text(cx, cy + 28, 'OWNED', {
          fontSize: '10px', color: '#66bb6a', fontStyle: 'bold',
        }).setOrigin(0.5);
      } else {
        // Buy button
        const canAfford = this.brData.coins >= br.price;
        const buyBtn = this.add.rectangle(cx, cy + 30, 70, 20, canAfford ? 0xc62828 : 0x333333)
          .setStrokeStyle(1, canAfford ? 0xff4444 : 0x555555)
          .setInteractive({ useHandCursor: canAfford });
        this.add.text(cx, cy + 30, `${br.price}c`, {
          fontSize: '9px', color: canAfford ? '#ffffff' : '#666666', fontStyle: 'bold',
        }).setOrigin(0.5);

        if (canAfford) {
          buyBtn.on('pointerdown', () => this.buyBrainrot(br));
        }
      }
    }
  }

  async buyBrainrot(br) {
    if (this.brData.coins < br.price) return;
    this.brData.coins -= br.price;
    this.brData.owned.push(br.id);
    this.registry.set('brainrotData', this.brData);

    // Save to server
    const username = this.registry.get('username');
    fetch('/api/save-brainrot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, brainrotData: this.brData }),
    }).catch(() => {});

    this.buildUI();
  }
}
