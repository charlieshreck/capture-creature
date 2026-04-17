import * as THREE from 'three';

export function buildWorld(scene) {
  // Sun
  const sun = new THREE.DirectionalLight(0xfff1c9, 2.2);
  sun.position.set(20, 30, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Soft fill
  const ambient = new THREE.HemisphereLight(0xbfe4ff, 0x6b9c4a, 0.6);
  scene.add(ambient);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(120, 1, 120),
    new THREE.MeshLambertMaterial({ color: 0x5fbb4a }),
  );
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // A checkerboard of lighter patches for visual depth
  const patch = new THREE.PlaneGeometry(8, 8);
  const patchMat = new THREE.MeshLambertMaterial({ color: 0x6fcf5a });
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      if ((x + z) % 2 !== 0) continue;
      const p = new THREE.Mesh(patch, patchMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x * 8, 0.01, z * 8);
      p.receiveShadow = true;
      scene.add(p);
    }
  }

  // Decorative trees
  const trunkGeo = new THREE.CylinderGeometry(0.4, 0.5, 2, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  const leafGeo = new THREE.ConeGeometry(1.6, 3, 8);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b3a });
  const treeSpots = [
    [-18, -12], [16, -18], [-22, 14], [20, 18], [-8, -24],
    [26, 4], [-26, 0], [12, 22], [-14, 22], [6, -28],
  ];
  for (const [x, z] of treeSpots) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 3.5;
    leaves.castShadow = true;
    t.add(trunk); t.add(leaves);
    t.position.set(x, 0, z);
    scene.add(t);
  }

  // Clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 2), cloudMat);
      b.position.set(j * 2 - 2, Math.random() * 0.3, 0);
      c.add(b);
    }
    c.position.set((Math.random() - 0.5) * 80, 22 + Math.random() * 6, (Math.random() - 0.5) * 80);
    scene.add(c);
  }
}
