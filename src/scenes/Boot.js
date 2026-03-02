import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Generate all textures procedurally — no external assets needed to start
    this.generateTextures();

    // Show loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.rectangle(w / 2, h / 2, 300, 20, 0x333333);
    const fill = this.add.rectangle(w / 2 - 148, h / 2, 4, 16, 0x66bb6a);
    this.add.text(w / 2, h / 2 - 30, 'Loading...', {
      fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (val) => {
      fill.width = 296 * val;
      fill.x = w / 2 - 148 + fill.width / 2;
    });
  }

  generateTextures() {
    // Player sprite (16x16 character)
    const playerGfx = this.make.graphics({ add: false });
    // Body
    playerGfx.fillStyle(0x4fc3f7);
    playerGfx.fillRect(4, 4, 8, 8);
    // Head
    playerGfx.fillStyle(0xffcc80);
    playerGfx.fillRect(5, 1, 6, 5);
    // Eyes
    playerGfx.fillStyle(0x333333);
    playerGfx.fillRect(6, 3, 1, 1);
    playerGfx.fillRect(9, 3, 1, 1);
    // Legs
    playerGfx.fillStyle(0x3949ab);
    playerGfx.fillRect(5, 12, 2, 3);
    playerGfx.fillRect(9, 12, 2, 3);
    playerGfx.generateTexture('player', 16, 16);
    playerGfx.destroy();

    // Grass tile
    const grassGfx = this.make.graphics({ add: false });
    grassGfx.fillStyle(0x4caf50);
    grassGfx.fillRect(0, 0, 16, 16);
    grassGfx.fillStyle(0x388e3c);
    grassGfx.fillRect(2, 3, 2, 3);
    grassGfx.fillRect(8, 7, 2, 4);
    grassGfx.fillRect(12, 2, 2, 3);
    grassGfx.generateTexture('grass', 16, 16);
    grassGfx.destroy();

    // Tall grass (creature encounter zone)
    const tallGrassGfx = this.make.graphics({ add: false });
    tallGrassGfx.fillStyle(0x2e7d32);
    tallGrassGfx.fillRect(0, 0, 16, 16);
    tallGrassGfx.fillStyle(0x1b5e20);
    tallGrassGfx.fillRect(1, 0, 2, 10);
    tallGrassGfx.fillRect(5, 0, 2, 12);
    tallGrassGfx.fillRect(9, 0, 2, 8);
    tallGrassGfx.fillRect(13, 0, 2, 11);
    tallGrassGfx.fillStyle(0x4caf50);
    tallGrassGfx.fillRect(3, 0, 1, 7);
    tallGrassGfx.fillRect(7, 0, 1, 9);
    tallGrassGfx.fillRect(11, 0, 1, 6);
    tallGrassGfx.generateTexture('tallgrass', 16, 16);
    tallGrassGfx.destroy();

    // Path tile
    const pathGfx = this.make.graphics({ add: false });
    pathGfx.fillStyle(0xd7ccc8);
    pathGfx.fillRect(0, 0, 16, 16);
    pathGfx.fillStyle(0xbcaaa4);
    pathGfx.fillRect(3, 5, 2, 2);
    pathGfx.fillRect(10, 11, 2, 2);
    pathGfx.generateTexture('path', 16, 16);
    pathGfx.destroy();

    // Water tile
    const waterGfx = this.make.graphics({ add: false });
    waterGfx.fillStyle(0x1565c0);
    waterGfx.fillRect(0, 0, 16, 16);
    waterGfx.fillStyle(0x42a5f5);
    waterGfx.fillRect(2, 4, 6, 2);
    waterGfx.fillRect(8, 10, 6, 2);
    waterGfx.generateTexture('water', 16, 16);
    waterGfx.destroy();

    // Tree tile (solid, blocks movement)
    const treeGfx = this.make.graphics({ add: false });
    treeGfx.fillStyle(0x4caf50);
    treeGfx.fillRect(0, 0, 16, 16);
    treeGfx.fillStyle(0x2e7d32);
    treeGfx.fillCircle(8, 5, 6);
    treeGfx.fillStyle(0x1b5e20);
    treeGfx.fillCircle(8, 4, 4);
    treeGfx.fillStyle(0x795548);
    treeGfx.fillRect(7, 10, 3, 6);
    treeGfx.generateTexture('tree', 16, 16);
    treeGfx.destroy();

    // Wall/rock tile
    const wallGfx = this.make.graphics({ add: false });
    wallGfx.fillStyle(0x616161);
    wallGfx.fillRect(0, 0, 16, 16);
    wallGfx.fillStyle(0x757575);
    wallGfx.fillRect(1, 1, 6, 6);
    wallGfx.fillRect(9, 9, 6, 6);
    wallGfx.generateTexture('wall', 16, 16);
    wallGfx.destroy();

    // House tile
    const houseGfx = this.make.graphics({ add: false });
    houseGfx.fillStyle(0xef5350);
    houseGfx.fillRect(0, 0, 16, 16);
    houseGfx.fillStyle(0xc62828);
    // roof shape
    houseGfx.fillTriangle(8, 0, 0, 6, 16, 6);
    houseGfx.fillStyle(0xffcc80);
    houseGfx.fillRect(2, 7, 12, 9);
    // door
    houseGfx.fillStyle(0x795548);
    houseGfx.fillRect(6, 10, 4, 6);
    // window
    houseGfx.fillStyle(0x81d4fa);
    houseGfx.fillRect(3, 8, 3, 3);
    houseGfx.fillRect(10, 8, 3, 3);
    houseGfx.generateTexture('house', 16, 16);
    houseGfx.destroy();

    // Capture orb (item)
    const orbGfx = this.make.graphics({ add: false });
    orbGfx.fillStyle(0xf44336);
    orbGfx.fillCircle(8, 8, 6);
    orbGfx.fillStyle(0xffffff);
    orbGfx.fillCircle(8, 8, 3);
    orbGfx.fillStyle(0x333333);
    orbGfx.fillCircle(8, 8, 1);
    orbGfx.lineStyle(1, 0x333333);
    orbGfx.lineBetween(2, 8, 14, 8);
    orbGfx.generateTexture('orb', 16, 16);
    orbGfx.destroy();
  }

  create() {
    this.scene.start('World');
  }
}
