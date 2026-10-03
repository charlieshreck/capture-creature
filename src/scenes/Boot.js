import Phaser from 'phaser';
import { CREATURES } from '../creatures/data.js';

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

    // Avatar outfits
    const outfits = [
      { name: 'Default Blue', body: 0x4fc3f7, legs: 0x3949ab },
      { name: 'Red Hoodie', body: 0xe53935, legs: 0x37474f },
      { name: 'Green Explorer', body: 0x43a047, legs: 0x795548 },
      { name: 'Purple Wizard', body: 0x8e24aa, legs: 0x6a1b9a },
      { name: 'Gold Champion', body: 0xffd600, legs: 0xeeeeee },
      { name: 'Pink Casual', body: 0xf06292, legs: 0xcfd8dc },
      { name: 'Black Ninja', body: 0x212121, legs: 0x111111 },
      { name: 'White Knight', body: 0xf5f5f5, legs: 0x9e9e9e },
      { name: 'Orange Adventurer', body: 0xff9800, legs: 0x795548 },
      { name: 'Cyan Surfer', body: 0x00e5ff, legs: 0x1565c0 },
      { name: 'Yellow Builder', body: 0xffee58, legs: 0x8d6e63 },
      { name: 'Camo Ranger', body: 0x2e7d32, legs: 0x5d4037 },
      { name: 'Royal Blue', body: 0x1a237e, legs: 0xffc107 },
      { name: 'Lava', body: 0xff5722, legs: 0xb71c1c },
      { name: 'Ice', body: 0xb3e5fc, legs: 0xffffff },
      { name: 'Shadow', body: 0x424242, legs: 0x212121 },
      { name: 'Sunset', body: 0xff7043, legs: 0x7b1fa2 },
      { name: 'Forest', body: 0x6d4c41, legs: 0x388e3c },
      { name: 'Ocean', body: 0x00897b, legs: 0x0d47a1 },
      { name: 'Neon', body: 0x76ff03, legs: 0xff4081 },
    ];

    const hats = [
      { name: 'None', draw: null },
      { name: 'Cap', draw: (g, c) => { g.fillStyle(c); g.fillRect(3, 0, 10, 2); g.fillRect(2, 1, 4, 1); } },
      { name: 'Beanie', draw: (g, c) => { g.fillStyle(c); g.fillRect(4, 0, 8, 2); g.fillRect(7, -1, 2, 1); } },
      { name: 'Crown', draw: (g, c) => { g.fillStyle(c); g.fillRect(5, 0, 6, 2); g.fillRect(5, -1, 1, 1); g.fillRect(8, -1, 1, 1); g.fillRect(10, -1, 1, 1); } },
      { name: 'Headband', draw: (g, c) => { g.fillStyle(c); g.fillRect(4, 1, 8, 1); } },
    ];

    const hatColors = [0x000000, 0xe53935, 0x42a5f5, 0xffd600, 0xff4081];

    for (let o = 0; o < outfits.length; o++) {
      for (let h = 0; h < hats.length; h++) {
        const g = this.make.graphics({ add: false });
        // Body
        g.fillStyle(outfits[o].body);
        g.fillRect(4, 4, 8, 8);
        // Head
        g.fillStyle(0xffcc80);
        g.fillRect(5, 1, 6, 5);
        // Eyes
        g.fillStyle(0x333333);
        g.fillRect(6, 3, 1, 1);
        g.fillRect(9, 3, 1, 1);
        // Legs
        g.fillStyle(outfits[o].legs);
        g.fillRect(5, 12, 2, 3);
        g.fillRect(9, 12, 2, 3);
        // Hat
        if (hats[h].draw) {
          hats[h].draw(g, hatColors[h]);
        }
        g.generateTexture(`avatar_${o}_${h}`, 16, 16);
        g.destroy();
      }
    }

    // 3D Roblox-style avatar textures (48x64)
    const darken = (color, amt) => {
      const r = Math.max(0, ((color >> 16) & 0xff) - amt);
      const g2 = Math.max(0, ((color >> 8) & 0xff) - amt);
      const b = Math.max(0, (color & 0xff) - amt);
      return (r << 16) | (g2 << 8) | b;
    };
    const lighten = (color, amt) => {
      const r = Math.min(255, ((color >> 16) & 0xff) + amt);
      const g2 = Math.min(255, ((color >> 8) & 0xff) + amt);
      const b = Math.min(255, (color & 0xff) + amt);
      return (r << 16) | (g2 << 8) | b;
    };

    for (let o = 0; o < outfits.length; o++) {
      for (let h = 0; h < hats.length; h++) {
        const g = this.make.graphics({ add: false });
        const body = outfits[o].body;
        const legs = outfits[o].legs;
        const skin = 0xffcc80;

        // === HEAD (blocky 3D cube) ===
        // Front face
        g.fillStyle(skin);
        g.fillRect(14, 4, 20, 18);
        // Right face (darker)
        g.fillStyle(darken(skin, 50));
        g.fillRect(34, 4, 4, 18);
        // Top face (lighter)
        g.fillStyle(lighten(skin, 30));
        g.fillRect(14, 2, 20, 2);
        g.fillStyle(lighten(skin, 15));
        g.fillRect(34, 2, 4, 2);

        // Eyes
        g.fillStyle(0x222222);
        g.fillRect(18, 10, 3, 3);
        g.fillRect(27, 10, 3, 3);
        // Eye shine
        g.fillStyle(0xffffff);
        g.fillRect(19, 11, 1, 1);
        g.fillRect(28, 11, 1, 1);
        // Mouth
        g.fillStyle(darken(skin, 40));
        g.fillRect(21, 16, 6, 1);

        // === TORSO (3D cube) ===
        // Front face
        g.fillStyle(body);
        g.fillRect(12, 22, 24, 18);
        // Right face (darker)
        g.fillStyle(darken(body, 50));
        g.fillRect(36, 22, 4, 18);
        // Top face
        g.fillStyle(lighten(body, 25));
        g.fillRect(12, 22, 24, 2);

        // === LEFT ARM ===
        g.fillStyle(body);
        g.fillRect(4, 22, 8, 18);
        // Right edge (shadow)
        g.fillStyle(darken(body, 30));
        g.fillRect(4, 22, 2, 18);

        // === RIGHT ARM ===
        g.fillStyle(body);
        g.fillRect(36, 22, 8, 18);
        // Right face
        g.fillStyle(darken(body, 50));
        g.fillRect(40, 22, 4, 18);

        // Hand skin
        g.fillStyle(skin);
        g.fillRect(5, 36, 6, 4);
        g.fillRect(37, 36, 6, 4);

        // === LEFT LEG ===
        g.fillStyle(legs);
        g.fillRect(12, 40, 12, 18);
        // Right edge shadow
        g.fillStyle(darken(legs, 30));
        g.fillRect(12, 40, 2, 18);

        // === RIGHT LEG ===
        g.fillStyle(legs);
        g.fillRect(24, 40, 12, 18);
        // Right face
        g.fillStyle(darken(legs, 50));
        g.fillRect(32, 40, 4, 18);

        // Shoe bottoms
        g.fillStyle(0x333333);
        g.fillRect(12, 56, 12, 2);
        g.fillRect(24, 56, 12, 2);
        g.fillStyle(0x222222);
        g.fillRect(32, 56, 4, 2);

        // === HAT ===
        if (hats[h].name === 'Cap') {
          const hc = hatColors[h];
          g.fillStyle(hc);
          g.fillRect(10, 2, 28, 4);
          g.fillStyle(darken(hc, 40));
          g.fillRect(10, 0, 24, 2);
          g.fillRect(34, 2, 4, 4);
        } else if (hats[h].name === 'Beanie') {
          const hc = hatColors[h];
          g.fillStyle(hc);
          g.fillRect(14, 0, 20, 6);
          g.fillStyle(lighten(hc, 30));
          g.fillRect(20, -2, 8, 2);
          g.fillStyle(darken(hc, 40));
          g.fillRect(34, 0, 4, 6);
        } else if (hats[h].name === 'Crown') {
          g.fillStyle(0xffd600);
          g.fillRect(13, 0, 22, 4);
          g.fillStyle(0xffab00);
          g.fillRect(13, -3, 4, 3);
          g.fillRect(21, -3, 4, 3);
          g.fillRect(29, -3, 4, 3);
          g.fillStyle(0xff1744);
          g.fillRect(22, 1, 3, 2);
        } else if (hats[h].name === 'Headband') {
          const hc = hatColors[h];
          g.fillStyle(hc);
          g.fillRect(13, 4, 22, 3);
          g.fillStyle(darken(hc, 40));
          g.fillRect(35, 4, 4, 3);
        }

        g.generateTexture(`avatar3d_${o}_${h}`, 48, 64);
        g.destroy();
      }
    }

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

    // Recharge station — glowing green/cyan pad with a plus symbol
    const rechargeGfx = this.make.graphics({ add: false });
    rechargeGfx.fillStyle(0x00e676);
    rechargeGfx.fillRect(2, 2, 12, 12);
    rechargeGfx.fillStyle(0x69f0ae);
    rechargeGfx.fillRect(4, 4, 8, 8);
    // Plus symbol
    rechargeGfx.fillStyle(0xffffff);
    rechargeGfx.fillRect(7, 3, 2, 10);
    rechargeGfx.fillRect(3, 7, 10, 2);
    // Corner dots for glow effect
    rechargeGfx.fillStyle(0xb9f6ca);
    rechargeGfx.fillRect(0, 0, 2, 2);
    rechargeGfx.fillRect(14, 0, 2, 2);
    rechargeGfx.fillRect(0, 14, 2, 2);
    rechargeGfx.fillRect(14, 14, 2, 2);
    rechargeGfx.generateTexture('recharge', 16, 16);
    rechargeGfx.destroy();

    // Weapon pickup — golden diamond/sword shape
    const weaponGfx = this.make.graphics({ add: false });
    weaponGfx.fillStyle(0xffa000);
    weaponGfx.fillTriangle(8, 1, 3, 8, 13, 8); // blade top
    weaponGfx.fillStyle(0xffca28);
    weaponGfx.fillTriangle(8, 1, 5, 7, 11, 7); // blade highlight
    weaponGfx.fillStyle(0x795548);
    weaponGfx.fillRect(7, 8, 2, 5); // handle
    weaponGfx.fillStyle(0xffd54f);
    weaponGfx.fillRect(5, 8, 6, 2); // crossguard
    weaponGfx.generateTexture('weapon', 16, 16);
    weaponGfx.destroy();

    // Capture orb (used in battle UI)
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

    // Orb refill station — red pad with orb symbol
    const orbPadGfx = this.make.graphics({ add: false });
    orbPadGfx.fillStyle(0xf44336);
    orbPadGfx.fillRect(2, 2, 12, 12);
    orbPadGfx.fillStyle(0xef9a9a);
    orbPadGfx.fillRect(4, 4, 8, 8);
    // Orb symbol in center
    orbPadGfx.fillStyle(0xffffff);
    orbPadGfx.fillCircle(8, 8, 3);
    orbPadGfx.fillStyle(0xf44336);
    orbPadGfx.fillCircle(8, 8, 1);
    orbPadGfx.lineStyle(1, 0xc62828);
    orbPadGfx.lineBetween(5, 8, 11, 8);
    // Corner dots
    orbPadGfx.fillStyle(0xffcdd2);
    orbPadGfx.fillRect(0, 0, 2, 2);
    orbPadGfx.fillRect(14, 0, 2, 2);
    orbPadGfx.fillRect(0, 14, 2, 2);
    orbPadGfx.fillRect(14, 14, 2, 2);
    orbPadGfx.generateTexture('orbrefill', 16, 16);
    orbPadGfx.destroy();

    // Unique pixel sprites for each creature
    this.generateCreatureSprites();
  }

  generateCreatureSprites() {
    // 1 - Burne: little flame spirit — orange body, flame head
    const g1 = this.make.graphics({ add: false });
    g1.fillStyle(0xff6b35);
    g1.fillRect(5, 6, 6, 7);  // body
    g1.fillStyle(0xff9800);
    g1.fillRect(6, 3, 4, 5);  // head
    g1.fillStyle(0xffeb3b);
    g1.fillTriangle(8, 0, 5, 4, 11, 4); // flame tip
    g1.fillStyle(0xffffff);
    g1.fillRect(6, 5, 1, 1); g1.fillRect(9, 5, 1, 1); // eyes
    g1.fillStyle(0xff3d00);
    g1.fillRect(5, 13, 2, 2); g1.fillRect(9, 13, 2, 2); // feet
    g1.generateTexture('creature_1', 16, 16); g1.destroy();

    // 2 - Watery: bouncy water blob — blue round body, droplet shape
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x29b6f6);
    g2.fillCircle(8, 9, 6); // round body
    g2.fillStyle(0x0288d1);
    g2.fillTriangle(8, 2, 5, 7, 11, 7); // droplet top
    g2.fillStyle(0x81d4fa);
    g2.fillCircle(6, 8, 2); // shine
    g2.fillStyle(0xffffff);
    g2.fillRect(6, 8, 1, 1); g2.fillRect(10, 8, 1, 1); // eyes
    g2.fillStyle(0x111111);
    g2.fillRect(6, 9, 1, 1); g2.fillRect(10, 9, 1, 1); // pupils
    g2.generateTexture('creature_2', 16, 16); g2.destroy();

    // 3 - Green: leafy creature — green body with leaf on head
    const g3 = this.make.graphics({ add: false });
    g3.fillStyle(0x4caf50);
    g3.fillRect(4, 6, 8, 7); // body
    g3.fillStyle(0x388e3c);
    g3.fillRect(5, 4, 6, 4); // head
    g3.fillStyle(0x66bb6a);
    g3.fillTriangle(8, 0, 5, 4, 11, 4); // leaf
    g3.fillStyle(0x2e7d32);
    g3.fillRect(7, 1, 2, 3); // leaf stem
    g3.fillStyle(0xffffff);
    g3.fillRect(6, 5, 1, 1); g3.fillRect(9, 5, 1, 1); // eyes
    g3.fillStyle(0x388e3c);
    g3.fillRect(4, 13, 2, 2); g3.fillRect(10, 13, 2, 2); // feet
    g3.generateTexture('creature_3', 16, 16); g3.destroy();

    // 4 - Gusty: swirling wind spirit — pale wispy body
    const g4 = this.make.graphics({ add: false });
    g4.fillStyle(0xb2dfdb);
    g4.fillCircle(8, 8, 5); // body
    g4.fillStyle(0x80cbc4);
    g4.fillRect(3, 5, 2, 4); // left swirl
    g4.fillRect(11, 7, 2, 4); // right swirl
    g4.fillStyle(0xe0f2f1);
    g4.fillCircle(8, 6, 3); // face highlight
    g4.fillStyle(0x4db6ac);
    g4.fillRect(2, 3, 3, 2); // top swirl
    g4.fillRect(11, 3, 3, 2);
    g4.fillStyle(0x333333);
    g4.fillRect(6, 7, 1, 1); g4.fillRect(10, 7, 1, 1); // eyes
    g4.generateTexture('creature_4', 16, 16); g4.destroy();

    // 5 - Sparx: zippy electric critter — yellow with lightning bolt ears
    const g5 = this.make.graphics({ add: false });
    g5.fillStyle(0xffee58);
    g5.fillRect(5, 5, 6, 7); // body
    g5.fillStyle(0xfdd835);
    g5.fillRect(6, 3, 4, 4); // head
    g5.fillStyle(0xff8f00);
    g5.fillTriangle(4, 1, 5, 5, 7, 3); // left ear bolt
    g5.fillTriangle(12, 1, 11, 5, 9, 3); // right ear bolt
    g5.fillStyle(0x111111);
    g5.fillRect(6, 5, 1, 1); g5.fillRect(9, 5, 1, 1); // eyes
    g5.fillStyle(0xf9a825);
    g5.fillRect(5, 12, 2, 2); g5.fillRect(9, 12, 2, 2); // feet
    g5.fillStyle(0xffff8d);
    g5.fillRect(7, 4, 2, 1); // mouth
    g5.generateTexture('creature_5', 16, 16); g5.destroy();

    // 6 - Roko: tough rock creature — brown square body, rocky
    const g6 = this.make.graphics({ add: false });
    g6.fillStyle(0x8d6e63);
    g6.fillRect(3, 4, 10, 10); // blocky body
    g6.fillStyle(0x6d4c41);
    g6.fillRect(4, 3, 8, 3); // head
    g6.fillStyle(0xa1887f);
    g6.fillRect(5, 5, 2, 2); // rock detail
    g6.fillRect(9, 8, 2, 2);
    g6.fillStyle(0xbcaaa4);
    g6.fillRect(3, 7, 2, 3); // arm left
    g6.fillRect(11, 7, 2, 3); // arm right
    g6.fillStyle(0xffffff);
    g6.fillRect(5, 4, 2, 1); g6.fillRect(9, 4, 2, 1); // eyes
    g6.generateTexture('creature_6', 16, 16); g6.destroy();

    // 7 - Frozzo: chilly ice critter — light blue, icicle spikes
    const g7 = this.make.graphics({ add: false });
    g7.fillStyle(0x81d4fa);
    g7.fillCircle(8, 9, 5); // round body
    g7.fillStyle(0x4fc3f7);
    g7.fillRect(6, 4, 4, 4); // head
    g7.fillStyle(0xb3e5fc);
    g7.fillTriangle(5, 2, 6, 5, 4, 5); // left spike
    g7.fillTriangle(8, 0, 9, 4, 7, 4); // top spike
    g7.fillTriangle(11, 2, 12, 5, 10, 5); // right spike
    g7.fillStyle(0xffffff);
    g7.fillRect(6, 5, 1, 1); g7.fillRect(9, 5, 1, 1); // eyes
    g7.fillStyle(0x0288d1);
    g7.fillRect(7, 7, 2, 1); // mouth
    g7.generateTexture('creature_7', 16, 16); g7.destroy();

    // 8 - Levfire: hovering flame beast — dark red, floating with fire trail
    const g8 = this.make.graphics({ add: false });
    g8.fillStyle(0xd32f2f);
    g8.fillRect(4, 4, 8, 7); // body
    g8.fillStyle(0xff5722);
    g8.fillRect(5, 2, 6, 4); // head
    g8.fillStyle(0xffab00);
    g8.fillTriangle(8, 0, 5, 3, 11, 3); // flame crown
    g8.fillStyle(0xff6d00);
    g8.fillRect(4, 11, 2, 3); // left flame trail
    g8.fillRect(7, 12, 2, 3); // middle flame
    g8.fillRect(10, 11, 2, 3); // right flame trail
    g8.fillStyle(0xffeb3b);
    g8.fillRect(5, 12, 1, 2); g8.fillRect(11, 12, 1, 2);
    g8.fillStyle(0xffffff);
    g8.fillRect(6, 4, 1, 1); g8.fillRect(9, 4, 1, 1); // eyes
    g8.generateTexture('creature_8', 16, 16); g8.destroy();

    // 9 - Hoblex: sneaky shadow goblin — purple body, pointy ears, glowing eyes
    const g9 = this.make.graphics({ add: false });
    g9.fillStyle(0x7b1fa2);
    g9.fillRect(5, 6, 6, 7); // body
    g9.fillStyle(0x9c27b0);
    g9.fillRect(5, 3, 6, 5); // head
    g9.fillStyle(0x6a1b9a);
    g9.fillTriangle(3, 3, 5, 3, 5, 0); // left ear
    g9.fillTriangle(13, 3, 11, 3, 11, 0); // right ear
    g9.fillStyle(0xffff00);
    g9.fillRect(6, 5, 1, 1); g9.fillRect(9, 5, 1, 1); // glowing eyes
    g9.fillStyle(0xce93d8);
    g9.fillRect(7, 7, 2, 1); // grin
    g9.fillStyle(0x4a148c);
    g9.fillRect(5, 13, 2, 2); g9.fillRect(9, 13, 2, 2); // feet
    g9.generateTexture('creature_9', 16, 16); g9.destroy();

    // 10 - Tidex: wave creature with claws — deep blue, pincers
    const g10 = this.make.graphics({ add: false });
    g10.fillStyle(0x0277bd);
    g10.fillCircle(8, 9, 5); // body
    g10.fillStyle(0x01579b);
    g10.fillRect(6, 4, 4, 4); // head
    g10.fillStyle(0x039be5);
    g10.fillRect(2, 6, 3, 4); // left claw
    g10.fillRect(11, 6, 3, 4); // right claw
    g10.fillStyle(0x0288d1);
    g10.fillRect(2, 5, 2, 2); // claw tip L
    g10.fillRect(12, 5, 2, 2); // claw tip R
    g10.fillStyle(0xffffff);
    g10.fillRect(6, 5, 1, 1); g10.fillRect(9, 5, 1, 1); // eyes
    g10.fillStyle(0x81d4fa);
    g10.fillCircle(8, 10, 2); // belly
    g10.generateTexture('creature_10', 16, 16); g10.destroy();

    // 11 - Thornix: thorny vine beast — dark green, spikes
    const g11 = this.make.graphics({ add: false });
    g11.fillStyle(0x2e7d32);
    g11.fillRect(4, 5, 8, 8); // body
    g11.fillStyle(0x388e3c);
    g11.fillRect(5, 3, 6, 4); // head
    g11.fillStyle(0x1b5e20);
    g11.fillTriangle(4, 2, 5, 5, 3, 5); // left thorn
    g11.fillTriangle(12, 2, 11, 5, 13, 5); // right thorn
    g11.fillTriangle(8, 0, 7, 3, 9, 3); // top thorn
    g11.fillStyle(0x66bb6a);
    g11.fillRect(5, 8, 2, 2); // belly mark
    g11.fillRect(9, 8, 2, 2);
    g11.fillStyle(0xff0000);
    g11.fillRect(6, 4, 1, 1); g11.fillRect(9, 4, 1, 1); // red eyes
    g11.fillStyle(0x1b5e20);
    g11.fillRect(4, 13, 2, 2); g11.fillRect(10, 13, 2, 2); // feet
    g11.generateTexture('creature_11', 16, 16); g11.destroy();

    // 12 - Voltix: lightning hunter — yellow/orange, bolt stripes
    const g12 = this.make.graphics({ add: false });
    g12.fillStyle(0xf9a825);
    g12.fillRect(4, 5, 8, 7); // body
    g12.fillStyle(0xfbc02d);
    g12.fillRect(5, 3, 6, 4); // head
    g12.fillStyle(0xff8f00);
    g12.fillRect(4, 6, 8, 1); // stripe 1
    g12.fillRect(4, 9, 8, 1); // stripe 2
    g12.fillStyle(0xffff00);
    g12.fillTriangle(3, 1, 5, 4, 3, 4); // left bolt ear
    g12.fillTriangle(13, 1, 11, 4, 13, 4); // right bolt ear
    g12.fillStyle(0x111111);
    g12.fillRect(6, 4, 1, 1); g12.fillRect(9, 4, 1, 1); // eyes
    g12.fillStyle(0xe65100);
    g12.fillRect(10, 10, 3, 2); // tail
    g12.fillRect(12, 9, 2, 2);
    g12.generateTexture('creature_12', 16, 16); g12.destroy();

    // 13 - Vanex: phantom — deep purple, ghostly shape, glowing eyes
    const g13 = this.make.graphics({ add: false });
    g13.fillStyle(0x311b92);
    g13.fillTriangle(8, 1, 2, 12, 14, 12); // ghostly triangle body
    g13.fillStyle(0x4527a0);
    g13.fillCircle(8, 6, 4); // head
    g13.fillStyle(0x7c4dff);
    g13.fillCircle(8, 5, 2); // face glow
    g13.fillStyle(0x00ffff);
    g13.fillRect(6, 5, 1, 2); g13.fillRect(9, 5, 1, 2); // cyan glowing eyes
    g13.fillStyle(0x1a0a2e);
    g13.fillRect(4, 12, 2, 3); // wispy tail left
    g13.fillRect(7, 13, 2, 3); // wispy tail mid
    g13.fillRect(10, 12, 2, 3); // wispy tail right
    g13.generateTexture('creature_13', 16, 16); g13.destroy();

    // 14 - Glaciex: ice dragon — cyan, crystal spikes, wings
    const g14 = this.make.graphics({ add: false });
    g14.fillStyle(0x4dd0e1);
    g14.fillRect(5, 5, 6, 8); // body
    g14.fillStyle(0x00acc1);
    g14.fillRect(6, 3, 4, 4); // head
    g14.fillStyle(0xb2ebf2);
    g14.fillTriangle(8, 0, 6, 3, 10, 3); // top crystal
    g14.fillTriangle(2, 5, 5, 5, 4, 10); // left wing
    g14.fillTriangle(14, 5, 11, 5, 12, 10); // right wing
    g14.fillStyle(0xe0f7fa);
    g14.fillRect(7, 6, 2, 2); // belly crystal
    g14.fillStyle(0xff1744);
    g14.fillRect(7, 4, 1, 1); g14.fillRect(9, 4, 1, 1); // red eyes
    g14.fillStyle(0x006064);
    g14.fillRect(7, 13, 2, 2); // tail
    g14.generateTexture('creature_14', 16, 16); g14.destroy();

    // 15 - Solara: sun being — bright yellow, rays, glowing
    const g15 = this.make.graphics({ add: false });
    g15.fillStyle(0xfff176);
    g15.fillCircle(8, 8, 5); // body
    g15.fillStyle(0xffee58);
    g15.fillCircle(8, 8, 3); // inner glow
    g15.fillStyle(0xffd600);
    g15.fillRect(7, 1, 2, 3); // top ray
    g15.fillRect(7, 12, 2, 3); // bottom ray
    g15.fillRect(1, 7, 3, 2); // left ray
    g15.fillRect(12, 7, 3, 2); // right ray
    g15.fillRect(3, 3, 2, 2); // diag rays
    g15.fillRect(11, 3, 2, 2);
    g15.fillRect(3, 11, 2, 2);
    g15.fillRect(11, 11, 2, 2);
    g15.fillStyle(0x111111);
    g15.fillRect(7, 7, 1, 1); g15.fillRect(9, 7, 1, 1); // eyes
    g15.fillStyle(0xff6f00);
    g15.fillRect(7, 9, 2, 1); // mouth
    g15.generateTexture('creature_15', 16, 16); g15.destroy();

    // 16 - Craggon: rock golem — brown, chunky, arm blocks
    const g16 = this.make.graphics({ add: false });
    g16.fillStyle(0x6d4c41);
    g16.fillRect(4, 4, 8, 9); // body
    g16.fillStyle(0x5d4037);
    g16.fillRect(5, 2, 6, 4); // head
    g16.fillStyle(0x8d6e63);
    g16.fillRect(1, 5, 3, 6); // left arm
    g16.fillRect(12, 5, 3, 6); // right arm
    g16.fillStyle(0x4e342e);
    g16.fillRect(1, 5, 3, 2); // fist L
    g16.fillRect(12, 5, 3, 2); // fist R
    g16.fillStyle(0xa1887f);
    g16.fillRect(6, 6, 4, 3); // chest plate
    g16.fillStyle(0xffffff);
    g16.fillRect(6, 3, 1, 1); g16.fillRect(9, 3, 1, 1); // eyes
    g16.fillStyle(0x3e2723);
    g16.fillRect(5, 13, 2, 2); g16.fillRect(9, 13, 2, 2); // feet
    g16.generateTexture('creature_16', 16, 16); g16.destroy();

    // 17 - Infernox: fire titan — red/orange, huge flame crown, menacing
    const g17 = this.make.graphics({ add: false });
    g17.fillStyle(0xff3d00);
    g17.fillRect(4, 5, 8, 8); // body
    g17.fillStyle(0xdd2c00);
    g17.fillRect(5, 3, 6, 4); // head
    g17.fillStyle(0xffab00);
    g17.fillTriangle(4, 0, 5, 4, 3, 4); // left flame
    g17.fillTriangle(8, -1, 7, 3, 9, 3); // center flame
    g17.fillTriangle(12, 0, 11, 4, 13, 4); // right flame
    g17.fillStyle(0xffff00);
    g17.fillRect(5, 1, 1, 2); g17.fillRect(10, 1, 1, 2); // flame tips
    g17.fillStyle(0xffffff);
    g17.fillRect(6, 4, 1, 2); g17.fillRect(9, 4, 1, 2); // eyes
    g17.fillStyle(0xff6e40);
    g17.fillRect(2, 6, 2, 5); // left arm
    g17.fillRect(12, 6, 2, 5); // right arm
    g17.fillStyle(0xbf360c);
    g17.fillRect(5, 13, 2, 2); g17.fillRect(9, 13, 2, 2); // feet
    g17.generateTexture('creature_17', 16, 16); g17.destroy();

    // 18 - Abyssal: void creature — near-black purple, red eyes, tendrils
    const g18 = this.make.graphics({ add: false });
    g18.fillStyle(0x1a0a2e);
    g18.fillRect(4, 3, 8, 10); // body
    g18.fillStyle(0x2d1b4e);
    g18.fillCircle(8, 6, 4); // head
    g18.fillStyle(0xff0000);
    g18.fillRect(6, 5, 1, 2); g18.fillRect(9, 5, 1, 2); // red eyes
    g18.fillStyle(0x0d0020);
    g18.fillRect(3, 10, 2, 5); // left tendril
    g18.fillRect(7, 12, 2, 4); // mid tendril
    g18.fillRect(11, 10, 2, 5); // right tendril
    g18.fillStyle(0x4a148c);
    g18.fillRect(2, 5, 2, 4); // left wing
    g18.fillRect(12, 5, 2, 4); // right wing
    g18.fillStyle(0x6200ea);
    g18.fillRect(7, 8, 2, 1); // mouth glow
    g18.generateTexture('creature_18', 16, 16); g18.destroy();

    // 19 - Duskle: tiny shadow bat — purple/black, wings spread, small fangs
    const g19 = this.make.graphics({ add: false });
    g19.fillStyle(0x4a148c);
    g19.fillCircle(8, 7, 3); // body
    g19.fillStyle(0x6a1b9a);
    g19.fillTriangle(1, 4, 5, 6, 4, 10); // left wing
    g19.fillTriangle(15, 4, 11, 6, 12, 10); // right wing
    g19.fillStyle(0x38006b);
    g19.fillTriangle(1, 3, 3, 5, 5, 5); // wing tip L
    g19.fillTriangle(15, 3, 13, 5, 11, 5); // wing tip R
    g19.fillStyle(0xffff00);
    g19.fillRect(7, 6, 1, 1); g19.fillRect(9, 6, 1, 1); // eyes
    g19.fillStyle(0xffffff);
    g19.fillRect(7, 9, 1, 2); g19.fillRect(9, 9, 1, 2); // fangs
    g19.fillStyle(0x4a148c);
    g19.fillTriangle(6, 3, 8, 5, 10, 3); // ears
    g19.generateTexture('creature_19', 16, 16); g19.destroy();

    // 20 - Lumini: glowing fairy — soft yellow, tiny wings, sparkle aura
    const g20 = this.make.graphics({ add: false });
    g20.fillStyle(0xfff9c4);
    g20.fillCircle(8, 8, 3); // body
    g20.fillStyle(0xffe082);
    g20.fillCircle(8, 6, 2); // head
    g20.fillStyle(0xffd600);
    g20.fillTriangle(3, 5, 6, 7, 5, 9); // left wing
    g20.fillTriangle(13, 5, 10, 7, 11, 9); // right wing
    g20.fillStyle(0xffff8d);
    g20.fillRect(4, 4, 1, 1); g20.fillRect(12, 3, 1, 1); // sparkles
    g20.fillRect(2, 8, 1, 1); g20.fillRect(13, 9, 1, 1);
    g20.fillRect(6, 12, 1, 1); g20.fillRect(10, 13, 1, 1);
    g20.fillStyle(0x333333);
    g20.fillRect(7, 5, 1, 1); g20.fillRect(9, 5, 1, 1); // eyes
    g20.fillStyle(0xffab00);
    g20.fillRect(8, 11, 1, 2); // tiny feet
    g20.generateTexture('creature_20', 16, 16); g20.destroy();

    // 21 - Sandclaw: desert crab — sandy brown, big claws, beady eyes
    const g21 = this.make.graphics({ add: false });
    g21.fillStyle(0xd4a057);
    g21.fillRect(4, 7, 8, 5); // body
    g21.fillStyle(0xc08b3e);
    g21.fillRect(5, 5, 6, 4); // top shell
    g21.fillStyle(0xe6b566);
    g21.fillRect(1, 5, 3, 3); // left claw arm
    g21.fillRect(12, 5, 3, 3); // right claw arm
    g21.fillStyle(0xbf8030);
    g21.fillRect(0, 4, 3, 3); // left pincer
    g21.fillRect(13, 4, 3, 3); // right pincer
    g21.fillStyle(0x111111);
    g21.fillRect(6, 6, 1, 1); g21.fillRect(9, 6, 1, 1); // eyes
    g21.fillStyle(0xc08b3e);
    g21.fillRect(4, 12, 2, 2); g21.fillRect(7, 12, 2, 2); g21.fillRect(10, 12, 2, 2); // legs
    g21.generateTexture('creature_21', 16, 16); g21.destroy();

    // 22 - Torrent: water serpent — blue, wavy body, fins
    const g22 = this.make.graphics({ add: false });
    g22.fillStyle(0x039be5);
    g22.fillCircle(8, 5, 3); // head
    g22.fillStyle(0x0277bd);
    g22.fillRect(6, 7, 4, 3); // neck
    g22.fillRect(5, 9, 6, 3); // body
    g22.fillRect(7, 12, 3, 3); // tail
    g22.fillStyle(0x4fc3f7);
    g22.fillTriangle(3, 3, 5, 5, 3, 7); // left fin
    g22.fillTriangle(13, 3, 11, 5, 13, 7); // right fin
    g22.fillStyle(0x01579b);
    g22.fillTriangle(8, 14, 6, 15, 10, 15); // tail fin
    g22.fillStyle(0xffffff);
    g22.fillRect(6, 4, 1, 1); g22.fillRect(9, 4, 1, 1); // eyes
    g22.fillStyle(0x81d4fa);
    g22.fillCircle(8, 6, 1); // belly spot
    g22.generateTexture('creature_22', 16, 16); g22.destroy();

    // 23 - Blazeclaw: fire wolf — orange/red, pointed ears, flame tail
    const g23 = this.make.graphics({ add: false });
    g23.fillStyle(0xe65100);
    g23.fillRect(4, 6, 8, 6); // body
    g23.fillStyle(0xbf360c);
    g23.fillRect(5, 3, 5, 5); // head
    g23.fillStyle(0xff6d00);
    g23.fillTriangle(5, 1, 5, 4, 3, 4); // left ear
    g23.fillTriangle(10, 1, 10, 4, 12, 4); // right ear
    g23.fillStyle(0xffab00);
    g23.fillTriangle(12, 7, 15, 5, 14, 10); // flame tail
    g23.fillStyle(0xffff00);
    g23.fillRect(14, 6, 1, 2); // flame tip
    g23.fillStyle(0xffffff);
    g23.fillRect(6, 4, 1, 1); g23.fillRect(9, 4, 1, 1); // eyes
    g23.fillStyle(0xff3d00);
    g23.fillRect(4, 12, 2, 3); g23.fillRect(10, 12, 2, 3); // legs
    g23.fillStyle(0xbf360c);
    g23.fillRect(6, 12, 2, 2); g23.fillRect(8, 12, 2, 2); // back legs
    g23.generateTexture('creature_23', 16, 16); g23.destroy();

    // 24 - Frostfang: ice fox — light blue/white, bushy tail, ice crystals
    const g24 = this.make.graphics({ add: false });
    g24.fillStyle(0x4fc3f7);
    g24.fillRect(4, 6, 8, 6); // body
    g24.fillStyle(0x81d4fa);
    g24.fillRect(5, 3, 5, 5); // head
    g24.fillStyle(0xb3e5fc);
    g24.fillTriangle(5, 0, 5, 4, 3, 4); // left ear
    g24.fillTriangle(10, 0, 10, 4, 12, 4); // right ear
    g24.fillStyle(0xe1f5fe);
    g24.fillTriangle(12, 6, 15, 4, 15, 9); // bushy tail
    g24.fillRect(14, 5, 2, 2); // tail poof
    g24.fillStyle(0x0288d1);
    g24.fillRect(6, 4, 1, 1); g24.fillRect(9, 4, 1, 1); // eyes
    g24.fillStyle(0xffffff);
    g24.fillRect(6, 7, 1, 1); g24.fillRect(9, 7, 1, 1); // fangs
    g24.fillStyle(0x4fc3f7);
    g24.fillRect(4, 12, 2, 3); g24.fillRect(10, 12, 2, 3); // legs
    g24.fillStyle(0xe0f7fa);
    g24.fillRect(7, 5, 2, 2); // chest fluff
    g24.generateTexture('creature_24', 16, 16); g24.destroy();

    // 25 - Stormwing: storm bird — teal, wide wings, lightning marks
    const g25 = this.make.graphics({ add: false });
    g25.fillStyle(0x80cbc4);
    g25.fillCircle(8, 7, 3); // body
    g25.fillStyle(0x4db6ac);
    g25.fillRect(6, 4, 4, 3); // head
    g25.fillStyle(0x26a69a);
    g25.fillTriangle(1, 4, 5, 6, 3, 10); // left wing
    g25.fillTriangle(15, 4, 11, 6, 13, 10); // right wing
    g25.fillStyle(0xe0f2f1);
    g25.fillTriangle(1, 3, 3, 5, 5, 5); // wing tip L
    g25.fillTriangle(15, 3, 13, 5, 11, 5); // wing tip R
    g25.fillStyle(0xffff00);
    g25.fillRect(3, 7, 1, 2); // lightning mark L
    g25.fillRect(12, 7, 1, 2); // lightning mark R
    g25.fillStyle(0x111111);
    g25.fillRect(7, 5, 1, 1); g25.fillRect(9, 5, 1, 1); // eyes
    g25.fillStyle(0xff8f00);
    g25.fillTriangle(7, 7, 9, 7, 8, 9); // beak
    g25.fillStyle(0x4db6ac);
    g25.fillRect(7, 11, 1, 2); g25.fillRect(9, 11, 1, 2); // talons
    g25.generateTexture('creature_25', 16, 16); g25.destroy();

    // 26 - Mossbark: tree stump — dark green/brown, mossy, root feet
    const g26 = this.make.graphics({ add: false });
    g26.fillStyle(0x5d4037);
    g26.fillRect(4, 5, 8, 8); // trunk body
    g26.fillStyle(0x33691e);
    g26.fillCircle(8, 4, 5); // mossy top
    g26.fillStyle(0x558b2f);
    g26.fillCircle(8, 3, 3); // top moss highlight
    g26.fillStyle(0x4e342e);
    g26.fillRect(2, 10, 3, 4); // left root
    g26.fillRect(11, 10, 3, 4); // right root
    g26.fillStyle(0x6d4c41);
    g26.fillRect(1, 12, 3, 3); g26.fillRect(12, 12, 3, 3); // root feet
    g26.fillStyle(0xffffff);
    g26.fillRect(6, 6, 1, 1); g26.fillRect(9, 6, 1, 1); // eyes
    g26.fillStyle(0x388e3c);
    g26.fillRect(5, 7, 2, 1); g26.fillRect(9, 8, 2, 1); // moss patches
    g26.generateTexture('creature_26', 16, 16); g26.destroy();

    // 27 - Thunderex: thunder dragon — gold/orange, wings, lightning horns
    const g27 = this.make.graphics({ add: false });
    g27.fillStyle(0xffab00);
    g27.fillRect(5, 5, 6, 7); // body
    g27.fillStyle(0xff8f00);
    g27.fillRect(6, 3, 4, 4); // head
    g27.fillStyle(0xffff00);
    g27.fillTriangle(5, 0, 6, 3, 4, 3); // left horn
    g27.fillTriangle(11, 0, 10, 3, 12, 3); // right horn
    g27.fillStyle(0xffc107);
    g27.fillTriangle(2, 4, 5, 6, 3, 10); // left wing
    g27.fillTriangle(14, 4, 11, 6, 13, 10); // right wing
    g27.fillStyle(0xffffff);
    g27.fillRect(7, 4, 1, 1); g27.fillRect(9, 4, 1, 1); // eyes
    g27.fillStyle(0xffff8d);
    g27.fillRect(7, 7, 2, 2); // chest glow
    g27.fillStyle(0xe65100);
    g27.fillRect(5, 12, 2, 3); g27.fillRect(9, 12, 2, 3); // legs
    g27.fillStyle(0xff6d00);
    g27.fillRect(8, 11, 2, 4); // tail
    g27.generateTexture('creature_27', 16, 16); g27.destroy();

    // 28 - Crystalia: crystal being — pink/purple crystal, faceted, light refraction
    const g28 = this.make.graphics({ add: false });
    g28.fillStyle(0xce93d8);
    g28.fillTriangle(8, 1, 3, 8, 13, 8); // top crystal
    g28.fillTriangle(8, 15, 3, 8, 13, 8); // bottom crystal
    g28.fillStyle(0xe1bee7);
    g28.fillTriangle(8, 2, 5, 7, 11, 7); // inner facet top
    g28.fillStyle(0xf3e5f5);
    g28.fillTriangle(8, 14, 5, 9, 11, 9); // inner facet bottom
    g28.fillStyle(0xab47bc);
    g28.fillRect(6, 6, 1, 1); g28.fillRect(9, 6, 1, 1); // eyes
    g28.fillStyle(0xffffff);
    g28.fillRect(5, 4, 1, 1); g28.fillRect(10, 4, 1, 1); // sparkles
    g28.fillRect(3, 9, 1, 1); g28.fillRect(12, 9, 1, 1);
    g28.fillRect(7, 11, 1, 1);
    g28.fillStyle(0xea80fc);
    g28.fillRect(7, 7, 2, 2); // core glow
    g28.generateTexture('creature_28', 16, 16); g28.destroy();

    // 29 - Tempestus: storm titan — teal/dark, swirling energy, huge wings
    const g29 = this.make.graphics({ add: false });
    g29.fillStyle(0x26a69a);
    g29.fillRect(5, 5, 6, 8); // body
    g29.fillStyle(0x00897b);
    g29.fillRect(6, 2, 4, 5); // head
    g29.fillStyle(0x004d40);
    g29.fillTriangle(6, 0, 7, 3, 5, 3); // left horn
    g29.fillTriangle(10, 0, 9, 3, 11, 3); // right horn
    g29.fillStyle(0x4db6ac);
    g29.fillTriangle(1, 3, 5, 5, 2, 11); // left wing
    g29.fillTriangle(15, 3, 11, 5, 14, 11); // right wing
    g29.fillStyle(0x80cbc4);
    g29.fillTriangle(0, 2, 3, 5, 1, 7); // wing tip L
    g29.fillTriangle(16, 2, 13, 5, 15, 7); // wing tip R
    g29.fillStyle(0xffffff);
    g29.fillRect(7, 4, 1, 1); g29.fillRect(9, 4, 1, 1); // eyes
    g29.fillStyle(0xffff00);
    g29.fillRect(3, 8, 1, 1); g29.fillRect(12, 9, 1, 1); // lightning sparks
    g29.fillRect(7, 7, 2, 1); // chest mark
    g29.fillStyle(0x00695c);
    g29.fillRect(5, 13, 2, 2); g29.fillRect(9, 13, 2, 2); // feet
    g29.generateTexture('creature_29', 16, 16); g29.destroy();

    // 30 - Terravex: living mountain — dark brown, massive, crystal veins
    const g30 = this.make.graphics({ add: false });
    g30.fillStyle(0x4e342e);
    g30.fillRect(3, 4, 10, 10); // massive body
    g30.fillStyle(0x3e2723);
    g30.fillRect(5, 2, 6, 5); // head
    g30.fillStyle(0x5d4037);
    g30.fillRect(1, 6, 3, 6); // left arm
    g30.fillRect(12, 6, 3, 6); // right arm
    g30.fillStyle(0x3e2723);
    g30.fillRect(1, 5, 3, 3); // fist L
    g30.fillRect(12, 5, 3, 3); // fist R
    g30.fillStyle(0x00e5ff);
    g30.fillRect(6, 6, 1, 2); // crystal vein L
    g30.fillRect(9, 7, 1, 2); // crystal vein R
    g30.fillRect(7, 10, 2, 1); // crystal vein bottom
    g30.fillStyle(0xff6d00);
    g30.fillRect(6, 3, 1, 2); g30.fillRect(9, 3, 1, 2); // glowing eyes
    g30.fillStyle(0x6d4c41);
    g30.fillTriangle(7, 0, 6, 3, 8, 3); // rock horn L
    g30.fillTriangle(10, 0, 9, 3, 11, 3); // rock horn R
    g30.fillStyle(0x3e2723);
    g30.fillRect(4, 14, 3, 2); g30.fillRect(9, 14, 3, 2); // feet
    g30.generateTexture('creature_30', 16, 16); g30.destroy();

    // 31 - Peblit: small living pebble — round, brown, cute face
    const g31 = this.make.graphics({ add: false });
    g31.fillStyle(0xa1887f);
    g31.fillCircle(8, 9, 5); // round body
    g31.fillStyle(0x8d6e63);
    g31.fillCircle(8, 8, 4); // top half
    g31.fillStyle(0xbcaaa4);
    g31.fillCircle(6, 7, 1); // rock detail
    g31.fillCircle(10, 10, 1);
    g31.fillStyle(0x111111);
    g31.fillRect(6, 8, 1, 1); g31.fillRect(9, 8, 1, 1); // eyes
    g31.fillStyle(0xffffff);
    g31.fillRect(7, 10, 2, 1); // smile
    g31.fillStyle(0x795548);
    g31.fillRect(5, 13, 2, 2); g31.fillRect(9, 13, 2, 2); // tiny feet
    g31.generateTexture('creature_31', 16, 16); g31.destroy();

    // 32 - Flicktail: fox kit with flame tail — orange, bushy tail with fire tip
    const g32 = this.make.graphics({ add: false });
    g32.fillStyle(0xff8a65);
    g32.fillRect(4, 6, 7, 6); // body
    g32.fillStyle(0xffab91);
    g32.fillRect(5, 3, 5, 5); // head
    g32.fillStyle(0xff7043);
    g32.fillTriangle(5, 1, 5, 4, 3, 4); // left ear
    g32.fillTriangle(10, 1, 10, 4, 12, 4); // right ear
    g32.fillStyle(0xffffff);
    g32.fillRect(6, 5, 2, 2); // face mark
    g32.fillStyle(0x111111);
    g32.fillRect(6, 4, 1, 1); g32.fillRect(9, 4, 1, 1); // eyes
    g32.fillStyle(0xff8a65);
    g32.fillRect(11, 7, 3, 2); // tail base
    g32.fillStyle(0xffab00);
    g32.fillRect(13, 6, 2, 2); // flame tip
    g32.fillStyle(0xffff00);
    g32.fillRect(14, 5, 1, 2); // flame bright
    g32.fillStyle(0xff7043);
    g32.fillRect(4, 12, 2, 3); g32.fillRect(9, 12, 2, 3); // legs
    g32.generateTexture('creature_32', 16, 16); g32.destroy();

    // 33 - Zappfly: electric firefly — yellow glowing body, tiny wings
    const g33 = this.make.graphics({ add: false });
    g33.fillStyle(0xfff59d);
    g33.fillCircle(8, 8, 3); // body
    g33.fillStyle(0xffff00);
    g33.fillCircle(8, 8, 2); // glow core
    g33.fillStyle(0xfff9c4);
    g33.fillTriangle(4, 5, 6, 7, 5, 9); // left wing
    g33.fillTriangle(12, 5, 10, 7, 11, 9); // right wing
    g33.fillStyle(0xffff8d);
    g33.fillRect(3, 3, 1, 1); g33.fillRect(12, 4, 1, 1); // sparkle
    g33.fillRect(5, 12, 1, 1); g33.fillRect(11, 11, 1, 1);
    g33.fillStyle(0x111111);
    g33.fillRect(7, 7, 1, 1); g33.fillRect(9, 7, 1, 1); // eyes
    g33.fillStyle(0xff8f00);
    g33.fillRect(7, 11, 1, 2); g33.fillRect(9, 11, 1, 2); // antennae down
    g33.fillStyle(0xffc107);
    g33.fillRect(6, 4, 1, 2); g33.fillRect(10, 4, 1, 2); // antennae up
    g33.generateTexture('creature_33', 16, 16); g33.destroy();

    // 34 - Mosling: tiny moss creature — light green, round, sits on stone
    const g34 = this.make.graphics({ add: false });
    g34.fillStyle(0x9e9e9e);
    g34.fillRect(4, 11, 8, 4); // stone base
    g34.fillStyle(0x81c784);
    g34.fillCircle(8, 8, 4); // mossy body
    g34.fillStyle(0xa5d6a7);
    g34.fillCircle(8, 7, 3); // highlight
    g34.fillStyle(0x66bb6a);
    g34.fillRect(5, 3, 2, 3); // left leaf
    g34.fillRect(9, 3, 2, 3); // right leaf
    g34.fillStyle(0x4caf50);
    g34.fillRect(6, 2, 1, 2); g34.fillRect(10, 2, 1, 2); // leaf tips
    g34.fillStyle(0x111111);
    g34.fillRect(6, 7, 1, 1); g34.fillRect(9, 7, 1, 1); // eyes
    g34.fillStyle(0xc8e6c9);
    g34.fillRect(7, 9, 2, 1); // smile
    g34.generateTexture('creature_34', 16, 16); g34.destroy();

    // 35 - Drizzle: rain cloud creature — light blue cloud, rain drops
    const g35 = this.make.graphics({ add: false });
    g35.fillStyle(0x4dd0e1);
    g35.fillCircle(8, 6, 4); // main cloud
    g35.fillCircle(5, 7, 3); // left puff
    g35.fillCircle(11, 7, 3); // right puff
    g35.fillStyle(0x80deea);
    g35.fillCircle(8, 5, 2); // highlight
    g35.fillStyle(0x111111);
    g35.fillRect(6, 6, 1, 1); g35.fillRect(9, 6, 1, 1); // eyes
    g35.fillStyle(0x29b6f6);
    g35.fillRect(5, 11, 1, 2); // rain drop L
    g35.fillRect(8, 12, 1, 2); // rain drop M
    g35.fillRect(11, 11, 1, 2); // rain drop R
    g35.fillStyle(0x0288d1);
    g35.fillRect(5, 10, 1, 1); g35.fillRect(8, 11, 1, 1); g35.fillRect(11, 10, 1, 1);
    g35.generateTexture('creature_35', 16, 16); g35.destroy();

    // 36 - Shadelock: shadow wolf with chains — dark purple, chain marks
    const g36 = this.make.graphics({ add: false });
    g36.fillStyle(0x5c2d91);
    g36.fillRect(4, 6, 8, 6); // body
    g36.fillStyle(0x7b1fa2);
    g36.fillRect(5, 3, 5, 5); // head
    g36.fillStyle(0x4a148c);
    g36.fillTriangle(5, 0, 5, 4, 3, 4); // left ear
    g36.fillTriangle(10, 0, 10, 4, 12, 4); // right ear
    g36.fillStyle(0xff0000);
    g36.fillRect(6, 4, 1, 1); g36.fillRect(9, 4, 1, 1); // red eyes
    g36.fillStyle(0x9e9e9e);
    g36.fillRect(4, 8, 1, 1); g36.fillRect(6, 9, 1, 1); g36.fillRect(8, 8, 1, 1); // chain links
    g36.fillRect(10, 9, 1, 1); g36.fillRect(12, 8, 1, 1);
    g36.fillStyle(0x38006b);
    g36.fillRect(4, 12, 2, 3); g36.fillRect(10, 12, 2, 3); // legs
    g36.fillStyle(0x9c27b0);
    g36.fillRect(12, 7, 3, 2); // tail
    g36.generateTexture('creature_36', 16, 16); g36.destroy();

    // 37 - Galewing: elegant hawk — green-tinted, spread wings, sharp beak
    const g37 = this.make.graphics({ add: false });
    g37.fillStyle(0xa5d6a7);
    g37.fillCircle(8, 7, 3); // body
    g37.fillStyle(0x81c784);
    g37.fillRect(6, 4, 4, 3); // head
    g37.fillStyle(0x66bb6a);
    g37.fillTriangle(1, 4, 5, 6, 3, 10); // left wing
    g37.fillTriangle(15, 4, 11, 6, 13, 10); // right wing
    g37.fillStyle(0xc8e6c9);
    g37.fillTriangle(1, 3, 3, 5, 5, 5); // wing tip L
    g37.fillTriangle(15, 3, 13, 5, 11, 5); // wing tip R
    g37.fillStyle(0x111111);
    g37.fillRect(7, 5, 1, 1); g37.fillRect(9, 5, 1, 1); // eyes
    g37.fillStyle(0xff8f00);
    g37.fillTriangle(7, 7, 9, 7, 8, 9); // beak
    g37.fillStyle(0x4caf50);
    g37.fillRect(7, 11, 1, 2); g37.fillRect(9, 11, 1, 2); // talons
    g37.fillStyle(0xffffff);
    g37.fillRect(7, 4, 2, 1); // forehead mark
    g37.generateTexture('creature_37', 16, 16); g37.destroy();

    // 38 - Glacia: ice deer — light blue, crystal antlers
    const g38 = this.make.graphics({ add: false });
    g38.fillStyle(0xb3e5fc);
    g38.fillRect(5, 6, 6, 6); // body
    g38.fillStyle(0x81d4fa);
    g38.fillRect(6, 3, 4, 5); // head
    g38.fillStyle(0xe1f5fe);
    g38.fillTriangle(5, 0, 6, 3, 4, 4); // left antler
    g38.fillTriangle(11, 0, 10, 3, 12, 4); // right antler
    g38.fillStyle(0x4fc3f7);
    g38.fillRect(4, 0, 1, 2); g38.fillRect(12, 0, 1, 2); // antler tips
    g38.fillStyle(0x0288d1);
    g38.fillRect(7, 4, 1, 1); g38.fillRect(9, 4, 1, 1); // eyes
    g38.fillStyle(0xe0f7fa);
    g38.fillRect(7, 7, 2, 2); // chest
    g38.fillStyle(0x81d4fa);
    g38.fillRect(5, 12, 2, 3); g38.fillRect(9, 12, 2, 3); // legs
    g38.fillRect(4, 14, 2, 1); g38.fillRect(10, 14, 2, 1); // hooves
    g38.generateTexture('creature_38', 16, 16); g38.destroy();

    // 39 - Inferake: fire serpent — deep red, coiled, flames along body
    const g39 = this.make.graphics({ add: false });
    g39.fillStyle(0xd50000);
    g39.fillCircle(8, 5, 3); // head
    g39.fillStyle(0xb71c1c);
    g39.fillRect(6, 7, 4, 2); // neck
    g39.fillRect(4, 8, 8, 3); // body coil
    g39.fillRect(6, 11, 5, 2); // lower coil
    g39.fillStyle(0xff6d00);
    g39.fillRect(3, 9, 1, 2); g39.fillRect(12, 8, 1, 2); // side flames
    g39.fillRect(5, 12, 1, 2); g39.fillRect(10, 12, 1, 2);
    g39.fillStyle(0xffff00);
    g39.fillRect(3, 8, 1, 1); g39.fillRect(12, 7, 1, 1); // flame tips
    g39.fillStyle(0xffffff);
    g39.fillRect(7, 4, 1, 1); g39.fillRect(9, 4, 1, 1); // eyes
    g39.fillStyle(0xff5252);
    g39.fillTriangle(7, 2, 8, 4, 9, 2); // head crest
    g39.fillStyle(0xff1744);
    g39.fillRect(8, 13, 3, 2); // tail
    g39.generateTexture('creature_39', 16, 16); g39.destroy();

    // 40 - Abyssfin: deep sea leviathan — dark blue, fins, glowing lure
    const g40 = this.make.graphics({ add: false });
    g40.fillStyle(0x01579b);
    g40.fillRect(4, 5, 8, 7); // body
    g40.fillStyle(0x0d47a1);
    g40.fillRect(5, 3, 6, 4); // head
    g40.fillStyle(0x0277bd);
    g40.fillTriangle(2, 5, 4, 7, 3, 10); // left fin
    g40.fillTriangle(14, 5, 12, 7, 13, 10); // right fin
    g40.fillStyle(0x039be5);
    g40.fillTriangle(5, 2, 7, 4, 3, 4); // dorsal fin
    g40.fillStyle(0x00e5ff);
    g40.fillCircle(8, 2, 1); // lure light
    g40.fillRect(8, 2, 1, 2); // lure stalk
    g40.fillStyle(0xffffff);
    g40.fillRect(6, 4, 1, 1); g40.fillRect(9, 4, 1, 1); // eyes
    g40.fillStyle(0x1565c0);
    g40.fillTriangle(8, 12, 5, 14, 11, 14); // tail
    g40.fillStyle(0x82b1ff);
    g40.fillRect(6, 7, 4, 2); // belly
    g40.generateTexture('creature_40', 16, 16); g40.destroy();

    // 41 - Orionis: celestial god creature — gold, glowing, star orbit, halo
    const g41 = this.make.graphics({ add: false });
    // Outer glow aura
    g41.fillStyle(0xffd700);
    g41.fillCircle(8, 8, 7); // golden aura
    g41.fillStyle(0xfff8e1);
    g41.fillCircle(8, 8, 5); // bright inner
    g41.fillStyle(0xffffff);
    g41.fillCircle(8, 8, 3); // core body
    // Halo
    g41.fillStyle(0xffd700);
    g41.fillRect(4, 1, 8, 1); // halo top
    g41.fillRect(3, 2, 1, 1); g41.fillRect(12, 2, 1, 1); // halo sides
    // Orbiting stars
    g41.fillStyle(0xff00ff);
    g41.fillRect(2, 5, 2, 2); // star L
    g41.fillRect(12, 5, 2, 2); // star R
    g41.fillRect(2, 11, 2, 2); // star BL
    g41.fillRect(12, 11, 2, 2); // star BR
    // Eyes
    g41.fillStyle(0xff00ff);
    g41.fillRect(7, 7, 1, 1); g41.fillRect(9, 7, 1, 1); // magenta eyes
    // Wings of light
    g41.fillStyle(0xffd700);
    g41.fillTriangle(0, 6, 4, 8, 2, 11); // left wing
    g41.fillTriangle(16, 6, 12, 8, 14, 11); // right wing
    g41.generateTexture('creature_41', 16, 16); g41.destroy();

    // 42 - Titanox: ultimate beast — dark red, massive horns, glowing red eyes, chaos aura
    const g42 = this.make.graphics({ add: false });
    // Chaos aura (dark pulsing ring)
    g42.fillStyle(0x330000);
    g42.fillCircle(8, 8, 7);
    // Body — dark crimson
    g42.fillStyle(0x8b0000);
    g42.fillRect(4, 5, 8, 8); // torso
    g42.fillRect(5, 4, 6, 1); // shoulders
    // Horns — jagged, white-hot tips
    g42.fillStyle(0x8b0000);
    g42.fillRect(4, 3, 1, 2); g42.fillRect(11, 3, 1, 2); // horn base
    g42.fillStyle(0xff0000);
    g42.fillRect(3, 1, 1, 2); g42.fillRect(12, 1, 1, 2); // horn mid
    g42.fillStyle(0xff4444);
    g42.fillRect(2, 0, 1, 1); g42.fillRect(13, 0, 1, 1); // horn tips
    // Eyes — glowing red
    g42.fillStyle(0xff0000);
    g42.fillRect(6, 6, 1, 1); g42.fillRect(9, 6, 1, 1);
    g42.fillStyle(0xffff00);
    g42.fillRect(6, 6, 1, 1); g42.fillRect(9, 6, 1, 1); // yellow-hot glow
    // Mouth — snarl
    g42.fillStyle(0xff0000);
    g42.fillRect(6, 9, 4, 1);
    g42.fillStyle(0xffffff);
    g42.fillRect(7, 9, 1, 1); g42.fillRect(9, 9, 1, 1); // fangs
    // Claws
    g42.fillStyle(0xff4444);
    g42.fillRect(3, 12, 1, 2); g42.fillRect(12, 12, 1, 2); // claws
    g42.fillRect(4, 13, 1, 1); g42.fillRect(11, 13, 1, 1);
    // Chaos sparks around body
    g42.fillStyle(0xff0000);
    g42.fillRect(1, 4, 1, 1); g42.fillRect(14, 4, 1, 1);
    g42.fillRect(0, 9, 1, 1); g42.fillRect(15, 9, 1, 1);
    g42.fillRect(1, 14, 1, 1); g42.fillRect(14, 14, 1, 1);
    g42.generateTexture('creature_42', 16, 16); g42.destroy();

    // 43 - Cinderpup: fire puppy — orange with flame tail
    const g43 = this.make.graphics({ add: false });
    g43.fillStyle(0xff7043); g43.fillCircle(8, 9, 5); // body
    g43.fillStyle(0xff5722); g43.fillCircle(8, 6, 3); // head
    g43.fillStyle(0xffffff); g43.fillRect(7, 5, 1, 1); g43.fillRect(9, 5, 1, 1); // eyes
    g43.fillStyle(0x000000); g43.fillRect(7, 5, 1, 1); g43.fillRect(9, 5, 1, 1); // pupils
    g43.fillStyle(0xff3d00); g43.fillTriangle(6, 4, 5, 1, 7, 3); // ear L
    g43.fillTriangle(10, 4, 11, 1, 9, 3); // ear R
    g43.fillStyle(0xffab00); g43.fillRect(12, 8, 2, 1); g43.fillRect(13, 7, 2, 1); // flame tail
    g43.fillStyle(0xff6d00); g43.fillRect(14, 6, 1, 1); // tail tip
    g43.fillStyle(0xff7043); g43.fillRect(5, 12, 2, 2); g43.fillRect(9, 12, 2, 2); // legs
    g43.generateTexture('creature_43', 16, 16); g43.destroy();

    // 44 - Bubbloon: round water balloon — light blue, bubbly
    const g44 = this.make.graphics({ add: false });
    g44.fillStyle(0x4fc3f7); g44.fillCircle(8, 8, 6); // body
    g44.fillStyle(0x81d4fa); g44.fillCircle(6, 6, 2); // highlight
    g44.fillStyle(0xffffff); g44.fillRect(6, 7, 1, 1); g44.fillRect(10, 7, 1, 1); // eyes
    g44.fillStyle(0x0288d1); g44.fillRect(7, 10, 2, 1); // mouth
    g44.fillStyle(0xb3e5fc); g44.fillCircle(3, 4, 1); g44.fillCircle(13, 5, 1); // bubbles
    g44.fillCircle(2, 10, 1); g44.fillCircle(14, 11, 1);
    g44.generateTexture('creature_44', 16, 16); g44.destroy();

    // 45 - Shockrat: electric rat — yellow, zigzag tail
    const g45 = this.make.graphics({ add: false });
    g45.fillStyle(0xfdd835); g45.fillCircle(7, 9, 4); // body
    g45.fillCircle(7, 6, 3); // head
    g45.fillStyle(0x000000); g45.fillRect(6, 5, 1, 1); g45.fillRect(8, 5, 1, 1); // eyes
    g45.fillStyle(0xfdd835); g45.fillTriangle(5, 4, 4, 1, 6, 3); // ear L
    g45.fillTriangle(9, 4, 10, 1, 8, 3); // ear R
    g45.fillStyle(0xf9a825); g45.fillRect(11, 7, 1, 2); g45.fillRect(12, 9, 1, 1); // zigzag tail
    g45.fillRect(13, 7, 1, 2); g45.fillRect(14, 6, 1, 1);
    g45.fillStyle(0xfdd835); g45.fillRect(5, 12, 1, 2); g45.fillRect(9, 12, 1, 2); // legs
    g45.generateTexture('creature_45', 16, 16); g45.destroy();

    // 46 - Breezel: wind sprite — cyan, wispy
    const g46 = this.make.graphics({ add: false });
    g46.fillStyle(0xb2ebf2); g46.fillCircle(8, 8, 4); // body
    g46.fillStyle(0xe0f7fa); g46.fillCircle(8, 6, 2); // head glow
    g46.fillStyle(0x006064); g46.fillRect(7, 6, 1, 1); g46.fillRect(9, 6, 1, 1); // eyes
    g46.fillStyle(0x80deea); g46.fillTriangle(3, 7, 0, 5, 4, 9); // wind wisp L
    g46.fillTriangle(13, 7, 16, 5, 12, 9); // wind wisp R
    g46.fillTriangle(8, 13, 6, 16, 10, 16); // tail wisp
    g46.generateTexture('creature_46', 16, 16); g46.destroy();

    // 47 - Glacipede: ice centipede — teal, segmented
    const g47 = this.make.graphics({ add: false });
    g47.fillStyle(0x80deea); g47.fillRect(4, 5, 8, 3); // head
    g47.fillStyle(0x4dd0e1); g47.fillRect(4, 8, 8, 2); // segment 1
    g47.fillStyle(0x26c6da); g47.fillRect(4, 10, 8, 2); // segment 2
    g47.fillStyle(0x00bcd4); g47.fillRect(5, 12, 6, 2); // tail
    g47.fillStyle(0xffffff); g47.fillRect(5, 6, 1, 1); g47.fillRect(8, 6, 1, 1); // eyes
    g47.fillStyle(0x80deea); // legs
    g47.fillRect(3, 6, 1, 1); g47.fillRect(12, 6, 1, 1);
    g47.fillRect(3, 9, 1, 1); g47.fillRect(12, 9, 1, 1);
    g47.fillRect(3, 11, 1, 1); g47.fillRect(12, 11, 1, 1);
    g47.generateTexture('creature_47', 16, 16); g47.destroy();

    // 48 - Pyroconda: fire snake — dark orange, coiled
    const g48 = this.make.graphics({ add: false });
    g48.fillStyle(0xbf360c); g48.fillCircle(8, 9, 5); // coiled body
    g48.fillStyle(0xe65100); g48.fillCircle(8, 5, 3); // head
    g48.fillStyle(0xffff00); g48.fillRect(7, 4, 1, 1); g48.fillRect(9, 4, 1, 1); // eyes
    g48.fillStyle(0xff0000); g48.fillRect(7, 7, 2, 1); // tongue
    g48.fillRect(6, 8, 1, 1); // tongue fork
    g48.fillStyle(0xff6d00); g48.fillRect(5, 10, 1, 1); g48.fillRect(11, 10, 1, 1); // pattern
    g48.fillRect(7, 12, 1, 1); g48.fillRect(9, 12, 1, 1);
    g48.generateTexture('creature_48', 16, 16); g48.destroy();

    // 49 - Tidalcrab: water crab — blue, big pincers
    const g49 = this.make.graphics({ add: false });
    g49.fillStyle(0x0288d1); g49.fillRect(4, 7, 8, 5); // body
    g49.fillStyle(0x0277bd); g49.fillRect(5, 6, 6, 1); // top
    g49.fillStyle(0xffffff); g49.fillRect(6, 8, 1, 1); g49.fillRect(9, 8, 1, 1); // eyes
    g49.fillStyle(0x01579b); // pincers
    g49.fillRect(1, 6, 3, 2); g49.fillRect(0, 5, 2, 1); // left pincer
    g49.fillRect(12, 6, 3, 2); g49.fillRect(14, 5, 2, 1); // right pincer
    g49.fillStyle(0x0288d1); // legs
    g49.fillRect(4, 12, 1, 2); g49.fillRect(7, 12, 1, 2);
    g49.fillRect(8, 12, 1, 2); g49.fillRect(11, 12, 1, 2);
    g49.generateTexture('creature_49', 16, 16); g49.destroy();

    // 50 - Thornviper: grass snake — dark green, thorny
    const g50 = this.make.graphics({ add: false });
    g50.fillStyle(0x1b5e20); g50.fillCircle(8, 9, 5); // coiled body
    g50.fillStyle(0x2e7d32); g50.fillCircle(8, 5, 3); // head
    g50.fillStyle(0xff0000); g50.fillRect(7, 4, 1, 1); g50.fillRect(9, 4, 1, 1); // eyes
    g50.fillStyle(0x4caf50); // thorns
    g50.fillRect(4, 7, 1, 1); g50.fillRect(12, 7, 1, 1);
    g50.fillRect(5, 11, 1, 1); g50.fillRect(11, 11, 1, 1);
    g50.fillRect(3, 9, 1, 1); g50.fillRect(13, 9, 1, 1);
    g50.fillStyle(0x1b5e20); g50.fillRect(7, 7, 2, 1); // mouth
    g50.generateTexture('creature_50', 16, 16); g50.destroy();

    // 51 - Boltclaw: electric tiger cub — orange-yellow, stripes
    const g51 = this.make.graphics({ add: false });
    g51.fillStyle(0xf57f17); g51.fillCircle(8, 9, 5); // body
    g51.fillCircle(8, 5, 3); // head
    g51.fillStyle(0x000000); // stripes
    g51.fillRect(5, 4, 1, 2); g51.fillRect(11, 4, 1, 2);
    g51.fillRect(5, 8, 1, 2); g51.fillRect(11, 8, 1, 2);
    g51.fillStyle(0xffffff); g51.fillRect(7, 5, 1, 1); g51.fillRect(9, 5, 1, 1); // eyes
    g51.fillStyle(0xffff00); g51.fillRect(4, 12, 2, 2); g51.fillRect(10, 12, 2, 2); // paws (electric)
    g51.fillStyle(0xf57f17); g51.fillTriangle(5, 3, 4, 0, 7, 3); // ear L
    g51.fillTriangle(11, 3, 12, 0, 9, 3); // ear R
    g51.generateTexture('creature_51', 16, 16); g51.destroy();

    // 52 - Gravelem: rock golem — brown, chunky
    const g52 = this.make.graphics({ add: false });
    g52.fillStyle(0x795548); g52.fillRect(4, 4, 8, 9); // body
    g52.fillStyle(0x8d6e63); g52.fillRect(5, 3, 6, 2); // head
    g52.fillStyle(0xffffff); g52.fillRect(6, 4, 1, 1); g52.fillRect(9, 4, 1, 1); // eyes
    g52.fillStyle(0x5d4037); // arms
    g52.fillRect(2, 6, 2, 4); g52.fillRect(12, 6, 2, 4);
    g52.fillStyle(0x795548); g52.fillRect(5, 13, 2, 2); g52.fillRect(9, 13, 2, 2); // legs
    g52.fillStyle(0xa1887f); g52.fillRect(6, 7, 1, 1); g52.fillRect(9, 9, 1, 1); // rock spots
    g52.generateTexture('creature_52', 16, 16); g52.destroy();

    // 53 - Nightowl: dark owl — purple, big eyes
    const g53 = this.make.graphics({ add: false });
    g53.fillStyle(0x4a0072); g53.fillCircle(8, 8, 5); // body
    g53.fillStyle(0x6a1b9a); g53.fillCircle(8, 6, 3); // head
    g53.fillStyle(0xffff00); g53.fillCircle(6, 5, 1); g53.fillCircle(10, 5, 1); // big eyes
    g53.fillStyle(0x000000); g53.fillRect(6, 5, 1, 1); g53.fillRect(10, 5, 1, 1); // pupils
    g53.fillStyle(0xf9a825); g53.fillTriangle(8, 6, 7, 8, 9, 8); // beak
    g53.fillStyle(0x7b1fa2); // wings
    g53.fillTriangle(2, 6, 4, 5, 4, 11);
    g53.fillTriangle(14, 6, 12, 5, 12, 11);
    g53.fillStyle(0x4a0072); g53.fillRect(6, 12, 1, 2); g53.fillRect(10, 12, 1, 2); // talons
    g53.generateTexture('creature_53', 16, 16); g53.destroy();

    // 54 - Halofly: light dragonfly — yellow, glowing wings
    const g54 = this.make.graphics({ add: false });
    g54.fillStyle(0xfff176); g54.fillRect(7, 5, 2, 7); // body
    g54.fillCircle(8, 4, 2); // head
    g54.fillStyle(0x000000); g54.fillRect(7, 3, 1, 1); g54.fillRect(9, 3, 1, 1); // eyes
    g54.fillStyle(0xffd54f, 0.7); // wings
    g54.fillTriangle(3, 5, 7, 7, 7, 5); // wing TL
    g54.fillTriangle(13, 5, 9, 7, 9, 5); // wing TR
    g54.fillTriangle(3, 9, 7, 7, 7, 9); // wing BL
    g54.fillTriangle(13, 9, 9, 7, 9, 9); // wing BR
    g54.fillStyle(0xffecb3); g54.fillRect(7, 1, 1, 2); g54.fillRect(9, 1, 1, 2); // antennae
    g54.generateTexture('creature_54', 16, 16); g54.destroy();

    // 55 - Magmawyrm: fire wyrm — deep red, lava dripping
    const g55 = this.make.graphics({ add: false });
    g55.fillStyle(0xdd2c00); g55.fillRect(4, 3, 8, 10); // body
    g55.fillStyle(0xff6e40); g55.fillRect(5, 2, 6, 2); // head
    g55.fillStyle(0xffff00); g55.fillRect(6, 3, 1, 1); g55.fillRect(9, 3, 1, 1); // eyes
    g55.fillStyle(0xff3d00); // spines
    g55.fillRect(7, 0, 2, 2);
    g55.fillRect(6, 5, 1, 1); g55.fillRect(9, 5, 1, 1);
    g55.fillStyle(0xffab00); // lava drips
    g55.fillRect(5, 12, 1, 2); g55.fillRect(8, 13, 1, 2); g55.fillRect(10, 12, 1, 2);
    g55.fillStyle(0xbf360c); g55.fillRect(5, 13, 2, 2); g55.fillRect(9, 13, 2, 2); // legs
    g55.generateTexture('creature_55', 16, 16); g55.destroy();

    // 56 - Frostlich: ice undead — teal, skull face, ice crown
    const g56 = this.make.graphics({ add: false });
    g56.fillStyle(0x00bcd4); g56.fillRect(5, 5, 6, 8); // body robe
    g56.fillStyle(0x00838f); g56.fillCircle(8, 5, 3); // head
    g56.fillStyle(0x00ffff); g56.fillRect(6, 4, 1, 1); g56.fillRect(10, 4, 1, 1); // eyes
    g56.fillStyle(0x80deea); // ice crown
    g56.fillRect(5, 1, 1, 2); g56.fillRect(8, 0, 1, 2); g56.fillRect(11, 1, 1, 2);
    g56.fillStyle(0x004d40); g56.fillRect(7, 7, 2, 1); // mouth
    g56.fillStyle(0x00bcd4); // arms
    g56.fillRect(3, 7, 2, 1); g56.fillRect(11, 7, 2, 1);
    g56.fillStyle(0x80deea); g56.fillRect(2, 7, 1, 1); g56.fillRect(13, 7, 1, 1); // ice hands
    g56.generateTexture('creature_56', 16, 16); g56.destroy();

    // 57 - Verdantis: grass tree guardian — green, trunk body, leaf crown
    const g57 = this.make.graphics({ add: false });
    g57.fillStyle(0x5d4037); g57.fillRect(6, 6, 4, 8); // trunk body
    g57.fillStyle(0x2e7d32); g57.fillCircle(8, 5, 4); // leaf crown
    g57.fillStyle(0x4caf50); g57.fillCircle(5, 3, 2); g57.fillCircle(11, 3, 2); // extra leaves
    g57.fillStyle(0xffff00); g57.fillRect(7, 5, 1, 1); g57.fillRect(9, 5, 1, 1); // eyes
    g57.fillStyle(0x5d4037); // branch arms
    g57.fillRect(3, 8, 3, 1); g57.fillRect(10, 8, 3, 1);
    g57.fillStyle(0x2e7d32); g57.fillRect(2, 7, 1, 1); g57.fillRect(13, 7, 1, 1); // leaf tips
    g57.fillStyle(0x795548); g57.fillRect(6, 14, 1, 2); g57.fillRect(9, 14, 1, 2); // roots
    g57.generateTexture('creature_57', 16, 16); g57.destroy();

    // 58 - Stormrex: wind raptor — teal, sharp wings
    const g58 = this.make.graphics({ add: false });
    g58.fillStyle(0x00897b); g58.fillCircle(8, 8, 4); // body
    g58.fillStyle(0x4db6ac); g58.fillCircle(8, 5, 3); // head
    g58.fillStyle(0xff0000); g58.fillRect(7, 4, 1, 1); g58.fillRect(9, 4, 1, 1); // fierce eyes
    g58.fillStyle(0xf9a825); g58.fillTriangle(8, 5, 7, 7, 9, 7); // beak
    g58.fillStyle(0x00695c); // sharp wings
    g58.fillTriangle(0, 6, 5, 7, 4, 11);
    g58.fillTriangle(16, 6, 11, 7, 12, 11);
    g58.fillStyle(0x00897b); g58.fillRect(6, 12, 1, 2); g58.fillRect(10, 12, 1, 2); // talons
    g58.generateTexture('creature_58', 16, 16); g58.destroy();

    // 59 - Voidshade: dark assassin — very dark purple, glowing eyes
    const g59 = this.make.graphics({ add: false });
    g59.fillStyle(0x1a0033); g59.fillRect(5, 4, 6, 9); // body/cloak
    g59.fillRect(4, 5, 8, 6); // cloak spread
    g59.fillStyle(0x4a148c); g59.fillCircle(8, 4, 2); // hood
    g59.fillStyle(0xff0000); g59.fillRect(7, 4, 1, 1); g59.fillRect(9, 4, 1, 1); // red eyes
    g59.fillStyle(0x6a1b9a); // daggers
    g59.fillRect(3, 8, 1, 3); g59.fillRect(2, 8, 1, 1); // left blade
    g59.fillRect(12, 8, 1, 3); g59.fillRect(13, 8, 1, 1); // right blade
    g59.fillStyle(0x1a0033); g59.fillTriangle(6, 13, 8, 16, 10, 13); // cloak tail
    g59.generateTexture('creature_59', 16, 16); g59.destroy();

    // 60 - Glacius: ice emperor — dark cyan, icy crown, cape
    const g60 = this.make.graphics({ add: false });
    g60.fillStyle(0x006064); g60.fillRect(5, 5, 6, 8); // body
    g60.fillStyle(0x00838f); g60.fillCircle(8, 5, 3); // head
    g60.fillStyle(0x00ffff); g60.fillRect(7, 4, 1, 1); g60.fillRect(9, 4, 1, 1); // icy eyes
    g60.fillStyle(0x80deea); // ice crown
    g60.fillRect(5, 1, 1, 3); g60.fillRect(7, 0, 1, 3); g60.fillRect(9, 0, 1, 3); g60.fillRect(11, 1, 1, 3);
    g60.fillStyle(0x004d40); // cape
    g60.fillTriangle(3, 6, 5, 5, 5, 13);
    g60.fillTriangle(13, 6, 11, 5, 11, 13);
    g60.fillStyle(0x00bcd4); g60.fillRect(6, 13, 2, 2); g60.fillRect(8, 13, 2, 2); // feet
    g60.generateTexture('creature_60', 16, 16); g60.destroy();

    // 61 - Floravex: grass titan — dark green, massive, vine arms
    const g61 = this.make.graphics({ add: false });
    g61.fillStyle(0x004d40); g61.fillRect(4, 4, 8, 9); // body
    g61.fillStyle(0x1b5e20); g61.fillCircle(8, 4, 3); // head
    g61.fillStyle(0xffff00); g61.fillRect(7, 3, 1, 1); g61.fillRect(9, 3, 1, 1); // eyes
    g61.fillStyle(0x2e7d32); // vine arms
    g61.fillRect(1, 6, 3, 2); g61.fillRect(0, 5, 1, 1); // left
    g61.fillRect(12, 6, 3, 2); g61.fillRect(15, 5, 1, 1); // right
    g61.fillStyle(0x4caf50); // leaf shoulders
    g61.fillCircle(4, 5, 2); g61.fillCircle(12, 5, 2);
    g61.fillStyle(0x388e3c); g61.fillRect(5, 13, 2, 2); g61.fillRect(9, 13, 2, 2); // legs
    g61.fillStyle(0x66bb6a); g61.fillCircle(8, 1, 2); // leaf crown
    g61.generateTexture('creature_61', 16, 16); g61.destroy();

    // 62 - Voltrion: electric god — orange, lightning aura
    const g62 = this.make.graphics({ add: false });
    g62.fillStyle(0xff6f00); g62.fillCircle(8, 8, 5); // body
    g62.fillStyle(0xffab00); g62.fillCircle(8, 6, 3); // head
    g62.fillStyle(0xffffff); g62.fillRect(7, 5, 1, 1); g62.fillRect(9, 5, 1, 1); // eyes
    g62.fillStyle(0xffff00); // lightning bolts around
    g62.fillRect(2, 3, 1, 3); g62.fillRect(3, 5, 1, 1); g62.fillRect(1, 6, 1, 1);
    g62.fillRect(13, 3, 1, 3); g62.fillRect(12, 5, 1, 1); g62.fillRect(14, 6, 1, 1);
    g62.fillRect(7, 0, 2, 2); // top bolt
    g62.fillStyle(0xff6f00); g62.fillRect(5, 13, 2, 2); g62.fillRect(9, 13, 2, 2); // legs
    g62.fillStyle(0xffff00); g62.fillRect(4, 12, 1, 1); g62.fillRect(11, 12, 1, 1); // sparks
    g62.generateTexture('creature_62', 16, 16); g62.destroy();

    // 63 - Abyssion: dark god — deep purple, void aura, glowing eyes
    const g63 = this.make.graphics({ add: false });
    g63.fillStyle(0x0a0020); g63.fillCircle(8, 8, 7); // void aura
    g63.fillStyle(0x1a0a3e); g63.fillRect(4, 4, 8, 9); // body
    g63.fillStyle(0x2d1b69); g63.fillCircle(8, 4, 3); // head
    g63.fillStyle(0xff00ff); g63.fillRect(6, 3, 1, 1); g63.fillRect(10, 3, 1, 1); // eyes
    g63.fillStyle(0x7b1fa2); // horns
    g63.fillRect(4, 2, 1, 2); g63.fillRect(3, 0, 1, 2);
    g63.fillRect(12, 2, 1, 2); g63.fillRect(13, 0, 1, 2);
    g63.fillStyle(0x4a148c); // void tendrils
    g63.fillRect(2, 7, 2, 1); g63.fillRect(1, 9, 1, 1);
    g63.fillRect(12, 7, 2, 1); g63.fillRect(14, 9, 1, 1);
    g63.fillStyle(0xff00ff); // orbiting void sparks
    g63.fillRect(1, 4, 1, 1); g63.fillRect(14, 4, 1, 1);
    g63.fillRect(0, 12, 1, 1); g63.fillRect(15, 12, 1, 1);
    g63.generateTexture('creature_63', 16, 16); g63.destroy();

    // 64 - Eternox: rock god — dark brown, ancient, glowing runes
    const g64 = this.make.graphics({ add: false });
    g64.fillStyle(0x3e2723); g64.fillRect(3, 3, 10, 11); // massive body
    g64.fillStyle(0x4e342e); g64.fillRect(4, 2, 8, 2); // head
    g64.fillStyle(0xffab00); g64.fillRect(6, 3, 1, 1); g64.fillRect(9, 3, 1, 1); // glowing eyes
    g64.fillStyle(0x5d4037); // arms
    g64.fillRect(1, 5, 2, 5); g64.fillRect(13, 5, 2, 5);
    g64.fillStyle(0xffab00); // ancient runes on body
    g64.fillRect(6, 7, 1, 1); g64.fillRect(9, 7, 1, 1);
    g64.fillRect(7, 9, 2, 1);
    g64.fillRect(6, 11, 1, 1); g64.fillRect(9, 11, 1, 1);
    g64.fillStyle(0x3e2723); g64.fillRect(4, 14, 3, 2); g64.fillRect(9, 14, 3, 2); // legs
    g64.fillStyle(0xffab00); g64.fillRect(7, 0, 2, 2); // crown rune
    g64.generateTexture('creature_64', 16, 16); g64.destroy();

    // === EPIC CREATURES ===

    // 65 - Pyroclasm: volcanic beast — dark red, lava jaws, fire crest
    const g65 = this.make.graphics({ add: false });
    g65.fillStyle(0xbf360c); g65.fillRect(4, 4, 8, 9); // body
    g65.fillStyle(0xe65100); g65.fillCircle(8, 4, 3); // head
    g65.fillStyle(0xffff00); g65.fillRect(6, 3, 1, 1); g65.fillRect(10, 3, 1, 1); // eyes
    g65.fillStyle(0xff3d00); // fire crest
    g65.fillRect(6, 0, 1, 2); g65.fillRect(8, 0, 1, 3); g65.fillRect(10, 0, 1, 2);
    g65.fillStyle(0xffab00); g65.fillRect(6, 7, 4, 2); // lava mouth
    g65.fillStyle(0xbf360c); g65.fillRect(3, 8, 2, 4); g65.fillRect(11, 8, 2, 4); // arms
    g65.fillStyle(0xff6d00); g65.fillRect(5, 13, 2, 2); g65.fillRect(9, 13, 2, 2); // feet
    g65.fillStyle(0xffab00); g65.fillRect(3, 12, 1, 1); g65.fillRect(12, 12, 1, 1); // lava drips
    g65.generateTexture('creature_65', 16, 16); g65.destroy();

    // 66 - Leviathorn: thorned sea serpent — deep blue, spikes
    const g66 = this.make.graphics({ add: false });
    g66.fillStyle(0x01579b); g66.fillCircle(8, 8, 5); // coiled body
    g66.fillStyle(0x0277bd); g66.fillCircle(8, 4, 3); // head
    g66.fillStyle(0x00ffff); g66.fillRect(7, 3, 1, 1); g66.fillRect(9, 3, 1, 1); // eyes
    g66.fillStyle(0x4fc3f7); // thorns/spikes
    g66.fillRect(4, 6, 1, 2); g66.fillRect(12, 6, 1, 2);
    g66.fillRect(3, 9, 1, 2); g66.fillRect(13, 9, 1, 2);
    g66.fillRect(5, 12, 1, 1); g66.fillRect(11, 12, 1, 1);
    g66.fillStyle(0x01579b); g66.fillTriangle(8, 13, 5, 16, 11, 16); // tail fin
    g66.generateTexture('creature_66', 16, 16); g66.destroy();

    // 67 - Phantomix: phantom wraith — very dark purple, ghostly
    const g67 = this.make.graphics({ add: false });
    g67.fillStyle(0x200040); g67.fillRect(5, 3, 6, 10); // cloak
    g67.fillStyle(0x380060); g67.fillCircle(8, 4, 3); // hood
    g67.fillStyle(0xff00ff); g67.fillRect(6, 3, 1, 1); g67.fillRect(10, 3, 1, 1); // glowing eyes
    g67.fillStyle(0x4a0072); // wispy tendrils
    g67.fillTriangle(5, 13, 3, 16, 7, 14);
    g67.fillTriangle(11, 13, 13, 16, 9, 14);
    g67.fillTriangle(8, 14, 6, 16, 10, 16);
    g67.fillStyle(0x7b1fa2); g67.fillRect(3, 6, 2, 1); g67.fillRect(11, 6, 2, 1); // arms
    g67.fillStyle(0xff00ff); g67.fillRect(2, 5, 1, 1); g67.fillRect(13, 5, 1, 1); // hand glow
    g67.generateTexture('creature_67', 16, 16); g67.destroy();

    // 68 - Crystallion: crystal ice dragon — cyan, crystalline
    const g68 = this.make.graphics({ add: false });
    g68.fillStyle(0x00acc1); g68.fillRect(5, 5, 6, 7); // body
    g68.fillStyle(0x00838f); g68.fillCircle(8, 5, 3); // head
    g68.fillStyle(0xffffff); g68.fillRect(7, 4, 1, 1); g68.fillRect(9, 4, 1, 1); // eyes
    g68.fillStyle(0x80deea); // crystal spines
    g68.fillRect(7, 1, 2, 3); // top crystal
    g68.fillRect(4, 3, 1, 2); g68.fillRect(11, 3, 1, 2); // side crystals
    g68.fillStyle(0x4dd0e1); // wings
    g68.fillTriangle(1, 6, 5, 5, 4, 10);
    g68.fillTriangle(15, 6, 11, 5, 12, 10);
    g68.fillStyle(0x00acc1); g68.fillRect(6, 12, 1, 2); g68.fillRect(9, 12, 1, 2); // legs
    g68.generateTexture('creature_68', 16, 16); g68.destroy();

    // 69 - Verdantking: forest king — dark green, crown of leaves, big
    const g69 = this.make.graphics({ add: false });
    g69.fillStyle(0x1b5e20); g69.fillRect(4, 5, 8, 8); // body
    g69.fillStyle(0x2e7d32); g69.fillCircle(8, 5, 3); // head
    g69.fillStyle(0xffff00); g69.fillRect(7, 4, 1, 1); g69.fillRect(9, 4, 1, 1); // eyes
    g69.fillStyle(0x4caf50); // leaf crown
    g69.fillCircle(6, 2, 2); g69.fillCircle(8, 1, 2); g69.fillCircle(10, 2, 2);
    g69.fillStyle(0x33691e); // arms
    g69.fillRect(2, 7, 2, 3); g69.fillRect(12, 7, 2, 3);
    g69.fillStyle(0x4caf50); g69.fillRect(1, 6, 1, 1); g69.fillRect(14, 6, 1, 1); // leaf tips
    g69.fillStyle(0x1b5e20); g69.fillRect(5, 13, 2, 2); g69.fillRect(9, 13, 2, 2); // legs
    g69.generateTexture('creature_69', 16, 16); g69.destroy();

    // === MYTHIC CREATURES ===

    // 70 - Solarius: sun phoenix — golden, fiery wings, radiant
    const g70 = this.make.graphics({ add: false });
    g70.fillStyle(0xffab00); g70.fillCircle(8, 8, 5); // body glow
    g70.fillStyle(0xffd700); g70.fillCircle(8, 7, 3); // head
    g70.fillStyle(0xffffff); g70.fillRect(7, 6, 1, 1); g70.fillRect(9, 6, 1, 1); // eyes
    g70.fillStyle(0xff6d00); // fire wings
    g70.fillTriangle(0, 4, 5, 6, 3, 11);
    g70.fillTriangle(16, 4, 11, 6, 13, 11);
    g70.fillStyle(0xffff00); // wing tips
    g70.fillRect(0, 3, 2, 1); g70.fillRect(14, 3, 2, 1);
    g70.fillStyle(0xffd700); g70.fillTriangle(8, 12, 5, 16, 11, 16); // tail flame
    g70.fillStyle(0xff6d00); g70.fillRect(7, 14, 1, 2); g70.fillRect(9, 14, 1, 2); // tail tips
    g70.generateTexture('creature_70', 16, 16); g70.destroy();

    // 71 - Stormdrake: thunder dragon — orange-yellow, electric aura
    const g71 = this.make.graphics({ add: false });
    g71.fillStyle(0xf57f17); g71.fillRect(4, 4, 8, 9); // body
    g71.fillStyle(0xff8f00); g71.fillCircle(8, 4, 3); // head
    g71.fillStyle(0xffffff); g71.fillRect(6, 3, 1, 1); g71.fillRect(10, 3, 1, 1); // eyes
    g71.fillStyle(0xffff00); // lightning aura
    g71.fillRect(2, 2, 1, 3); g71.fillRect(3, 4, 1, 1);
    g71.fillRect(13, 2, 1, 3); g71.fillRect(12, 4, 1, 1);
    g71.fillRect(7, 0, 2, 2);
    g71.fillStyle(0xe65100); // wings
    g71.fillTriangle(1, 5, 4, 4, 4, 9);
    g71.fillTriangle(15, 5, 12, 4, 12, 9);
    g71.fillStyle(0xf57f17); g71.fillRect(5, 13, 2, 2); g71.fillRect(9, 13, 2, 2); // legs
    g71.fillStyle(0xffff00); g71.fillRect(4, 12, 1, 1); g71.fillRect(11, 12, 1, 1); // sparks
    g71.generateTexture('creature_71', 16, 16); g71.destroy();

    // 72 - Frostqueen: ice queen — dark cyan, ice crown, elegant
    const g72 = this.make.graphics({ add: false });
    g72.fillStyle(0x006064); g72.fillRect(5, 5, 6, 8); // body/dress
    g72.fillStyle(0x00838f); g72.fillCircle(8, 5, 3); // head
    g72.fillStyle(0x00ffff); g72.fillRect(7, 4, 1, 1); g72.fillRect(9, 4, 1, 1); // eyes
    g72.fillStyle(0x80deea); // ice crown — tall spires
    g72.fillRect(5, 0, 1, 3); g72.fillRect(7, 0, 1, 4); g72.fillRect(9, 0, 1, 4); g72.fillRect(11, 0, 1, 3);
    g72.fillStyle(0x4dd0e1); // flowing cape
    g72.fillTriangle(3, 7, 5, 5, 5, 13);
    g72.fillTriangle(13, 7, 11, 5, 11, 13);
    g72.fillStyle(0x80deea); g72.fillTriangle(6, 13, 8, 16, 10, 13); // dress trail
    g72.generateTexture('creature_72', 16, 16); g72.destroy();

    // 73 - Shadowlord: dark lord — nearly black, red eyes, cape
    const g73 = this.make.graphics({ add: false });
    g73.fillStyle(0x050010); g73.fillCircle(8, 8, 7); // dark aura
    g73.fillStyle(0x0a0020); g73.fillRect(4, 4, 8, 9); // body
    g73.fillStyle(0x150030); g73.fillCircle(8, 4, 3); // head
    g73.fillStyle(0xff0000); g73.fillRect(6, 3, 1, 1); g73.fillRect(10, 3, 1, 1); // red eyes
    g73.fillStyle(0x1a0040); // horns
    g73.fillRect(4, 2, 1, 2); g73.fillRect(3, 0, 1, 2);
    g73.fillRect(12, 2, 1, 2); g73.fillRect(13, 0, 1, 2);
    g73.fillStyle(0x0a0020); // cape
    g73.fillTriangle(2, 6, 4, 4, 4, 13);
    g73.fillTriangle(14, 6, 12, 4, 12, 13);
    g73.fillStyle(0xff0000); g73.fillRect(1, 5, 1, 1); g73.fillRect(14, 5, 1, 1); // hand glow
    g73.generateTexture('creature_73', 16, 16); g73.destroy();

    // 74 - Terraforge: mythic golem — dark brown, glowing cracks, massive
    const g74 = this.make.graphics({ add: false });
    g74.fillStyle(0x3e2723); g74.fillRect(3, 3, 10, 11); // massive body
    g74.fillStyle(0x4e342e); g74.fillRect(4, 2, 8, 2); // head
    g74.fillStyle(0xffab00); g74.fillRect(6, 3, 1, 1); g74.fillRect(9, 3, 1, 1); // glowing eyes
    g74.fillStyle(0x5d4037); g74.fillRect(1, 5, 2, 5); g74.fillRect(13, 5, 2, 5); // arms
    g74.fillStyle(0xff6d00); // glowing cracks on body
    g74.fillRect(5, 6, 1, 1); g74.fillRect(10, 6, 1, 1);
    g74.fillRect(6, 8, 4, 1);
    g74.fillRect(5, 10, 1, 1); g74.fillRect(10, 10, 1, 1);
    g74.fillRect(7, 12, 2, 1);
    g74.fillStyle(0x3e2723); g74.fillRect(4, 14, 3, 2); g74.fillRect(9, 14, 3, 2); // legs
    g74.fillStyle(0xffab00); g74.fillRect(7, 0, 2, 2); // crown glow
    g74.generateTexture('creature_74', 16, 16); g74.destroy();

    // 75 - Seth: shadow beast — midnight body, purple aura, glowing cyan eyes, twin curved horns
    const g75 = this.make.graphics({ add: false });
    // Shadow aura
    g75.fillStyle(0x2a1a4a); g75.fillCircle(8, 9, 7);
    // Body — deep midnight
    g75.fillStyle(0x1a1a3a); g75.fillRect(4, 5, 8, 9);
    g75.fillStyle(0x0a0a1a); g75.fillRect(4, 13, 8, 1); // shadow underline
    // Curved horns (back-swept)
    g75.fillStyle(0x4a3a6a);
    g75.fillRect(3, 3, 1, 2); g75.fillRect(12, 3, 1, 2); // horn base
    g75.fillRect(2, 1, 1, 2); g75.fillRect(13, 1, 1, 2); // horn mid
    g75.fillStyle(0x9a7ab0); g75.fillRect(1, 0, 1, 1); g75.fillRect(14, 0, 1, 1); // horn tips
    // Glowing cyan eyes
    g75.fillStyle(0x00e5ff); g75.fillRect(6, 7, 1, 1); g75.fillRect(9, 7, 1, 1);
    g75.fillStyle(0xb2ebf2); g75.fillRect(6, 7, 1, 1); g75.fillRect(9, 7, 1, 1); // glow tip
    // Mouth — fanged snarl
    g75.fillStyle(0x000000); g75.fillRect(6, 10, 4, 1);
    g75.fillStyle(0xffffff); g75.fillRect(7, 10, 1, 1); g75.fillRect(8, 10, 1, 1);
    // Claws
    g75.fillStyle(0x9a7ab0); g75.fillRect(3, 14, 1, 2); g75.fillRect(12, 14, 1, 2);
    g75.fillRect(5, 14, 1, 2); g75.fillRect(10, 14, 1, 2);
    // Drifting shadow particles
    g75.fillStyle(0x6a4a8a);
    g75.fillRect(0, 6, 1, 1); g75.fillRect(15, 6, 1, 1);
    g75.fillRect(0, 11, 1, 1); g75.fillRect(15, 11, 1, 1);
    g75.generateTexture('creature_75', 16, 16); g75.destroy();

    // 76 - Santino: volcanic beast — orange-red body, magma cracks, flame mane, glowing yellow eyes
    const g76 = this.make.graphics({ add: false });
    // Heat haze aura
    g76.fillStyle(0x5d1f0a); g76.fillCircle(8, 9, 7);
    // Body — burning orange
    g76.fillStyle(0xff5722); g76.fillRect(4, 5, 8, 9);
    // Magma cracks (yellow glow lines on body)
    g76.fillStyle(0xffd54f);
    g76.fillRect(5, 8, 1, 1); g76.fillRect(7, 9, 2, 1); g76.fillRect(10, 8, 1, 1);
    g76.fillRect(6, 11, 4, 1);
    // Flame mane on top of head (jagged)
    g76.fillStyle(0xff9100);
    g76.fillRect(3, 4, 1, 1); g76.fillRect(5, 3, 1, 1); g76.fillRect(7, 2, 2, 1);
    g76.fillRect(10, 3, 1, 1); g76.fillRect(12, 4, 1, 1);
    g76.fillStyle(0xffd54f);
    g76.fillRect(4, 3, 1, 1); g76.fillRect(6, 2, 1, 1); g76.fillRect(9, 2, 1, 1); g76.fillRect(11, 3, 1, 1);
    // Glowing yellow eyes
    g76.fillStyle(0xffeb3b); g76.fillRect(6, 7, 1, 1); g76.fillRect(9, 7, 1, 1);
    // Mouth — glowing fanged
    g76.fillStyle(0xffd54f); g76.fillRect(6, 10, 4, 1);
    g76.fillStyle(0xffffff); g76.fillRect(7, 10, 1, 1); g76.fillRect(8, 10, 1, 1);
    // Claws
    g76.fillStyle(0xff7043);
    g76.fillRect(3, 14, 1, 2); g76.fillRect(5, 14, 1, 2);
    g76.fillRect(10, 14, 1, 2); g76.fillRect(12, 14, 1, 2);
    // Floating embers
    g76.fillStyle(0xffaa33);
    g76.fillRect(1, 5, 1, 1); g76.fillRect(14, 5, 1, 1);
    g76.fillRect(0, 12, 1, 1); g76.fillRect(15, 12, 1, 1);
    g76.generateTexture('creature_76', 16, 16); g76.destroy();

    // === SAFE BLAST TEXTURES ===

    // Bridge (160x16)
    const bridge = this.make.graphics({ add: false });
    bridge.fillStyle(0x8d6e63); bridge.fillRect(0, 0, 160, 16);
    bridge.fillStyle(0x6d4c41); bridge.fillRect(0, 0, 160, 2); bridge.fillRect(0, 14, 160, 2);
    for (let i = 0; i < 10; i++) { bridge.fillStyle(0x5d4037); bridge.fillRect(i * 16, 6, 1, 4); }
    bridge.fillStyle(0xa1887f); bridge.fillRect(0, 4, 160, 1);
    bridge.generateTexture('sb_bridge', 160, 16); bridge.destroy();

    // Safe (16x16)
    const safe = this.make.graphics({ add: false });
    safe.fillStyle(0x78909c); safe.fillRect(1, 2, 14, 13);
    safe.fillStyle(0x546e7a); safe.fillRect(1, 2, 14, 2); // top edge
    safe.fillStyle(0x90a4ae); safe.fillRect(2, 4, 12, 9);
    safe.fillStyle(0xffd600); safe.fillRect(7, 7, 3, 3); // lock
    safe.fillStyle(0xffab00); safe.fillRect(8, 8, 1, 1);
    safe.fillStyle(0x455a64); safe.fillRect(12, 6, 2, 5); // handle
    safe.generateTexture('sb_safe', 16, 16); safe.destroy();

    // Broken safe (16x16)
    const safeb = this.make.graphics({ add: false });
    safeb.fillStyle(0x546e7a); safeb.fillRect(1, 3, 14, 12);
    safeb.fillStyle(0x37474f); safeb.fillRect(3, 5, 4, 3); safeb.fillRect(9, 7, 3, 4);
    safeb.fillStyle(0xffd600); safeb.fillRect(5, 8, 2, 2); // gold inside
    safeb.fillStyle(0xffab00); safeb.fillRect(8, 6, 3, 2);
    safeb.fillStyle(0x263238); safeb.fillRect(6, 4, 1, 3); safeb.fillRect(10, 5, 1, 2); // cracks
    safeb.generateTexture('sb_safe_broken', 16, 16); safeb.destroy();

    // Sword (8x16)
    const sword = this.make.graphics({ add: false });
    sword.fillStyle(0xbdbdbd); sword.fillRect(3, 0, 2, 10); // blade
    sword.fillStyle(0xe0e0e0); sword.fillRect(3, 0, 1, 10); // shine
    sword.fillStyle(0xffd600); sword.fillRect(1, 10, 6, 2); // guard
    sword.fillStyle(0x795548); sword.fillRect(3, 12, 2, 4); // handle
    sword.generateTexture('sb_sword', 8, 16); sword.destroy();

    // Pickaxe (8x16)
    const pick = this.make.graphics({ add: false });
    pick.fillStyle(0x795548); pick.fillRect(3, 4, 2, 12); // handle
    pick.fillStyle(0x78909c); pick.fillRect(0, 0, 8, 3); // head
    pick.fillStyle(0x546e7a); pick.fillRect(0, 0, 2, 5); // pick point
    pick.fillStyle(0x90a4ae); pick.fillRect(1, 0, 7, 1); // shine
    pick.generateTexture('sb_pickaxe', 8, 16); pick.destroy();

    // Player character (16x24) blue
    const sbp = this.make.graphics({ add: false });
    sbp.fillStyle(0xffcc80); sbp.fillRect(4, 0, 8, 7); // head
    sbp.fillStyle(0x333333); sbp.fillRect(5, 3, 2, 2); sbp.fillRect(9, 3, 2, 2); // eyes
    sbp.fillStyle(0xffffff); sbp.fillRect(6, 3, 1, 1); sbp.fillRect(10, 3, 1, 1); // shine
    sbp.fillStyle(0x2196f3); sbp.fillRect(3, 7, 10, 9); // body
    sbp.fillStyle(0x1565c0); sbp.fillRect(3, 7, 10, 2); // collar
    sbp.fillStyle(0xffcc80); sbp.fillRect(1, 8, 2, 6); sbp.fillRect(13, 8, 2, 6); // arms
    sbp.fillStyle(0x1a237e); sbp.fillRect(4, 16, 3, 7); sbp.fillRect(9, 16, 3, 7); // legs
    sbp.fillStyle(0x333333); sbp.fillRect(4, 22, 3, 2); sbp.fillRect(9, 22, 3, 2); // shoes
    sbp.generateTexture('sb_player', 16, 24); sbp.destroy();

    // Enemy character (16x24) red
    const sbe = this.make.graphics({ add: false });
    sbe.fillStyle(0xffcc80); sbe.fillRect(4, 0, 8, 7); // head
    sbe.fillStyle(0x333333); sbe.fillRect(5, 3, 2, 2); sbe.fillRect(9, 3, 2, 2); // eyes
    sbe.fillStyle(0xff1744); sbe.fillRect(6, 3, 1, 1); sbe.fillRect(10, 3, 1, 1); // red eyes
    sbe.fillStyle(0xe53935); sbe.fillRect(3, 7, 10, 9); // body
    sbe.fillStyle(0xb71c1c); sbe.fillRect(3, 7, 10, 2); // collar
    sbe.fillStyle(0xffcc80); sbe.fillRect(1, 8, 2, 6); sbe.fillRect(13, 8, 2, 6); // arms
    sbe.fillStyle(0x37474f); sbe.fillRect(4, 16, 3, 7); sbe.fillRect(9, 16, 3, 7); // legs
    sbe.fillStyle(0x222222); sbe.fillRect(4, 22, 3, 2); sbe.fillRect(9, 22, 3, 2); // shoes
    sbe.generateTexture('sb_enemy', 16, 24); sbe.destroy();

    // Brainrot collectibles (16x16 each, weird fun creatures)
    const brainrots = [
      { name: 'Skibidi', color: 0xff4444, draw: (g) => { g.fillStyle(0xff4444); g.fillRect(3,3,10,8); g.fillStyle(0xffffff); g.fillRect(4,4,3,3); g.fillRect(9,4,3,3); g.fillStyle(0x111111); g.fillRect(5,5,1,1); g.fillRect(10,5,1,1); g.fillStyle(0xff4444); g.fillRect(5,0,6,3); g.fillRect(2,6,2,6); g.fillRect(12,6,2,6); g.fillStyle(0xffcc00); g.fillRect(6,9,4,2); } },
      { name: 'Gyatt', color: 0xff69b4, draw: (g) => { g.fillStyle(0xff69b4); g.fillCircle(8,8,6); g.fillStyle(0xffffff); g.fillRect(4,5,3,3); g.fillRect(9,5,3,3); g.fillStyle(0x111111); g.fillRect(5,6,1,1); g.fillRect(10,6,1,1); g.fillStyle(0xff1493); g.fillRect(5,10,6,2); g.fillStyle(0xff69b4); g.fillRect(2,2,3,3); g.fillRect(11,2,3,3); } },
      { name: 'Rizz', color: 0xffaa00, draw: (g) => { g.fillStyle(0xffaa00); g.fillRect(2,2,12,10); g.fillStyle(0xffffff); g.fillRect(3,4,4,3); g.fillRect(9,4,4,3); g.fillStyle(0x111111); g.fillRect(5,5,1,1); g.fillRect(10,5,1,1); g.fillStyle(0xff6600); g.fillRect(6,9,4,1); g.fillStyle(0xffdd00); g.fillRect(4,0,2,2); g.fillRect(10,0,2,2); g.fillStyle(0xffaa00); g.fillRect(3,12,4,3); g.fillRect(9,12,4,3); } },
      { name: 'Sigma', color: 0x666666, draw: (g) => { g.fillStyle(0x666666); g.fillRect(3,1,10,12); g.fillStyle(0x888888); g.fillRect(4,2,8,4); g.fillStyle(0xffffff); g.fillRect(5,3,2,2); g.fillRect(9,3,2,2); g.fillStyle(0x111111); g.fillRect(5,4,2,1); g.fillRect(9,4,2,1); g.fillStyle(0x444444); g.fillRect(5,8,6,1); g.fillStyle(0x222222); g.fillRect(3,0,10,1); g.fillRect(4,13,3,3); g.fillRect(9,13,3,3); } },
      { name: 'Ohio', color: 0x4488ff, draw: (g) => { g.fillStyle(0x4488ff); g.fillCircle(8,7,6); g.fillStyle(0xffffff); g.fillRect(4,4,3,4); g.fillRect(9,4,3,4); g.fillStyle(0xff0000); g.fillRect(5,5,1,2); g.fillRect(10,5,1,2); g.fillStyle(0x4488ff); g.fillRect(5,10,6,2); g.fillRect(2,12,4,3); g.fillRect(10,12,4,3); g.fillStyle(0xffdd00); g.fillRect(6,1,4,2); } },
      { name: 'Fanum Tax', color: 0x44ff44, draw: (g) => { g.fillStyle(0x44ff44); g.fillRect(2,3,12,9); g.fillStyle(0x22cc22); g.fillRect(3,4,4,3); g.fillRect(9,4,4,3); g.fillStyle(0x111111); g.fillRect(4,5,2,1); g.fillRect(10,5,2,1); g.fillStyle(0xffffff); g.fillRect(5,8,6,3); g.fillStyle(0x44ff44); g.fillRect(1,6,2,5); g.fillRect(13,6,2,5); g.fillRect(4,12,3,4); g.fillRect(9,12,3,4); } },
      { name: 'Mewing', color: 0xaa44ff, draw: (g) => { g.fillStyle(0xaa44ff); g.fillRect(3,2,10,10); g.fillStyle(0xcc88ff); g.fillRect(4,3,3,3); g.fillRect(9,3,3,3); g.fillStyle(0x111111); g.fillRect(5,4,1,1); g.fillRect(10,4,1,1); g.fillStyle(0xaa44ff); g.fillRect(6,8,4,1); g.fillStyle(0x8822dd); g.fillRect(4,0,3,2); g.fillRect(9,0,3,2); g.fillRect(3,12,4,3); g.fillRect(9,12,4,3); } },
      { name: 'Jellybean', color: 0xff44ff, draw: (g) => { g.fillStyle(0xff44ff); g.fillCircle(8,7,5); g.fillStyle(0xff88ff); g.fillCircle(8,6,3); g.fillStyle(0xffffff); g.fillRect(6,5,2,2); g.fillRect(9,5,2,2); g.fillStyle(0x111111); g.fillRect(6,5,1,1); g.fillRect(10,5,1,1); g.fillStyle(0xff44ff); g.fillRect(4,11,3,4); g.fillRect(9,11,3,4); g.fillStyle(0xff00ff); g.fillRect(6,9,4,1); } },
      { name: 'Baby Gronk', color: 0xffdd00, draw: (g) => { g.fillStyle(0xffdd00); g.fillRect(2,2,12,10); g.fillStyle(0xffffff); g.fillRect(4,3,3,4); g.fillRect(9,3,3,4); g.fillStyle(0x111111); g.fillRect(5,4,1,2); g.fillRect(10,4,1,2); g.fillStyle(0xff8800); g.fillRect(5,9,6,2); g.fillStyle(0xffdd00); g.fillRect(0,5,3,4); g.fillRect(13,5,3,4); g.fillRect(4,12,3,4); g.fillRect(9,12,3,4); g.fillStyle(0xffaa00); g.fillRect(5,0,6,2); } },
      { name: 'Livvy Dunne', color: 0x00ffff, draw: (g) => { g.fillStyle(0x00ffff); g.fillRect(3,1,10,11); g.fillStyle(0x88ffff); g.fillRect(4,2,8,4); g.fillStyle(0xffffff); g.fillRect(5,3,2,2); g.fillRect(9,3,2,2); g.fillStyle(0x111111); g.fillRect(5,4,2,1); g.fillRect(9,4,2,1); g.fillStyle(0x00cccc); g.fillRect(6,8,4,2); g.fillStyle(0x00ffff); g.fillRect(2,5,2,5); g.fillRect(12,5,2,5); g.fillRect(4,12,3,4); g.fillRect(9,12,3,4); g.fillStyle(0xffdd00); g.fillRect(5,0,6,1); } },
    ];

    for (let i = 0; i < brainrots.length; i++) {
      const bg = this.make.graphics({ add: false });
      brainrots[i].draw(bg);
      bg.generateTexture(`brainrot_${i}`, 16, 16);
      bg.destroy();
    }

    // === ISOMETRIC TEXTURES FOR SAFE BLAST REBUILD ===
    try {

    // Helper: draw an isometric diamond (ground tile) using fillTriangle
    const drawDiamond = (g, color, w, h) => {
      g.fillStyle(color);
      // Two triangles to make a diamond
      g.fillTriangle(w / 2, 0, w, h / 2, 0, h / 2);       // top half
      g.fillTriangle(0, h / 2, w, h / 2, w / 2, h);        // bottom half
    };

    // Helper: draw an isometric cube (block on a tile) using fillTriangle
    const drawIsoCube = (g, color, w, h) => {
      const top = lighten(color, 35);
      const left = color;
      const right = darken(color, 50);
      const halfW = w / 2;
      const topH = Math.floor(h * 0.33);
      const midY = topH * 2;

      // Top face (diamond)
      g.fillStyle(top);
      g.fillTriangle(halfW, 0, w, topH, halfW, midY);
      g.fillTriangle(halfW, 0, 0, topH, halfW, midY);

      // Left face (parallelogram)
      g.fillStyle(left);
      g.fillTriangle(0, topH, halfW, midY, halfW, h);
      g.fillTriangle(0, topH, 0, h - topH, halfW, h);

      // Right face (parallelogram)
      g.fillStyle(right);
      g.fillTriangle(w, topH, halfW, midY, halfW, h);
      g.fillTriangle(w, topH, w, h - topH, halfW, h);
    };

    // Ground tiles (64x32 diamonds)
    const groundTiles = [
      { key: 'iso_grass', color: 0x4caf50, detail: 0x388e3c },
      { key: 'iso_stone', color: 0x757575, detail: 0x616161 },
      { key: 'iso_wood', color: 0x8d6e63, detail: 0x6d4c41 },
      { key: 'iso_sand', color: 0xffd54f, detail: 0xffca28 },
      { key: 'iso_water', color: 0x1565c0, detail: 0x0d47a1 },
      { key: 'iso_generator', color: 0x9e9e9e, detail: 0xffdd00 },
      { key: 'iso_gold_gen', color: 0x9e9e9e, detail: 0xffab00 },
    ];

    for (const t of groundTiles) {
      const g = this.make.graphics({ add: false });
      drawDiamond(g, t.color, 64, 32);
      // Add detail pixels
      g.fillStyle(t.detail);
      if (t.key === 'iso_grass') {
        // Grass blades
        for (let i = 0; i < 8; i++) {
          g.fillRect(12 + i * 5, 10 + (i % 3) * 4, 2, 2);
        }
      } else if (t.key === 'iso_stone') {
        g.fillRect(20, 12, 4, 2); g.fillRect(38, 16, 3, 2);
      } else if (t.key === 'iso_wood') {
        for (let i = 0; i < 5; i++) g.fillRect(10 + i * 10, 14, 1, 4);
      } else if (t.key === 'iso_generator' || t.key === 'iso_gold_gen') {
        // Sparkle center
        g.fillRect(30, 14, 4, 4);
        g.fillStyle(0xffffff);
        g.fillRect(31, 15, 2, 2);
      }
      g.generateTexture(t.key, 64, 32);
      g.destroy();
    }

    // Block cubes (64x48)
    const blockTypes = [
      { key: 'iso_block_wool', color: 0xeeeeee },
      { key: 'iso_block_wood', color: 0x8d6e63 },
      { key: 'iso_block_stone', color: 0x757575 },
      { key: 'iso_block_obsidian', color: 0x311b92 },
    ];

    for (const b of blockTypes) {
      const g = this.make.graphics({ add: false });
      drawIsoCube(g, b.color, 64, 48);
      // Wood grain detail
      if (b.key === 'iso_block_wood') {
        g.fillStyle(darken(b.color, 30));
        g.fillRect(8, 20, 1, 16); g.fillRect(24, 22, 1, 14);
      }
      g.generateTexture(b.key, 64, 48);
      g.destroy();
    }

    // Crack overlays (64x48)
    const crack1 = this.make.graphics({ add: false });
    crack1.fillStyle(0x000000);
    crack1.fillRect(20, 18, 2, 8); crack1.fillRect(22, 22, 6, 2);
    crack1.fillRect(38, 20, 2, 6);
    crack1.generateTexture('iso_crack1', 64, 48);
    crack1.destroy();

    const crack2 = this.make.graphics({ add: false });
    crack2.fillStyle(0x000000);
    crack2.fillRect(16, 16, 2, 12); crack2.fillRect(18, 24, 8, 2);
    crack2.fillRect(36, 18, 2, 10); crack2.fillRect(28, 20, 10, 2);
    crack2.fillRect(22, 14, 2, 6); crack2.fillRect(40, 24, 2, 8);
    crack2.generateTexture('iso_crack2', 64, 48);
    crack2.destroy();

    // Safe cubes (64x48)
    const safeBlue = this.make.graphics({ add: false });
    drawIsoCube(safeBlue, 0x1565c0, 64, 48);
    safeBlue.fillStyle(0xffd600); safeBlue.fillRect(26, 28, 12, 8); // lock on front
    safeBlue.fillStyle(0xffab00); safeBlue.fillRect(30, 30, 4, 4);
    safeBlue.generateTexture('iso_safe_blue', 64, 48);
    safeBlue.destroy();

    const safeRed = this.make.graphics({ add: false });
    drawIsoCube(safeRed, 0xc62828, 64, 48);
    safeRed.fillStyle(0xffd600); safeRed.fillRect(26, 28, 12, 8);
    safeRed.fillStyle(0xffab00); safeRed.fillRect(30, 30, 4, 4);
    safeRed.generateTexture('iso_safe_red', 64, 48);
    safeRed.destroy();

    const safeBroken = this.make.graphics({ add: false });
    drawIsoCube(safeBroken, 0x546e7a, 64, 48);
    safeBroken.fillStyle(0xffd600); safeBroken.fillRect(24, 26, 6, 6);
    safeBroken.fillStyle(0x000000); safeBroken.fillRect(30, 22, 2, 10);
    safeBroken.fillRect(36, 28, 2, 8);
    safeBroken.generateTexture('iso_safe_broken', 64, 48);
    safeBroken.destroy();

    // Weapon icons for HUD (16x16)
    const weaponIcons = [
      { key: 'iso_sword_wood', blade: 0xbdbdbd, guard: 0x8d6e63 },
      { key: 'iso_sword_iron', blade: 0xe0e0e0, guard: 0xffd600 },
      { key: 'iso_sword_diamond', blade: 0x4fc3f7, guard: 0xffd600 },
      { key: 'iso_pick_wood', head: 0x795548, handle: 0x8d6e63 },
      { key: 'iso_pick_iron', head: 0xbdbdbd, handle: 0x795548 },
      { key: 'iso_pick_diamond', head: 0x4fc3f7, handle: 0x795548 },
    ];

    for (const wi of weaponIcons) {
      const g = this.make.graphics({ add: false });
      if (wi.key.includes('sword')) {
        g.fillStyle(wi.blade); g.fillRect(7, 1, 2, 9);
        g.fillStyle(lighten(wi.blade, 30)); g.fillRect(7, 1, 1, 9);
        g.fillStyle(wi.guard); g.fillRect(5, 10, 6, 2);
        g.fillStyle(0x795548); g.fillRect(7, 12, 2, 3);
      } else {
        g.fillStyle(wi.handle); g.fillRect(7, 5, 2, 10);
        g.fillStyle(wi.head); g.fillRect(2, 1, 12, 3);
        g.fillStyle(darken(wi.head, 30)); g.fillRect(2, 1, 3, 5);
        g.fillStyle(lighten(wi.head, 30)); g.fillRect(3, 1, 11, 1);
      }
      g.generateTexture(wi.key, 16, 16);
      g.destroy();
    }

    // Bow icon
    const bowG = this.make.graphics({ add: false });
    bowG.fillStyle(0x795548); bowG.fillRect(4, 1, 2, 14); // bow body
    bowG.fillStyle(0xeeeeee); bowG.fillRect(10, 1, 1, 14); // string
    bowG.fillStyle(0x6d4c41); bowG.fillRect(3, 0, 4, 2); bowG.fillRect(3, 14, 4, 2); // tips
    bowG.generateTexture('iso_bow', 16, 16);
    bowG.destroy();

    // TNT icon
    const tntG = this.make.graphics({ add: false });
    tntG.fillStyle(0xd32f2f); tntG.fillRect(2, 4, 12, 10);
    tntG.fillStyle(0xb71c1c); tntG.fillRect(2, 4, 12, 2);
    tntG.fillStyle(0xffffff); tntG.fillRect(5, 7, 6, 4);
    tntG.fillStyle(0xd32f2f);
    tntG.fillRect(6, 8, 4, 2); // TNT text area
    tntG.fillStyle(0x795548); tntG.fillRect(7, 1, 2, 3); // fuse
    tntG.fillStyle(0xff9800); tntG.fillRect(7, 0, 2, 2); // spark
    tntG.generateTexture('iso_tnt', 16, 16);
    tntG.destroy();

    // Arrow projectile (8x8)
    const arrowG = this.make.graphics({ add: false });
    arrowG.fillStyle(0x795548); arrowG.fillRect(1, 3, 6, 2); // shaft
    arrowG.fillStyle(0xbdbdbd); arrowG.fillRect(6, 2, 2, 4); // tip
    arrowG.fillStyle(0xeeeeee); arrowG.fillRect(0, 2, 2, 1); arrowG.fillRect(0, 5, 2, 1); // feathers
    arrowG.generateTexture('iso_arrow', 8, 8);
    arrowG.destroy();

    // Coin pickups (12x12)
    const coinTypes = [
      { key: 'iso_coin_bronze', color: 0xcd7f32 },
      { key: 'iso_coin_silver', color: 0xc0c0c0 },
      { key: 'iso_coin_gold', color: 0xffd700 },
    ];
    for (const c of coinTypes) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(c.color);
      g.fillCircle(6, 6, 5);
      g.fillStyle(lighten(c.color, 50));
      g.fillCircle(5, 5, 2);
      g.generateTexture(c.key, 12, 12);
      g.destroy();
    }

    // HUD elements
    const slotG = this.make.graphics({ add: false });
    slotG.fillStyle(0x1a1a2e); slotG.fillRect(0, 0, 36, 36);
    slotG.lineStyle(2, 0x444444); slotG.strokeRect(0, 0, 36, 36);
    slotG.generateTexture('hotbar_slot', 36, 36);
    slotG.destroy();

    const slotAG = this.make.graphics({ add: false });
    slotAG.fillStyle(0x1a1a3e); slotAG.fillRect(0, 0, 36, 36);
    slotAG.lineStyle(2, 0x42a5f5); slotAG.strokeRect(0, 0, 36, 36);
    slotAG.generateTexture('hotbar_active', 36, 36);
    slotAG.destroy();
    } catch (e) { console.error('ISO TEXTURE ERROR:', e); }
  }

  create() {
    this.tryResumeSession();
  }

  async tryResumeSession() {
    let token = null;
    try { token = localStorage.getItem('cc_session'); } catch {}
    if (!token) {
      this.scene.start('Login');
      return;
    }
    try {
      const resp = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await resp.json();
      if (data.ok) {
        this.registry.set('username', data.displayName);
        this.registry.set('serverGameData', data.gameData);
        this.registry.set('avatar', data.avatar || { outfit: 0, hat: 0 });

        // Merge server + localStorage so an in-flight save that never
        // reached the server isn't lost to a refresh. localStorage is the
        // authoritative source for values that can DECREASE (coins) since
        // it's written synchronously on every client change; server wins
        // only when localStorage is missing (fresh login / other device).
        const serverBr = data.brainrotData || { coins: 0, owned: [], bestLevels: {} };
        let finalBr = serverBr;
        try {
          const key = 'cc_brdata_' + (data.displayName || '_').toLowerCase();
          const raw = localStorage.getItem(key);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached && cached.data) {
              const c = cached.data;
              // If server has MORE coins than we last saw it with, treat the
              // difference as an operator bump and add it to our local total.
              // If server has the same / less, trust localStorage (normal
              // spending).
              const lastSeenServer = typeof cached.lastServerCoins === 'number'
                ? cached.lastServerCoins
                : (typeof c.coins === 'number' ? c.coins : 0);
              const serverCoins = serverBr.coins || 0;
              const bump = Math.max(0, serverCoins - lastSeenServer);
              const localCoins = typeof c.coins === 'number' ? c.coins : 0;
              finalBr = {
                coins: localCoins + bump,
                owned: unionIds(serverBr.owned, c.owned),
                bestLevels: Object.assign({}, serverBr.bestLevels || {}, c.bestLevels || {}),
                abilities: mergeAbilities(serverBr.abilities, c.abilities),
                // For per-ability upgrade levels take the max of server and
                // localStorage so upgrades never appear to roll back.
                abilityLevels: mergeLevelMaps(serverBr.abilityLevels, c.abilityLevels),
                soldierLevel: Math.max(serverBr.soldierLevel || 0, c.soldierLevel || 0) || 1,
                healthLevel: Math.max(serverBr.healthLevel || 0, c.healthLevel || 0),
              };
            }
          }
        } catch {}
        this.registry.set('brainrotData', finalBr);

        // If localStorage was ahead, push it back to the server so everything
        // is in sync going forward.
        if (data.token) {
          try { localStorage.setItem('cc_session', data.token); } catch {}
        }

        if (finalBr !== serverBr) {
          fetch('/api/save-brainrot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.token, brainrotData: finalBr }),
            keepalive: true,
          }).catch(() => {});
        }
        this.scene.start('Homepage');
        return;
      }
      try { localStorage.removeItem('cc_session'); } catch {}
    } catch {
      // network error - fall through to login
    }
    this.scene.start('Login');
  }
}

function unionIds(a, b) {
  const s = new Set();
  if (Array.isArray(a)) for (const x of a) s.add(x);
  if (Array.isArray(b)) for (const x of b) s.add(x);
  return Array.from(s);
}

function mergeLevelMaps(a, b) {
  const out = {};
  if (a && typeof a === 'object') for (const k of Object.keys(a)) out[k] = a[k];
  if (b && typeof b === 'object') {
    for (const k of Object.keys(b)) {
      out[k] = Math.max(out[k] || 0, b[k] || 0);
    }
  }
  return out;
}

function mergeAbilities(a, b) {
  const ownedA = (a && a.owned) || [];
  const ownedB = (b && b.owned) || [];
  const equippedA = (a && a.equipped) || [];
  const equippedB = (b && b.equipped) || [];
  return {
    owned: unionIds(ownedA, ownedB),
    // Equipped is a user choice - prefer whichever list is longer (more
    // recent edits), trimmed to 8.
    equipped: (equippedB.length >= equippedA.length ? equippedB : equippedA).slice(0, 8),
  };
}
