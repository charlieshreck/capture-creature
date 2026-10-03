// ============================================================================
//  Avatar — the builder you control, seen from their own eyes (first person).
//  Manual control: forward/back walks along the way you're facing, and turning
//  rotates which way you face (and therefore the view). It can also auto-walk
//  to a construction site via goTo().
// ============================================================================
import * as THREE from 'three';

const WALK_SPEED = 6; // world units per second
const TURN_RATE = 2.4; // radians/second when turning with the keys
const SEEK_TURN = 10; // how fast it swivels when auto-walking to a target
const BOUNDS = 150; // keep the avatar on the (now bigger) map
export const EYE_HEIGHT = 1.7; // camera height in first person
const SWIM_SINK = 0.9;  // how far you drop into the water when swimming
const SWIM_SPEED = 0.6; // you move slower in water

export class Avatar {
  constructor() {
    this.group = new THREE.Group();
    this._build();

    this.forwardInput = 0; // -1..1 set each frame by the Game
    this.turnInput = 0; // -1..1 (positive = turn left)
    this.target = null; // auto-walk destination
    this._arriveCb = null;
    this._walkPhase = 0;
    this._tmp = new THREE.Vector3();
    this._moving = false;
    // The Game sets this: blocked(x, z) → true if a solid thing is in the way.
    this.blocked = null;
    // swimming: how deep we've sunk into the water (lerps toward a target)
    this._swim = 0;
    this._swimTarget = 0;
    this._inWater = false;
    // standing height: lowers as you dig the ground down beneath you
    this._floor = 0;
    this._floorTarget = 0;
  }

  // The Game calls this each frame: are we standing in a lake?
  setSwimming(on) {
    this._inWater = on;
    this._swimTarget = on ? SWIM_SINK : 0;
  }

  // The Game calls this each frame with the floor height under the avatar.
  setFloor(y) { this._floorTarget = y; }

  // Try to move by (dx, dz), but stop at obstacles. We test each axis on its
  // own so you SLIDE along a tree/rock/wall instead of sticking to it.
  _tryMove(dx, dz) {
    const pos = this.group.position;
    const nx = THREE.MathUtils.clamp(pos.x + dx, -BOUNDS, BOUNDS);
    if (!this.blocked || !this.blocked(nx, pos.z)) pos.x = nx;
    const nz = THREE.MathUtils.clamp(pos.z + dz, -BOUNDS, BOUNDS);
    if (!this.blocked || !this.blocked(pos.x, nz)) pos.z = nz;
  }

  _build() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x3b6ea5, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.9 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), dark);
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), cloth);
    torso.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skin);
    head.position.y = 1.85;
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
    tool.position.set(0, 1.3, -0.35);
    tool.rotation.x = 0.4;

    for (const m of [legs, torso, head, tool]) {
      m.castShadow = true;
      this.group.add(m);
    }
    this._torso = torso;
    this._head = head;
  }

  // Called by the Game each frame from the keys.
  setControl(forward, turn) {
    this.forwardInput = forward;
    this.turnInput = turn;
  }

  setVisible(v) { this.group.visible = v; }

  get yaw() { return this.group.rotation.y; }

  // Eye position for the first-person camera (drops as you sink into water).
  headPosition(out = new THREE.Vector3()) {
    return out.set(this.group.position.x, this.group.position.y + EYE_HEIGHT, this.group.position.z);
  }

  // Walk to a point, then call `cb` once (used by the build system).
  goTo(point, cb = null) {
    this.target = point.clone();
    this.target.y = 0;
    this._arriveCb = cb;
  }

  get isMoving() { return this._moving; }

  update(dt) {
    let moving = false;

    if (this.forwardInput !== 0 || this.turnInput !== 0) {
      // Manual control overrides any auto-walk destination.
      this.target = null;
      this._arriveCb = null;

      if (this.turnInput !== 0) this.group.rotation.y += this.turnInput * TURN_RATE * dt;

      if (this.forwardInput !== 0) {
        const yaw = this.group.rotation.y;
        const speed = this._inWater ? WALK_SPEED * SWIM_SPEED : WALK_SPEED;
        const step = speed * dt * this.forwardInput;
        this._tryMove(Math.sin(yaw) * step, Math.cos(yaw) * step);
        moving = true;
      }
      this.forwardInput = 0;
      this.turnInput = 0;
    } else if (this.target) {
      const to = this._tmp.subVectors(this.target, this.group.position);
      to.y = 0;
      if (to.length() < 0.5) {
        this.target = null;
        const cb = this._arriveCb;
        this._arriveCb = null;
        if (cb) cb();
      } else {
        this._seek(to, dt);
        moving = true;
      }
    }

    this._moving = moving;

    // ease our submersion + dug-down floor, then drop the whole body (and eye)
    this._swim += (this._swimTarget - this._swim) * Math.min(1, dt * 6);
    this._floor += (this._floorTarget - this._floor) * Math.min(1, dt * 6);
    this.group.position.y = this._floor - this._swim;

    // gentle walk bob (only affects the body meshes, never the camera)
    if (moving) this._walkPhase += dt * 12;
    const bob = moving ? Math.sin(this._walkPhase) * 0.06 : 0;
    this._torso.position.y = 1.2 + bob;
    this._head.position.y = 1.85 + bob;
  }

  // Move toward a target and face it (auto-walk to build sites / click-to-move).
  _seek(dir, dt) {
    dir.normalize();
    this._tryMove(dir.x * WALK_SPEED * dt, dir.z * WALK_SPEED * dt);

    const targetYaw = Math.atan2(dir.x, dir.z);
    let diff = targetYaw - this.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, SEEK_TURN * dt);
  }
}
