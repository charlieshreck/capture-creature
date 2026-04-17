import * as THREE from 'three';

// Roblox-style blocky character, shared by player and bots.
export function makeCharacter({ shirt = 0x42a5f5, pants = 0x333333, skin = 0xf0c080 } = {}) {
  const group = new THREE.Group();
  const skinMat  = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMat);
  head.position.y = 2.1; head.castShadow = true; group.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.BoxGeometry(0.09, 0.09, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.15, 2.15, 0.36);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set( 0.15, 2.15, 0.36);
  group.add(eyeL); group.add(eyeR);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.5), shirtMat);
  body.position.y = 1.25; body.castShadow = true; group.add(body);

  const armGeo = new THREE.BoxGeometry(0.28, 1.0, 0.35);
  const armL = new THREE.Mesh(armGeo, skinMat);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.6, 1.25, 0); armR.position.set( 0.6, 1.25, 0);
  armL.castShadow = true; armR.castShadow = true;
  group.add(armL); group.add(armR);

  const legGeo = new THREE.BoxGeometry(0.36, 1.0, 0.42);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.22, 0.3, 0); legR.position.set( 0.22, 0.3, 0);
  legL.castShadow = true; legR.castShadow = true;
  group.add(legL); group.add(legR);

  return { group, head, body, armL, armR, legL, legR };
}
