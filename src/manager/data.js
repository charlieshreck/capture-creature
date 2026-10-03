// Countries -> Divisions (pyramid, top first) -> Teams.
// Each division has a `tier` (0 = top flight). Promotion / relegation
// swaps the bottom of tier N with the top of tier N+1 in the same country.

export const COUNTRIES = [
  { id: 'eng', name: 'England', flag: '#cf142b', divisions: [
    { id: 'epl',   name: 'Premier League',  tier: 0, color: '#3d195b', accent: '#00ff85',
      teams: ['Man City','Arsenal','Liverpool','Man United','Chelsea','Tottenham','Newcastle','Aston Villa',
              'Brighton','West Ham','Crystal Palace','Brentford','Everton','Fulham','Wolves','Nottingham Forest'] },
    { id: 'champ', name: 'Championship',    tier: 1, color: '#1565c0', accent: '#ffd400',
      teams: ['Leeds','Leicester','Southampton','West Brom','Norwich','Watford','Middlesbrough','Sunderland',
              'Bristol City','Sheffield United','Hull City','Stoke City','Coventry','Preston','Blackburn','Birmingham'] },
    { id: 'l1',    name: 'League One',      tier: 2, color: '#1976d2', accent: '#ffffff',
      teams: ['Bolton','Derby County','Portsmouth','Reading','Charlton','Wycombe','Lincoln','Peterborough',
              'Wrexham','Oxford United','Plymouth','Barnsley'] },
    { id: 'l2',    name: 'League Two',      tier: 3, color: '#0d47a1', accent: '#ffffff',
      teams: ['Mansfield','Bradford','Crewe','Walsall','MK Dons','Tranmere','Doncaster','Notts County',
              'Crawley','Salford','Grimsby','Stockport'] },
  ]},
  { id: 'esp', name: 'Spain', flag: '#aa151b', divisions: [
    { id: 'laliga', name: 'La Liga',        tier: 0, color: '#ff4b44', accent: '#fff200',
      teams: ['Real Madrid','Barcelona','Atletico Madrid','Athletic Bilbao','Real Sociedad','Real Betis','Villarreal','Sevilla',
              'Valencia','Girona','Osasuna','Celta Vigo','Mallorca','Rayo Vallecano','Las Palmas','Alaves'] },
    { id: 'segunda', name: 'Segunda División', tier: 1, color: '#d84315', accent: '#ffd54f',
      teams: ['Eibar','Levante','Sporting Gijon','Real Oviedo','Burgos','Tenerife','Mirandes','Albacete',
              'Cartagena','Andorra','Eldense','Huesca','Racing Santander','Leganes','Real Zaragoza','Espanyol'] },
    { id: 'primfed', name: 'Primera Federación', tier: 2, color: '#bf360c', accent: '#ffd54f',
      teams: ['Castellón','Ibiza','Algeciras','Sabadell','Antequera','Lugo','Cordoba','Recreativo',
              'Linares','Melilla','Merida','Intercity'] },
  ]},
  { id: 'ita', name: 'Italy', flag: '#009246', divisions: [
    { id: 'seriea', name: 'Serie A',        tier: 0, color: '#008fd7', accent: '#00d2ff',
      teams: ['Inter Milan','AC Milan','Juventus','Napoli','Roma','Lazio','Atalanta','Fiorentina',
              'Bologna','Torino','Udinese','Monza','Genoa','Empoli','Lecce','Verona'] },
    { id: 'serieb', name: 'Serie B',        tier: 1, color: '#1565c0', accent: '#90caf9',
      teams: ['Sampdoria','Palermo','Cremonese','Parma','Spezia','Bari','Catania','Cesena',
              'Pisa','Brescia','Cosenza','Modena','Reggiana','Como','Sudtirol','Ascoli'] },
    { id: 'seriec', name: 'Serie C',        tier: 2, color: '#0d47a1', accent: '#bbdefb',
      teams: ['Avellino','Padova','Vicenza','Triestina','Pescara','Foggia','Lecco','Pordenone',
              'Mantova','Catanzaro','Torres','Carrarese'] },
  ]},
  { id: 'ger', name: 'Germany', flag: '#dd0000', divisions: [
    { id: 'bundesliga',  name: 'Bundesliga',    tier: 0, color: '#d20515', accent: '#fff200',
      teams: ['Bayern Munich','Bayer Leverkusen','Borussia Dortmund','RB Leipzig','Stuttgart','Eintracht Frankfurt','Hoffenheim','Freiburg',
              'Wolfsburg','Mainz','Werder Bremen','Augsburg','Borussia Mgladbach','Union Berlin','Heidenheim','Bochum'] },
    { id: 'bundesliga2', name: '2. Bundesliga', tier: 1, color: '#b71c1c', accent: '#ffeb3b',
      teams: ['Hamburger SV','Hertha Berlin','Schalke 04','Karlsruher SC','Hannover 96','Düsseldorf','Kaiserslautern','Paderborn',
              'Magdeburg','Greuther Fürth','Holstein Kiel','Nürnberg','St Pauli','Elversberg','Braunschweig','Rostock'] },
    { id: 'liga3',       name: '3. Liga',       tier: 2, color: '#880e4f', accent: '#f8bbd0',
      teams: ['Dynamo Dresden','1860 München','Erzgebirge Aue','Rot-Weiss Essen','Saarbrücken','Sandhausen','Verl','Halle',
              'Cottbus','Mannheim','Ingolstadt','Wiesbaden'] },
  ]},
  { id: 'fra', name: 'France', flag: '#0055a4', divisions: [
    { id: 'ligue1',   name: 'Ligue 1',        tier: 0, color: '#091c3e', accent: '#dceaff',
      teams: ['Paris SG','Monaco','Marseille','Lille','Nice','Lyon','Lens','Rennes',
              'Strasbourg','Reims','Toulouse','Nantes','Montpellier','Brest','Le Havre','Metz'] },
    { id: 'ligue2',   name: 'Ligue 2',        tier: 1, color: '#0d2a5a', accent: '#90caf9',
      teams: ['Saint-Étienne','Bordeaux','Auxerre','Caen','Guingamp','Bastia','Grenoble','Annecy',
              'Quevilly Rouen','Pau','Ajaccio','Amiens','Troyes','Angers','Laval','Rodez'] },
    { id: 'national', name: 'Championnat National', tier: 2, color: '#1a237e', accent: '#bbdefb',
      teams: ['Avranches','Versailles','Cholet','Nancy','Châteauroux','Concarneau','GFC Ajaccio','Boulogne',
              'Rouen','Le Mans','Orléans','Sochaux'] },
  ]},
  { id: 'ned', name: 'Netherlands', flag: '#ff6900', divisions: [
    { id: 'eredivisie',  name: 'Eredivisie',     tier: 0, color: '#ff6900', accent: '#ffd400',
      teams: ['PSV Eindhoven','Feyenoord','Ajax','AZ Alkmaar','Twente','Utrecht','Sparta Rotterdam','NEC Nijmegen',
              'Go Ahead Eagles','Heerenveen','Fortuna Sittard','Almere City','PEC Zwolle','RKC Waalwijk','Heracles','Vitesse'] },
    { id: 'eerste', name: 'Eerste Divisie',    tier: 1, color: '#e65100', accent: '#ffe082',
      teams: ['ADO Den Haag','Volendam','Roda JC','MVV Maastricht','Den Bosch','Cambuur','Helmond Sport','Telstar',
              'TOP Oss','Dordrecht','Eindhoven FC','Jong Ajax'] },
  ]},
  { id: 'por', name: 'Portugal', flag: '#006600', divisions: [
    { id: 'primeira', name: 'Primeira Liga',  tier: 0, color: '#006600', accent: '#ffd400',
      teams: ['Sporting CP','Benfica','Porto','Braga','Vitoria SC','Famalicao','Moreirense','Rio Ave',
              'Casa Pia','Estoril','Gil Vicente','Boavista','Estrela','Farense','Portimonense','Chaves'] },
    { id: 'liga2',    name: 'Liga Portugal 2',tier: 1, color: '#1b5e20', accent: '#ffd54f',
      teams: ['Maritimo','Belenenses','Penafiel','Tondela','Leixoes','Academico Viseu','Mafra','Nacional',
              'Feirense','Vilafranquense','UD Oliveirense','Trofense'] },
  ]},
  { id: 'sco', name: 'Scotland', flag: '#0065bd', divisions: [
    { id: 'spl',  name: 'Scottish Premiership', tier: 0, color: '#0065bd', accent: '#ffffff',
      teams: ['Celtic','Rangers','Hearts','Hibernian','Aberdeen','Kilmarnock','St Mirren','Motherwell',
              'St Johnstone','Dundee','Ross County','Livingston'] },
    { id: 'sco2', name: 'Scottish Championship',tier: 1, color: '#01579b', accent: '#b3e5fc',
      teams: ['Dundee United','Partick Thistle','Raith Rovers','Ayr United','Greenock Morton','Inverness CT','Arbroath','Queen\'s Park',
              'Dunfermline','Airdrieonians','Falkirk','Hamilton'] },
  ]},
  { id: 'usa', name: 'USA', flag: '#bf0a30', divisions: [
    { id: 'mls', name: 'MLS',                  tier: 0, color: '#001a44', accent: '#ff0046',
      teams: ['Inter Miami','LAFC','LA Galaxy','Atlanta United','NY Red Bulls','NYCFC','Seattle Sounders','Portland Timbers',
              'Philadelphia Union','Cincinnati','Columbus Crew','Nashville SC','Toronto FC','Houston Dynamo','Austin FC','DC United'] },
    { id: 'usl', name: 'USL Championship',     tier: 1, color: '#003366', accent: '#ffcc00',
      teams: ['Tampa Bay Rowdies','Phoenix Rising','Indy Eleven','Sacramento Republic','El Paso Locomotive','Pittsburgh Riverhounds','Memphis 901','Charleston Battery',
              'Birmingham Legion','Hartford Athletic','Rio Grande Valley','Oakland Roots'] },
  ]},
  { id: 'sau', name: 'Saudi Arabia', flag: '#006c35', divisions: [
    { id: 'spro',  name: 'Saudi Pro League',   tier: 0, color: '#006c35', accent: '#ffffff',
      teams: ['Al-Hilal','Al-Nassr','Al-Ittihad','Al-Ahli','Al-Ettifaq','Al-Taawoun','Al-Khaleej','Al-Fateh',
              'Al-Fayha','Al-Wehda','Damac','Al-Shabab','Al-Riyadh','Abha','Al-Hazem','Al-Akhdoud'] },
    { id: 'sfirst',name: 'Saudi First Division',tier: 1, color: '#1b5e20', accent: '#e8f5e9',
      teams: ['Al-Qadsiah','Al-Najma','Al-Sahel','Al-Jandal','Al-Ain','Al-Bukiryah','Hajer','Jeddah',
              'Najran','Al-Faisaly','Al-Adalah','Al-Nahda'] },
  ]},
  { id: 'tur', name: 'Turkey', flag: '#e30a17', divisions: [
    { id: 'superlig', name: 'Super Lig',       tier: 0, color: '#e30a17', accent: '#ffffff',
      teams: ['Galatasaray','Fenerbahce','Besiktas','Trabzonspor','Adana Demirspor','Basaksehir','Kayserispor','Konyaspor',
              'Antalyaspor','Sivasspor','Alanyaspor','Rizespor','Kasimpasa','Ankaragucu','Pendikspor','Hatayspor'] },
    { id: 'tur2',     name: '1. Lig',          tier: 1, color: '#b71c1c', accent: '#ffcdd2',
      teams: ['Bandirmaspor','Boluspor','Gocukspor','Erzurumspor','Sakaryaspor','Manisa','Adanaspor','Eyupspor',
              'Genclerbirligi','Tuzlaspor','Altay','Keciorengucu'] },
  ]},
  { id: 'bel', name: 'Belgium', flag: '#ed2939', divisions: [
    { id: 'belpro', name: 'Belgian Pro League',     tier: 0, color: '#fdda24', accent: '#ed2939',
      teams: ['Club Brugge','Anderlecht','Genk','Antwerp','Gent','Union SG','Standard Liege','Cercle Brugge',
              'Mechelen','Westerlo','Charleroi','OH Leuven','Sint-Truiden','Kortrijk','Eupen','RWDM'] },
    { id: 'belchall',name: 'Challenger Pro League', tier: 1, color: '#bf360c', accent: '#fff59d',
      teams: ['Beerschot','Lommel','Patro Eisden','Lokeren','Beveren','Deinze','SK Beveren','Seraing',
              'KMSK Deinze','Anderlecht II','Genk II','Club Brugge II'] },
  ]},
];

// Average rating for each tier index (0..3) and depth within division (0=top..4=bottom).
const TIER_AVG = [
  [82, 78, 74, 70, 66],   // tier 0 — top flight
  [68, 64, 60, 57, 54],   // tier 1
  [56, 53, 51, 49, 47],   // tier 2
  [50, 48, 46, 45, 45],   // tier 3
];

// Starting budget per tier
const TIER_BUDGET = [
  100_000_000,
  25_000_000,
  6_000_000,
  2_000_000,
];

// Yearly TV / prize income per tier (used in endSeason)
export const TIER_SEASON_INCOME = [
  60_000_000,
  15_000_000,
  3_000_000,
  900_000,
];

// 0..4 — rank within a division for rating purposes
function rankTier(idx, total) {
  const r = idx / Math.max(1, total - 1);
  if (r < 0.15) return 0;
  if (r < 0.35) return 1;
  if (r < 0.65) return 2;
  if (r < 0.85) return 3;
  return 4;
}

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
  'Silva','Santos','Costa','Ferreira','Pereira','Oliveira','Rodriguez','Martinez','Garcia','Lopez',
  'Hernandez','Gonzalez','Sanchez','Perez','Ramos','Torres','Moreno','Diaz','Cruz','Reyes',
  'Mbappe','Salah','Mane','Diaby','Coulibaly','Toure','Diallo','Kone','Camara','Sissoko',
  'Smith','Jones','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson',
  'Tanaka','Nakamura','Sato','Suzuki','Watanabe','Ito','Yamamoto','Kobayashi','Saito','Hayashi',
  'Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson',
  'Dupont','Lefebvre','Moreau','Laurent','Simon','Michel','Robert','Richard','Petit','Durand',
  'Petrov','Volkov','Sokolov','Mikhailov','Fedorov','Morozov','Pavlov','Kuznetsov','Smirnov',
  'Park','Kim','Lee','Choi','Jung','Kang','Cho','Yoon','Jang','Lim',
];

const POSITIONS = [
  { pos: 'GK', count: 1 },
  { pos: 'DEF', count: 4 },
  { pos: 'MID', count: 3 },
  { pos: 'FWD', count: 3 },
  { pos: 'GK', count: 1 },
  { pos: 'DEF', count: 2 },
  { pos: 'MID', count: 2 },
  { pos: 'FWD', count: 2 },
];

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let nextPlayerId = 1;
function newPlayerId() { return 'p_' + (nextPlayerId++); }

function buildSquad(avgRating, rng) {
  const players = [];
  for (const slot of POSITIONS) {
    for (let i = 0; i < slot.count; i++) {
      const variance = (rng() - 0.5) * 12;
      const rating = Math.max(40, Math.min(95, Math.round(avgRating + variance)));
      const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      const last  = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
      const age = 22 + Math.floor(rng() * 14);
      players.push({
        id: newPlayerId(),
        name: `${first} ${last}`,
        pos: slot.pos,
        rating, age,
        potential: Math.min(117, rating + Math.floor(rng() * 6)),
        morale: 70 + Math.floor(rng() * 25),
        value: priceFor(rating, age),
      });
    }
  }
  return players;
}

function buildYouth(avgRating, rng) {
  const players = [];
  const slots = [
    { pos: 'GK', count: 1 },
    { pos: 'DEF', count: 3 },
    { pos: 'MID', count: 3 },
    { pos: 'FWD', count: 2 },
  ];
  for (const slot of slots) {
    for (let i = 0; i < slot.count; i++) {
      const variance = (rng() - 0.5) * 8;
      const rating = Math.max(40, Math.min(78, Math.round(avgRating - 10 + variance)));
      const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      const last  = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
      const age = 16 + Math.floor(rng() * 5);
      players.push({
        id: newPlayerId(),
        name: `${first} ${last}`,
        pos: slot.pos,
        rating, age,
        potential: Math.min(117, rating + 8 + Math.floor(rng() * 12)),
        morale: 75 + Math.floor(rng() * 20),
        value: priceFor(rating, age),
      });
    }
  }
  return players;
}

// Generate a scout for the marketplace. Stars 0.5..5.0 in 0.5 steps.
export function makeScout() {
  const stars = (Math.floor(Math.random() * 10) + 1) * 0.5;
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return {
    id: 's_' + Math.random().toString(36).slice(2, 9),
    name: `${first} ${last}`,
    stars,
    // Quadratic price curve. 0.5★ ≈ £50K, 2★ ≈ £800K, 5★ ≈ £5M.
    price: Math.round(200_000 * stars * stars / 1000) * 1000,
  };
}

export function generateScoutShop(count = 12) {
  const shop = [];
  for (let i = 0; i < count; i++) shop.push(makeScout());
  return shop;
}

// Generate a youth player whose potential scales with the scout's stars.
// Higher stars → bigger rating + much higher potential ceiling.
export function youthFromScout(stars) {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const baseRating = 40 + stars * 8;          // 0.5★=44, 5★=80
  const rating = Math.max(40, Math.min(95, Math.round(baseRating + (Math.random() - 0.5) * 6)));
  const potential = Math.max(rating, Math.min(117,
    Math.round(50 + stars * 13 + (Math.random() - 0.5) * 8)));
  const age = 16 + Math.floor(Math.random() * 4);
  return {
    id: 'p_s_' + Math.random().toString(36).slice(2, 9),
    name: `${first} ${last}`,
    pos: ['GK', 'DEF', 'MID', 'FWD'][Math.floor(Math.random() * 4)],
    rating, age, potential,
    morale: 80, value: priceFor(rating, age),
  };
}

export function newYouthPlayer(teamAvgRating = 65) {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const rating = Math.max(40, Math.min(72, Math.round(teamAvgRating - 12 + (Math.random() - 0.5) * 8)));
  const age = 16;
  return {
    id: 'p_y_' + Math.random().toString(36).slice(2, 8),
    name: `${first} ${last}`,
    pos: ['GK', 'DEF', 'MID', 'FWD'][Math.floor(Math.random() * 4)],
    rating, age,
    potential: Math.min(117, rating + 10 + Math.floor(Math.random() * 14)),
    morale: 80, value: priceFor(rating, age),
  };
}

export function priceFor(rating, age) {
  const base = Math.pow(Math.max(0, rating - 50), 3.2) * 8000;
  const youth = age < 23 ? 1.6 : age < 28 ? 1.2 : age < 31 ? 0.9 : 0.55;
  return Math.max(10000, Math.round(base * youth / 1000) * 1000);
}

// Build every team in every division of every country.
export function buildWorld(seed = 1) {
  nextPlayerId = 1;
  const rng = mulberry32(hashSeed('world_' + seed));
  const leagues = [];
  for (const C of COUNTRIES) {
    for (const D of C.divisions) {
      const total = D.teams.length;
      const teams = D.teams.map((tn, idx) => {
        const tier = D.tier;
        const rank = rankTier(idx, total);
        const avg = TIER_AVG[tier][rank] + (rng() - 0.5) * 3;
        const teamRng = mulberry32(hashSeed(D.id + ':' + tn));
        return {
          id: D.id + ':' + idx,
          name: tn,
          countryId: C.id,
          leagueId: D.id,
          squad: buildSquad(avg, teamRng),
          youth: buildYouth(avg, teamRng),
          budget: Math.round(TIER_BUDGET[tier] * (0.6 + rng() * 0.9)),
          trophies: [],
        };
      });
      leagues.push({
        id: D.id,
        name: D.name,
        country: C.name,
        countryId: C.id,
        tier: D.tier,
        color: D.color,
        accent: D.accent,
        teams,
      });
    }
  }
  return { leagues, season: 1, week: 0 };
}

// Regenerate a team's squad to match a target tier's worst-team average.
// Used when the user picks a division below their team's natural one.
export function rebuildSquadForTier(team, tier) {
  const avg = TIER_AVG[Math.max(0, Math.min(3, tier))][4];      // worst rank within tier
  const rng = mulberry32(hashSeed('rebuild_' + team.id + '_' + tier + '_' + Date.now()));
  team.squad = buildSquad(avg, rng);
  team.youth = buildYouth(avg, rng);
  team.budget = Math.round(TIER_BUDGET[tier] * (0.7 + Math.random() * 0.4));
}

export function teamRating(team) {
  const sorted = team.squad.slice().sort((a, b) => b.rating - a.rating);
  const top = sorted.slice(0, 11);
  if (top.length === 0) return 0;
  return Math.round(top.reduce((s, p) => s + p.rating, 0) / top.length);
}

export function formatMoney(n) {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return '£' + Math.round(n / 1000) + 'K';
  return '£' + n;
}
