import Phaser from 'phaser';

const OUTFITS = [
  'Default Blue', 'Red Hoodie', 'Green Explorer', 'Purple Wizard', 'Gold Champion',
  'Pink Casual', 'Black Ninja', 'White Knight', 'Orange Adventurer', 'Cyan Surfer',
  'Yellow Builder', 'Camo Ranger', 'Royal Blue', 'Lava', 'Ice',
  'Shadow', 'Sunset', 'Forest', 'Ocean', 'Neon',
];

const HATS = ['None', 'Cap', 'Beanie', 'Crown', 'Headband'];

export class Avatar3DScene extends Phaser.Scene {
  constructor() {
    super('Avatar3D');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const avatar = this.registry.get('avatar') || { outfit: 0, hat: 0 };
    this.selectedOutfit = avatar.outfit;
    this.selectedHat = avatar.hat;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    // Title
    this.add.text(w / 2, 20, '3D AVATAR', {
      fontSize: '24px', color: '#ffab40', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '← BACK', {
      fontSize: '12px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Homepage'));

    // --- Preview area (left side) ---
    this.add.text(130, 50, 'PREVIEW', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    // Preview background with 3D pedestal
    this.add.rectangle(130, 155, 140, 160, 0x1a1a2e)
      .setStrokeStyle(2, 0x333366);

    // Pedestal
    const platGfx = this.add.graphics();
    platGfx.fillStyle(0x2a2a4e);
    platGfx.fillEllipse(130, 220, 90, 20);
    platGfx.fillStyle(0x1a1a3e);
    platGfx.fillRect(85, 220, 90, 10);
    platGfx.fillStyle(0x12122e);
    platGfx.fillEllipse(130, 230, 90, 20);

    // Shadow
    this.previewShadow = this.add.ellipse(130, 212, 50, 12, 0x000000, 0.4);

    // 3D avatar shadow copy
    this.previewDepth = this.add.image(133, 153, `avatar3d_${this.selectedOutfit}_${this.selectedHat}`)
      .setScale(3).setTint(0x000000).setAlpha(0.3);

    // 3D avatar preview
    this.previewSprite = this.add.image(130, 150, `avatar3d_${this.selectedOutfit}_${this.selectedHat}`)
      .setScale(3);

    // Float animation
    this.tweens.add({
      targets: this.previewSprite, y: 145, duration: 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.previewDepth, y: 148, duration: 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.previewShadow, scaleX: 0.85, scaleY: 0.85, duration: 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Selected outfit name
    this.outfitLabel = this.add.text(130, 245, OUTFITS[this.selectedOutfit], {
      fontSize: '11px', color: '#ffab40',
    }).setOrigin(0.5);

    // Selected hat name
    this.hatLabel = this.add.text(130, 260, `Hat: ${HATS[this.selectedHat]}`, {
      fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // --- Outfit grid (right side) ---
    this.add.text(460, 42, 'OUTFITS', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    const gridCols = 5;
    const cellSize = 44;
    const gridGap = 4;
    const gridStartX = 460 - (gridCols * (cellSize + gridGap)) / 2 + cellSize / 2;
    const gridStartY = 70;

    this.outfitHighlights = [];

    for (let i = 0; i < OUTFITS.length; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const cx = gridStartX + col * (cellSize + gridGap);
      const cy = gridStartY + row * (cellSize + gridGap);

      const isSelected = i === this.selectedOutfit;
      const cell = this.add.rectangle(cx, cy, cellSize, cellSize, 0x16213e)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffab40 : 0x333366)
        .setInteractive({ useHandCursor: true });

      // 3D thumbnail
      this.add.image(cx, cy, `avatar3d_${i}_${this.selectedHat}`).setScale(0.6);

      cell.on('pointerdown', () => {
        this.selectedOutfit = i;
        this.updatePreview();
      });

      this.outfitHighlights.push(cell);
    }

    // --- Hat row ---
    this.add.text(460, 270, 'HATS', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    const hatStartX = 460 - (HATS.length * (cellSize + gridGap)) / 2 + cellSize / 2;
    const hatY = 298;

    this.hatHighlights = [];

    for (let h = 0; h < HATS.length; h++) {
      const cx = hatStartX + h * (cellSize + gridGap);

      const isSelected = h === this.selectedHat;
      const cell = this.add.rectangle(cx, hatY, cellSize, cellSize, 0x16213e)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffab40 : 0x333366)
        .setInteractive({ useHandCursor: true });

      this.add.image(cx, hatY, `avatar3d_${this.selectedOutfit}_${h}`).setScale(0.6);

      cell.on('pointerdown', () => {
        this.selectedHat = h;
        this.updatePreview();
      });

      this.hatHighlights.push(cell);

      this.add.text(cx, hatY + 26, HATS[h], {
        fontSize: '7px', color: '#666666',
      }).setOrigin(0.5);
    }

    // --- Save button ---
    // Shadow
    this.add.rectangle(133, 303, 120, 36, 0x000000, 0.3);
    const saveBtn = this.add.rectangle(130, 300, 120, 36, 0x2e7d32)
      .setStrokeStyle(2, 0x66bb6a)
      .setInteractive({ useHandCursor: true });
    this.add.text(130, 300, 'SAVE', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x388e3c));
    saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x2e7d32));
    saveBtn.on('pointerdown', () => this.saveAvatar());

    // Status text
    this.statusText = this.add.text(130, 330, '', {
      fontSize: '10px', color: '#66bb6a',
    }).setOrigin(0.5);
  }

  updatePreview() {
    const key = `avatar3d_${this.selectedOutfit}_${this.selectedHat}`;
    this.previewSprite.setTexture(key);
    this.previewDepth.setTexture(key);
    this.outfitLabel.setText(OUTFITS[this.selectedOutfit]);
    this.hatLabel.setText(`Hat: ${HATS[this.selectedHat]}`);

    this.outfitHighlights.forEach((cell, i) => {
      cell.setStrokeStyle(i === this.selectedOutfit ? 2 : 1, i === this.selectedOutfit ? 0xffab40 : 0x333366);
    });
    this.hatHighlights.forEach((cell, i) => {
      cell.setStrokeStyle(i === this.selectedHat ? 2 : 1, i === this.selectedHat ? 0xffab40 : 0x333366);
    });
  }

  async saveAvatar() {
    const username = this.registry.get('username');
    const avatar = { outfit: this.selectedOutfit, hat: this.selectedHat };

    try {
      const resp = await fetch('/api/save-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar }),
      });
      const data = await resp.json();
      if (data.ok) {
        this.registry.set('avatar', avatar);
        this.statusText.setText('Saved!');
        this.time.delayedCall(800, () => this.scene.start('Homepage'));
      } else {
        this.statusText.setText(data.error || 'Failed to save');
        this.statusText.setColor('#ff4444');
      }
    } catch {
      this.statusText.setText('Connection error');
      this.statusText.setColor('#ff4444');
    }
  }
}
