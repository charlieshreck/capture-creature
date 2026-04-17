import * as THREE from 'three';

// Roblox-style blocky character. Each body part is a simple box.
// Returns a group plus update(dt) for idle bob + walk bounce.
export function buildPlayer(scene) {
  const group = new THREE.Group();

  const skin = new THREE.MeshLambertMaterial({ color: 0xf0c080 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x42a5f5 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x333333 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skin);
  head.position.y = 3.0;
  head.castShadow = true;
  group.add(head);

  // Simple face: two eye dots on the front
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.2, 3.05, 0.5);
  eyeR.position.set(0.2, 3.05, 0.5);
  group.add(eyeL); group.add(eyeR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.7), shirt);
  torso.position.y = 1.8;
  torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.4, 1.4, 0.5);
  const armL = new THREE.Mesh(armGeo, skin);
  const armR = new THREE.Mesh(armGeo, skin);
  armL.position.set(-0.85, 1.8, 0);
  armR.position.set(0.85, 1.8, 0);
  armL.castShadow = true; armR.castShadow = true;
  group.add(armL); group.add(armR);

  const legGeo = new THREE.BoxGeometry(0.5, 1.4, 0.6);
  const legL = new THREE.Mesh(legGeo, pants);
  const legR = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.3, 0.4, 0);
  legR.position.set(0.3, 0.4, 0);
  legL.castShadow = true; legR.castShadow = true;
  group.add(legL); group.add(legR);

  scene.add(group);

  // Movement state written by controls
  const velocity = new THREE.Vector3();
  let walkPhase = 0;

  function update(dt) {
    const speed = velocity.length();
    if (speed > 0.05) {
      walkPhase += dt * 10;
      const swing = Math.sin(walkPhase) * 0.6;
      armL.rotation.x = swing;
      armR.rotation.x = -swing;
      legL.rotation.x = -swing;
      legR.rotation.x = swing;
      group.position.y = Math.abs(Math.sin(walkPhase)) * 0.08;
    } else {
      walkPhase *= 0.9;
      armL.rotation.x *= 0.85;
      armR.rotation.x *= 0.85;
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      group.position.y = Math.sin(performance.now() * 0.003) * 0.05;
    }
  }

  return {
    group,
    velocity,
    update,
    get position() { return group.position; },
  };
}
