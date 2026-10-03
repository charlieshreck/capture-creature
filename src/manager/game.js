import {
  buildWorld, teamRating, priceFor, newYouthPlayer,
  rebuildSquadForTier, TIER_SEASON_INCOME, COUNTRIES,
  generateScoutShop, youthFromScout,
} from './data.js';

const SAVE_KEY_PREFIX = 'cc_manager_';

// Build a new career. `targetLeagueId` is optional — if provided AND different
// from the team's natural division, the team is moved there and its squad is
// rebuilt to match the worst team's rating in that division.
export function newCareer(username, teamId, targetLeagueId = null) {
  const world = buildWorld(Date.now() & 0xfffff);
  const team = findTeam(world, teamId);
  if (!team) throw new Error('Team not found: ' + teamId);
  if (targetLeagueId && targetLeagueId !== team.leagueId) {
    moveTeamToLeague(world, team, targetLeagueId, /*resetSquad*/ true);
  }
  const career = {
    username,
    teamId,
    leagueId: team.leagueId,
    world,
    fixtures: buildFixtures(world, team.leagueId),
    week: 0,
    results: [],
    table: emptyTable(world, team.leagueId),
    cashSpent: 0,
    trophies: [],
    eventLog: [`You take charge of ${team.name} in the ${findLeague(world, team.leagueId).name}!`],
  };
  // Carabao Cup runs at the start of every English season
  if (team.countryId === 'eng') setupCarabaoCup(career);
  return career;
}

// Move a team to a different division (same world). If resetSquad, regenerate
// the squad to match the worst-team rating of the new tier.
export function moveTeamToLeague(world, team, newLeagueId, resetSquad) {
  const oldLeague = findLeague(world, team.leagueId);
  const newLeague = findLeague(world, newLeagueId);
  if (!oldLeague || !newLeague) return;
  // Detach from old
  oldLeague.teams = oldLeague.teams.filter((t) => t.id !== team.id);
  // Attach to new (append)
  team.leagueId = newLeague.id;
  newLeague.teams.push(team);
  if (resetSquad) rebuildSquadForTier(team, newLeague.tier);
}

export function saveCareer(career) {
  try {
    localStorage.setItem(SAVE_KEY_PREFIX + career.username.toLowerCase(),
      JSON.stringify(career));
  } catch {}
}

export function loadCareer(username) {
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + username.toLowerCase());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function deleteCareer(username) {
  try { localStorage.removeItem(SAVE_KEY_PREFIX + username.toLowerCase()); } catch {}
}

export function findTeam(world, teamId) {
  for (const L of world.leagues) {
    for (const t of L.teams) if (t.id === teamId) return t;
  }
  return null;
}

export function findLeague(world, leagueId) {
  return world.leagues.find((L) => L.id === leagueId);
}

export function myTeam(career) {
  return findTeam(career.world, career.teamId);
}

// Round-robin double-leg fixtures for the given league.
function buildFixtures(world, leagueId) {
  const L = findLeague(world, leagueId);
  const teams = L.teams.slice();
  if (teams.length % 2) teams.push(null);     // bye if odd
  const n = teams.length;
  const rounds = [];
  // Circle method
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a && b) round.push({ home: a.id, away: b.id });
    }
    rounds.push(round);
    // Rotate (keep first fixed)
    teams.splice(1, 0, teams.pop());
  }
  // Second leg: reverse fixtures
  const second = rounds.map((rd) => rd.map((m) => ({ home: m.away, away: m.home })));
  return [...rounds, ...second];
}

function emptyTable(world, leagueId) {
  const L = findLeague(world, leagueId);
  return L.teams.map((t) => ({
    teamId: t.id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
  }));
}

// Sort table standard football: Pts > GD > GF
export function sortTable(rows) {
  return rows.slice().sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
}

// Which "zone" a league rank sits in.
// Returns one of: 'cl' | 'el' | 'confl' | 'promoted' | 'relegated' | null.
//
// Top-flight rules (tier 0): top 4 = CL, 5 = EL, 6 = ConfL, bottom 3 = relegated.
// Mid tiers: top 2 = promoted, bottom 3 = relegated.
// Bottom tier of a country's pyramid: top 2 = promoted, no relegation.
export function tableZone(career, rank, totalTeams) {
  const league = findLeague(career.world, career.leagueId);
  if (!league) return null;
  const tier = league.tier ?? 0;
  // Find the deepest tier in this country (bottom of pyramid)
  let bottomTier = tier;
  for (const L of career.world.leagues) {
    if (L.countryId === league.countryId && (L.tier ?? 0) > bottomTier) bottomTier = L.tier;
  }
  // Top flight
  if (tier === 0) {
    if (rank <= 3) return 'cl';
    if (rank === 4) return 'el';
    if (rank === 5) return 'confl';
    if (rank >= totalTeams - 3) return 'relegated';
    return null;
  }
  // Bottom tier — no relegation
  if (tier === bottomTier) {
    if (rank <= 1) return 'promoted';        // top 2 auto
    if (rank >= 2 && rank <= 5) return 'playoff';  // 3rd-6th playoff
    return null;
  }
  // Mid tier
  if (rank <= 1) return 'promoted';
  if (rank >= 2 && rank <= 5) return 'playoff';
  if (rank >= totalTeams - 3) return 'relegated';
  return null;
}

// Countries whose top division feeds European competitions. (USA + Saudi
// have their own continental tournaments and stay out.)
const EUROPE_COUNTRIES = new Set(['eng','esp','ita','ger','fra','ned','por','sco','tur','bel']);

export function europeanQualifierFor(career, sortedTable) {
  const myRank = sortedTable.findIndex((r) => r.teamId === career.teamId);
  if (myRank < 0) return null;
  const league = findLeague(career.world, career.leagueId);
  if (!league || (league.tier ?? 0) !== 0) return null;
  if (!EUROPE_COUNTRIES.has(league.countryId)) return null;
  if (myRank <= 3) return 'cl';
  if (myRank === 4) return 'el';
  if (myRank === 5) return 'confl';
  return null;
}

// Play one week of fixtures (mine + AI). Returns { myResult, allResults }.
export function playWeek(career) {
  const fx = career.fixtures[career.week];
  if (!fx) return null;
  // Tick down player availability (injuries / suspensions) for my squad.
  // The lineup picker has already excluded anyone unavailable, so this
  // counts the current match as one served / one week recovered.
  const me0 = myTeam(career);
  for (const p of [...me0.squad, ...(me0.youth || [])]) {
    if ((p.suspendMatchesLeft || 0) > 0) p.suspendMatchesLeft--;
    if ((p.injuryWeeksLeft || 0) > 0) p.injuryWeeksLeft--;
  }
  const results = [];
  let myResult = null;
  for (const m of fx) {
    const home = findTeam(career.world, m.home);
    const away = findTeam(career.world, m.away);
    const r = simulateMatch(home, away);
    results.push({ week: career.week, home: m.home, away: m.away, hs: r.hs, as: r.as });
    applyResult(career, m.home, m.away, r.hs, r.as);
    if (m.home === career.teamId || m.away === career.teamId) {
      myResult = { home, away, hs: r.hs, as: r.as, mine: m.home === career.teamId ? 'home' : 'away' };
    }
  }
  career.results.push(...results);
  career.week++;
  // After every match, a tiny morale + age effect
  ageAndMorale(career);
  return { myResult, allResults: results };
}

function applyResult(career, homeId, awayId, hs, as_) {
  const rowH = career.table.find((r) => r.teamId === homeId);
  const rowA = career.table.find((r) => r.teamId === awayId);
  if (rowH) {
    rowH.P++; rowH.GF += hs; rowH.GA += as_; rowH.GD = rowH.GF - rowH.GA;
    if (hs > as_) { rowH.W++; rowH.Pts += 3; }
    else if (hs === as_) { rowH.D++; rowH.Pts += 1; }
    else rowH.L++;
  }
  if (rowA) {
    rowA.P++; rowA.GF += as_; rowA.GA += hs; rowA.GD = rowA.GF - rowA.GA;
    if (as_ > hs) { rowA.W++; rowA.Pts += 3; }
    else if (as_ === hs) { rowA.D++; rowA.Pts += 1; }
    else rowA.L++;
  }
}

function simulateMatch(home, away) {
  const hr = teamRating(home) + 3;          // home advantage
  const ar = teamRating(away);
  // Expected goals: gap of 10 rating ≈ 1.5 goal swing
  const baseH = 1.4 + (hr - ar) * 0.05;
  const baseA = 1.2 - (hr - ar) * 0.05;
  const hs = Math.max(0, samplePoisson(Math.max(0.2, baseH)));
  const as = Math.max(0, samplePoisson(Math.max(0.2, baseA)));
  return { hs, as };
}

function samplePoisson(lambda) {
  // Knuth's algorithm — fine for small lambdas like ours
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function ageAndMorale(career) {
  // No actual age increment per week — that happens at season end.
  // Morale drifts toward 70 + small random walk.
  for (const L of career.world.leagues) {
    for (const t of L.teams) {
      for (const p of t.squad) {
        const drift = (70 - p.morale) * 0.02 + (Math.random() - 0.5) * 4;
        p.morale = Math.max(0, Math.min(100, Math.round(p.morale + drift)));
      }
      if (t.youth) {
        for (const p of t.youth) {
          const drift = (70 - p.morale) * 0.02 + (Math.random() - 0.5) * 4;
          p.morale = Math.max(0, Math.min(100, Math.round(p.morale + drift)));
        }
      }
    }
  }
}

// How big a successful training bump is. Higher potential = bigger jumps,
// but the small ones are always more common.
function bumpForPotential(potential) {
  const r = Math.random();
  if (potential >= 110) return r < 0.35 ? 1 : r < 0.7 ? 2 : r < 0.92 ? 3 : 4;
  if (potential >= 100) return r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
  if (potential >=  90) return r < 0.7 ? 1 : 2;
  if (potential >=  80) return r < 0.88 ? 1 : 2;
  return 1;
}

// How likely an age is to improve from training. Younger = more.
function ageTrainFactor(age) {
  if (age <= 17) return 2.0;
  if (age <= 19) return 1.7;
  if (age <= 21) return 1.4;
  if (age <= 24) return 1.1;
  if (age <= 27) return 0.85;
  if (age <= 30) return 0.6;
  if (age <= 33) return 0.35;
  return 0.2;
}

// Train one player from senior or youth squad. Younger players are far
// more likely to improve. Older players still CAN improve, just rarely —
// they never lose rating.
export function trainPlayer(career, playerId, intensity = 'normal') {
  const team = myTeam(career);
  const found = findOnTeam(team, playerId);
  if (!found) return { ok: false, msg: 'Not found' };
  const { player: p } = found;
  const cost = intensity === 'hard' ? 250_000 : 80_000;
  if (team.budget < cost) return { ok: false, msg: 'Not enough cash' };
  team.budget -= cost;
  career.cashSpent += cost;
  const gap = Math.max(0, p.potential - p.rating);
  // Tuned so training is always a gamble. Even the most promising
  // teenager on hard training caps around ~60%; older players sit far lower.
  const baseChance = (intensity === 'hard' ? 0.32 : 0.16) * (0.5 + gap / 25);
  const boostChance = Math.min(0.6, baseChance * ageTrainFactor(p.age));
  if (Math.random() < boostChance && p.rating < 117) {
    const oldRating = p.rating;
    // Bump size depends on potential: higher potential = bigger jumps.
    const bump = bumpForPotential(p.potential);
    p.rating = Math.min(117, p.rating + bump);
    p.value = priceFor(p.rating, p.age);
    if (p.rating > p.potential) p.potential = p.rating;
    p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 12 : 4));
    return { ok: true, improved: true, playerId: p.id,
      delta: p.rating - oldRating, oldRating, newRating: p.rating,
      morale: p.morale, value: p.value,
      msg: `${p.name} improved to ${p.rating}!` };
  } else {
    p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 10 : 2));
    return { ok: true, improved: false, playerId: p.id,
      delta: 0, morale: p.morale, value: p.value,
      msg: `${p.name} trained but didn't improve.` };
  }
}

// Apply ratings bumps after the 3D training match. `stats` is a map of
// playerId -> { goals, passes, tackles, sprints, plays }. `preMatch` is
// an optional map of playerId -> rating before the match started — when
// supplied, events report total deltas (live bumps from goals/tackles +
// post-match bumps) so the results screen reflects EVERYTHING that
// changed, not just the post-match step.
export function applyMatchTraining(career, stats, preMatch = {}) {
  const team = myTeam(career);
  const events = [];

  const scoreFor = (p, s) => {
    let core = 0, bonus = 0;
    if (p.pos === 'FWD') {
      core = s.goals * 4 + s.shots * 0.5;
      bonus = s.passes * 0.4 + s.tackles * 0.6 + s.sprints * 0.3;
    } else if (p.pos === 'MID') {
      core = s.passes * 1.0 + s.sprints * 0.6;
      bonus = s.goals * 2 + s.tackles * 0.8 + s.shots * 0.3;
    } else if (p.pos === 'DEF') {
      core = s.tackles * 1.4 + s.passes * 0.5;
      bonus = s.goals * 2 + s.sprints * 0.4;
    } else {
      core = s.saves * 2 + s.passes * 0.4;
      bonus = s.goals * 3 + s.tackles * 0.5;
    }
    return { core, bonus };
  };

  for (const p of [...team.squad, ...(team.youth || [])]) {
    const preRating = preMatch[p.id] != null ? preMatch[p.id] : p.rating;
    const s = stats[p.id];
    if (s) {
      const { core, bonus } = scoreFor(p, s);
      const baseChance = Math.min(0.85, 0.05 + core * 0.05);
      const ageMult = ageTrainFactor(p.age);
      if (Math.random() < baseChance * ageMult && p.rating < 117) {
        let bump = 1;
        bump += Math.floor(bonus / 3);
        if (core >= 12 && bonus >= 6) bump += 1;
        if (p.potential >= 100 && Math.random() < 0.4) bump += 1;
        bump = Math.max(1, Math.min(5, bump));
        p.rating = Math.min(117, p.rating + bump);
        p.value = priceFor(p.rating, p.age);
        if (p.rating > p.potential) p.potential = p.rating;
      }
    } else {
      const ageMult = ageTrainFactor(p.age);
      if (Math.random() < 0.08 * ageMult && p.rating < 117) {
        p.rating++;
        p.value = priceFor(p.rating, p.age);
        if (p.rating > p.potential) p.potential = p.rating;
      }
    }
    const totalDelta = p.rating - preRating;
    if (totalDelta > 0) {
      events.push({ playerId: p.id, delta: totalDelta, oldRating: preRating, newRating: p.rating, name: p.name });
    }
  }
  return { events };
}

// ============== SCOUTS ==============
//
// Replaces the old "youth players appear automatically every season"
// system. The user's team only gets new youth via the scout shop, which
// restocks 12 fresh scouts every 25 real seconds. Each scout has a star
// rating; better stars = more expensive but yields a higher-potential
// youth recruit.

const SCOUT_RESTOCK_MS = 25_000;
const SCOUT_COUNT = 12;

export function maybeRestockScoutShop(career, force = false) {
  const now = Date.now();
  if (force || !career.scoutShop || !career.scoutShopUntil || now >= career.scoutShopUntil) {
    career.scoutShop = generateScoutShop(SCOUT_COUNT);
    career.scoutShopUntil = now + SCOUT_RESTOCK_MS;
    return true;
  }
  return false;
}

export function scoutShopMsLeft(career) {
  if (!career.scoutShopUntil) return 0;
  return Math.max(0, career.scoutShopUntil - Date.now());
}

// Hire a scout from the market. Scout joins your permanent roster.
// They no longer deliver a youth player on hire — use scoutSearch() for that.
export function hireScout(career, scoutId) {
  const shop = career.scoutShop || [];
  const idx = shop.findIndex((s) => s.id === scoutId);
  if (idx < 0) return { ok: false, msg: 'Scout no longer available.' };
  const scout = shop[idx];
  const me = myTeam(career);
  if (me.budget < scout.price) return { ok: false, msg: `You need £${scout.price.toLocaleString()} to hire them.` };
  me.budget -= scout.price;
  career.cashSpent += scout.price;
  if (!career.scouts) career.scouts = [];
  career.scouts.push({ ...scout, searchesDone: 0 });
  shop.splice(idx, 1);
  return { ok: true, msg: `${scout.name} hired.`, scout };
}

// Search fee for a given scout — about 20% of their hire fee. Rounded.
export function scoutSearchFee(scout) {
  return Math.max(5000, Math.round(scout.price * 0.2 / 1000) * 1000);
}

// Pay a hired scout to find a new youth player.
export function scoutSearch(career, scoutId) {
  const scout = (career.scouts || []).find((s) => s.id === scoutId);
  if (!scout) return { ok: false, msg: 'Scout not on your roster.' };
  const me = myTeam(career);
  const fee = scoutSearchFee(scout);
  if (me.budget < fee) return { ok: false, msg: `Need £${fee.toLocaleString()} for the search.` };
  me.budget -= fee;
  career.cashSpent += fee;
  if (!me.youth) me.youth = [];
  const player = youthFromScout(scout.stars);
  me.youth.push(player);
  scout.searchesDone = (scout.searchesDone || 0) + 1;
  return { ok: true, msg: `${scout.name} found ${player.name}!`, player, scout, fee };
}

// Fire a scout you no longer want (no refund).
export function fireScout(career, scoutId) {
  if (!career.scouts) return { ok: false, msg: 'No scout' };
  const idx = career.scouts.findIndex((s) => s.id === scoutId);
  if (idx < 0) return { ok: false, msg: 'Scout not found' };
  const [scout] = career.scouts.splice(idx, 1);
  return { ok: true, msg: `${scout.name} let go.` };
}

// Player availability. Injuries are measured in weeks (1 week ≈ 1 league
// match); suspensions in matches. Both decrement at the START of each
// playWeek so a "1 match suspension" really does keep the player out for
// the very next match.
export function isAvailable(p) {
  return (p.injuryWeeksLeft || 0) <= 0 && (p.suspendMatchesLeft || 0) <= 0;
}

export function injurePlayer(p, weeks) {
  p.injuryWeeksLeft = Math.max(p.injuryWeeksLeft || 0, weeks);
}

export function suspendPlayer(p, matches) {
  p.suspendMatchesLeft = Math.max(p.suspendMatchesLeft || 0, matches);
}

// Per-position core skills. Doing well on these decides whether the player
// improves. Doing well on the OTHER skills boosts the size of the bump.
export const POSITION_CORE = {
  GK:  ['saves',     'physicality', 'pace'],
  DEF: ['defending', 'physicality', 'pace'],
  MID: ['passing',   'dribbling',   'pace'],
  FWD: ['finishing', 'dribbling',   'pace'],
};

// scores: { finishing, dribbling, passing, pace, physicality, saves, defending }
// each 0..5, undefined for skills not attempted in this session.
export function applyDrillTraining(career, playerId, intensity, scores) {
  const team = myTeam(career);
  const found = findOnTeam(team, playerId);
  if (!found) return { ok: false, msg: 'Not found' };
  const { player: p } = found;
  const cost = intensity === 'hard' ? 250_000 : 80_000;
  if (team.budget < cost) return { ok: false, msg: 'Not enough cash' };
  team.budget -= cost;
  career.cashSpent += cost;

  const core = POSITION_CORE[p.pos] || [];
  let coreSum = 0, coreCount = 0, nonSum = 0, nonCount = 0;
  for (const skill in scores) {
    const sc = scores[skill];
    if (sc == null) continue;
    if (core.includes(skill)) { coreSum += sc; coreCount++; }
    else { nonSum += sc; nonCount++; }
  }
  const coreAvg = coreCount > 0 ? coreSum / coreCount : 0;
  const nonAvg  = nonCount  > 0 ? nonSum / nonCount  : 0;

  // Improvement chance: based on how well the player did on their CORE
  // skills, then modulated by age (kids improve more).
  const baseChance = 0.15 + coreAvg * 0.16;       // 0.15 .. 0.95
  const chance = Math.min(0.95, baseChance * ageTrainFactor(p.age) * (intensity === 'hard' ? 1.15 : 1));

  if (Math.random() < chance && p.rating < 117) {
    const oldRating = p.rating;
    // Base bump = 1; extra from doing non-core skills well.
    let bump = 1;
    bump += Math.floor(nonAvg / 1.4);              // 0..3 extra
    // Mastery bonus: ace BOTH categories
    if (coreAvg >= 4.5 && nonAvg >= 3.5) bump += 1;
    // Higher potential allows bigger jumps too
    if (p.potential >= 100 && Math.random() < 0.5) bump += 1;
    bump = Math.max(1, Math.min(5, bump));
    p.rating = Math.min(117, p.rating + bump);
    p.value = priceFor(p.rating, p.age);
    if (p.rating > p.potential) p.potential = p.rating;
    p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 12 : 4));
    return { ok: true, improved: true, playerId: p.id,
      delta: p.rating - oldRating, oldRating, newRating: p.rating,
      morale: p.morale, value: p.value,
      msg: `${p.name} improved to ${p.rating}!` };
  }
  p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 10 : 2));
  return { ok: true, improved: false, playerId: p.id,
    delta: 0, morale: p.morale, value: p.value,
    msg: `${p.name} trained but didn't improve.` };
}

// Variant of trainPlayer where a player-supplied `performance` score (0..1
// from the training mini-game) modifies the success chance. Better play
// at the mini-game = better chance of improving + occasionally a bigger
// bump.
export function applyTrainingFromMinigame(career, playerId, intensity, performance) {
  const team = myTeam(career);
  const found = findOnTeam(team, playerId);
  if (!found) return { ok: false, msg: 'Not found' };
  const { player: p } = found;
  const cost = intensity === 'hard' ? 250_000 : 80_000;
  if (team.budget < cost) return { ok: false, msg: 'Not enough cash' };
  team.budget -= cost;
  career.cashSpent += cost;
  const gap = Math.max(0, p.potential - p.rating);
  const baseChance = (intensity === 'hard' ? 0.32 : 0.16) * (0.5 + gap / 25);
  const perfMult = 0.25 + performance * 1.5;          // 0.25 .. 1.75
  const boostChance = Math.min(0.95, baseChance * ageTrainFactor(p.age) * perfMult);
  if (Math.random() < boostChance && p.rating < 117) {
    const oldRating = p.rating;
    let bump = bumpForPotential(p.potential);
    if (performance >= 0.999) bump += 1;              // perfect run = bonus
    p.rating = Math.min(117, p.rating + bump);
    p.value = priceFor(p.rating, p.age);
    if (p.rating > p.potential) p.potential = p.rating;
    p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 12 : 4));
    return { ok: true, improved: true, playerId: p.id,
      delta: p.rating - oldRating, oldRating, newRating: p.rating,
      morale: p.morale, value: p.value,
      msg: `${p.name} improved to ${p.rating}!` };
  } else {
    p.morale = Math.max(0, p.morale - (intensity === 'hard' ? 10 : 2));
    return { ok: true, improved: false, playerId: p.id,
      delta: 0, morale: p.morale, value: p.value,
      msg: `${p.name} trained but didn't improve.` };
  }
}

function findOnTeam(team, playerId) {
  const a = team.squad.find((x) => x.id === playerId);
  if (a) return { player: a, where: 'squad' };
  if (team.youth) {
    const b = team.youth.find((x) => x.id === playerId);
    if (b) return { player: b, where: 'youth' };
  }
  return null;
}

// Promote a youth player to the senior squad. Allowed only while age <= 21.
export function promoteYouth(career, playerId) {
  const team = myTeam(career);
  if (!team.youth) team.youth = [];
  const idx = team.youth.findIndex((x) => x.id === playerId);
  if (idx < 0) return { ok: false, msg: 'Not in youth squad' };
  const p = team.youth[idx];
  if (p.age > 21) return { ok: false, msg: 'Too old for promotion (over 21)' };
  team.youth.splice(idx, 1);
  team.squad.push(p);
  return { ok: true, msg: `${p.name} promoted to the senior squad!` };
}

// ---------- Negotiations ----------
//
// Two flavours: BUY (player from another team) and SELL (your player out).
// Either side can accept, counter, or walk away. Negotiation objects are
// transient (UI memory, not saved), so the player's actual transfer only
// happens when completeTransfer is called.

export function openBuyNegotiation(career, fromTeamId, playerId) {
  const me = myTeam(career);
  const from = findTeam(career.world, fromTeamId);
  if (!from || from.id === me.id) return { ok: false, msg: 'Invalid team' };
  const p = from.squad.find((x) => x.id === playerId);
  if (!p) return { ok: false, msg: 'Player no longer available' };
  // Starting asking price is high; absolute minimum they'd ever take is
  // around value × 0.95 (rare, only after multiple rounds).
  const asking = Math.round(p.value * (1.25 + Math.random() * 0.45));
  const minimum = Math.round(p.value * (0.95 + Math.random() * 0.15));
  return {
    ok: true,
    type: 'buy',
    fromTeamId,
    playerId,
    player: { ...p },
    fromTeamName: from.name,
    asking,
    minimum,
    currentDemand: asking,
    rounds: 0,
    maxRounds: 4,
    history: [{ side: 'them', amount: asking, label: 'Initial demand' }],
  };
}

export function openSellNegotiation(career, playerId) {
  const me = myTeam(career);
  let p = me.squad.find((x) => x.id === playerId);
  let fromYouth = false;
  if (!p) {
    p = (me.youth || []).find((x) => x.id === playerId);
    fromYouth = true;
  }
  if (!p) return { ok: false, msg: 'Not on your team' };
  if (!fromYouth && me.squad.length <= 11) return { ok: false, msg: 'Need at least 11 senior players' };
  // Best the AI is willing to bid; their opening bid is a chunk lower so
  // you have room to push them up.
  const maxBid = Math.round(p.value * (0.85 + Math.random() * 0.35));
  const openingBid = Math.round(maxBid * (0.55 + Math.random() * 0.2));
  return {
    ok: true,
    type: 'sell',
    playerId,
    player: { ...p },
    fromTeamName: '(interested club)',
    maxBid,
    currentBid: openingBid,
    rounds: 0,
    maxRounds: 4,
    history: [{ side: 'them', amount: openingBid, label: 'Opening bid' }],
  };
}

// User makes an offer/asking-amount. Returns:
//   { status: 'accepted', agreedPrice }
//   { status: 'countered', counter }
//   { status: 'rejected', reason }
//   { status: 'no-money' }
export function submitNegotiationOffer(career, neg, amount) {
  amount = Math.max(0, Math.round(amount));
  neg.rounds++;
  neg.history.push({ side: 'you', amount, label: neg.type === 'buy' ? 'Your offer' : 'You ask' });
  if (neg.type === 'buy') {
    const me = myTeam(career);
    if (me.budget < amount) return { status: 'no-money' };
    if (amount >= neg.currentDemand) {
      return { status: 'accepted', agreedPrice: amount };
    }
    // Way too low? Reject outright.
    if (amount < neg.minimum * 0.45) {
      neg.history.push({ side: 'them', amount: 0, label: 'Walked away — insulted' });
      return { status: 'rejected', reason: 'They walk away — your offer was insulting.' };
    }
    if (neg.rounds >= neg.maxRounds) {
      neg.history.push({ side: 'them', amount: 0, label: 'Talks broke down' });
      return { status: 'rejected', reason: 'Negotiations broke down after too many rounds.' };
    }
    // Counter: weighted toward their current demand, never below minimum.
    const counter = Math.max(
      neg.minimum,
      Math.round(neg.currentDemand * 0.6 + amount * 0.4)
    );
    neg.currentDemand = counter;
    neg.history.push({ side: 'them', amount: counter, label: 'Counter demand' });
    return { status: 'countered', counter };
  }
  // SELL: user proposes an asking price.
  if (amount <= neg.currentBid) {
    return { status: 'accepted', agreedPrice: amount };
  }
  if (amount <= neg.maxBid) {
    // Within reach — they accept your number.
    return { status: 'accepted', agreedPrice: amount };
  }
  // Greedy? Reject if far above what they can pay.
  if (amount > neg.maxBid * 2.0) {
    neg.history.push({ side: 'them', amount: 0, label: 'Walked away — too high' });
    return { status: 'rejected', reason: 'They laugh and walk away.' };
  }
  if (neg.rounds >= neg.maxRounds) {
    neg.history.push({ side: 'them', amount: 0, label: 'Talks broke down' });
    return { status: 'rejected', reason: 'Negotiations broke down after too many rounds.' };
  }
  // Counter bid — they bump up toward your number but not all the way.
  const counter = Math.min(
    neg.maxBid,
    Math.round(neg.currentBid * 0.4 + amount * 0.6)
  );
  neg.currentBid = counter;
  neg.history.push({ side: 'them', amount: counter, label: 'Counter bid' });
  return { status: 'countered', counter };
}

// Accept whatever the AI's current number is (current demand or current bid).
export function acceptCurrentNegotiation(career, neg) {
  if (neg.type === 'buy') {
    const me = myTeam(career);
    if (me.budget < neg.currentDemand) return { status: 'no-money' };
    return { status: 'accepted', agreedPrice: neg.currentDemand };
  }
  return { status: 'accepted', agreedPrice: neg.currentBid };
}

// Finalize the transfer at the agreed price.
export function completeTransfer(career, neg, agreedPrice) {
  agreedPrice = Math.max(0, Math.round(agreedPrice));
  const me = myTeam(career);
  if (neg.type === 'buy') {
    const from = findTeam(career.world, neg.fromTeamId);
    if (!from) return { ok: false, msg: 'Selling club gone' };
    const p = from.squad.find((x) => x.id === neg.playerId);
    if (!p) return { ok: false, msg: 'Player no longer available' };
    if (me.budget < agreedPrice) return { ok: false, msg: 'Not enough money' };
    me.budget -= agreedPrice;
    from.budget += agreedPrice;
    from.squad = from.squad.filter((x) => x.id !== neg.playerId);
    me.squad.push(p);
    career.cashSpent += agreedPrice;
    return { ok: true, msg: `Signed ${p.name} for £${agreedPrice.toLocaleString()}`, price: agreedPrice };
  }
  // SELL — could be from senior squad or from youth
  let p = me.squad.find((x) => x.id === neg.playerId);
  let fromYouth = false;
  if (!p) {
    p = (me.youth || []).find((x) => x.id === neg.playerId);
    fromYouth = true;
  }
  if (!p) return { ok: false, msg: 'Player no longer on your team' };
  if (!fromYouth && me.squad.length <= 11) return { ok: false, msg: 'Need at least 11 senior players' };
  me.budget += agreedPrice;
  if (fromYouth) {
    me.youth = (me.youth || []).filter((x) => x.id !== neg.playerId);
  } else {
    me.squad = me.squad.filter((x) => x.id !== neg.playerId);
  }
  return { ok: true, msg: `Sold ${p.name} for £${agreedPrice.toLocaleString()}`, price: agreedPrice };
}

// Returns true if season just finished (last fixture played).
export function isSeasonOver(career) {
  return career.week >= career.fixtures.length;
}

// Wrap up the season: hand out trophies, age players up, new fixtures.
// If the user finished 3rd-6th in a non-top-flight league, this kicks off
// a promotion playoff and the rest of season-end is deferred until the
// playoff resolves via finalizePostPlayoff().
export function endSeason(career) {
  const sorted = sortTable(career.table);
  const champId = sorted[0].teamId;
  const champTeam = findTeam(career.world, champId);
  const champLeague = findLeague(career.world, career.leagueId);
  champTeam.trophies = champTeam.trophies || [];
  champTeam.trophies.push({ league: champLeague.name, season: career.world.season });
  career.eventLog.push(`Season ${career.world.season}: ${champTeam.name} won the ${champLeague.name}.`);
  if (champId === career.teamId) {
    career.trophies.push({ league: champLeague.name, season: career.world.season });
    career.eventLog.push(`🏆 You won the ${champLeague.name}!`);
  }

  // Does the user need to play a promotion playoff?
  const myRank = sorted.findIndex((r) => r.teamId === career.teamId);
  const myLeague = findLeague(career.world, career.leagueId);
  const needsPlayoff = myLeague && (myLeague.tier ?? 0) > 0 && myRank >= 2 && myRank <= 5;
  if (needsPlayoff) {
    setupPromotionPlayoff(career, sorted);
    career.eventLog.push(`Promotion playoff! ${myTeam(career).name} are in the bracket.`);
    return;     // age/promotion/etc deferred until the playoff finishes
  }

  finalizeSeasonAfterPlayoff(career, sorted, null);
}

function finalizeSeasonAfterPlayoff(career, sorted, playoffWinnerId) {

  // Age everyone up by 1. Rating NEVER drops just because of age.
  // Youth aging past 21 auto-promote to the senior squad.
  for (const L of career.world.leagues) {
    for (const t of L.teams) {
      if (!t.youth) t.youth = [];
      // Senior squad: just age + retirement
      const kept = [];
      for (const p of t.squad) {
        p.age++;
        if (p.age >= 38 && Math.random() < 0.35) continue;  // some retire, most stay
        // Small natural growth for young seniors (matches "younger = improves more")
        if (p.age < 25 && p.rating < p.potential && Math.random() < 0.4) p.rating++;
        p.value = priceFor(p.rating, p.age);
        kept.push(p);
      }
      t.squad = kept;

      // Youth: age up, auto-promote those >21, natural growth for the rest
      const stillYouth = [];
      for (const p of t.youth) {
        p.age++;
        if (p.rating < p.potential && Math.random() < 0.55) p.rating++;
        p.value = priceFor(p.rating, p.age);
        if (p.age > 21) {
          t.squad.push(p);                                 // auto-promote
        } else {
          stillYouth.push(p);
        }
      }
      t.youth = stillYouth;

      // Top up senior squad if too few
      while (t.squad.length < 18) {
        const youthie = newYouthPlayer(70);
        youthie.age = 22;                                   // promoted-feel
        youthie.value = priceFor(youthie.rating, youthie.age);
        t.squad.push(youthie);
      }
      // Top up youth squad — only AI teams. The user's team gets youth
      // exclusively via scouts (Youth tab → scout shop).
      if (t.id !== career.teamId) {
        while (t.youth.length < 8) t.youth.push(newYouthPlayer(70));
      }
    }
  }

  // Promotion / relegation in the user's country (and every other country
  // simulated abstractly so the world stays alive).
  applyPromotionRelegation(career, sorted);

  // Yearly TV / prize income based on each team's CURRENT division tier.
  for (const L of career.world.leagues) {
    for (const t of L.teams) {
      const tier = Math.max(0, Math.min(3, L.tier ?? 0));
      const income = TIER_SEASON_INCOME[tier] * (0.7 + Math.random() * 0.6);
      t.budget += Math.round(income);
    }
  }

  // European qualification — DEFER setup until after the FA Cup runs.
  if (career.europe && career.europe.stage === 'done') career.europe = null;
  const euroComp = europeanQualifierFor(career, sorted);
  if (euroComp && !career.europe) {
    career._pendingEuropeQualifier = euroComp;
    career.eventLog.push(`🌍 You qualified for the ${euroLongName(euroComp)} (kicks off after the FA Cup)!`);
  }

  // FA Cup runs now (for the just-ended season) if user is English
  if (isEnglishUser(career) && !career.faCup) setupFACup(career);

  // User may have switched leagues via promotion/relegation
  career.leagueId = myTeam(career).leagueId;

  // New season
  career.world.season++;
  career.week = 0;
  career.results = [];
  career.fixtures = buildFixtures(career.world, career.leagueId);
  career.table = emptyTable(career.world, career.leagueId);

  // Carabao Cup runs at the start of every English season
  if (isEnglishUser(career) && !career.carabaoCup) setupCarabaoCup(career);
}

// ============== PROMOTION PLAYOFF ==============
//
// Real-football style: top 2 of a non-top-flight league auto-promote, and
// the teams ranked 3rd-6th compete in a knockout for the third promotion
// spot — semis are two-legged, final is one leg.

export function setupPromotionPlayoff(career, sortedTable) {
  const teams = [
    sortedTable[2].teamId,
    sortedTable[3].teamId,
    sortedTable[4].teamId,
    sortedTable[5].teamId,
  ];
  career.playoff = {
    teams,
    seedNames: ['3rd', '4th', '5th', '6th'],
    standings: sortedTable.map((r) => ({ teamId: r.teamId })),   // remember for finalize
    stage: 'sf',
    ties: {
      sf: [
        buildTwoLegTie(teams[0], teams[3]),
        buildTwoLegTie(teams[1], teams[2]),
      ],
      final: null,
    },
    winnerId: null,
    log: ['Semis drawn: 3rd vs 6th, 4th vs 5th.'],
  };
}

export function hasActivePlayoff(career) {
  return !!(career.playoff && career.playoff.stage !== 'done');
}

export function nextPlayoffMatchInfo(career) {
  if (!hasActivePlayoff(career)) return null;
  const P = career.playoff;
  if (P.stage === 'sf') {
    const myTie = P.ties.sf.find((t) => !t.winnerId && (t.teamA === career.teamId || t.teamB === career.teamId));
    if (!myTie) return null;
    const nextLeg = myTie.legs.findIndex((l) => l.hs == null);
    if (nextLeg < 0) return null;
    const leg = myTie.legs[nextLeg];
    const opp = findTeam(career.world, leg.home === career.teamId ? leg.away : leg.home);
    return { stage: 'sf', leg: nextLeg + 1, opp, home: leg.home === career.teamId };
  }
  if (P.stage === 'final' && P.ties.final && !P.ties.final.winnerId) {
    const leg = P.ties.final.legs[0];
    if (leg.hs != null) return null;
    if (leg.home !== career.teamId && leg.away !== career.teamId) return null;
    const opp = findTeam(career.world, leg.home === career.teamId ? leg.away : leg.home);
    return { stage: 'final', leg: 1, opp, home: leg.home === career.teamId };
  }
  return null;
}

export function playPlayoffMatch(career) {
  if (!hasActivePlayoff(career)) return null;
  const P = career.playoff;
  if (P.stage === 'sf') {
    const myTie = P.ties.sf.find((t) => !t.winnerId && (t.teamA === career.teamId || t.teamB === career.teamId));
    if (!myTie) {
      // User already eliminated — fast-forward
      advanceAIPlayoff(career);
      return null;
    }
    const legIdx = myTie.legs.findIndex((l) => l.hs == null);
    if (legIdx < 0) { advancePlayoffIfReady(career); return null; }
    let mine = null;
    for (const t of P.ties.sf) {
      if (t.winnerId) continue;
      const leg = t.legs[legIdx];
      if (!leg || leg.hs != null) continue;
      const home = findTeam(career.world, leg.home);
      const away = findTeam(career.world, leg.away);
      const r = simulateMatch(home, away);
      leg.hs = r.hs; leg.as = r.as;
      if (leg.home === career.teamId || leg.away === career.teamId) {
        mine = { stage: 'sf', home, away, hs: r.hs, as: r.as,
          mine: leg.home === career.teamId ? 'home' : 'away', leg: legIdx + 1 };
      }
    }
    advancePlayoffIfReady(career);
    ageAndMorale(career);
    return mine;
  }
  if (P.stage === 'final') {
    const tie = P.ties.final;
    if (!tie || tie.winnerId) return null;
    const leg = tie.legs[0];
    if (leg.hs != null) return null;
    const home = findTeam(career.world, leg.home);
    const away = findTeam(career.world, leg.away);
    const r = simulateMatch(home, away);
    leg.hs = r.hs; leg.as = r.as;
    tie.winnerId = decideTieWinner(tie, true);
    P.winnerId = tie.winnerId;
    P.stage = 'done';
    const winner = findTeam(career.world, tie.winnerId);
    P.log.push(`Final: ${winner.name} win the playoff!`);
    if (tie.winnerId === career.teamId) career.eventLog.push(`🏆 You won the promotion playoff!`);
    else career.eventLog.push(`${winner.name} won the playoff final.`);
    finalizeSeasonAfterPlayoff(career, rebuildStandingsAfterPlayoff(career), P.winnerId);
    ageAndMorale(career);
    return { stage: 'final', home, away, hs: r.hs, as: r.as,
      mine: leg.home === career.teamId ? 'home' : (leg.away === career.teamId ? 'away' : null), leg: 1 };
  }
  return null;
}

function advancePlayoffIfReady(career) {
  const P = career.playoff;
  if (P.stage !== 'sf') return;
  const allDone = P.ties.sf.every((t) => t.legs.every((l) => l.hs != null));
  if (!allDone) return;
  for (const t of P.ties.sf) {
    if (!t.winnerId) {
      t.winnerId = decideTieWinner(t, false);
      const w = findTeam(career.world, t.winnerId);
      const l = findTeam(career.world, t.winnerId === t.teamA ? t.teamB : t.teamA);
      P.log.push(`Semi: ${w.name} beat ${l.name}.`);
      if (career.teamId === (t.winnerId === t.teamA ? t.teamB : t.teamA)) {
        career.eventLog.push(`You were knocked out in the playoff semi-final.`);
      }
    }
  }
  P.ties.final = buildOneLegTie(P.ties.sf[0].winnerId, P.ties.sf[1].winnerId);
  P.stage = 'final';
  P.log.push('Playoff final set.');
}

function advanceAIPlayoff(career) {
  const P = career.playoff;
  while (P.stage !== 'done') {
    if (P.stage === 'sf') {
      for (const t of P.ties.sf) {
        for (const leg of t.legs) {
          if (leg.hs == null) {
            const home = findTeam(career.world, leg.home);
            const away = findTeam(career.world, leg.away);
            const r = simulateMatch(home, away);
            leg.hs = r.hs; leg.as = r.as;
          }
        }
      }
      advancePlayoffIfReady(career);
    } else if (P.stage === 'final') {
      const leg = P.ties.final.legs[0];
      const home = findTeam(career.world, leg.home);
      const away = findTeam(career.world, leg.away);
      const r = simulateMatch(home, away);
      leg.hs = r.hs; leg.as = r.as;
      P.ties.final.winnerId = decideTieWinner(P.ties.final, true);
      P.winnerId = P.ties.final.winnerId;
      P.stage = 'done';
      const w = findTeam(career.world, P.winnerId);
      P.log.push(`Final: ${w.name} won.`);
      finalizeSeasonAfterPlayoff(career, rebuildStandingsAfterPlayoff(career), P.winnerId);
    }
  }
}

// Rebuild a sorted standings array using the playoff winner inserted at
// position 2 so the existing applyPromotionRelegation top-3 logic includes
// them as the third promoted team.
function rebuildStandingsAfterPlayoff(career) {
  const orig = career.playoff.standings.slice();
  const winnerIdx = orig.findIndex((r) => r.teamId === career.playoff.winnerId);
  if (winnerIdx > 2) {
    const [row] = orig.splice(winnerIdx, 1);
    orig.splice(2, 0, row);
  }
  return orig;
}

export function clearFinishedPlayoff(career) {
  if (career.playoff && career.playoff.stage === 'done') career.playoff = null;
}

// ============== DOMESTIC CUPS (English only) ==============
//
// Carabao Cup runs at the START of each season.
// FA Cup runs at the END (after the league).
// Europe (if qualified) runs AFTER the FA Cup.
//
// Both cups are 16-team, single-leg knockouts: R1 → QF → SF → Final.

export function isEnglishUser(career) {
  const me = myTeam(career);
  return me && me.countryId === 'eng';
}

export function setupCarabaoCup(career) {
  if (!isEnglishUser(career)) return;
  // Real Carabao Cup has 2-legged semis; everything else single leg.
  career.carabaoCup = buildCup(career, 'Carabao Cup', { use2LegSemi: true });
}

export function setupFACup(career) {
  if (!isEnglishUser(career)) return;
  // Modern FA Cup is all single-leg (no replays since 2024).
  career.faCup = buildCup(career, 'FA Cup', { use2LegSemi: false });
}

// Build a cup that includes EVERY English team. The strongest 8 teams
// (by rating) get byes into round 2, mirroring how real cups seed top
// flight clubs in.
function buildCup(career, name, opts = {}) {
  const all = [];
  for (const L of career.world.leagues) {
    if (L.countryId !== 'eng') continue;
    for (const t of L.teams) all.push(t);
  }
  all.sort((a, b) => teamRating(b) - teamRating(a));
  const byes = all.slice(0, 8).map((t) => t.id);
  const r1Pool = all.slice(8).map((t) => t.id);
  shuffleInPlace(r1Pool);
  const r1 = [];
  for (let i = 0; i + 1 < r1Pool.length; i += 2) {
    r1.push(buildOneLegTie(r1Pool[i], r1Pool[i + 1]));
  }
  // Odd team out gets pushed to byes (so the bracket stays a power of 2)
  if (r1Pool.length % 2 === 1) byes.push(r1Pool[r1Pool.length - 1]);
  return {
    name,
    stage: 'r1',
    rounds: { r1, r2: null, r3: null, qf: null, sf: null, final: null },
    byes,
    log: [`${name} R1 drawn — ${r1.length} ties, ${byes.length} byes to R2.`],
    myEliminated: false,
    champion: null,
    use2LegSemi: !!opts.use2LegSemi,
  };
}

const CUP_STAGES = ['r1', 'r2', 'r3', 'qf', 'sf', 'final'];

export function activeCup(career) {
  if (career.carabaoCup && career.carabaoCup.stage !== 'done') {
    return { key: 'carabaoCup', cup: career.carabaoCup };
  }
  if (career.faCup && career.faCup.stage !== 'done') {
    return { key: 'faCup', cup: career.faCup };
  }
  return null;
}
export function hasActiveCup(career) { return !!activeCup(career); }
export function activeFACup(career) {
  return career.faCup && career.faCup.stage !== 'done' ? career.faCup : null;
}
export function activeCarabaoCup(career) {
  return career.carabaoCup && career.carabaoCup.stage !== 'done' ? career.carabaoCup : null;
}

export function nextCupMatchInfo(career) {
  const ac = activeCup(career);
  if (!ac) return null;
  const ties = ac.cup.rounds[ac.cup.stage];
  if (!ties) return null;
  const myTie = ties.find((t) => !t.winnerId && (t.teamA === career.teamId || t.teamB === career.teamId));
  if (!myTie) return null;
  const legIdx = myTie.legs.findIndex((l) => l.hs == null);
  if (legIdx < 0) return null;
  const leg = myTie.legs[legIdx];
  const opp = findTeam(career.world, leg.home === career.teamId ? leg.away : leg.home);
  return { stage: ac.cup.stage, opp, home: leg.home === career.teamId,
    cupName: ac.cup.name, leg: legIdx + 1, totalLegs: myTie.legs.length };
}

export function playCupMatch(career) {
  const ac = activeCup(career);
  if (!ac) return null;
  const { cup, key } = ac;
  const ties = cup.rounds[cup.stage];
  if (!ties) return null;
  const isFinal = cup.stage === 'final';

  // Find which leg we're on (so all ties stay in lockstep)
  let legIdx = 0;
  for (const t of ties) {
    if (t.winnerId) continue;
    const idx = t.legs.findIndex((l) => l.hs == null);
    if (idx >= 0) { legIdx = idx; break; }
  }

  let mine = null;
  for (const t of ties) {
    if (t.winnerId) continue;
    const leg = t.legs[legIdx];
    if (!leg || leg.hs != null) continue;
    const home = findTeam(career.world, leg.home);
    const away = findTeam(career.world, leg.away);
    const r = simulateMatch(home, away);
    leg.hs = r.hs; leg.as = r.as;
    if (leg.home === career.teamId || leg.away === career.teamId) {
      mine = { stage: cup.stage, home, away, hs: r.hs, as: r.as, leg: legIdx + 1,
        mine: leg.home === career.teamId ? 'home' : 'away' };
    }
  }

  // Resolve winners only after the LAST leg of every tie has been played
  const allLegsDone = ties.every((t) => t.winnerId || t.legs.every((l) => l.hs != null));
  if (allLegsDone) {
    for (const t of ties) {
      if (t.winnerId) continue;
      // Single-leg: penalties on draw decide. Multi-leg: aggregate + away goals.
      if (t.legs.length === 1) {
        const leg = t.legs[0];
        if (leg.hs > leg.as) t.winnerId = leg.home;
        else if (leg.as > leg.hs) t.winnerId = leg.away;
        else t.winnerId = Math.random() < 0.5 ? leg.home : leg.away;
      } else {
        t.winnerId = decideTieWinner(t, isFinal);
      }
      const w = findTeam(career.world, t.winnerId);
      const lTeam = findTeam(career.world, t.winnerId === t.teamA ? t.teamB : t.teamA);
      cup.log.push(`${cupStageName(cup.stage)}: ${w.name} beat ${lTeam.name}.`);
      if (career.teamId === (t.winnerId === t.teamA ? t.teamB : t.teamA)) {
        career.eventLog.push(`Knocked out of the ${cup.name} in the ${cupStageName(cup.stage)}.`);
        cup.myEliminated = true;
      }
    }
    advanceCup(career, key);
  }

  ageAndMorale(career);
  return mine;
}

function advanceCup(career, key) {
  const cup = career[key];
  const idx = CUP_STAGES.indexOf(cup.stage);
  if (idx < 0) return;
  if (cup.stage === 'final') {
    cup.champion = cup.rounds.final[0].winnerId;
    cup.stage = 'done';
    const w = findTeam(career.world, cup.champion);
    cup.log.push(`${w.name} won the ${cup.name}!`);
    if (cup.champion === career.teamId) {
      career.eventLog.push(`🏆 You won the ${cup.name}!`);
      career.trophies.push({ league: cup.name, season: career.world.season });
    } else {
      career.eventLog.push(`${w.name} won the ${cup.name}.`);
    }
    return;
  }
  // Compose next-round teams: this round's winners + (R1 byes if going to R2)
  const winners = cup.rounds[cup.stage].map((t) => t.winnerId);
  let nextTeams = winners;
  if (cup.stage === 'r1') nextTeams = [...winners, ...cup.byes];
  shuffleInPlace(nextTeams);
  const nextStage = CUP_STAGES[idx + 1];
  const useTwoLegs = nextStage === 'sf' && cup.use2LegSemi;
  const nextTies = [];
  for (let i = 0; i + 1 < nextTeams.length; i += 2) {
    nextTies.push(useTwoLegs
      ? buildTwoLegTie(nextTeams[i], nextTeams[i + 1])
      : buildOneLegTie(nextTeams[i], nextTeams[i + 1]));
  }
  cup.rounds[nextStage] = nextTies;
  cup.stage = nextStage;
  cup.log.push(`${cupStageName(cup.stage)} drawn — ${nextTies.length} ${nextTies.length === 1 ? 'tie' : 'ties'}${useTwoLegs ? ' (two legs)' : ''}.`);
}

export function cupStageName(s) {
  return s === 'r1' ? 'Round 1'
    : s === 'r2' ? 'Round 2'
    : s === 'r3' ? 'Round 3'
    : s === 'qf' ? 'Quarter-Final'
    : s === 'sf' ? 'Semi-Final'
    : s === 'final' ? 'Final' : s;
}

export function clearFinishedCup(career) {
  if (career.carabaoCup && career.carabaoCup.stage === 'done') career.carabaoCup = null;
  if (career.faCup && career.faCup.stage === 'done') {
    career.faCup = null;
    // FA Cup is over → trigger Europe setup if a qualifier was deferred
    if (career._pendingEuropeQualifier && !career.europe) {
      const q = career._pendingEuropeQualifier;
      career._pendingEuropeQualifier = null;
      setupEuropeanCompetition(career, q);
      career.eventLog.push(`🌍 You start the ${euroLongName(q)} now!`);
    }
  }
}

// ============== EUROPEAN COMPETITIONS ==============

export function euroLongName(t) {
  return t === 'cl' ? 'Champions League'
    : t === 'el' ? 'Europa League'
    : t === 'confl' ? 'Conference League'
    : 'European Competition';
}

const EURO_TOTAL_TEAMS = 16;       // 4 groups of 4
const EURO_GROUPS = 4;

// Build group stage + initialize an active competition on the career.
export function setupEuropeanCompetition(career, type) {
  const me = myTeam(career);
  // Spot ranges per competition (zero-indexed within each country's top
  // division standings). CL takes top 4; EL takes 5th; ConfL takes 6th-7th.
  const ranges = { cl: [0, 4], el: [4, 5], confl: [5, 7] };
  const [lo, hi] = ranges[type] || ranges.cl;

  const qualifiers = [];
  for (const L of career.world.leagues) {
    if ((L.tier ?? 0) !== 0) continue;
    if (!EUROPE_COUNTRIES.has(L.countryId)) continue;
    // For the user's own league, use the real final standings; for the
    // rest, use team rating as a proxy for league finish.
    let ordered;
    if (L.id === career.leagueId) {
      const sorted = sortTable(career.table);
      ordered = sorted.map((row) => findTeam(career.world, row.teamId)).filter(Boolean);
    } else {
      ordered = L.teams.slice().sort((a, b) => teamRating(b) - teamRating(a));
    }
    for (let i = lo; i < hi && i < ordered.length; i++) {
      if (ordered[i] && ordered[i].id !== me.id) qualifiers.push(ordered[i]);
    }
  }
  // Make sure the user is in there too (in case they qualified)
  qualifiers.unshift(me);
  // Trim down or pad up to EURO_TOTAL_TEAMS
  qualifiers.sort((a, b) => teamRating(b) - teamRating(a));
  let chosen = qualifiers.filter((t) => t.id !== me.id).slice(0, EURO_TOTAL_TEAMS - 1);

  if (chosen.length < EURO_TOTAL_TEAMS - 1) {
    // Fall back: backfill from all top-division teams in Europe-eligible
    // countries.
    const backup = [];
    for (const L of career.world.leagues) {
      if ((L.tier ?? 0) !== 0) continue;
      if (!EUROPE_COUNTRIES.has(L.countryId)) continue;
      for (const t of L.teams) {
        if (t.id === me.id) continue;
        if (chosen.find((x) => x.id === t.id)) continue;
        backup.push(t);
      }
    }
    backup.sort((a, b) => teamRating(b) - teamRating(a));
    while (chosen.length < EURO_TOTAL_TEAMS - 1 && backup.length > 0) {
      chosen.push(backup.shift());
    }
  }
  // Shuffle and split into 4 groups of 4. User goes to group A position 0.
  shuffleInPlace(chosen);
  const groups = [];
  for (let g = 0; g < EURO_GROUPS; g++) {
    const groupTeams = [];
    if (g === 0) groupTeams.push(me.id);
    while (groupTeams.length < 4) {
      groupTeams.push(chosen.pop().id);
    }
    const fixtures = buildGroupFixtures(groupTeams);
    groups.push({
      id: String.fromCharCode(65 + g),                       // A, B, C, D
      teamIds: groupTeams,
      table: groupTeams.map((tid) => ({ teamId: tid, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 })),
      fixtures,                                              // [matchday][match]
      played: 0,
      results: [],
    });
  }

  career.europe = {
    type,
    stage: 'group',                                          // 'group' | 'r16' | 'qf' | 'sf' | 'final' | 'done'
    groups,
    knockout: { r16: null, qf: null, sf: null, final: null },
    myEliminated: false,
    champion: null,
    log: [`${euroLongName(type)} group stage begins.`],
  };
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 4-team group round-robin home + away = 6 matchdays.
// Each matchday has 2 games (each team plays once).
function buildGroupFixtures(teamIds) {
  const [a, b, c, d] = teamIds;
  // Single round-robin (3 matchdays)
  const single = [
    [{ home: a, away: b }, { home: c, away: d }],
    [{ home: a, away: c }, { home: d, away: b }],
    [{ home: a, away: d }, { home: b, away: c }],
  ];
  // Reverse leg
  const reverse = single.map((md) => md.map((m) => ({ home: m.away, away: m.home })));
  return [...single, ...reverse];
}

export function hasActiveEurope(career) {
  return !!(career.europe && career.europe.stage !== 'done');
}

// Returns details about the user's next European fixture (or null).
export function nextEuropeanMatchInfo(career) {
  if (!hasActiveEurope(career)) return null;
  const E = career.europe;
  if (E.stage === 'group') {
    const myGroup = E.groups.find((g) => g.teamIds.includes(career.teamId));
    if (!myGroup) return null;
    if (myGroup.played >= myGroup.fixtures.length) return null;
    const md = myGroup.fixtures[myGroup.played];
    const m = md.find((x) => x.home === career.teamId || x.away === career.teamId);
    if (!m) return null;
    const opp = findTeam(career.world, m.home === career.teamId ? m.away : m.home);
    return { stage: 'group', groupId: myGroup.id, matchday: myGroup.played + 1, opp,
      home: m.home === career.teamId };
  }
  // Knockout stages
  const tie = currentKnockoutTie(career);
  if (!tie) return null;
  const myTie = tie.tie;
  const nextLeg = myTie.legs.findIndex((l) => l.hs == null);
  if (nextLeg < 0) return null;
  const leg = myTie.legs[nextLeg];
  const opp = findTeam(career.world, leg.home === career.teamId ? leg.away : leg.home);
  return { stage: tie.stageKey, leg: nextLeg + 1, opp, home: leg.home === career.teamId };
}

// Find the user's current tie (if any) in the active knockout stage.
// Auto-play out the rest of the European tournament — used when the user
// has been knocked out but a click of "PLAY EUROPE MATCH" should still
// progress the bracket to a champion.
function autoFinishEurope(career) {
  const E = career.europe;
  if (!E) return;
  let safety = 12;
  while (E.stage !== 'done' && safety-- > 0) {
    const stageKey = E.stage;
    if (stageKey === 'group') break;          // shouldn't reach here
    const ties = E.knockout[stageKey];
    if (!ties) break;
    const isFinal = stageKey === 'final';
    for (const t of ties) {
      if (t.winnerId) continue;
      for (const leg of t.legs) {
        if (leg.hs == null) {
          const home = findTeam(career.world, leg.home);
          const away = findTeam(career.world, leg.away);
          const r = simulateMatch(home, away);
          leg.hs = r.hs; leg.as = r.as;
        }
      }
      t.winnerId = decideTieWinner(t, isFinal);
      const w = findTeam(career.world, t.winnerId);
      const lTeam = findTeam(career.world, t.winnerId === t.teamA ? t.teamB : t.teamA);
      E.log.push(`${stageLongName(stageKey)}: ${w.name} beat ${lTeam.name}.`);
    }
    advanceKnockout(career);
  }
  ageAndMorale(career);
}

function currentKnockoutTie(career) {
  const E = career.europe;
  const stageKey = E.stage;
  if (stageKey === 'group' || stageKey === 'done') return null;
  const ties = E.knockout[stageKey];
  if (!ties) return null;
  for (const t of ties) {
    if (t.winnerId) continue;
    if (t.teamA === career.teamId || t.teamB === career.teamId) {
      return { tie: t, stageKey };
    }
  }
  return null;
}

// User plays their next European match. All other matches happening
// concurrently are simulated as well so the stage progresses in sync.
// Returns { mine, all } similar to playWeek.
export function playEuropeanMatch(career) {
  if (!hasActiveEurope(career)) return null;
  const E = career.europe;
  if (E.stage === 'group') {
    const myGroup = E.groups.find((g) => g.teamIds.includes(career.teamId));
    if (!myGroup || myGroup.played >= myGroup.fixtures.length) return null;
    // Simulate this matchday for ALL groups so they stay in lockstep.
    let mine = null;
    for (const g of E.groups) {
      if (g.played >= g.fixtures.length) continue;
      const md = g.fixtures[g.played];
      for (const m of md) {
        const home = findTeam(career.world, m.home);
        const away = findTeam(career.world, m.away);
        const r = simulateMatch(home, away);
        m.hs = r.hs; m.as = r.as;
        applyGroupTableResult(g.table, m.home, m.away, r.hs, r.as);
        g.results.push({ matchday: g.played + 1, home: m.home, away: m.away, hs: r.hs, as: r.as });
        if (m.home === career.teamId || m.away === career.teamId) {
          mine = { stage: 'group', home, away, hs: r.hs, as: r.as,
            mine: m.home === career.teamId ? 'home' : 'away', leg: null };
        }
      }
      g.played++;
    }
    // Group stage done? Advance to QF.
    if (E.groups.every((g) => g.played >= g.fixtures.length)) {
      advanceGroupStageToQF(career);
    }
    ageAndMorale(career);
    return mine;
  }
  // Knockout
  const cur = currentKnockoutTie(career);
  if (!cur) {
    // User isn't in any unfinished tie — auto-play the rest of the
    // tournament so the bracket finishes and a champion is crowned.
    autoFinishEurope(career);
    return null;
  }
  const stageKey = cur.stageKey;
  const ties = E.knockout[stageKey];
  // Find the next-leg index across the round (legs progress together so
  // the user doesn't get out of sync).
  const legIdx = cur.tie.legs.findIndex((l) => l.hs == null);
  if (legIdx < 0) return null;
  let mine = null;
  for (const t of ties) {
    if (t.winnerId) continue;
    const leg = t.legs[legIdx];
    if (!leg || leg.hs != null) continue;
    const home = findTeam(career.world, leg.home);
    const away = findTeam(career.world, leg.away);
    const r = simulateMatch(home, away);
    leg.hs = r.hs; leg.as = r.as;
    if (leg.home === career.teamId || leg.away === career.teamId) {
      mine = { stage: stageKey, home, away, hs: r.hs, as: r.as,
        mine: leg.home === career.teamId ? 'home' : 'away', leg: legIdx + 1 };
    }
  }
  // For 2-legged ties, resolve winners only after the last leg.
  // Final is single-leg.
  const isFinal = stageKey === 'final';
  const allLegsDone = ties.every((t) => t.legs.every((l) => l.hs != null) || t.winnerId);
  if (allLegsDone) {
    for (const t of ties) {
      if (t.winnerId) continue;
      const winnerId = decideTieWinner(t, isFinal);
      t.winnerId = winnerId;
      const wTeam = findTeam(career.world, winnerId);
      const lTeam = findTeam(career.world, winnerId === t.teamA ? t.teamB : t.teamA);
      E.log.push(`${stageLongName(stageKey)}: ${wTeam.name} beat ${lTeam.name}.`);
      if (career.teamId === (winnerId === t.teamA ? t.teamB : t.teamA)) {
        career.eventLog.push(`You were knocked out of the ${euroLongName(E.type)} in the ${stageLongName(stageKey)}.`);
        E.myEliminated = true;
      }
    }
    advanceKnockout(career);
  }
  ageAndMorale(career);
  return mine;
}

function stageLongName(k) {
  return k === 'r16' ? 'Round of 16' : k === 'qf' ? 'Quarter-Final' : k === 'sf' ? 'Semi-Final' : k === 'final' ? 'Final' : k;
}

function applyGroupTableResult(table, homeId, awayId, hs, as_) {
  const rH = table.find((r) => r.teamId === homeId);
  const rA = table.find((r) => r.teamId === awayId);
  if (rH) {
    rH.P++; rH.GF += hs; rH.GA += as_; rH.GD = rH.GF - rH.GA;
    if (hs > as_) { rH.W++; rH.Pts += 3; }
    else if (hs === as_) { rH.D++; rH.Pts += 1; }
    else rH.L++;
  }
  if (rA) {
    rA.P++; rA.GF += as_; rA.GA += hs; rA.GD = rA.GF - rA.GA;
    if (as_ > hs) { rA.W++; rA.Pts += 3; }
    else if (as_ === hs) { rA.D++; rA.Pts += 1; }
    else rA.L++;
  }
}

function decideTieWinner(tie, isFinal) {
  // Aggregate goals; tiebreaker: away goals; else random.
  let aGoals = 0, bGoals = 0, aAway = 0, bAway = 0;
  for (const l of tie.legs) {
    if (l.home === tie.teamA) { aGoals += l.hs; bGoals += l.as; bAway += l.as; }
    else                       { bGoals += l.hs; aGoals += l.as; aAway += l.as; }
  }
  if (aGoals !== bGoals) return aGoals > bGoals ? tie.teamA : tie.teamB;
  if (isFinal) {
    // Final goes to penalties after one leg if level
    return Math.random() < 0.5 ? tie.teamA : tie.teamB;
  }
  if (aAway !== bAway) return aAway > bAway ? tie.teamA : tie.teamB;
  return Math.random() < 0.5 ? tie.teamA : tie.teamB;
}

function advanceGroupStageToQF(career) {
  const E = career.europe;
  // Take top 2 from each group → 8 teams → 4 QF ties.
  const advancing = [];
  for (const g of E.groups) {
    const sorted = sortTable(g.table);
    advancing.push({ groupId: g.id, first: sorted[0].teamId, second: sorted[1].teamId });
  }
  // Pair winners with runners-up from other groups: A1-B2, B1-A2, C1-D2, D1-C2.
  const pairs = [
    [advancing[0].first, advancing[1].second],
    [advancing[1].first, advancing[0].second],
    [advancing[2].first, advancing[3].second],
    [advancing[3].first, advancing[2].second],
  ];
  E.knockout.qf = pairs.map(([a, b]) => buildTwoLegTie(a, b));
  E.stage = 'qf';
  E.log.push('Group stage done. Quarter-finals drawn.');
  // Check user advanced
  const myAdv = advancing.find((a) => a.first === career.teamId || a.second === career.teamId);
  if (!myAdv) {
    E.myEliminated = true;
    career.eventLog.push(`You were eliminated from the ${euroLongName(E.type)} in the group stage.`);
  } else {
    career.eventLog.push(`You advanced from your group in the ${euroLongName(E.type)}!`);
  }
}

function buildTwoLegTie(teamA, teamB) {
  return {
    teamA, teamB,
    legs: [
      { home: teamA, away: teamB, hs: null, as: null },
      { home: teamB, away: teamA, hs: null, as: null },
    ],
    winnerId: null,
  };
}

function buildOneLegTie(teamA, teamB) {
  return {
    teamA, teamB,
    legs: [{ home: teamA, away: teamB, hs: null, as: null }],
    winnerId: null,
  };
}

function advanceKnockout(career) {
  const E = career.europe;
  if (E.stage === 'qf') {
    const winners = E.knockout.qf.map((t) => t.winnerId);
    E.knockout.sf = [
      buildTwoLegTie(winners[0], winners[2]),
      buildTwoLegTie(winners[1], winners[3]),
    ];
    E.stage = 'sf';
    E.log.push('Semi-finals drawn.');
    return;
  }
  if (E.stage === 'sf') {
    const winners = E.knockout.sf.map((t) => t.winnerId);
    E.knockout.final = [buildOneLegTie(winners[0], winners[1])];
    E.stage = 'final';
    E.log.push('Final set!');
    return;
  }
  if (E.stage === 'final') {
    const winnerId = E.knockout.final[0].winnerId;
    const w = findTeam(career.world, winnerId);
    E.champion = winnerId;
    E.stage = 'done';
    E.log.push(`${w.name} are the ${euroLongName(E.type)} champions!`);
    if (winnerId === career.teamId) {
      career.eventLog.push(`🏆 You won the ${euroLongName(E.type)}!`);
      career.trophies.push({ league: euroLongName(E.type), season: career.world.season - 1 });
    } else {
      career.eventLog.push(`${w.name} won the ${euroLongName(E.type)}.`);
    }
  }
}

export function clearFinishedEurope(career) {
  if (career.europe && career.europe.stage === 'done') {
    career.europe = null;
  }
}

// At the end of a season: the bottom 3 of each division swap with the top
// 3 of the division below it (same country). For the user's actual
// division we use the real standings; for the rest we use team ratings as
// a proxy for who'd have finished where.
const PROMOTE_COUNT = 3;

function applyPromotionRelegation(career, userStandings) {
  const byCountry = new Map();
  for (const L of career.world.leagues) {
    if (!byCountry.has(L.countryId)) byCountry.set(L.countryId, []);
    byCountry.get(L.countryId).push(L);
  }
  for (const list of byCountry.values()) list.sort((a, b) => a.tier - b.tier);

  for (const list of byCountry.values()) {
    for (let i = 0; i < list.length - 1; i++) {
      const upper = list[i];
      const lower = list[i + 1];
      const n = Math.min(PROMOTE_COUNT,
        Math.max(0, upper.teams.length - 1),
        Math.max(0, lower.teams.length - 1));
      if (n <= 0) continue;

      // Teams dropping from upper
      let drops;
      if (career.leagueId === upper.id) {
        drops = userStandings.slice(-n).map((r) => findTeam(career.world, r.teamId));
      } else {
        drops = pickBottom(upper, n);
      }
      // Teams rising from lower
      let rises;
      if (career.leagueId === lower.id) {
        rises = userStandings.slice(0, n).map((r) => findTeam(career.world, r.teamId));
      } else {
        rises = pickTop(lower, n);
      }

      for (let k = 0; k < n; k++) {
        const drop = drops[k];
        const rise = rises[k];
        if (!drop || !rise) continue;
        moveTeamToLeague(career.world, drop, lower.id, false);
        moveTeamToLeague(career.world, rise, upper.id, false);
        career.eventLog.push(
          `↓ ${drop.name} relegated to ${lower.name}.  ↑ ${rise.name} promoted to ${upper.name}.`
        );
      }
    }
  }
}

function pickTop(league, n) {
  return league.teams.slice().sort((a, b) => teamRating(b) - teamRating(a)).slice(0, n);
}
function pickBottom(league, n) {
  return league.teams.slice().sort((a, b) => teamRating(a) - teamRating(b)).slice(0, n);
}
