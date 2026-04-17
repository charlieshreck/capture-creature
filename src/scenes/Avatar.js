import Phaser from 'phaser';

const OUTFITS = [
  'Default Blue', 'Red Hoodie', 'Green Explorer', 'Purple Wizard', 'Gold Champion',
  'Pink Casual', 'Black Ninja', 'White Knight', 'Orange Adventurer', 'Cyan Surfer',
  'Yellow Builder', 'Camo Ranger', 'Royal Blue', 'Lava', 'Ice',
  'Shadow', 'Sunset', 'Forest', 'Ocean', 'Neon',
];

const HATS = ['None', 'Cap', 'Beanie', 'Crown', 'Headband'];

export class AvatarScene extends Phaser.Scene {
  constructor() {
    super('Avatar');
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
    this.add.text(w / 2, 20, 'AVATAR', {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '← BACK', {
      fontSize: '12px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Homepage'));

    // --- Preview area (left side) ---
    this.add.text(120, 50, 'PREVIEW', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    // Preview background
    this.add.rectangle(120, 140, 100, 100, 0x1a1a2e)
      .setStrokeStyle(2, 0x333366);

    this.previewSprite = this.add.image(120, 140, `avatar_${this.selectedOutfit}_${this.selectedHat}`)
      .setScale(6);

    // Selected outfit name
    this.outfitLabel = this.add.text(120, 205, OUTFITS[this.selectedOutfit], {
      fontSize: '11px', color: '#ffab40',
    }).setOrigin(0.5);

    // Selected hat name
    this.hatLabel = this.add.text(120, 220, `Hat: ${HATS[this.selectedHat]}`, {
      fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // --- Outfit grid (right side) ---
    this.add.text(450, 42, 'OUTFITS', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    const gridCols = 5;
    const cellSize = 40;
    const gridGap = 4;
    const gridStartX = 450 - (gridCols * (cellSize + gridGap)) / 2 + cellSize / 2;
    const gridStartY = 65;

    this.outfitHighlights = [];

    for (let i = 0; i < OUTFITS.length; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const cx = gridStartX + col * (cellSize + gridGap);
      const cy = gridStartY + row * (cellSize + gridGap);

      // Cell background
      const isSelected = i === this.selectedOutfit;
      const cell = this.add.rectangle(cx, cy, cellSize, cellSize, 0x16213e)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffab40 : 0x333366)
        .setInteractive({ useHandCursor: true });

      // Thumbnail
      this.add.image(cx, cy, `avatar_${i}_${this.selectedHat}`).setScale(2);

      cell.on('pointerdown', () => {
        this.selectedOutfit = i;
        this.updatePreview();
      });

      this.outfitHighlights.push(cell);
    }

    // Outfit name tooltips on hover
    // (skipping to keep it simple)

    // --- Hat row ---
    this.add.text(450, 250, 'HATS', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    const hatStartX = 450 - (HATS.length * (cellSize + gridGap)) / 2 + cellSize / 2;
    const hatY = 278;

    this.hatHighlights = [];

    for (let h = 0; h < HATS.length; h++) {
      const cx = hatStartX + h * (cellSize + gridGap);

      const isSelected = h === this.selectedHat;
      const cell = this.add.rectangle(cx, hatY, cellSize, cellSize, 0x16213e)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffab40 : 0x333366)
        .setInteractive({ useHandCursor: true });

      this.add.image(cx, hatY, `avatar_${this.selectedOutfit}_${h}`).setScale(2);

      cell.on('pointerdown', () => {
        this.selectedHat = h;
        this.updatePreview();
      });

      this.hatHighlights.push(cell);

      // Label below
      this.add.text(cx, hatY + 24, HATS[h], {
        fontSize: '7px', color: '#666666',
      }).setOrigin(0.5);
    }

    // --- Save button ---
    const saveBtnW = 120;
    const saveBtnH = 36;
    const saveBtn = this.add.rectangle(120, 270, saveBtnW, saveBtnH, 0x2e7d32)
      .setStrokeStyle(2, 0x66bb6a)
      .setInteractive({ useHandCursor: true });
    this.add.text(120, 270, 'SAVE', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x388e3c));
    saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x2e7d32));
    saveBtn.on('pointerdown', () => this.saveAvatar());

    // Status text
    this.statusText = this.add.text(120, 300, '', {
      fontSize: '10px', color: '#66bb6a',
    }).setOrigin(0.5);
  }

  updatePreview() {
    const key = `avatar_${this.selectedOutfit}_${this.selectedHat}`;
    this.previewSprite.setTexture(key);
    this.outfitLabel.setText(OUTFITS[this.selectedOutfit]);
    this.hatLabel.setText(`Hat: ${HATS[this.selectedHat]}`);

    // Update highlights
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
