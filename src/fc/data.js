// FC Computer — card collection football game.
//
// All players, teams and cards are procedurally generated — nothing here
// references a real product or brand.

export const FCP_START = 1500;
export const GEMS_START = 6;

// Rating tiers — used purely for card visuals (color of card border etc.)
// The "Tier" of a card is derived from its rating, not the other way round.
export const TIERS = [
  { id: 'basic',   name: 'Basic',      color: '#b87333', glow: '#cd7f32', minR: 50, maxR: 69 },
  { id: 'pro',     name: 'Pro',        color: '#9fa6b3', glow: '#d0d6df', minR: 70, maxR: 79 },
  { id: 'elite',   name: 'Elite',      color: '#d4a017', glow: '#ffd54f', minR: 80, maxR: 84 },
  { id: 'star',    name: 'Star',       color: '#7e57c2', glow: '#b388ff', minR: 85, maxR: 89 },
  { id: 'icon',    name: 'Icon',       color: '#c62828', glow: '#ff5252', minR: 90, maxR: 94 },
  { id: 'legend',  name: 'Legend',     color: '#b8860b', glow: '#ffe082', minR: 95, maxR: 99 },
];

export function tierForRating(r) {
  for (const t of TIERS) if (r >= t.minR && r <= t.maxR) return t;
  return TIERS[0];
}

// Packs are now keyed by GUARANTEED MINIMUM rating. One card in the pack
// is guaranteed to be at least that rating; others are random.
export const PACKS = [
  { id: 'p_65', name: '65+ Pack',  cost: 250,   cur: 'fcp',  cards: 3, guaranteeMin: 65,
    blurb: '3 cards • 1 rated 65+' },
  { id: 'p_75', name: '75+ Pack',  cost: 900,   cur: 'fcp',  cards: 4, guaranteeMin: 75,
    blurb: '4 cards • 1 rated 75+' },
  { id: 'p_82', name: '82+ Pack',  cost: 3500,  cur: 'fcp',  cards: 5, guaranteeMin: 82,
    blurb: '5 cards • 1 rated 82+' },
  { id: 'p_85', name: '85+ Pack',  cost: 11000, cur: 'fcp',  cards: 5, guaranteeMin: 85,
    blurb: '5 cards • 1 rated 85+' },
  { id: 'g_88', name: '88+ Pack',  cost: 30,    cur: 'gems', cards: 6, guaranteeMin: 88,
    blurb: '6 cards • 1 rated 88+' },
  { id: 'g_91', name: '91+ Pack',  cost: 75,    cur: 'gems', cards: 5, guaranteeMin: 91,
    blurb: '5 cards • 1 rated 91+' },
  { id: 'g_95', name: '95+ Pack',  cost: 200,   cur: 'gems', cards: 5, guaranteeMin: 95,
    blurb: '5 cards • 1 rated 95+' },
];

const FIRST_NAMES = [
  'Alex','Marco','Diego','Carlos','Luis','Antonio','Jose','Pedro','Hugo','Ivan',
  'Mohamed','Youssef','Karim','Riyad','Ali','Hassan','Omar','Sami','Khalid','Tariq',
  'Liam','Noah','Lucas','Ethan','Mason','Logan','Oliver','James','Henry','Leo',
  'Kai','Ren','Yuki','Hiro','Sora','Takeshi','Daiki','Kenji','Ryu','Shun',
  'Erik','Lars','Olaf','Nils','Bjorn','Magnus','Jonas','Mats','Anders','Sven',
  'Pierre','Antoine','Mathieu','Julien','Romain','Thierry','Olivier','Theo',
  'Sergei','Dmitri','Yuri','Igor','Nikolai','Vlad','Andrei','Pavel','Maxim','Boris',
  'Jamal','Andre','Marcus','Tyrell','Jerome','Trevon','Darnell','Malik','Kobe','Damian',
];
const LAST_NAMES = [
  'Silva','Santos','Costa','Ferreira','Pereira','Oliveira','Reyes','Cruz','Diaz','Moreno',
  'Hernandez','Gonzalez','Sanchez','Perez','Ramos','Torres','Garcia','Lopez','Martinez',
  'Smith','Jones','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson',
  'Tanaka','Nakamura','Sato','Suzuki','Watanabe','Ito','Yamamoto','Kobayashi','Saito','Hayashi',
  'Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson',
  'Dupont','Lefebvre','Moreau','Laurent','Simon','Michel','Robert','Richard','Petit','Durand',
  'Petrov','Volkov','Sokolov','Mikhailov','Fedorov','Morozov','Pavlov','Kuznetsov','Smirnov',
  'Park','Kim','Lee','Choi','Jung','Kang','Cho','Yoon','Jang','Lim',
];
// Two-letter "country tag" decorations purely for card flavor.
const TAGS = ['BR','AR','UY','ES','FR','DE','IT','EN','NL','PT','BE','SE','NO','DK','CH',
              'JP','KR','CN','SA','MA','NG','CI','SN','GH','EG','US','CA','MX','AU','PL','TR'];
const POSITIONS = ['GK','DEF','MID','FWD'];

let cardCounter = 1;

export function pickTier(tierId) {
  return TIERS.find((t) => t.id === tierId);
}

// Pick a random rating 50..99 weighted toward the lower end so high
// ratings are rare. Skewed exponentially.
function randomBaseRating() {
  // r in [0, 1), squared again pushes most mass near 0
  const r = Math.random() * Math.random();
  return 50 + Math.floor(r * 50);          // 50..99, heavily favouring 50s/60s
}

// Generate a card. If `minRating` is given, the card's rating is at least
// that value (with the distribution above the floor still skewing low).
export function generateCard(opts = {}) {
  const min = opts.minRating || 50;
  let rating;
  if (min <= 50) {
    rating = randomBaseRating();
  } else {
    // For guaranteed-min cards, distribute exponentially above the floor.
    const span = 99 - min;
    rating = Math.min(99, min + Math.floor(Math.random() * Math.random() * (span + 1)));
  }
  const tier = tierForRating(rating);
  const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const tag   = TAGS[Math.floor(Math.random() * TAGS.length)];
  return {
    id: 'c_' + (cardCounter++).toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    tier: tier.id,
    rating,
    pos,
    // Surname-only display (like a football scoreboard). fullName is the
    // long version, shown on the big pack-reveal cards.
    name: last,
    surname: last,
    fullName: `${first} ${last}`,
    tag,
    // Per-stat ratings; not heavily used in v1 but useful later.
    pace:    Math.max(40, Math.min(99, rating + Math.floor((Math.random() - 0.5) * 8))),
    shoot:   Math.max(40, Math.min(99, rating + Math.floor((Math.random() - 0.5) * 8))),
    pass:    Math.max(40, Math.min(99, rating + Math.floor((Math.random() - 0.5) * 8))),
    defend:  Math.max(40, Math.min(99, rating + Math.floor((Math.random() - 0.5) * 8))),
    value:   Math.max(50, Math.round(Math.pow(Math.max(0, rating - 50), 2.6) * 5)),
  };
}

// Open a pack: returns an array of cards. The guarantee is one card
// rated at least pack.guaranteeMin; the rest are random.
export function openPack(pack) {
  const cards = [];
  if (pack.guaranteeMin) cards.push(generateCard({ minRating: pack.guaranteeMin }));
  while (cards.length < pack.cards) cards.push(generateCard());
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Squad helpers
export const FORMATION_433 = [
  { slot: 'GK', x: 50, y: 90 },
  { slot: 'LB', x: 12, y: 70 },  { slot: 'CB', x: 36, y: 70 }, { slot: 'CB', x: 64, y: 70 }, { slot: 'RB', x: 88, y: 70 },
  { slot: 'CM', x: 20, y: 45 },  { slot: 'CM', x: 50, y: 45 }, { slot: 'CM', x: 80, y: 45 },
  { slot: 'LW', x: 18, y: 18 },  { slot: 'ST', x: 50, y: 12 }, { slot: 'RW', x: 82, y: 18 },
];

// Which collection positions can fit a formation slot. (Loose so we
// don't get stuck without strict positional matches.)
export function slotAccepts(slot, cardPos) {
  if (slot === 'GK') return cardPos === 'GK';
  if (slot === 'LB' || slot === 'RB' || slot === 'CB') return cardPos === 'DEF';
  if (slot === 'CM') return cardPos === 'MID';
  return cardPos === 'FWD';                                  // LW / ST / RW
}

export function teamOVR(squadCards) {
  const valid = squadCards.filter(Boolean);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((s, c) => s + c.rating, 0) / valid.length);
}

export function formatFCP(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M FCP';
  if (n >= 1_000) return Math.round(n / 1000) + 'K FCP';
  return (n | 0) + ' FCP';
}
export function formatGems(n) { return (n | 0) + ' 💎'; }
