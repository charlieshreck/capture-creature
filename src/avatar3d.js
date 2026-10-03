import * as THREE from 'three';

// Maps Avatar3D scene's outfit IDs (0-19) to 3D character shirt + pants
// colours. Order must match OUTFITS in src/scenes/Avatar3D.js so the choice
// the player saved on the Game Hub round-trips correctly into 3D.
export const OUTFIT_COLORS = [
  { shirt: 0x42a5f5, pants: 0x222244 }, // 0  Default Blue
  { shirt: 0xc62828, pants: 0x4a2010 }, // 1  Red Hoodie
  { shirt: 0x2e7d32, pants: 0x4a3728 }, // 2  Green Explorer
  { shirt: 0x6a1b9a, pants: 0x2a0c3a }, // 3  Purple Wizard
  { shirt: 0xffa000, pants: 0x6a4a00 }, // 4  Gold Champion
  { shirt: 0xec407a, pants: 0x4a1a3a }, // 5  Pink Casual
  { shirt: 0x424242, pants: 0x111111 }, // 6  Black Ninja
  { shirt: 0xeeeeee, pants: 0x546e7a }, // 7  White Knight
  { shirt: 0xff7043, pants: 0x4a2a10 }, // 8  Orange Adventurer
  { shirt: 0x00bcd4, pants: 0x004a55 }, // 9  Cyan Surfer
  { shirt: 0xfdd835, pants: 0x6a4a00 }, // 10 Yellow Builder
  { shirt: 0x6b8e23, pants: 0x3b4a1f }, // 11 Camo Ranger
  { shirt: 0x1565c0, pants: 0x0a2a4a }, // 12 Royal Blue
  { shirt: 0xff5722, pants: 0x6a1010 }, // 13 Lava
  { shirt: 0xb3e5fc, pants: 0x546e7a }, // 14 Ice
  { shirt: 0x37474f, pants: 0x000000 }, // 15 Shadow
  { shirt: 0xff6f00, pants: 0xd13030 }, // 16 Sunset
  { shirt: 0x2e7d32, pants: 0x1b5e20 }, // 17 Forest
  { shirt: 0x0277bd, pants: 0x004d6e }, // 18 Ocean
  { shirt: 0x39ff14, pants: 0xff00ff }, // 19 Neon
];

// HATS in src/scenes/Avatar3D.js: ['None','Cap','Beanie','Crown','Headband']
// Builds the hat as a Group ready to attach to a head Mesh. headSize is the
// edge length of the head cube the hat sits on.
export function makeHat(hatId, headSize = 1) {
  if (!hatId) return null;
  const g = new THREE.Group();
  if (hatId === 1) {
    // Cap: flat top with a brim sticking out the front
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(headSize * 1.1, headSize * 0.3, headSize * 1.1),
      new THREE.MeshLambertMaterial({ color: 0xc62828 }),
    );
    top.position.y = headSize * 0.65;
    top.castShadow = true;
    g.add(top);
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(headSize * 1.0, headSize * 0.08, headSize * 0.6),
      new THREE.MeshLambertMaterial({ color: 0x6e0a0a }),
    );
    brim.position.set(0, headSize * 0.5, headSize * 0.7);
    g.add(brim);
  } else if (hatId === 2) {
    // Beanie: rounded knit cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(headSize * 1.15, headSize * 0.55, headSize * 1.15),
      new THREE.MeshLambertMaterial({ color: 0x1b5e20 }),
    );
    cap.position.y = headSize * 0.75;
    cap.castShadow = true;
    g.add(cap);
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(headSize * 0.18, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    pom.position.y = headSize * 1.1;
    g.add(pom);
  } else if (hatId === 3) {
    // Crown: gold ring with spikes
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(headSize * 1.15, headSize * 0.25, headSize * 1.15),
      new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0x553a00, emissiveIntensity: 0.5 }),
    );
    band.position.y = headSize * 0.6;
    band.castShadow = true;
    g.add(band);
    const spikeGeo = new THREE.ConeGeometry(headSize * 0.13, headSize * 0.4, 4);
    const spikeMat = new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0x553a00, emissiveIntensity: 0.5 });
    for (const [x, z] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
      const s = new THREE.Mesh(spikeGeo, spikeMat);
      s.position.set(x * headSize, headSize * 0.85, z * headSize);
      g.add(s);
    }
  } else if (hatId === 4) {
    // Headband: thin coloured strip across the forehead
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(headSize * 1.08, headSize * 0.15, headSize * 1.08),
      new THREE.MeshLambertMaterial({ color: 0x42a5f5 }),
    );
    band.position.y = headSize * 0.4;
    g.add(band);
  }
  return g;
}

export function outfitColors(outfitId) {
  return OUTFIT_COLORS[outfitId] || OUTFIT_COLORS[0];
}
