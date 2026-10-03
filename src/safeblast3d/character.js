import * as THREE from 'three';
import { outfitColors, makeHat } from '../avatar3d.js';

// Roblox-style blocky character, shared by player and bots.
// Pass `avatar: { outfit, hat }` to colour it from the player's chosen
// outfit and add their hat. Or pass shirt/pants directly for bots.
export function makeCharacter({ shirt, pants, skin = 0xf0c080, avatar } = {}) {
  if (avatar) {
    const c = outfitColors(avatar.outfit || 0);
    if (shirt === undefined) shirt = c.shirt;
    if (pants === undefined) pants = c.pants;
  }
  if (shirt === undefined) shirt = 0x42a5f5;
  if (pants === undefined) pants = 0x333333;
  const group = new THREE.Group();
  const skinMat  = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMat);
  head.position.y = 2.1; head.castShadow = true; group.add(head);

  // Hat from chosen avatar
  if (avatar && avatar.hat) {
    const hat = makeHat(avatar.hat, 0.7);
    if (hat) { hat.position.y = 2.1; group.add(hat); }
  }

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

  // Sword slot lives at the right hand and follows the arm's swing.
  // Position is in arm-local coords: bottom of the arm and just outside
  // the outer face so the sword is held off to the side, not buried in
  // the arm geometry.
  const swordSlot = new THREE.Group();
  swordSlot.position.set(0.18, -0.5, 0.2);
  armR.add(swordSlot);

  return { group, head, body, armL, armR, legL, legR, swordSlot };
}

// Sword visual built from primitive boxes. Different palettes per tier.
export function makeSword(swordId) {
  const group = new THREE.Group();
  let handleC, guardC, bladeC, emissive = 0x000000;
  if (swordId === 'iron_sword') {
    handleC = 0x3a2918; guardC = 0xb8b8b8; bladeC = 0xe2e2e2;
  } else if (swordId === 'diamond_sword') {
    handleC = 0x3a2918; guardC = 0xffd54f; bladeC = 0x66f0e0; emissive = 0x114a44;
  } else {
    handleC = 0x6b4222; guardC = 0x8b5a2b; bladeC = 0xc99565;
  }

  // Sword is built pointing FORWARD (along +Z) from the hand so it sticks
  // out in front of the player instead of straight up through the body.
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.32),
    new THREE.MeshLambertMaterial({ color: handleC }),
  );
  handle.castShadow = true;
  group.add(handle);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.08),
    new THREE.MeshLambertMaterial({ color: guardC }),
  );
  guard.position.z = 0.2;
  guard.castShadow = true;
  group.add(guard);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 0.95),
    new THREE.MeshLambertMaterial({ color: bladeC, emissive, emissiveIntensity: emissive ? 0.55 : 0 }),
  );
  blade.position.z = 0.72;
  blade.castShadow = true;
  group.add(blade);

  // Pommel (cap on the back of the handle, behind the hand)
  const pommel = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.1),
    new THREE.MeshLambertMaterial({ color: guardC }),
  );
  pommel.position.z = -0.18;
  group.add(pommel);

  return group;
}

// Replaces whatever sword is currently in a character's swordSlot with the
// requested tier. Disposes the previous sword's geometry/materials.
export function attachSword(character, swordId) {
  const slot = character.swordSlot;
  if (!slot) return;
  for (let i = slot.children.length - 1; i >= 0; i--) {
    const child = slot.children[i];
    slot.remove(child);
    child.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  slot.add(makeSword(swordId));
}
