import Phaser from 'phaser';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const username = this.registry.get('username') || 'guest';
    const admins = ['albie', 'chaz'];
    const isAdmin = admins.includes(username.toLowerCase());

    // Zone name display
    this.zoneText = this.add.text(w / 2, 12, 'Starter Town', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Username display
    this.add.text(10, 54, username, {
      fontSize: '11px', color: '#ffab40', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // Orb count
    this.orbText = this.add.text(10, 10, '', {
      fontSize: '11px', color: '#ff8a80', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // Creature count
    this.creatureText = this.add.text(10, 32, '', {
      fontSize: '11px', color: '#80cbc4', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // Home button (top-right) — clear exit back to Homepage
    const homeBtn = this.add.rectangle(w - 35, 12, 60, 22, 0x000000, 0.6)
      .setStrokeStyle(1, 0xffab40)
      .setScrollFactor(0).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.add.text(w - 35, 12, '🏠 HOME', {
      fontSize: '11px', color: '#ffab40', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    homeBtn.on('pointerover', () => homeBtn.setStrokeStyle(2, 0xffffff));
    homeBtn.on('pointerout', () => homeBtn.setStrokeStyle(1, 0xffab40));
    homeBtn.on('pointerdown', () => {
      this.scene.stop('Inventory');
      this.scene.stop('AdminPanel');
      this.scene.stop('Battle');
      this.scene.stop('World');
      this.scene.stop('HUD');
      this.scene.start('Homepage');
    });

    // Listen for zone changes
    const worldScene = this.scene.get('World');
    worldScene.events.on('zone-change', (zone) => {
      this.zoneText.setText(zone);
      this.tweens.add({
        targets: this.zoneText,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
      });
    });

    // --- Touch Controls ---
    this.touchDir = { x: 0, y: 0 };
    this.registry.set('touchDir', this.touchDir);

    // D-pad (bottom-left)
    const padX = 70;
    const padY = h - 70;
    const btnSize = 36;
    const gap = 2;

    const makeDpadBtn = (x, y, label, dx, dy) => {
      const btn = this.add.rectangle(x, y, btnSize, btnSize, 0x000000, 0.5)
        .setStrokeStyle(1, 0x444444)
        .setScrollFactor(0).setDepth(200)
        .setInteractive();
      this.add.text(x, y, label, {
        fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      btn.on('pointerdown', () => { this.touchDir.x += dx; this.touchDir.y += dy; btn.setFillStyle(0x333333, 0.8); });
      btn.on('pointerup', () => { this.touchDir.x -= dx; this.touchDir.y -= dy; btn.setFillStyle(0x000000, 0.5); });
      btn.on('pointerout', () => { this.touchDir.x -= dx; this.touchDir.y -= dy; btn.setFillStyle(0x000000, 0.5); });
      return btn;
    };

    makeDpadBtn(padX, padY - btnSize - gap, '▲', 0, -1);           // Up
    makeDpadBtn(padX, padY + btnSize + gap, '▼', 0, 1);            // Down
    makeDpadBtn(padX - btnSize - gap, padY, '◀', -1, 0);           // Left
    makeDpadBtn(padX + btnSize + gap, padY, '▶', 1, 0);            // Right

    // Action buttons (bottom-right)
    const btnW = 50;
    const btnH = 28;
    const rightX = w - 35;

    // Inventory button
    const invBtn = this.add.rectangle(rightX, h - 110, btnW, btnH, 0x000000, 0.5)
      .setStrokeStyle(1, 0x80cbc4)
      .setScrollFactor(0).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.add.text(rightX, h - 110, 'BAG', {
      fontSize: '11px', color: '#80cbc4', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    invBtn.on('pointerdown', () => {
      const ws = this.scene.get('World');
      if (ws && ws.scene.isActive()) {
        ws.scene.launch('Inventory');
        ws.scene.pause();
      }
    });

    // Map button
    const mapBtn = this.add.rectangle(rightX, h - 75, btnW, btnH, 0x000000, 0.5)
      .setStrokeStyle(1, 0x90caf9)
      .setScrollFactor(0).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.add.text(rightX, h - 75, 'MAP', {
      fontSize: '11px', color: '#90caf9', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    mapBtn.on('pointerdown', () => {
      const ws = this.scene.get('World');
      if (ws && ws.toggleMap) ws.toggleMap();
    });

    // Admin button (only for admins)
    if (isAdmin) {
      const adminBtn = this.add.rectangle(rightX, h - 40, btnW, btnH, 0x000000, 0.5)
        .setStrokeStyle(1, 0xff4444)
        .setScrollFactor(0).setDepth(200)
        .setInteractive({ useHandCursor: true });
      this.add.text(rightX, h - 40, 'ADM', {
        fontSize: '11px', color: '#ff4444', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      adminBtn.on('pointerdown', () => {
        const ws = this.scene.get('World');
        if (ws && ws.scene.isActive()) {
          ws.scene.launch('AdminPanel');
          ws.scene.pause();
        }
      });
    }
  }

  update() {
    const playerData = this.registry.get('playerData');
    if (playerData) {
      this.orbText.setText(`Orbs: ${playerData.orbs}`);
      this.creatureText.setText(`Creatures: ${playerData.creatures.length}`);
    }
  }
}
