import Phaser from 'phaser';

const GENRES = [
  { name: 'Action', color: 0xe53935, emoji: '💥' },
  { name: 'Comedy', color: 0xffd600, emoji: '😂' },
  { name: 'Horror', color: 0x4a148c, emoji: '👻' },
  { name: 'Sci-Fi', color: 0x00bcd4, emoji: '🚀' },
  { name: 'Romance', color: 0xec407a, emoji: '💖' },
  { name: 'Fantasy', color: 0x7e57c2, emoji: '🐉' },
];

const STARS = [
  { name: 'Buff Bob', color: 0xff7043 },
  { name: 'Sassy Sue', color: 0xf06292 },
  { name: 'Mystic Max', color: 0x7e57c2 },
  { name: 'Ninja Nora', color: 0x212121 },
  { name: 'Robo Rex', color: 0x90a4ae },
  { name: 'Princess Pip', color: 0xffd600 },
];

const SETTINGS = [
  { name: 'Outer Space', color: 0x0d47a1 },
  { name: 'Haunted Castle', color: 0x311b92 },
  { name: 'Neon City', color: 0xe91e63 },
  { name: 'Jungle Temple', color: 0x2e7d32 },
  { name: 'Ice Mountain', color: 0x81d4fa },
  { name: 'Pirate Island', color: 0x795548 },
];

const PLOTS = [
  'saves the world',
  'steals a diamond',
  'finds true love',
  'fights 1000 ninjas',
  'gets lost in time',
  'builds a giant robot',
];

const WORDS_A = ['The', 'Return of', 'Escape from', 'Legend of', 'Revenge of', 'Rise of'];
const WORDS_B = ['Doom', 'Destiny', 'Shadows', 'Glory', 'Thunder', 'Midnight'];

export class CreateMovieScene extends Phaser.Scene {
  constructor() {
    super('CreateMovie');
  }

  create() {
    this.choices = { genre: null, star: null, setting: null, plot: null };
    this.step = 0;
    this.steps = [
      { key: 'genre', label: 'Pick a Genre', options: GENRES },
      { key: 'star', label: 'Pick a Movie Star', options: STARS },
      { key: 'setting', label: 'Pick a Setting', options: SETTINGS },
      { key: 'plot', label: 'Pick a Plot', options: PLOTS.map((p) => ({ name: p, color: 0x546e7a })) },
    ];
    this.buildUI();
  }

  buildUI() {
    this.children.removeAll(true);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x100a1a);

    // Film-strip decoration on sides
    for (let i = 0; i < 8; i++) {
      this.add.rectangle(20, 40 + i * 75, 25, 55, 0x1a1a1a).setStrokeStyle(1, 0x333333);
      this.add.rectangle(20, 40 + i * 75, 15, 45, 0x000000);
      this.add.rectangle(w - 20, 40 + i * 75, 25, 55, 0x1a1a1a).setStrokeStyle(1, 0x333333);
      this.add.rectangle(w - 20, 40 + i * 75, 15, 45, 0x000000);
    }

    // Title
    this.add.text(w / 2, 25, 'CREATE A MOVIE', {
      fontSize: '24px', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(60, 20, '← BACK', {
      fontSize: '12px', color: '#42a5f5', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Homepage'));

    if (this.step < this.steps.length) {
      this.renderPicker();
    } else {
      this.renderPoster();
    }
  }

  renderPicker() {
    const w = this.cameras.main.width;
    const step = this.steps[this.step];

    // Progress dots
    for (let i = 0; i < this.steps.length; i++) {
      const col = i < this.step ? 0x66bb6a : i === this.step ? 0xffd600 : 0x444444;
      this.add.circle(w / 2 - 45 + i * 30, 60, 6, col);
    }

    // Step label
    this.add.text(w / 2, 90, `Step ${this.step + 1}: ${step.label}`, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Option grid: 3 cols, 2 rows
    const cols = 3;
    const cardW = 180;
    const cardH = 130;
    const gapX = 20;
    const gapY = 20;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = w / 2 - gridW / 2 + cardW / 2;
    const startY = 180;

    step.options.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      const card = this.add.rectangle(x, y, cardW, cardH, opt.color)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, y, opt.name, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        align: 'center', wordWrap: { width: cardW - 20 },
      }).setOrigin(0.5);

      card.on('pointerover', () => { card.setStrokeStyle(4, 0xffd600); card.setScale(1.05); });
      card.on('pointerout', () => { card.setStrokeStyle(2, 0xffffff); card.setScale(1); });
      card.on('pointerdown', () => {
        this.choices[step.key] = opt;
        this.step++;
        this.buildUI();
      });
    });
  }

  renderPoster() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Generate title
    const titleA = Phaser.Utils.Array.GetRandom(WORDS_A);
    const titleB = Phaser.Utils.Array.GetRandom(WORDS_B);
    const title = `${titleA} ${titleB}`;

    // Poster frame
    const posterX = w / 2 - 140;
    const posterY = h / 2 + 10;
    const posterW = 220;
    const posterH = 320;

    // Background gradient effect via stacked rects
    this.add.rectangle(posterX, posterY, posterW + 12, posterH + 12, 0xffd600);
    this.add.rectangle(posterX, posterY, posterW, posterH, this.choices.setting.color);

    // Star silhouette
    this.add.circle(posterX, posterY - 60, 40, this.choices.star.color);
    this.add.rectangle(posterX, posterY - 10, 60, 80, this.choices.star.color);

    // Genre badge
    this.add.rectangle(posterX + posterW / 2 - 40, posterY - posterH / 2 + 20, 70, 25, this.choices.genre.color)
      .setStrokeStyle(1, 0xffffff);
    this.add.text(posterX + posterW / 2 - 40, posterY - posterH / 2 + 20, this.choices.genre.name, {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Movie title
    this.add.text(posterX, posterY + 80, title, {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
      align: 'center', wordWrap: { width: posterW - 20 },
    }).setOrigin(0.5);

    // Tagline
    this.add.text(posterX, posterY + 120, `${this.choices.star.name} ${this.choices.plot.name}`, {
      fontSize: '10px', color: '#ffffff', fontStyle: 'italic',
      align: 'center', wordWrap: { width: posterW - 20 },
    }).setOrigin(0.5);

    // Right side: rating panel
    const panelX = w / 2 + 160;

    this.add.text(panelX, 100, 'YOUR MOVIE', {
      fontSize: '16px', color: '#ffd600', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Random rating out of 5 stars
    const rating = Phaser.Math.Between(1, 5);
    this.add.text(panelX, 130, 'Rating', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);
    let starStr = '';
    for (let i = 0; i < 5; i++) starStr += i < rating ? '★' : '☆';
    this.add.text(panelX, 155, starStr, {
      fontSize: '28px', color: '#ffd600',
    }).setOrigin(0.5);

    // Box office
    const boxOffice = Phaser.Math.Between(1, 999);
    this.add.text(panelX, 195, 'Box Office', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add.text(panelX, 215, `$${boxOffice}M`, {
      fontSize: '20px', color: '#66bb6a', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Review quote
    const reviews = [
      '"Absolute masterpiece!"',
      '"A wild ride!"',
      '"Weird but I liked it"',
      '"Two thumbs up!"',
      '"Unforgettable"',
      '"Pure cinema!"',
    ];
    const review = Phaser.Utils.Array.GetRandom(reviews);
    this.add.text(panelX, 260, review, {
      fontSize: '11px', color: '#ffab40', fontStyle: 'italic',
      align: 'center', wordWrap: { width: 180 },
    }).setOrigin(0.5);
    this.add.text(panelX, 280, '— The Daily Film', {
      fontSize: '9px', color: '#888888',
    }).setOrigin(0.5);

    // Make Another button
    const btnY = h - 50;
    const btn = this.add.rectangle(panelX, btnY, 180, 36, 0x2e7d32)
      .setStrokeStyle(2, 0x66bb6a)
      .setInteractive({ useHandCursor: true });
    this.add.text(panelX, btnY, 'MAKE ANOTHER', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x388e3c));
    btn.on('pointerout', () => btn.setFillStyle(0x2e7d32));
    btn.on('pointerdown', () => {
      this.choices = { genre: null, star: null, setting: null, plot: null };
      this.step = 0;
      this.buildUI();
    });
  }
}
