import Phaser from 'phaser';
import { CREATURES, RARITY_COLORS, createCreatureInstance } from '../creatures/data.js';

export class AdminPanelScene extends Phaser.Scene {
  constructor() {
    super('AdminPanel');
  }

  create() {
    this.scrollY = 0;
    this.currentPage = 'menu';
    this.buildMenu();
  }

  buildMenu() {
    this.children.removeAll(true);
    if (this.listContainer) { this.listContainer.destroy(); this.listContainer = null; }
    this.currentPage = 'menu';
    this.maxScroll = 0;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a23, 0.97);

    // Title
    this.add.text(w / 2, 40, 'ADMIN PANEL', {
      fontSize: '24px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Close button (touch-friendly)
    const closeBtn = this.add.text(w - 15, 15, '✕', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(200);
    closeBtn.on('pointerdown', () => this.closePanel());

    // Give Creature button
    const btnW = 250;
    const btnH = 50;
    const btn = this.add.rectangle(w / 2, 140, btnW, btnH, 0x1565c0)
      .setStrokeStyle(2, 0x42a5f5)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, 140, 'GIVE CREATURE', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x1976d2));
    btn.on('pointerout', () => btn.setFillStyle(0x1565c0));
    btn.on('pointerdown', () => this.buildCreatureList());

    // Close hint
    this.add.text(w / 2, h - 20, 'Press J or ESC to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Input
    this.input.keyboard.once('keydown-J', () => this.closePanel());
    this.input.keyboard.once('keydown-ESC', () => this.closePanel());
  }

  buildCreatureList() {
    this.children.removeAll(true);
    if (this.listContainer) { this.listContainer.destroy(); this.listContainer = null; }
    this.currentPage = 'creatures';
    this.scrollY = 0;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a23, 0.97);

    // Title
    this.add.text(w / 2, 20, 'GIVE CREATURE', {
      fontSize: '20px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '← BACK', {
      fontSize: '12px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.buildMenu());

    // Close button (touch-friendly)
    const closeBtn2 = this.add.text(w - 15, 15, '✕', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(200);
    closeBtn2.on('pointerdown', () => this.closePanel());

    this.add.text(w / 2, 42, 'Click a creature to give it to a player', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Scrollable list
    const listTop = 60;
    const listBottom = h - 30;
    const rowH = 32;
    const gap = 4;

    this.listContainer = this.add.container(0, 0);

    const maskShape = this.make.graphics({ add: false });
    maskShape.fillRect(0, listTop, w, listBottom - listTop);
    this.listContainer.setMask(maskShape.createGeometryMask());

    // Sort by rarity order
    const rarityOrder = ['beast', 'godly', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    const sorted = [...CREATURES].sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));

    sorted.forEach((creature, i) => {
      const y = listTop + i * (rowH + gap);
      const rarityColor = RARITY_COLORS[creature.rarity] || 0xaaaaaa;
      const rarityHex = '#' + rarityColor.toString(16).padStart(6, '0');

      // Row background
      const row = this.add.rectangle(w / 2, y + rowH / 2, w - 30, rowH, 0x16213e)
        .setStrokeStyle(1, rarityColor)
        .setInteractive({ useHandCursor: true });

      row.on('pointerover', () => row.setFillStyle(0x2a3a5e));
      row.on('pointerout', () => row.setFillStyle(0x16213e));
      row.on('pointerdown', () => this.addCreature(creature));

      this.listContainer.add(row);

      // Color circle
      this.listContainer.add(
        this.add.circle(35, y + rowH / 2, 10, creature.color)
          .setStrokeStyle(1, 0xffffff, 0.4)
      );

      // Name
      this.listContainer.add(this.add.text(55, y + 4, creature.name, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }));

      // Rarity + type
      this.listContainer.add(this.add.text(55, y + 18, `${creature.rarity.toUpperCase()} | ${creature.type}`, {
        fontSize: '9px', color: rarityHex,
      }));

      // Stats on the right
      this.listContainer.add(this.add.text(w - 25, y + 6, `HP:${creature.baseHp} ATK:${creature.baseAtk} DEF:${creature.baseDef} SPD:${creature.baseSpd}`, {
        fontSize: '8px', color: '#888888',
      }).setOrigin(1, 0));

      // Level hint
      this.listContainer.add(this.add.text(w - 25, y + 18, 'Click to add →', {
        fontSize: '8px', color: '#666666',
      }).setOrigin(1, 0));
    });

    this.maxScroll = Math.max(0, sorted.length * (rowH + gap) - (listBottom - listTop));

    // Close hint
    this.add.text(w / 2, h - 12, 'Press J or ESC to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Input
    this.input.keyboard.once('keydown-J', () => this.closePanel());
    this.input.keyboard.once('keydown-ESC', () => this.closePanel());

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
    });

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

  addCreature(template) {
    this.showGivePopup(template);
  }

  showGivePopup(template) {
    // Remove old popup if exists
    if (this.popupContainer) { this.popupContainer.destroy(); this.popupContainer = null; }
    if (this.usernameInput) { this.usernameInput.remove(); this.usernameInput = null; }
    if (this.levelInput) { this.levelInput.remove(); this.levelInput = null; }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const rarityColor = RARITY_COLORS[template.rarity] || 0xaaaaaa;
    const rarityHex = '#' + rarityColor.toString(16).padStart(6, '0');

    this.popupContainer = this.add.container(0, 0).setDepth(300);

    // Dim background
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setInteractive();
    this.popupContainer.add(dim);

    // Popup box
    const boxW = 280;
    const boxH = 240;
    const boxX = w / 2;
    const boxY = h / 2;
    this.popupContainer.add(
      this.add.rectangle(boxX, boxY, boxW, boxH, 0x1a1a2e)
        .setStrokeStyle(2, rarityColor)
    );

    // Title
    this.popupContainer.add(
      this.add.text(boxX, boxY - 80, `Give ${template.name}`, {
        fontSize: '16px', color: rarityHex, fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Creature sprite
    this.popupContainer.add(
      this.add.image(boxX, boxY - 50, `creature_${template.id}`).setScale(3)
    );

    // Username label
    this.popupContainer.add(
      this.add.text(boxX - 110, boxY - 20, 'Username:', {
        fontSize: '12px', color: '#aaaaaa',
      })
    );

    // HTML input for username
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;

    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = 'Enter username...';
    this.usernameInput.style.position = 'absolute';
    this.usernameInput.style.width = (220 * scaleX) + 'px';
    this.usernameInput.style.height = (22 * scaleY) + 'px';
    this.usernameInput.style.left = (canvasRect.left + (boxX - 110) * scaleX) + 'px';
    this.usernameInput.style.top = (canvasRect.top + (boxY - 2) * scaleY) + 'px';
    this.usernameInput.style.fontSize = (12 * scaleX) + 'px';
    this.usernameInput.style.background = '#0d1b2a';
    this.usernameInput.style.color = '#ffffff';
    this.usernameInput.style.border = '1px solid #42a5f5';
    this.usernameInput.style.borderRadius = '4px';
    this.usernameInput.style.padding = '2px 6px';
    this.usernameInput.style.outline = 'none';
    this.usernameInput.style.zIndex = '1000';
    this.usernameInput.addEventListener('keydown', (e) => e.stopPropagation());
    document.body.appendChild(this.usernameInput);
    this.usernameInput.focus();

    // Level label
    this.popupContainer.add(
      this.add.text(boxX - 110, boxY + 18, 'Level:', {
        fontSize: '12px', color: '#aaaaaa',
      })
    );

    // HTML input for level
    this.levelInput = document.createElement('input');
    this.levelInput.type = 'number';
    this.levelInput.min = '1';
    this.levelInput.max = '10000';
    this.levelInput.value = '5';
    this.levelInput.style.position = 'absolute';
    this.levelInput.style.width = (60 * scaleX) + 'px';
    this.levelInput.style.height = (22 * scaleY) + 'px';
    this.levelInput.style.left = (canvasRect.left + (boxX - 110) * scaleX) + 'px';
    this.levelInput.style.top = (canvasRect.top + (boxY + 36) * scaleY) + 'px';
    this.levelInput.style.fontSize = (12 * scaleX) + 'px';
    this.levelInput.style.background = '#0d1b2a';
    this.levelInput.style.color = '#ffffff';
    this.levelInput.style.border = '1px solid #42a5f5';
    this.levelInput.style.borderRadius = '4px';
    this.levelInput.style.padding = '2px 6px';
    this.levelInput.style.outline = 'none';
    this.levelInput.style.zIndex = '1000';
    this.levelInput.addEventListener('keydown', (e) => e.stopPropagation());
    document.body.appendChild(this.levelInput);

    // GIVE button
    const giveBtnW = 100;
    const giveBtnH = 32;
    const giveBtn = this.add.rectangle(boxX - 55, boxY + 65, giveBtnW, giveBtnH, 0x2e7d32)
      .setStrokeStyle(1, 0x66bb6a)
      .setInteractive({ useHandCursor: true });
    this.popupContainer.add(giveBtn);
    this.popupContainer.add(
      this.add.text(boxX - 55, boxY + 65, 'GIVE', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5)
    );
    giveBtn.on('pointerover', () => giveBtn.setFillStyle(0x388e3c));
    giveBtn.on('pointerout', () => giveBtn.setFillStyle(0x2e7d32));
    giveBtn.on('pointerdown', () => this.giveToPlayer(template));

    // GIVE ALL button
    const giveAllBtn = this.add.rectangle(boxX + 55, boxY + 65, giveBtnW, giveBtnH, 0xc62828)
      .setStrokeStyle(1, 0xef5350)
      .setInteractive({ useHandCursor: true });
    this.popupContainer.add(giveAllBtn);
    this.popupContainer.add(
      this.add.text(boxX + 55, boxY + 65, 'GIVE ALL', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5)
    );
    giveAllBtn.on('pointerover', () => giveAllBtn.setFillStyle(0xd32f2f));
    giveAllBtn.on('pointerout', () => giveAllBtn.setFillStyle(0xc62828));
    giveAllBtn.on('pointerdown', () => this.giveToAll(template));

    // CANCEL button
    const cancelBtn = this.add.text(boxX, boxY + 100, 'CANCEL', {
      fontSize: '11px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.popupContainer.add(cancelBtn);
    cancelBtn.on('pointerdown', () => this.closePopup());
  }

  getLevel() {
    const val = this.levelInput ? parseInt(this.levelInput.value) : 5;
    return Math.max(1, Math.min(10000, val || 5));
  }

  async giveToPlayer(template) {
    const username = this.usernameInput ? this.usernameInput.value.trim() : '';
    if (!username) {
      this.showPopupMessage('Enter a username!', '#ff4444');
      return;
    }

    const creature = createCreatureInstance(template, this.getLevel());
    try {
      const resp = await fetch('/api/give-creature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username, creature }),
      });
      const data = await resp.json();
      if (data.ok) {
        this.closePopup();
        this.showNotification(`Gave ${template.name} to ${data.displayName}!`, template);
        // If giving to self, update local data too
        const myUsername = this.registry.get('username') || '';
        if (username.toLowerCase() === myUsername.toLowerCase()) {
          const playerData = this.registry.get('playerData');
          playerData.creatures.push(creature);
          this.registry.set('playerData', playerData);
        }
      } else {
        this.showPopupMessage(data.error || 'Failed', '#ff4444');
      }
    } catch (err) {
      this.showPopupMessage('Server error', '#ff4444');
    }
  }

  async giveToAll(template) {
    const creature = createCreatureInstance(template, this.getLevel());
    try {
      const resp = await fetch('/api/give-creature-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creature }),
      });
      const data = await resp.json();
      if (data.ok) {
        this.closePopup();
        this.showNotification(`Gave ${template.name} to ${data.count} players!`, template);
        // Update local data too
        const playerData = this.registry.get('playerData');
        playerData.creatures.push({ ...creature });
        this.registry.set('playerData', playerData);
      } else {
        this.showPopupMessage(data.error || 'Failed', '#ff4444');
      }
    } catch (err) {
      this.showPopupMessage('Server error', '#ff4444');
    }
  }

  showPopupMessage(text, color) {
    if (this.popupMsg) this.popupMsg.destroy();
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.popupMsg = this.add.text(w / 2, h / 2 + 68, text, {
      fontSize: '11px', color: color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(400);
    this.time.delayedCall(2000, () => { if (this.popupMsg) this.popupMsg.destroy(); });
  }

  showNotification(text, template) {
    this.cameras.main.flash(200, 100, 255, 100);
    const w = this.cameras.main.width;
    const rarityHex = '#' + (RARITY_COLORS[template.rarity] || 0xaaaaaa).toString(16).padStart(6, '0');
    const msg = this.add.text(w / 2, 50, text, {
      fontSize: '14px', color: rarityHex, fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: msg, alpha: 0, y: 35, duration: 1200, onComplete: () => msg.destroy(),
    });
  }

  closePopup() {
    if (this.popupContainer) { this.popupContainer.destroy(); this.popupContainer = null; }
    if (this.usernameInput) { this.usernameInput.remove(); this.usernameInput = null; }
    if (this.levelInput) { this.levelInput.remove(); this.levelInput = null; }
    if (this.popupMsg) { this.popupMsg.destroy(); this.popupMsg = null; }
  }

  update() {
    if (this.currentPage !== 'creatures' || !this.maxScroll || this.maxScroll <= 0) return;
    const scrollSpeed = 4;
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.scrollY = Math.max(0, this.scrollY - scrollSpeed);
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.scrollY = Math.min(this.maxScroll, this.scrollY + scrollSpeed);
    }
    this.listContainer.y = -this.scrollY;
  }

  closePanel() {
    this.closePopup();
    this.scene.stop('AdminPanel');
    this.scene.resume('World');
  }
}
