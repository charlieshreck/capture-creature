// In-game shop overlay for Safe Blast

import { WEAPONS } from './Weapons.js';

export const SHOP_ITEMS = [
  // Blocks
  { name: 'Wool ×16', cost: 4, category: 'blocks', gives: { type: 'block', id: 10, count: 16 } },
  { name: 'Wood ×16', cost: 8, category: 'blocks', gives: { type: 'block', id: 11, count: 16 } },
  { name: 'Stone ×8', cost: 16, category: 'blocks', gives: { type: 'block', id: 12, count: 8 } },
  { name: 'Obsidian ×4', cost: 32, category: 'blocks', gives: { type: 'block', id: 13, count: 4 } },
  // Weapons
  { name: 'Iron Sword', cost: 20, category: 'weapons', gives: { type: 'weapon', id: 'iron_sword' } },
  { name: 'Diamond Sword', cost: 50, category: 'weapons', gives: { type: 'weapon', id: 'diamond_sword' } },
  { name: 'Iron Pick', cost: 20, category: 'weapons', gives: { type: 'weapon', id: 'iron_pick' } },
  { name: 'Diamond Pick', cost: 50, category: 'weapons', gives: { type: 'weapon', id: 'diamond_pick' } },
  // Special
  { name: 'Bow + Arrows', cost: 30, category: 'special', gives: { type: 'weapon', id: 'bow' } },
  { name: 'TNT', cost: 40, category: 'special', gives: { type: 'weapon', id: 'tnt' } },
];

export class ShopOverlay {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.elements = [];
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    this.visible = true;
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Background overlay
    const bg = this.scene.add.rectangle(w / 2, h / 2, 400, 350, 0x0a0a1a, 0.95)
      .setStrokeStyle(2, 0x42a5f5)
      .setScrollFactor(0).setDepth(200);
    this.elements.push(bg);

    // Title
    const title = this.scene.add.text(w / 2, h / 2 - 155, 'SHOP', {
      fontSize: '18px', color: '#42a5f5', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.elements.push(title);

    // Close button
    const closeBtn = this.scene.add.text(w / 2 + 180, h / 2 - 160, '✕', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.elements.push(closeBtn);

    // Coins display
    const coins = this.scene.matchCoins || 0;
    const coinText = this.scene.add.text(w / 2, h / 2 - 135, `Coins: ${coins}`, {
      fontSize: '12px', color: '#ffdd00', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.elements.push(coinText);

    // Items grid
    const startY = h / 2 - 110;
    const itemH = 28;

    for (let i = 0; i < SHOP_ITEMS.length; i++) {
      const item = SHOP_ITEMS[i];
      const iy = startY + i * itemH;
      const canAfford = (this.scene.matchCoins || 0) >= item.cost;

      // Item name
      const nameText = this.scene.add.text(w / 2 - 170, iy, item.name, {
        fontSize: '11px', color: '#ffffff',
      }).setScrollFactor(0).setDepth(201);
      this.elements.push(nameText);

      // Category tag
      const catColor = item.category === 'blocks' ? '#66bb6a' :
        item.category === 'weapons' ? '#ff7043' : '#ba68c8';
      const catText = this.scene.add.text(w / 2 + 40, iy, item.category.toUpperCase(), {
        fontSize: '8px', color: catColor,
      }).setScrollFactor(0).setDepth(201);
      this.elements.push(catText);

      // Buy button
      const btn = this.scene.add.rectangle(w / 2 + 140, iy + 6, 70, 22,
        canAfford ? 0x1565c0 : 0x333333)
        .setStrokeStyle(1, canAfford ? 0x42a5f5 : 0x555555)
        .setScrollFactor(0).setDepth(201)
        .setInteractive({ useHandCursor: canAfford });
      this.elements.push(btn);

      const btnText = this.scene.add.text(w / 2 + 140, iy + 6, `${item.cost}c`, {
        fontSize: '10px', color: canAfford ? '#ffffff' : '#666666', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      this.elements.push(btnText);

      if (canAfford) {
        btn.on('pointerdown', () => {
          this.scene.buyItem(item);
          this.hide();
          this.show(); // Refresh
        });
      }
    }
  }

  hide() {
    this.visible = false;
    for (const el of this.elements) el.destroy();
    this.elements = [];
  }

  destroy() {
    this.hide();
  }
}
