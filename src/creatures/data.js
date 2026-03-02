// Creature database
// Rarity: common (60%), uncommon (25%), rare (10%), legendary (5%)
export const CREATURES = [
  // -- COMMON --
  {
    id: 1, name: 'Mossbug', type: 'grass', rarity: 'common',
    baseHp: 30, baseAtk: 8, baseDef: 6, baseSpd: 10,
    color: 0x66bb6a,
    moves: ['Tackle', 'Vine Whip'],
    description: 'A tiny bug covered in soft green moss.',
  },
  {
    id: 2, name: 'Emberpup', type: 'fire', rarity: 'common',
    baseHp: 28, baseAtk: 10, baseDef: 5, baseSpd: 12,
    color: 0xef5350,
    moves: ['Scratch', 'Ember'],
    description: 'A playful pup with a fiery tail.',
  },
  {
    id: 3, name: 'Droplet', type: 'water', rarity: 'common',
    baseHp: 32, baseAtk: 7, baseDef: 8, baseSpd: 9,
    color: 0x42a5f5,
    moves: ['Splash', 'Bubble'],
    description: 'A wobbly blob of living water.',
  },
  {
    id: 4, name: 'Zappkit', type: 'electric', rarity: 'common',
    baseHp: 26, baseAtk: 11, baseDef: 4, baseSpd: 14,
    color: 0xffee58,
    moves: ['Quick Strike', 'Spark'],
    description: 'A tiny kit that crackles with static.',
  },
  {
    id: 5, name: 'Pebblin', type: 'rock', rarity: 'common',
    baseHp: 35, baseAtk: 9, baseDef: 12, baseSpd: 5,
    color: 0x8d6e63,
    moves: ['Tackle', 'Rock Throw'],
    description: 'A round pebble creature that rolls around.',
  },
  {
    id: 6, name: 'Breezee', type: 'wind', rarity: 'common',
    baseHp: 25, baseAtk: 7, baseDef: 5, baseSpd: 15,
    color: 0xb2dfdb,
    moves: ['Gust', 'Quick Strike'],
    description: 'A wispy creature made of living air.',
  },

  // -- UNCOMMON --
  {
    id: 7, name: 'Thornox', type: 'grass', rarity: 'uncommon',
    baseHp: 42, baseAtk: 14, baseDef: 10, baseSpd: 8,
    color: 0x2e7d32,
    moves: ['Vine Whip', 'Thorn Barrage', 'Tackle'],
    description: 'An ox-like beast with thorny armor.',
  },
  {
    id: 8, name: 'Blazefox', type: 'fire', rarity: 'uncommon',
    baseHp: 38, baseAtk: 16, baseDef: 7, baseSpd: 14,
    color: 0xd32f2f,
    moves: ['Ember', 'Flame Fang', 'Scratch'],
    description: 'A cunning fox wreathed in flames.',
  },
  {
    id: 9, name: 'Tidecrab', type: 'water', rarity: 'uncommon',
    baseHp: 44, baseAtk: 12, baseDef: 14, baseSpd: 7,
    color: 0x1565c0,
    moves: ['Bubble', 'Claw Crush', 'Splash'],
    description: 'A tough crab that commands the tides.',
  },
  {
    id: 10, name: 'Voltlynx', type: 'electric', rarity: 'uncommon',
    baseHp: 36, baseAtk: 15, baseDef: 8, baseSpd: 16,
    color: 0xf9a825,
    moves: ['Spark', 'Thunder Pounce', 'Quick Strike'],
    description: 'A sleek lynx that moves like lightning.',
  },
  {
    id: 11, name: 'Bouldrake', type: 'rock', rarity: 'uncommon',
    baseHp: 50, baseAtk: 13, baseDef: 16, baseSpd: 4,
    color: 0x5d4037,
    moves: ['Rock Throw', 'Iron Tail', 'Tackle'],
    description: 'A dragon made entirely of boulders.',
  },

  // -- RARE --
  {
    id: 12, name: 'Shadowmane', type: 'dark', rarity: 'rare',
    baseHp: 52, baseAtk: 20, baseDef: 12, baseSpd: 18,
    color: 0x4a148c,
    moves: ['Shadow Bite', 'Dark Pulse', 'Quick Strike', 'Nightmare'],
    description: 'A spectral lion that hunts in darkness.',
  },
  {
    id: 13, name: 'Glacieron', type: 'ice', rarity: 'rare',
    baseHp: 55, baseAtk: 18, baseDef: 15, baseSpd: 12,
    color: 0x80deea,
    moves: ['Ice Shard', 'Frost Breath', 'Blizzard', 'Tackle'],
    description: 'An ancient creature frozen in eternal ice.',
  },
  {
    id: 14, name: 'Solwing', type: 'light', rarity: 'rare',
    baseHp: 48, baseAtk: 19, baseDef: 11, baseSpd: 20,
    color: 0xfff176,
    moves: ['Light Beam', 'Solar Flare', 'Gust', 'Heal Pulse'],
    description: 'A radiant bird that flies close to the sun.',
  },

  // -- LEGENDARY --
  {
    id: 15, name: 'Terradon', type: 'rock', rarity: 'legendary',
    baseHp: 80, baseAtk: 25, baseDef: 22, baseSpd: 10,
    color: 0xff6f00,
    moves: ['Earthquake', 'Iron Tail', 'Rock Throw', 'Ancient Power'],
    description: 'The earth itself rises when Terradon walks.',
  },
  {
    id: 16, name: 'Voidrex', type: 'dark', rarity: 'legendary',
    baseHp: 75, baseAtk: 28, baseDef: 18, baseSpd: 22,
    color: 0x1a0033,
    moves: ['Void Rend', 'Dark Pulse', 'Nightmare', 'Shadow Bite'],
    description: 'A creature from beyond the void. None have captured one.',
  },
];

// Move database
export const MOVES = {
  'Tackle':         { power: 15, type: 'normal',   accuracy: 95, description: 'A basic body slam.' },
  'Scratch':        { power: 15, type: 'normal',   accuracy: 95, description: 'Sharp claw attack.' },
  'Quick Strike':   { power: 12, type: 'normal',   accuracy: 100, description: 'Always hits first.' },
  'Splash':         { power: 10, type: 'water',    accuracy: 100, description: 'A weak splash.' },

  'Vine Whip':      { power: 20, type: 'grass',    accuracy: 90, description: 'Whips with vines.' },
  'Thorn Barrage':  { power: 30, type: 'grass',    accuracy: 80, description: 'A storm of thorns.' },
  'Ember':          { power: 20, type: 'fire',     accuracy: 90, description: 'Small fireball.' },
  'Flame Fang':     { power: 30, type: 'fire',     accuracy: 85, description: 'Bites with flaming jaws.' },
  'Bubble':         { power: 20, type: 'water',    accuracy: 90, description: 'Shoots bubbles.' },
  'Claw Crush':     { power: 28, type: 'water',    accuracy: 85, description: 'Crushing claw attack.' },
  'Spark':          { power: 20, type: 'electric', accuracy: 90, description: 'An electric jolt.' },
  'Thunder Pounce': { power: 32, type: 'electric', accuracy: 80, description: 'Electrified leap attack.' },
  'Gust':           { power: 18, type: 'wind',     accuracy: 95, description: 'A cutting gust of wind.' },
  'Rock Throw':     { power: 22, type: 'rock',     accuracy: 85, description: 'Hurls a boulder.' },
  'Iron Tail':      { power: 28, type: 'rock',     accuracy: 80, description: 'A tail made of iron.' },

  'Shadow Bite':    { power: 28, type: 'dark',     accuracy: 90, description: 'Bites from the shadows.' },
  'Dark Pulse':     { power: 35, type: 'dark',     accuracy: 85, description: 'A wave of dark energy.' },
  'Nightmare':      { power: 40, type: 'dark',     accuracy: 75, description: 'Traps foe in a nightmare.' },
  'Ice Shard':      { power: 25, type: 'ice',      accuracy: 95, description: 'A fast shard of ice.' },
  'Frost Breath':   { power: 32, type: 'ice',      accuracy: 85, description: 'Freezing cold breath.' },
  'Blizzard':       { power: 45, type: 'ice',      accuracy: 70, description: 'A devastating blizzard.' },
  'Light Beam':     { power: 30, type: 'light',    accuracy: 90, description: 'A beam of pure light.' },
  'Solar Flare':    { power: 40, type: 'light',    accuracy: 80, description: 'Blindingly bright attack.' },
  'Heal Pulse':     { power: 0,  type: 'light',    accuracy: 100, description: 'Heals 25 HP.', heal: 25 },

  'Earthquake':     { power: 45, type: 'rock',     accuracy: 80, description: 'Shakes the earth itself.' },
  'Ancient Power':  { power: 50, type: 'rock',     accuracy: 75, description: 'Power from ancient times.' },
  'Void Rend':      { power: 55, type: 'dark',     accuracy: 70, description: 'Tears a hole in reality.' },
};

// Type effectiveness chart
export const TYPE_CHART = {
  fire:     { grass: 2, ice: 2, water: 0.5, rock: 0.5, fire: 0.5 },
  water:    { fire: 2, rock: 2, grass: 0.5, water: 0.5, electric: 0.5 },
  grass:    { water: 2, rock: 2, fire: 0.5, grass: 0.5, ice: 0.5 },
  electric: { water: 2, wind: 2, rock: 0.5, electric: 0.5 },
  rock:     { fire: 2, ice: 2, electric: 2, water: 0.5, grass: 0.5 },
  wind:     { grass: 2, rock: 0.5, electric: 0.5 },
  dark:     { light: 2, dark: 0.5, rock: 0.5 },
  light:    { dark: 2, light: 0.5 },
  ice:      { grass: 2, wind: 2, fire: 0.5, ice: 0.5, water: 0.5 },
  normal:   {},
};

// Rarity spawn weights
export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  legendary: 5,
};

// Rarity colors for UI
export const RARITY_COLORS = {
  common:    0xaaaaaa,
  uncommon:  0x4caf50,
  rare:      0x2196f3,
  legendary: 0xffc107,
};

// Pick a random creature based on rarity weights, optionally filtered by zone level
export function spawnRandomCreature(minLevel = 1, maxLevel = 5) {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  let chosenRarity = 'common';
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }

  const pool = CREATURES.filter(c => c.rarity === chosenRarity);
  const template = pool[Math.floor(Math.random() * pool.length)];
  const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

  return createCreatureInstance(template, level);
}

export function createCreatureInstance(template, level = 1) {
  const levelMult = 1 + (level - 1) * 0.12;
  return {
    ...template,
    level,
    maxHp: Math.floor(template.baseHp * levelMult),
    hp: Math.floor(template.baseHp * levelMult),
    atk: Math.floor(template.baseAtk * levelMult),
    def: Math.floor(template.baseDef * levelMult),
    spd: Math.floor(template.baseSpd * levelMult),
    xp: 0,
    xpToNext: level * 25,
  };
}
