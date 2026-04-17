// Weapon definitions for Safe Blast

export const WEAPONS = {
  wooden_sword: {
    id: 'wooden_sword', name: 'Wood Sword', slot: 1,
    damage: 8, range: 1.5, cooldown: 600, type: 'melee',
    cost: 0, texture: 'iso_sword_wood',
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', slot: 1,
    damage: 14, range: 1.5, cooldown: 500, type: 'melee',
    cost: 20, texture: 'iso_sword_iron',
  },
  diamond_sword: {
    id: 'diamond_sword', name: 'Diamond Sword', slot: 1,
    damage: 22, range: 1.5, cooldown: 400, type: 'melee',
    cost: 50, texture: 'iso_sword_diamond',
  },
  wooden_pick: {
    id: 'wooden_pick', name: 'Wood Pickaxe', slot: 2,
    damage: 3, range: 1.2, cooldown: 400, type: 'tool',
    minePower: 10, cost: 0, texture: 'iso_pick_wood',
  },
  iron_pick: {
    id: 'iron_pick', name: 'Iron Pickaxe', slot: 2,
    damage: 3, range: 1.2, cooldown: 300, type: 'tool',
    minePower: 20, cost: 20, texture: 'iso_pick_iron',
  },
  diamond_pick: {
    id: 'diamond_pick', name: 'Diamond Pickaxe', slot: 2,
    damage: 3, range: 1.2, cooldown: 200, type: 'tool',
    minePower: 40, cost: 50, texture: 'iso_pick_diamond',
  },
  bow: {
    id: 'bow', name: 'Bow', slot: 3,
    damage: 10, range: 8, cooldown: 1200, type: 'ranged',
    cost: 30, texture: 'iso_bow',
  },
  tnt: {
    id: 'tnt', name: 'TNT', slot: 4,
    damage: 50, range: 2.5, cooldown: 5000, type: 'explosive',
    blastRadius: 2, cost: 40, texture: 'iso_tnt',
  },
};

// Default loadout (free items)
export const DEFAULT_LOADOUT = {
  1: 'wooden_sword',
  2: 'wooden_pick',
  3: null,
  4: null,
};
