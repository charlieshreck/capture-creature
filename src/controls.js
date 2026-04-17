import * as THREE from 'three';

// WASD moves the player, arrow keys or mouse drag rotates the camera.
// Camera is a third-person chase camera with orbit yaw + pitch.
export function setupControls(canvas, camera, player) {
  const keys = new Set();
  let yaw = 0;
  let pitch = 0.45;
  let distance = 10;
  let dragging = false;
  let lastX = 0, lastY = 0;

  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.005;
    pitch -= (e.clientY - lastY) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    distance = Math.max(5, Math.min(20, distance + e.deltaY * 0.01));
    e.preventDefault();
  }, { passive: false });

  // Touch support (one finger drag)
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    dragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  });
  canvas.addEventListener('touchend', () => { dragging = false; });
  canvas.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    yaw -= (e.touches[0].clientX - lastX) * 0.005;
    pitch -= (e.touches[0].clientY - lastY) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch));
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  });

  const moveSpeed = 8;
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();

  function update(dt) {
    // Direction vectors relative to camera yaw
    tmpForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    tmpRight.set(Math.cos(yaw), 0, -Math.sin(yaw));

    const move = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup')) move.add(tmpForward);
    if (keys.has('s') || keys.has('arrowdown')) move.sub(tmpForward);
    if (keys.has('d') || keys.has('arrowright')) move.add(tmpRight);
    if (keys.has('a') || keys.has('arrowleft')) move.sub(tmpRight);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(moveSpeed * dt);
      player.position.add(move);
      // Face direction of travel
      const targetRot = Math.atan2(move.x, move.z);
      const cur = player.group.rotation.y;
      let diff = targetRot - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.group.rotation.y = cur + diff * 0.2;
      player.velocity.copy(move).divideScalar(dt);
    } else {
      player.velocity.set(0, 0, 0);
    }

    // Keep player inside the ground plane
    player.position.x = Math.max(-58, Math.min(58, player.position.x));
    player.position.z = Math.max(-58, Math.min(58, player.position.z));

    // Third-person camera
    const cx = player.position.x + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = player.position.z + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = player.position.y + Math.sin(pitch) * distance + 2;
    camera.position.set(cx, cy, cz);
    camera.lookAt(player.position.x, player.position.y + 2, player.position.z);
  }

  return { update };
}
