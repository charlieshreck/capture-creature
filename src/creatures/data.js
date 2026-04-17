// Creature database
// Rarity: common, uncommon, rare, legendary, godly, beast
export const CREATURES = [
  // -- COMMON --
  {
    id: 1, name: 'Burne', type: 'fire', rarity: 'common',
    baseHp: 28, baseAtk: 10, baseDef: 5, baseSpd: 12,
    color: 0xff6b35,
    moves: ['Scratch', 'Ember'],
    description: 'A little flame spirit that flickers when angry.',
  },
  {
    id: 2, name: 'Watery', type: 'water', rarity: 'common',
    baseHp: 32, baseAtk: 7, baseDef: 8, baseSpd: 9,
    color: 0x29b6f6,
    moves: ['Splash', 'Bubble'],
    description: 'A bouncy blob made of pure water.',
  },
  {
    id: 3, name: 'Green', type: 'grass', rarity: 'common',
    baseHp: 30, baseAtk: 8, baseDef: 6, baseSpd: 10,
    color: 0x4caf50,
    moves: ['Tackle', 'Vine Whip'],
    description: 'A leafy creature that loves sunlight.',
  },
  {
    id: 4, name: 'Gusty', type: 'wind', rarity: 'common',
    baseHp: 25, baseAtk: 7, baseDef: 5, baseSpd: 15,
    color: 0xb2dfdb,
    moves: ['Gust', 'Quick Strike'],
    description: 'A swirling little wind spirit.',
  },
  {
    id: 5, name: 'Sparx', type: 'electric', rarity: 'common',
    baseHp: 26, baseAtk: 11, baseDef: 4, baseSpd: 14,
    color: 0xffee58,
    moves: ['Quick Strike', 'Spark'],
    description: 'A zippy critter that zaps everything it touches.',
  },
  {
    id: 6, name: 'Roko', type: 'rock', rarity: 'common',
    baseHp: 35, baseAtk: 9, baseDef: 12, baseSpd: 5,
    color: 0x8d6e63,
    moves: ['Tackle', 'Rock Throw'],
    description: 'A tough little rock creature.',
  },
  {
    id: 7, name: 'Frozzo', type: 'ice', rarity: 'common',
    baseHp: 29, baseAtk: 9, baseDef: 7, baseSpd: 8,
    color: 0x81d4fa,
    moves: ['Ice Shard', 'Tackle'],
    description: 'A chilly critter that leaves frost wherever it walks.',
  },

  // -- UNCOMMON --
  {
    id: 8, name: 'Levfire', type: 'fire', rarity: 'uncommon',
    baseHp: 38, baseAtk: 16, baseDef: 7, baseSpd: 14,
    color: 0xd32f2f,
    moves: ['Ember', 'Flame Fang', 'Scratch'],
    description: 'A hovering flame beast with blazing eyes.',
  },
  {
    id: 9, name: 'Hoblex', type: 'dark', rarity: 'uncommon',
    baseHp: 40, baseAtk: 14, baseDef: 10, baseSpd: 12,
    color: 0x7b1fa2,
    moves: ['Shadow Bite', 'Dark Pulse', 'Scratch'],
    description: 'A sneaky shadow goblin that lurks in the dark.',
  },
  {
    id: 10, name: 'Tidex', type: 'water', rarity: 'uncommon',
    baseHp: 44, baseAtk: 12, baseDef: 14, baseSpd: 7,
    color: 0x0277bd,
    moves: ['Bubble', 'Claw Crush', 'Splash'],
    description: 'A powerful wave creature with crushing claws.',
  },
  {
    id: 11, name: 'Thornix', type: 'grass', rarity: 'uncommon',
    baseHp: 42, baseAtk: 14, baseDef: 10, baseSpd: 8,
    color: 0x2e7d32,
    moves: ['Vine Whip', 'Thorn Barrage', 'Tackle'],
    description: 'A thorny beast covered in sharp vines.',
  },
  {
    id: 12, name: 'Voltix', type: 'electric', rarity: 'uncommon',
    baseHp: 36, baseAtk: 15, baseDef: 8, baseSpd: 16,
    color: 0xf9a825,
    moves: ['Spark', 'Thunder Pounce', 'Quick Strike'],
    description: 'A lightning-fast hunter that crackles with energy.',
  },

  // -- RARE --
  {
    id: 13, name: 'Vanex', type: 'dark', rarity: 'rare',
    baseHp: 52, baseAtk: 20, baseDef: 12, baseSpd: 18,
    color: 0x311b92,
    moves: ['Shadow Bite', 'Dark Pulse', 'Nightmare', 'Quick Strike'],
    description: 'A phantom creature that vanishes into thin air.',
  },
  {
    id: 14, name: 'Glaciex', type: 'ice', rarity: 'rare',
    baseHp: 55, baseAtk: 18, baseDef: 15, baseSpd: 12,
    color: 0x4dd0e1,
    moves: ['Ice Shard', 'Frost Breath', 'Blizzard', 'Tackle'],
    description: 'An ancient ice dragon frozen in time.',
  },
  {
    id: 15, name: 'Solara', type: 'light', rarity: 'rare',
    baseHp: 48, baseAtk: 19, baseDef: 11, baseSpd: 20,
    color: 0xfff176,
    moves: ['Light Beam', 'Solar Flare', 'Gust', 'Heal Pulse'],
    description: 'A radiant being made of pure sunlight.',
  },
  {
    id: 16, name: 'Craggon', type: 'rock', rarity: 'rare',
    baseHp: 58, baseAtk: 17, baseDef: 20, baseSpd: 6,
    color: 0x6d4c41,
    moves: ['Earthquake', 'Rock Throw', 'Iron Tail', 'Tackle'],
    description: 'A massive rock golem that shakes the ground.',
  },

  // -- LEGENDARY --
  {
    id: 17, name: 'Infernox', type: 'fire', rarity: 'legendary',
    baseHp: 75, baseAtk: 26, baseDef: 18, baseSpd: 20,
    color: 0xff3d00,
    moves: ['Flame Fang', 'Ember', 'Earthquake', 'Ancient Power'],
    description: 'A legendary fire titan. The air burns around it.',
  },
  {
    id: 18, name: 'Abyssal', type: 'dark', rarity: 'legendary',
    baseHp: 80, baseAtk: 28, baseDef: 20, baseSpd: 16,
    color: 0x1a0a2e,
    moves: ['Void Rend', 'Dark Pulse', 'Nightmare', 'Shadow Bite'],
    description: 'A creature from the deepest void. Fear it.',
  },

  // -- NEW COMMON --
  {
    id: 19, name: 'Duskle', type: 'dark', rarity: 'common',
    baseHp: 27, baseAtk: 10, baseDef: 5, baseSpd: 13,
    color: 0x4a148c,
    moves: ['Shadow Bite', 'Quick Strike'],
    description: 'A tiny shadow bat that only appears at dusk.',
  },
  {
    id: 20, name: 'Lumini', type: 'light', rarity: 'common',
    baseHp: 24, baseAtk: 8, baseDef: 6, baseSpd: 14,
    color: 0xffe082,
    moves: ['Moonbeam', 'Tackle'],
    description: 'A glowing fairy that hums softly in the night.',
  },
  {
    id: 21, name: 'Sandclaw', type: 'rock', rarity: 'common',
    baseHp: 30, baseAtk: 10, baseDef: 10, baseSpd: 7,
    color: 0xd4a057,
    moves: ['Sand Blast', 'Scratch'],
    description: 'A desert crab that digs through sand at speed.',
  },
  {
    id: 22, name: 'Torrent', type: 'water', rarity: 'common',
    baseHp: 28, baseAtk: 9, baseDef: 7, baseSpd: 11,
    color: 0x039be5,
    moves: ['Bubble', 'Quick Strike'],
    description: 'A small water serpent that rides river currents.',
  },

  // -- NEW UNCOMMON --
  {
    id: 23, name: 'Blazeclaw', type: 'fire', rarity: 'uncommon',
    baseHp: 36, baseAtk: 15, baseDef: 8, baseSpd: 15,
    color: 0xe65100,
    moves: ['Flame Fang', 'Scratch', 'Ember'],
    description: 'A fierce fire wolf with claws of molten rock.',
  },
  {
    id: 24, name: 'Frostfang', type: 'ice', rarity: 'uncommon',
    baseHp: 38, baseAtk: 14, baseDef: 10, baseSpd: 13,
    color: 0x4fc3f7,
    moves: ['Ice Shard', 'Frost Breath', 'Scratch'],
    description: 'An ice fox with fangs cold enough to freeze steel.',
  },
  {
    id: 25, name: 'Stormwing', type: 'wind', rarity: 'uncommon',
    baseHp: 34, baseAtk: 13, baseDef: 7, baseSpd: 18,
    color: 0x80cbc4,
    moves: ['Wing Slash', 'Gust', 'Quick Strike'],
    description: 'A storm bird that rides thunderclouds.',
  },
  {
    id: 26, name: 'Mossbark', type: 'grass', rarity: 'uncommon',
    baseHp: 46, baseAtk: 12, baseDef: 14, baseSpd: 5,
    color: 0x33691e,
    moves: ['Vine Whip', 'Thorn Barrage', 'Tackle'],
    description: 'A walking tree stump covered in thick moss.',
  },

  // -- NEW RARE --
  {
    id: 27, name: 'Thunderex', type: 'electric', rarity: 'rare',
    baseHp: 50, baseAtk: 21, baseDef: 12, baseSpd: 19,
    color: 0xffab00,
    moves: ['Thunder Pounce', 'Spark', 'Storm Surge', 'Quick Strike'],
    description: 'A thunder dragon wreathed in crackling lightning.',
  },
  {
    id: 28, name: 'Crystalia', type: 'light', rarity: 'rare',
    baseHp: 46, baseAtk: 18, baseDef: 16, baseSpd: 14,
    color: 0xce93d8,
    moves: ['Light Beam', 'Crystal Bash', 'Heal Pulse', 'Solar Flare'],
    description: 'A crystalline being that refracts light into rainbows.',
  },

  // -- NEW LEGENDARY --
  {
    id: 29, name: 'Tempestus', type: 'wind', rarity: 'legendary',
    baseHp: 70, baseAtk: 24, baseDef: 16, baseSpd: 26,
    color: 0x26a69a,
    moves: ['Tornado', 'Wing Slash', 'Gust', 'Thunder Pounce'],
    description: 'A legendary storm titan. Hurricanes follow in its wake.',
  },
  {
    id: 30, name: 'Terravex', type: 'rock', rarity: 'legendary',
    baseHp: 85, baseAtk: 25, baseDef: 28, baseSpd: 8,
    color: 0x4e342e,
    moves: ['Earthquake', 'Ancient Power', 'Crystal Bash', 'Iron Tail'],
    description: 'The living mountain. Nothing can break its armor.',
  },

  // -- MORE COMMON --
  {
    id: 31, name: 'Peblit', type: 'rock', rarity: 'common',
    baseHp: 32, baseAtk: 8, baseDef: 11, baseSpd: 6,
    color: 0xa1887f,
    moves: ['Rock Throw', 'Tackle'],
    description: 'A small living pebble that rolls around happily.',
  },
  {
    id: 32, name: 'Flicktail', type: 'fire', rarity: 'common',
    baseHp: 26, baseAtk: 11, baseDef: 5, baseSpd: 13,
    color: 0xff8a65,
    moves: ['Ember', 'Quick Strike'],
    description: 'A fox kit with a flame-tipped tail.',
  },
  {
    id: 33, name: 'Zappfly', type: 'electric', rarity: 'common',
    baseHp: 22, baseAtk: 9, baseDef: 4, baseSpd: 16,
    color: 0xfff59d,
    moves: ['Spark', 'Quick Strike'],
    description: 'A buzzing electric firefly. Very fast, very fragile.',
  },
  {
    id: 34, name: 'Mosling', type: 'grass', rarity: 'common',
    baseHp: 28, baseAtk: 7, baseDef: 8, baseSpd: 9,
    color: 0x81c784,
    moves: ['Vine Whip', 'Scratch'],
    description: 'A tiny moss creature that grows on old stones.',
  },
  {
    id: 35, name: 'Drizzle', type: 'water', rarity: 'common',
    baseHp: 27, baseAtk: 8, baseDef: 7, baseSpd: 10,
    color: 0x4dd0e1,
    moves: ['Splash', 'Bubble'],
    description: 'A little rain cloud creature that floats along.',
  },

  // -- MORE UNCOMMON --
  {
    id: 36, name: 'Shadelock', type: 'dark', rarity: 'uncommon',
    baseHp: 39, baseAtk: 15, baseDef: 9, baseSpd: 14,
    color: 0x5c2d91,
    moves: ['Shadow Bite', 'Nightmare', 'Scratch'],
    description: 'A shadowy wolf with chains of darkness.',
  },
  {
    id: 37, name: 'Galewing', type: 'wind', rarity: 'uncommon',
    baseHp: 35, baseAtk: 12, baseDef: 8, baseSpd: 17,
    color: 0xa5d6a7,
    moves: ['Wing Slash', 'Gust', 'Tackle'],
    description: 'An elegant hawk that commands the breeze.',
  },
  {
    id: 38, name: 'Glacia', type: 'ice', rarity: 'uncommon',
    baseHp: 40, baseAtk: 13, baseDef: 12, baseSpd: 10,
    color: 0xb3e5fc,
    moves: ['Ice Shard', 'Frost Breath', 'Tackle'],
    description: 'A graceful ice deer with crystalline antlers.',
  },

  // -- MORE RARE --
  {
    id: 39, name: 'Inferake', type: 'fire', rarity: 'rare',
    baseHp: 54, baseAtk: 22, baseDef: 13, baseSpd: 16,
    color: 0xd50000,
    moves: ['Flame Fang', 'Ember', 'Inferno Blast', 'Scratch'],
    description: 'A fire serpent wreathed in eternal flame.',
  },
  {
    id: 40, name: 'Abyssfin', type: 'water', rarity: 'rare',
    baseHp: 56, baseAtk: 19, baseDef: 16, baseSpd: 13,
    color: 0x01579b,
    moves: ['Storm Surge', 'Claw Crush', 'Bubble', 'Tidal Wave'],
    description: 'A deep-sea leviathan with razor fins.',
  },

  // -- MORE COMMON (43-47) --
  {
    id: 43, name: 'Cinderpup', type: 'fire', rarity: 'common',
    baseHp: 26, baseAtk: 10, baseDef: 6, baseSpd: 12,
    color: 0xff7043,
    moves: ['Ember', 'Scratch'],
    description: 'A playful fire puppy that chases its own sparks.',
  },
  {
    id: 44, name: 'Bubbloon', type: 'water', rarity: 'common',
    baseHp: 30, baseAtk: 7, baseDef: 9, baseSpd: 8,
    color: 0x4fc3f7,
    moves: ['Bubble', 'Tackle'],
    description: 'A round water balloon creature that bounces around.',
  },
  {
    id: 45, name: 'Shockrat', type: 'electric', rarity: 'common',
    baseHp: 24, baseAtk: 11, baseDef: 4, baseSpd: 15,
    color: 0xfdd835,
    moves: ['Spark', 'Quick Strike'],
    description: 'A tiny electric rat that zips through walls.',
  },
  {
    id: 46, name: 'Breezel', type: 'wind', rarity: 'common',
    baseHp: 25, baseAtk: 8, baseDef: 5, baseSpd: 14,
    color: 0xb2ebf2,
    moves: ['Gust', 'Tackle'],
    description: 'A floating breeze sprite that hums in the wind.',
  },
  {
    id: 47, name: 'Glacipede', type: 'ice', rarity: 'common',
    baseHp: 29, baseAtk: 9, baseDef: 8, baseSpd: 7,
    color: 0x80deea,
    moves: ['Ice Shard', 'Scratch'],
    description: 'An icy centipede that leaves frost trails.',
  },

  // -- MORE UNCOMMON (48-54) --
  {
    id: 48, name: 'Pyroconda', type: 'fire', rarity: 'uncommon',
    baseHp: 40, baseAtk: 16, baseDef: 9, baseSpd: 13,
    color: 0xbf360c,
    moves: ['Flame Fang', 'Inferno Blast', 'Scratch'],
    description: 'A fire snake that coils around prey in flames.',
  },
  {
    id: 49, name: 'Tidalcrab', type: 'water', rarity: 'uncommon',
    baseHp: 44, baseAtk: 13, baseDef: 15, baseSpd: 6,
    color: 0x0288d1,
    moves: ['Claw Crush', 'Bubble', 'Storm Surge'],
    description: 'A tough crab with crushing pincers of coral.',
  },
  {
    id: 50, name: 'Thornviper', type: 'grass', rarity: 'uncommon',
    baseHp: 38, baseAtk: 15, baseDef: 10, baseSpd: 12,
    color: 0x1b5e20,
    moves: ['Thorn Barrage', 'Vine Whip', 'Quick Strike'],
    description: 'A venomous vine snake that strikes from tall grass.',
  },
  {
    id: 51, name: 'Boltclaw', type: 'electric', rarity: 'uncommon',
    baseHp: 36, baseAtk: 14, baseDef: 8, baseSpd: 17,
    color: 0xf57f17,
    moves: ['Thunder Pounce', 'Spark', 'Scratch'],
    description: 'A lightning tiger cub with electric claws.',
  },
  {
    id: 52, name: 'Gravelem', type: 'rock', rarity: 'uncommon',
    baseHp: 48, baseAtk: 12, baseDef: 16, baseSpd: 4,
    color: 0x795548,
    moves: ['Rock Throw', 'Iron Tail', 'Tackle'],
    description: 'A living boulder that rolls through mountain paths.',
  },
  {
    id: 53, name: 'Nightowl', type: 'dark', rarity: 'uncommon',
    baseHp: 37, baseAtk: 14, baseDef: 9, baseSpd: 15,
    color: 0x4a0072,
    moves: ['Shadow Bite', 'Wing Slash', 'Quick Strike'],
    description: 'A shadowy owl with piercing purple eyes.',
  },
  {
    id: 54, name: 'Halofly', type: 'light', rarity: 'uncommon',
    baseHp: 34, baseAtk: 13, baseDef: 10, baseSpd: 14,
    color: 0xfff176,
    moves: ['Light Beam', 'Moonbeam', 'Gust'],
    description: 'A glowing dragonfly with wings of pure light.',
  },

  // -- MORE RARE (55-59) --
  {
    id: 55, name: 'Magmawyrm', type: 'fire', rarity: 'rare',
    baseHp: 56, baseAtk: 22, baseDef: 14, baseSpd: 14,
    color: 0xdd2c00,
    moves: ['Inferno Blast', 'Flame Fang', 'Earthquake', 'Ember'],
    description: 'A lava wyrm that swims through molten rock.',
  },
  {
    id: 56, name: 'Frostlich', type: 'ice', rarity: 'rare',
    baseHp: 50, baseAtk: 20, baseDef: 16, baseSpd: 15,
    color: 0x00bcd4,
    moves: ['Blizzard', 'Frost Breath', 'Dark Pulse', 'Ice Shard'],
    description: 'An undead ice sorcerer that commands winter itself.',
  },
  {
    id: 57, name: 'Verdantis', type: 'grass', rarity: 'rare',
    baseHp: 54, baseAtk: 19, baseDef: 18, baseSpd: 11,
    color: 0x2e7d32,
    moves: ['Thorn Barrage', 'Vine Whip', 'Heal Pulse', 'Ancient Power'],
    description: 'An ancient tree guardian wrapped in living vines.',
  },
  {
    id: 58, name: 'Stormrex', type: 'wind', rarity: 'rare',
    baseHp: 52, baseAtk: 21, baseDef: 13, baseSpd: 18,
    color: 0x00897b,
    moves: ['Tornado', 'Wing Slash', 'Thunder Pounce', 'Gust'],
    description: 'A storm raptor that commands hurricanes.',
  },
  {
    id: 59, name: 'Voidshade', type: 'dark', rarity: 'rare',
    baseHp: 48, baseAtk: 23, baseDef: 12, baseSpd: 19,
    color: 0x1a0033,
    moves: ['Void Rend', 'Nightmare', 'Shadow Bite', 'Quick Strike'],
    description: 'A phantom assassin that strikes from the void.',
  },

  // -- MORE LEGENDARY (60-62) --
  {
    id: 60, name: 'Glacius', type: 'ice', rarity: 'legendary',
    baseHp: 78, baseAtk: 25, baseDef: 22, baseSpd: 18,
    color: 0x006064,
    moves: ['Blizzard', 'Frost Breath', 'Tidal Wave', 'Ancient Power'],
    description: 'The frozen emperor. Entire oceans freeze at its gaze.',
  },
  {
    id: 61, name: 'Floravex', type: 'grass', rarity: 'legendary',
    baseHp: 82, baseAtk: 24, baseDef: 24, baseSpd: 14,
    color: 0x004d40,
    moves: ['Thorn Barrage', 'Earthquake', 'Heal Pulse', 'Ancient Power'],
    description: 'The forest titan. Entire jungles grow from its footsteps.',
  },
  {
    id: 62, name: 'Voltrion', type: 'electric', rarity: 'legendary',
    baseHp: 72, baseAtk: 28, baseDef: 16, baseSpd: 28,
    color: 0xff6f00,
    moves: ['Thunder Pounce', 'Storm Surge', 'Tornado', 'Spark'],
    description: 'The lightning god. Thunder follows wherever it goes.',
  },

  // -- MORE GODLY (63-64) --
  {
    id: 63, name: 'Abyssion', type: 'dark', rarity: 'godly',
    baseHp: 130, baseAtk: 38, baseDef: 28, baseSpd: 28,
    color: 0x1a0a3e,
    moves: ['Void Rend', 'Cataclysm', 'Nightmare', 'Dark Pulse'],
    description: 'The god of the abyss. Reality bends in its presence.',
  },
  {
    id: 64, name: 'Eternox', type: 'rock', rarity: 'godly',
    baseHp: 140, baseAtk: 32, baseDef: 38, baseSpd: 22,
    color: 0x3e2723,
    moves: ['Ancient Power', 'Earthquake', 'Crystal Bash', 'Divine Wrath'],
    description: 'The eternal mountain. It has existed since the beginning of time.',
  },

  // -- EPIC (65-69) --
  {
    id: 65, name: 'Pyroclasm', type: 'fire', rarity: 'epic',
    baseHp: 62, baseAtk: 24, baseDef: 16, baseSpd: 20,
    color: 0xbf360c,
    moves: ['Inferno Blast', 'Flame Fang', 'Ember', 'Earthquake'],
    description: 'A volcanic beast that erupts with fury. Lava flows from its jaws.',
  },
  {
    id: 66, name: 'Leviathorn', type: 'water', rarity: 'epic',
    baseHp: 66, baseAtk: 22, baseDef: 20, baseSpd: 16,
    color: 0x01579b,
    moves: ['Tidal Wave', 'Storm Surge', 'Claw Crush', 'Bubble'],
    description: 'A thorned sea serpent that rules the deep waters.',
  },
  {
    id: 67, name: 'Phantomix', type: 'dark', rarity: 'epic',
    baseHp: 58, baseAtk: 26, baseDef: 15, baseSpd: 22,
    color: 0x200040,
    moves: ['Void Rend', 'Dark Pulse', 'Nightmare', 'Quick Strike'],
    description: 'A phantom wraith that phases through reality itself.',
  },
  {
    id: 68, name: 'Crystallion', type: 'ice', rarity: 'epic',
    baseHp: 60, baseAtk: 21, baseDef: 22, baseSpd: 17,
    color: 0x00acc1,
    moves: ['Blizzard', 'Frost Breath', 'Crystal Bash', 'Ice Shard'],
    description: 'A crystal dragon encased in eternal ice armor.',
  },
  {
    id: 69, name: 'Verdantking', type: 'grass', rarity: 'epic',
    baseHp: 64, baseAtk: 23, baseDef: 20, baseSpd: 14,
    color: 0x1b5e20,
    moves: ['Thorn Barrage', 'Vine Whip', 'Heal Pulse', 'Earthquake'],
    description: 'The king of the forest. Trees bow when it walks past.',
  },

  // -- MYTHIC (70-74) --
  {
    id: 70, name: 'Solarius', type: 'light', rarity: 'mythic',
    baseHp: 90, baseAtk: 30, baseDef: 25, baseSpd: 24,
    color: 0xffab00,
    moves: ['Divine Wrath', 'Solar Flare', 'Light Beam', 'Heal Pulse'],
    description: 'A sun phoenix reborn from golden flames. Its wings blind all who look.',
  },
  {
    id: 71, name: 'Stormdrake', type: 'electric', rarity: 'mythic',
    baseHp: 85, baseAtk: 32, baseDef: 22, baseSpd: 28,
    color: 0xf57f17,
    moves: ['Thunder Pounce', 'Storm Surge', 'Tornado', 'Spark'],
    description: 'A mythic thunder dragon. Lightning is its blood.',
  },
  {
    id: 72, name: 'Frostqueen', type: 'ice', rarity: 'mythic',
    baseHp: 88, baseAtk: 28, baseDef: 28, baseSpd: 20,
    color: 0x006064,
    moves: ['Blizzard', 'Frost Breath', 'Tidal Wave', 'Heal Pulse'],
    description: 'The mythic queen of winter. Oceans freeze at her touch.',
  },
  {
    id: 73, name: 'Shadowlord', type: 'dark', rarity: 'mythic',
    baseHp: 92, baseAtk: 33, baseDef: 20, baseSpd: 25,
    color: 0x0a0020,
    moves: ['Cataclysm', 'Void Rend', 'Nightmare', 'Dark Pulse'],
    description: 'Lord of all shadows. Daylight fades when it appears.',
  },
  {
    id: 74, name: 'Terraforge', type: 'rock', rarity: 'mythic',
    baseHp: 100, baseAtk: 28, baseDef: 34, baseSpd: 12,
    color: 0x3e2723,
    moves: ['Earthquake', 'Ancient Power', 'Iron Tail', 'Crystal Bash'],
    description: 'A mythic golem forged in the earths core. Unbreakable.',
  },

  // -- GODLY --
  {
    id: 41, name: 'Orionis', type: 'light', rarity: 'godly',
    baseHp: 120, baseAtk: 35, baseDef: 30, baseSpd: 30,
    color: 0xffd700,
    moves: ['Divine Wrath', 'Solar Flare', 'Heal Pulse', 'Ancient Power'],
    description: 'A celestial god creature. Stars orbit its body. Only the worthy may encounter it.',
  },

  // -- BEAST --
  {
    id: 42, name: 'Titanox', type: 'dark', rarity: 'beast',
    baseHp: 160, baseAtk: 45, baseDef: 40, baseSpd: 35,
    color: 0x8b0000,
    moves: ['Cataclysm', 'Void Rend', 'Earthquake', 'Divine Wrath'],
    description: 'The ultimate beast. Born from chaos itself. Its roar splits the sky.',
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

  'Moonbeam':       { power: 22, type: 'light',    accuracy: 95, description: 'A gentle beam of moonlight.' },
  'Sand Blast':     { power: 20, type: 'rock',     accuracy: 90, description: 'Blasts sand at the foe.' },
  'Wing Slash':     { power: 25, type: 'wind',     accuracy: 90, description: 'Slashes with razor wings.' },
  'Storm Surge':    { power: 35, type: 'water',    accuracy: 85, description: 'A surging wall of water.' },
  'Crystal Bash':   { power: 35, type: 'rock',     accuracy: 85, description: 'Strikes with crystal force.' },
  'Tornado':        { power: 50, type: 'wind',     accuracy: 75, description: 'A devastating whirlwind.' },
  'Inferno Blast':  { power: 42, type: 'fire',     accuracy: 80, description: 'An explosive burst of fire.' },
  'Tidal Wave':     { power: 42, type: 'water',    accuracy: 80, description: 'A massive crushing wave.' },
  'Divine Wrath':   { power: 65, type: 'light',    accuracy: 70, description: 'The fury of the heavens.' },
  'Cataclysm':      { power: 80, type: 'dark',     accuracy: 60, description: 'Unleashes total destruction. The strongest move in existence.' },
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
  common: 50,
  uncommon: 22,
  rare: 10,
  epic: 6,
  mythic: 3,
  legendary: 2,
  godly: 0.8,
  beast: 0.3,
};

// Rarity colors for UI
export const RARITY_COLORS = {
  common:    0xaaaaaa,
  uncommon:  0x4caf50,
  rare:      0x2196f3,
  epic:      0x9c27b0,
  mythic:    0xe91e63,
  legendary: 0xffc107,
  godly:     0xff00ff,
  beast:     0xff0000,
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
