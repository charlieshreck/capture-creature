// ============================================================================
//  Economy — the numbers behind the world.
//  Tracks resources, what's been unlocked, production/consumption from every
//  built structure, and which milestones have fired.
//  It knows NOTHING about 3D — that keeps the rules easy to read and test.
// ============================================================================
import {
  STARTING_RESOURCES,
  BASE_RESEARCH_PER_SEC,
  BUILDINGS,
  BUILDING_BY_ID,
  MILESTONES,
} from './data.js';

export class Economy {
  constructor() {
    this.resources = { ...STARTING_RESOURCES };

    // Buildings available to place. A building is unlocked when its `research`
    // cost has been paid AND its prerequisite (if any) is already unlocked.
    this.unlocked = new Set(BUILDINGS.filter((b) => b.research === 0 && !b.requires).map((b) => b.id));

    // Finished structures: [{ id }]. Used to total production & population.
    this.built = [];

    this.firedMilestones = new Set();

    // Listeners the HUD subscribes to.
    this._changeListeners = [];
    this._milestoneListeners = [];
    this._unlockListeners = [];
  }

  // ---- events ----------------------------------------------------------------
  onChange(fn) { this._changeListeners.push(fn); }
  onMilestone(fn) { this._milestoneListeners.push(fn); }
  onUnlock(fn) { this._unlockListeners.push(fn); }
  _emitChange() { for (const fn of this._changeListeners) fn(this); }

  // ---- spending --------------------------------------------------------------
  canAfford(cost) {
    return Object.entries(cost || {}).every(([k, v]) => this.resources[k] >= v);
  }

  spend(cost) {
    for (const [k, v] of Object.entries(cost || {})) this.resources[k] -= v;
    this._emitChange();
  }

  // ---- tech tree -------------------------------------------------------------
  // Is this building available to a build, given unlocks?
  isUnlocked(id) { return this.unlocked.has(id); }

  // Can the player unlock it right now? (prereq met + enough research banked)
  canUnlock(def) {
    if (this.unlocked.has(def.id)) return false;
    if (def.requires && !this.unlocked.has(def.requires)) return false;
    return this.resources.research >= def.research;
  }

  // Spend research to unlock. Returns true on success.
  unlock(id) {
    const def = BUILDING_BY_ID[id];
    if (!def || !this.canUnlock(def)) return false;
    this.resources.research -= def.research;
    this.unlocked.add(id);
    for (const fn of this._unlockListeners) fn(def);
    this._emitChange();
    return true;
  }

  // ---- production ------------------------------------------------------------
  // Called when a structure finishes construction.
  registerBuilt(id) {
    this.built.push({ id });
    this._emitChange();
  }

  get population() {
    return this.built.reduce((sum, b) => sum + (BUILDING_BY_ID[b.id].population || 0), 0);
  }

  get builtCounts() {
    const counts = {};
    for (const b of this.built) counts[b.id] = (counts[b.id] || 0) + 1;
    return counts;
  }

  // Net production per second for the HUD (positive = gaining).
  netRates() {
    const rates = { wood: 0, stone: 0, food: 0, energy: 0, research: BASE_RESEARCH_PER_SEC };
    for (const b of this.built) {
      const def = BUILDING_BY_ID[b.id];
      for (const [k, v] of Object.entries(def.produces || {})) rates[k] += v;
      for (const [k, v] of Object.entries(def.consumes || {})) rates[k] -= v;
    }
    return rates;
  }

  // Advance the simulation. The economy is a slow background sim, so we only
  // actually tick it a few times a second instead of every frame — that stops
  // it allocating arrays/objects (and poking the HUD) 60×/sec, which was
  // creating little garbage-collection hitches while you moved.
  update(dt) {
    this._acc = (this._acc || 0) + dt;
    if (this._acc < 0.2) return; // ~5 ticks per second is plenty
    const step = this._acc;
    this._acc = 0;

    const rates = this.netRates();
    for (const [k, v] of Object.entries(rates)) {
      this.resources[k] = Math.max(0, this.resources[k] + v * step);
    }
    this._checkMilestones();
    this._emitChange();
  }

  _checkMilestones() {
    const state = {
      population: this.population,
      totalBuilt: this.built.length,
      builtCounts: this.builtCounts,
      resources: this.resources,
    };
    for (const m of MILESTONES) {
      if (!this.firedMilestones.has(m.id) && m.test(state)) {
        this.firedMilestones.add(m.id);
        for (const fn of this._milestoneListeners) fn(m);
      }
    }
  }
}
