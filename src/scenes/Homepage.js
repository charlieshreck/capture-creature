import Phaser from 'phaser';

export class HomepageScene extends Phaser.Scene {
  constructor() {
    super('Homepage');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const username = this.registry.get('username') || 'Player';
    const avatar = this.registry.get('avatar') || { outfit: 0, hat: 0 };
    const avKey = `avatar_${avatar.outfit}_${avatar.hat}`;

    // Dark background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    // Stars background
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
      const star = this.add.circle(sx, sy, size, 0xffffff, alpha);
      this.tweens.add({
        targets: star, alpha: 0.1, duration: Phaser.Math.Between(1000, 3000),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Title
    const title = this.add.text(w / 2, 30, 'GAME HUB', {
      fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title, y: 35, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // --- Top-right buttons ---
    // --- Top-right buttons ---
    const av3dKey = `avatar3d_${avatar.outfit}_${avatar.hat}`;
    const btnW = 90;
    const btnH = 85;
    const btnY = 48;

    // === Pixel Avatar button ===
    const pxX = w - 150;

    // Shadow
    this.add.rectangle(pxX + 3, btnY + 3, btnW, btnH, 0x000000, 0.4);
    // Face
    const pxBtn = this.add.rectangle(pxX, btnY, btnW, btnH, 0x1a1a3e)
      .setStrokeStyle(2, 0x42a5f5)
      .setInteractive({ useHandCursor: true });
    // Bottom edge
    this.add.rectangle(pxX, btnY + btnH / 2, btnW, 5, 0x0f0f28);
    // Mini pixel avatar
    this.add.image(pxX + 1, btnY - 8, avKey).setScale(3).setTint(0x000000).setAlpha(0.25);
    this.add.image(pxX, btnY - 10, avKey).setScale(3);
    this.add.ellipse(pxX, btnY + 14, 28, 7, 0x000000, 0.3);
    // Label
    this.add.text(pxX, btnY + 28, 'PIXEL', {
      fontSize: '10px', color: '#42a5f5', fontStyle: 'bold',
    }).setOrigin(0.5);

    pxBtn.on('pointerover', () => pxBtn.setStrokeStyle(3, 0xffffff));
    pxBtn.on('pointerout', () => pxBtn.setStrokeStyle(2, 0x42a5f5));
    pxBtn.on('pointerdown', () => this.scene.start('Avatar'));

    // === 3D Avatar button ===
    const tdX = w - 52;

    // Shadow
    this.add.rectangle(tdX + 3, btnY + 3, btnW, btnH, 0x000000, 0.4);
    // Face
    const tdBtn = this.add.rectangle(tdX, btnY, btnW, btnH, 0x1a1a3e)
      .setStrokeStyle(2, 0xffab40)
      .setInteractive({ useHandCursor: true });
    // Bottom edge
    this.add.rectangle(tdX, btnY + btnH / 2, btnW, 5, 0x0f0f28);
    // Mini 3D avatar
    this.add.image(tdX + 1, btnY - 6, av3dKey).setScale(1.5).setTint(0x000000).setAlpha(0.25);
    this.add.image(tdX, btnY - 8, av3dKey).setScale(1.5);
    this.add.ellipse(tdX, btnY + 16, 28, 7, 0x000000, 0.3);
    // Label
    this.add.text(tdX, btnY + 28, '3D', {
      fontSize: '10px', color: '#ffab40', fontStyle: 'bold',
    }).setOrigin(0.5);

    tdBtn.on('pointerover', () => tdBtn.setStrokeStyle(3, 0xffffff));
    tdBtn.on('pointerout', () => tdBtn.setStrokeStyle(2, 0xffab40));
    tdBtn.on('pointerdown', () => this.scene.start('Avatar3D'));

    // === Log out button (below both) ===
    const loX = w - 100;
    const loY = 105;
    this.add.rectangle(loX + 2, loY + 2, 100, 22, 0x000000, 0.3);
    const logoutBtn = this.add.rectangle(loX, loY, 100, 22, 0x1a1a2e)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.add.text(loX, loY, 'LOG OUT', {
      fontSize: '9px', color: '#888888',
    }).setOrigin(0.5);
    logoutBtn.on('pointerover', () => logoutBtn.setStrokeStyle(1, 0xff4444));
    logoutBtn.on('pointerout', () => logoutBtn.setStrokeStyle(1, 0x444444));
    logoutBtn.on('pointerdown', () => {
      let token = null;
      try { token = localStorage.getItem('cc_session'); localStorage.removeItem('cc_session'); } catch {}
      if (token) {
        fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      this.registry.set('username', null);
      this.registry.set('serverGameData', null);
      this.scene.start('Login');
    });

    // --- 3D Roblox Avatar display (left side) ---
    const avX = 140;
    const avY = h / 2 + 10;

    // Platform / pedestal (3D effect)
    const platGfx = this.add.graphics();
    // Top of platform (lighter)
    platGfx.fillStyle(0x2a2a4e);
    platGfx.fillEllipse(avX, avY + 85, 130, 32);
    // Front of platform (darker)
    platGfx.fillStyle(0x1a1a3e);
    platGfx.fillRect(avX - 65, avY + 85, 130, 15);
    platGfx.fillStyle(0x12122e);
    platGfx.fillEllipse(avX, avY + 100, 130, 32);

    // Shadow under character
    const shadow = this.add.ellipse(avX, avY + 78, 70, 18, 0x000000, 0.4);

    // Big 3D Roblox avatar sprite
    const bigAvatar = this.add.image(avX, avY, av3dKey).setScale(4);

    // 3D depth effect — darker copy behind offset slightly
    const avatarShadow = this.add.image(avX + 4, avY + 4, av3dKey)
      .setScale(4).setTint(0x000000).setAlpha(0.3);
    avatarShadow.setDepth(0);
    bigAvatar.setDepth(1);

    // Gentle float animation
    this.tweens.add({
      targets: [bigAvatar],
      y: avY - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: [avatarShadow],
      y: avY - 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Shadow scales with float
    this.tweens.add({
      targets: shadow,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Username under avatar
    this.add.text(avX, avY + 95, username, {
      fontSize: '14px', color: '#ffab40', fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Game cards (right side) ---
    const cardX = w / 2 + 120;

    // Welcome
    this.add.text(cardX, 70, `Welcome, ${username}!`, {
      fontSize: '14px', color: '#ffab40',
    }).setOrigin(0.5);

    this.add.text(cardX, 90, 'Choose a game to play', {
      fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);

    // --- Scrollable game list ---
    const games = [
      {
        title: 'CAPTURE CREATURE',
        description: 'Explore, battle, and capture wild creatures!',
        color: 0x1b5e20,
        borderColor: 0x66bb6a,
        icon: 'creature_1',
        onClick: () => this.scene.start('World'),
      },
      {
        title: 'CREATE A MOVIE',
        description: 'Pick a genre, star, and plot — make your own film!',
        color: 0x311b92,
        borderColor: 0xffd600,
        icon: null,
        onClick: () => this.scene.start('CreateMovie'),
      },
      {
        title: 'WIN A BRAINROT',
        description: 'Play mini-games, earn coins, collect brainrots!',
        color: 0x4a1a00,
        borderColor: 0xff6644,
        icon: 'brainrot_0',
        onClick: () => this.scene.start('BrainrotHub'),
      },
    ];

    const viewTop = 110;
    const viewBottom = h - 30;
    const viewH = viewBottom - viewTop;
    const viewW = 360;
    const cardSpacing = 135;

    // Panel background for the scroll area
    this.add.rectangle(cardX, viewTop + viewH / 2, viewW + 10, viewH + 10, 0x000000, 0.35)
      .setStrokeStyle(1, 0x333355);

    // Mask so cards are clipped to the visible scroll window
    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(cardX - viewW / 2, viewTop, viewW, viewH);
    const mask = maskGfx.createGeometryMask();

    // Scroll container
    this.cardContainer = this.add.container(0, 0);
    this.cardContainer.setMask(mask);

    games.forEach((g, i) => {
      const y = viewTop + 60 + i * cardSpacing;
      this.createGameCard(cardX, y, g, g.onClick, this.cardContainer);
    });

    // Scroll state
    const contentH = games.length * cardSpacing;
    const minY = Math.min(0, viewH - contentH - 20);
    const maxY = 0;
    this.scrollY = 0;

    const applyScroll = () => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY, minY, maxY);
      this.cardContainer.y = this.scrollY;
    };

    // Mouse wheel scrolls when hovering the card area
    this.input.on('wheel', (pointer, over, dx, dy) => {
      if (pointer.x >= cardX - viewW / 2 && pointer.x <= cardX + viewW / 2
          && pointer.y >= viewTop && pointer.y <= viewBottom) {
        this.scrollY -= dy * 0.5;
        applyScroll();
      }
    });

    // Touch drag: track pointer globally; distinguish drag from click with a distance threshold
    let startY = null;
    let startScroll = 0;
    let dragged = false;
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x >= cardX - viewW / 2 && pointer.x <= cardX + viewW / 2
          && pointer.y >= viewTop && pointer.y <= viewBottom) {
        startY = pointer.y;
        startScroll = this.scrollY;
        dragged = false;
      } else {
        startY = null;
      }
    });
    this.input.on('pointermove', (pointer) => {
      if (startY !== null && pointer.isDown) {
        const delta = pointer.y - startY;
        if (Math.abs(delta) > 6) dragged = true;
        if (dragged) {
          this.scrollY = startScroll + delta;
          applyScroll();
        }
      }
    });
    this.input.on('pointerup', () => { startY = null; });
    this.scrollWasDragged = () => dragged;

    // Scroll hint (only if scrollable)
    if (contentH > viewH) {
      const hint = this.add.text(cardX, viewBottom + 5, '↕ scroll for more', {
        fontSize: '10px', color: '#666666',
      }).setOrigin(0.5);
      this.tweens.add({
        targets: hint, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1,
      });
    }

    // Footer
    this.add.text(w / 2, h - 15, 'Made by Albie', {
      fontSize: '10px', color: '#444444',
    }).setOrigin(0.5);
  }

  createGameCard(x, y, opts, onClick, container) {
    const cardW = 340;
    const cardH = 120;
    const add = (obj) => { if (container) container.add(obj); return obj; };

    // Card background
    const card = add(this.add.rectangle(x, y, cardW, cardH, opts.color)
      .setStrokeStyle(2, opts.borderColor));

    if (!opts.disabled) {
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => {
        card.setStrokeStyle(3, 0xffffff);
      });
      card.on('pointerout', () => {
        card.setStrokeStyle(2, opts.borderColor);
      });
      card.on('pointerup', () => {
        if (this.scrollWasDragged && this.scrollWasDragged()) return;
        onClick();
      });
    }

    // Icon
    if (opts.icon) {
      add(this.add.image(x - cardW / 2 + 40, y - 5, opts.icon).setScale(3));
    } else {
      add(this.add.text(x - cardW / 2 + 40, y, '?', {
        fontSize: '32px', color: '#333355', fontStyle: 'bold',
      }).setOrigin(0.5));
    }

    // Title
    const titleColor = opts.disabled ? '#555555' : '#ffffff';
    add(this.add.text(x - cardW / 2 + 80, y - 25, opts.title, {
      fontSize: '16px', color: titleColor, fontStyle: 'bold',
    }));

    // Description
    const descColor = opts.disabled ? '#444444' : '#aaaaaa';
    add(this.add.text(x - cardW / 2 + 80, y + 2, opts.description, {
      fontSize: '10px', color: descColor,
    }));

    // Play button
    if (!opts.disabled && onClick) {
      const btnW = 80;
      const btnH = 28;
      const btnX = x - cardW / 2 + 120;
      const btnY = y + 35;
      const btn = add(this.add.rectangle(btnX, btnY, btnW, btnH, 0x2e7d32)
        .setStrokeStyle(1, 0x66bb6a)
        .setInteractive({ useHandCursor: true }));
      add(this.add.text(btnX, btnY, 'PLAY', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      btn.on('pointerover', () => btn.setFillStyle(0x388e3c));
      btn.on('pointerout', () => btn.setFillStyle(0x2e7d32));
      btn.on('pointerup', () => {
        if (this.scrollWasDragged && this.scrollWasDragged()) return;
        onClick();
      });
    }
  }
}
