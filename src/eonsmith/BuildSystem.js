// ============================================================================
//  BuildSystem — turning intent into structures.
//  Flow: select a building -> a translucent "ghost" follows the cursor and
//  snaps to the grid -> click to place -> the avatar walks over -> the real
//  building rises out of the ground over its build time -> it starts producing.
// ============================================================================
import * as THREE from 'three';
import { BUILDING_BY_ID } from './data.js';

const GRID = 1; // snap step in world units

export class BuildSystem {
  constructor(scene, economy, avatar) {
    this.scene = scene;
    this.economy = economy;
    this.avatar = avatar;

    this.selectedId = null;
    this.ghost = null;
    this.placed = []; // { id, x, z, w, d, mesh }
    this.constructing = []; // { def, mesh, elapsed }

    this._onPlacedListeners = [];
  }

  onPlaced(fn) { this._onPlacedListeners.push(fn); }

  // ---- selecting a building to build ----------------------------------------
  select(id) {
    this.clearSelection();
    if (!id || !this.economy.isUnlocked(id)) return;
    this.selectedId = id;
    const def = BUILDING_BY_ID[id];

    // The ghost is the real mesh, made translucent and tinted by validity.
    this.ghost = def.make(THREE);
    this.ghost.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.5;
      }
    });
    this.scene.add(this.ghost);
  }

  clearSelection() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    this.selectedId = null;
  }

  get hasSelection() { return !!this.selectedId; }

  _snap(v) { return Math.round(v / GRID) * GRID; }

  // Would a building of this footprint at (x,z) overlap something already there?
  _overlaps(x, z, w, d) {
    for (const p of this.placed) {
      if (Math.abs(x - p.x) < (w + p.w) / 2 && Math.abs(z - p.z) < (d + p.d) / 2) return true;
    }
    return false;
  }

  isValidAt(x, z) {
    const def = BUILDING_BY_ID[this.selectedId];
    if (!def) return false;
    const [w, d] = def.footprint;
    if (!this.economy.canAfford(def.cost)) return false;
    if (this._overlaps(x, z, w, d)) return false;
    return true;
  }

  // Move the ghost to follow the cursor's ground point.
  updateGhost(point) {
    if (!this.ghost) return;
    const x = this._snap(point.x);
    const z = this._snap(point.z);
    this.ghost.position.set(x, 0, z);
    const valid = this.isValidAt(x, z);
    const tint = valid ? new THREE.Color(0x55ff77) : new THREE.Color(0xff5555);
    this.ghost.traverse((o) => {
      if (o.isMesh) o.material.color.copy(tint);
    });
    this._ghostValid = valid;
  }

  // Try to place at the cursor point. Returns true if construction started.
  tryPlace(point) {
    if (!this.ghost) return false;
    const x = this._snap(point.x);
    const z = this._snap(point.z);
    if (!this.isValidAt(x, z)) return false;

    const def = BUILDING_BY_ID[this.selectedId];
    this.economy.spend(def.cost);

    const [w, d] = def.footprint;
    const site = { x, z, w, d };
    this.placed.push({ id: def.id, ...site }); // reserve the footprint immediately

    // Walk the avatar to the edge of the site, then start raising the building.
    const walkTo = new THREE.Vector3(x, 0, z + d / 2 + 1);
    this.avatar.goTo(walkTo, () => this._startConstruction(def, x, z));

    return true;
  }

  // Drop a fully-built structure straight onto the map (used for the starter).
  placeInstant(id, x, z) {
    const def = BUILDING_BY_ID[id];
    if (!def) return;
    const [w, d] = def.footprint;
    const mesh = def.make(THREE);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.placed.push({ id, x, z, w, d, mesh });
    this.economy.registerBuilt(id);
    for (const fn of this._onPlacedListeners) fn(def);
  }

  _startConstruction(def, x, z) {
    const mesh = def.make(THREE);
    mesh.position.set(x, 0, z);
    mesh.scale.y = 0.01; // grows up out of the ground
    this.scene.add(mesh);
    // attach mesh to the reserved footprint record
    const rec = this.placed.find((p) => p.x === x && p.z === z && !p.mesh);
    if (rec) rec.mesh = mesh;
    this.constructing.push({ def, mesh, elapsed: 0 });
  }

  // Called every frame: grow buildings under construction and animate details.
  update(dt) {
    // construction growth
    for (let i = this.constructing.length - 1; i >= 0; i--) {
      const c = this.constructing[i];
      c.elapsed += dt;
      const t = Math.min(1, c.elapsed / c.def.buildTime);
      // ease-out so it "settles" at the top
      c.mesh.scale.y = 0.01 + (1 - 0.01) * (1 - Math.pow(1 - t, 3));
      if (t >= 1) {
        c.mesh.scale.y = 1;
        this.constructing.splice(i, 1);
        this.economy.registerBuilt(c.def.id);
        for (const fn of this._onPlacedListeners) fn(c.def);
      }
    }

    // ambient detail animation (windmill sails, reactor rings, etc.)
    for (const p of this.placed) {
      if (!p.mesh) continue;
      const blades = p.mesh.userData.blades;
      if (blades) blades.rotation.z += dt * 1.2;
      const ring = p.mesh.userData.glowRing;
      if (ring) ring.rotation.z += dt * 0.8;
    }
  }
}
