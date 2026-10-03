import { COUNTRIES, formatMoney, teamRating, newYouthPlayer } from './data.js';
import {
  newCareer, saveCareer, loadCareer, deleteCareer,
  findTeam, findLeague, myTeam, playWeek, trainPlayer,
  promoteYouth,
  openBuyNegotiation, openSellNegotiation,
  submitNegotiationOffer, acceptCurrentNegotiation, completeTransfer,
  isSeasonOver, endSeason, sortTable, tableZone,
  hasActiveEurope, nextEuropeanMatchInfo, playEuropeanMatch, clearFinishedEurope,
  hasActivePlayoff, nextPlayoffMatchInfo, playPlayoffMatch, clearFinishedPlayoff,
  euroLongName, applyTrainingFromMinigame, applyDrillTraining,
  applyMatchTraining,
  isAvailable, injurePlayer, suspendPlayer,
  hasActiveCup, activeCup, nextCupMatchInfo, playCupMatch, clearFinishedCup,
  cupStageName,
  maybeRestockScoutShop, scoutShopMsLeft,
  hireScout, scoutSearch, scoutSearchFee, fireScout,
} from './game.js';
import { showTrainingMinigame } from './training.js';
import { startMatchTraining } from './match3d.js';

const C = {
  bg: '#0a0f1c',
  panel: '#111a2f',
  panel2: '#1b2745',
  border: '#2d3a5e',
  text: '#e6ecff',
  dim: '#8a9bc7',
  accent: '#48ffaf',
  warn: '#ffab40',
  danger: '#ff5252',
  // Zone tints for the league table
  zoneCL:        'rgba(72,255,175,0.18)',    // green — Champions League / promoted
  zoneEL:        'rgba(72,160,255,0.18)',    // blue  — Europa League
  zoneConfL:     'rgba(179,136,255,0.18)',   // purple — Conference League
  zonePromoted:  'rgba(72,255,175,0.18)',
  zonePlayoff:   'rgba(255,213,79,0.18)',    // yellow — promotion playoff
  zoneRelegated: 'rgba(255,82,82,0.18)',
};

function zoneBg(zone) {
  if (zone === 'cl' || zone === 'promoted') return C.zoneCL;
  if (zone === 'el') return C.zoneEL;
  if (zone === 'confl') return C.zoneConfL;
  if (zone === 'playoff') return C.zonePlayoff;
  if (zone === 'relegated') return C.zoneRelegated;
  return null;
}

function zoneLabel(zone) {
  return zone === 'cl' ? 'CL' : zone === 'el' ? 'EL' : zone === 'confl' ? 'ConfL'
    : zone === 'promoted' ? '↑' : zone === 'playoff' ? 'PO'
    : zone === 'relegated' ? '↓' : '';
}

function el(tag, css, text) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  return e;
}

// Mounts the full Manager Career UI on document.body and returns a destroy() handle.
export function createManagerUI({ username, onBack }) {
  let career = loadCareer(username);
  // Old saves used a flat LEAGUES list without country pyramids. Detect
  // them and discard so the user starts fresh on the new world.
  if (career && career.world && career.world.leagues && career.world.leagues[0]
      && career.world.leagues[0].countryId === undefined) {
    career = null;
    deleteCareer(username);
  }

  const root = el('div', `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh; z-index: 9000;
    background: ${C.bg}; color: ${C.text};
    font-family: system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; overflow: hidden;
    margin: 0; padding: 0;
  `);
  document.body.appendChild(root);

  // Inject the float-up animation once.
  if (!document.getElementById('cc-manager-anim')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'cc-manager-anim';
    styleEl.textContent = `
      @keyframes cc-float-up {
        0%   { transform: translate(6px, -50%);   opacity: 0; }
        15%  { transform: translate(6px, -90%);   opacity: 1; }
        100% { transform: translate(6px, -260%);  opacity: 0; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Top bar
  const top = el('div', `
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; background: ${C.panel}; border-bottom: 1px solid ${C.border};
  `);
  root.appendChild(top);

  const backBtn = button('← BACK', C.warn);
  backBtn.addEventListener('click', () => { if (onBack) onBack(); });
  top.appendChild(backBtn);

  const title = el('div', 'font-weight: 900; font-size: 16px; letter-spacing: 2px;', 'MANAGER CAREER');
  top.appendChild(title);

  const spacer = el('div', 'flex: 1;');
  top.appendChild(spacer);

  const status = el('div', `font-size: 12px; color: ${C.dim};`);
  top.appendChild(status);

  const newBtn = button('NEW CAREER', C.danger);
  newBtn.addEventListener('click', () => {
    if (career && !confirm('Start a new career? Your current save will be lost.')) return;
    career = null;
    deleteCareer(username);
    render();
  });
  top.appendChild(newBtn);

  // Tab bar (only shown when in-career)
  const tabsBar = el('div', `
    display: none; gap: 4px; padding: 6px 12px;
    background: ${C.panel}; border-bottom: 1px solid ${C.border};
  `);
  root.appendChild(tabsBar);

  const body = el('div', `flex: 1; overflow: auto; padding: 16px;`);
  root.appendChild(body);

  let activeTab = 'home';
  function activeTabs() {
    const tabs = [
      { id: 'home',     name: 'Home' },
      { id: 'squad',    name: 'Squad' },
      { id: 'youth',    name: 'Youth' },
      { id: 'table',    name: 'Table' },
      { id: 'fixtures', name: 'Fixtures' },
      { id: 'transfer', name: 'Transfers' },
      { id: 'train',    name: 'Training' },
      { id: 'trophies', name: 'Trophies' },
    ];
    if (career && hasActiveEurope(career)) {
      tabs.splice(4, 0, { id: 'europe', name: 'Europe' });
    }
    if (career && hasActivePlayoff(career)) {
      tabs.splice(4, 0, { id: 'playoff', name: 'Playoff' });
    }
    if (career && hasActiveCup(career)) {
      const ac = activeCup(career);
      tabs.splice(4, 0, { id: 'cup', name: ac.cup.name.split(' ')[0] });
    }
    return tabs;
  }

  function setTab(id) { activeTab = id; render(); }

  function render() {
    tabsBar.innerHTML = '';
    body.innerHTML = '';
    if (!career) { renderTeamPicker(); return; }
    // Backfill youth squads on saves made before the youth system existed
    let migrated = false;
    for (const L of career.world.leagues) {
      for (const t of L.teams) {
        if (!t.youth) {
          t.youth = Array.from({ length: 8 }, () => newYouthPlayer(70));
          migrated = true;
        }
      }
    }
    if (migrated) saveCareer(career);
    tabsBar.style.display = 'flex';
    const tabs = activeTabs();
    if (!tabs.find((t) => t.id === activeTab)) activeTab = 'home';
    for (const t of tabs) {
      const b = el('button', `
        background: ${activeTab === t.id ? C.accent : C.panel2};
        color: ${activeTab === t.id ? '#0a0a1a' : C.text};
        border: 1px solid ${C.border}; border-radius: 6px;
        padding: 6px 12px; font-weight: 800; font-size: 12px;
        letter-spacing: 1px; cursor: pointer;
      `, t.name);
      b.addEventListener('click', () => setTab(t.id));
      tabsBar.appendChild(b);
    }

    const me = myTeam(career);
    status.textContent = `${me.name} • Season ${career.world.season} • Week ${career.week}/${career.fixtures.length} • ${formatMoney(me.budget)}`;

    if (activeTab === 'home') renderHome();
    else if (activeTab === 'squad') renderSquad();
    else if (activeTab === 'youth') renderYouth();
    else if (activeTab === 'europe') renderEurope();
    else if (activeTab === 'playoff') renderPlayoff();
    else if (activeTab === 'cup') renderCup();
    else if (activeTab === 'table') renderTable();
    else if (activeTab === 'fixtures') renderFixtures();
    else if (activeTab === 'transfer') renderTransfers();
    else if (activeTab === 'train') renderTraining();
    else if (activeTab === 'trophies') renderTrophies();
  }

  // ---------- Team picker ----------
  function renderTeamPicker() {
    tabsBar.style.display = 'none';
    status.textContent = '';
    renderCountryPicker();
  }

  // Three-step pick: country → team → starting division.
  let pickerStep = { stage: 'country', country: null, team: null };

  function renderCountryPicker() {
    pickerStep = { stage: 'country', country: null, team: null };
    body.innerHTML = '';
    const wrap = el('div', 'width: 100%; max-width: 1100px; margin: 0 auto;');
    body.appendChild(wrap);
    wrap.appendChild(pickerIntro('Pick a country', 'Choose where you want to manage. Each country has its own pyramid of divisions.'));

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;
    `);
    wrap.appendChild(grid);
    for (const country of COUNTRIES) {
      const card = el('button', `
        text-align: left; cursor: pointer;
        background: ${C.panel}; color: ${C.text};
        border: 2px solid ${C.border}; border-radius: 10px;
        padding: 14px; display: flex; align-items: center; gap: 10px;
      `);
      const flag = el('div', `
        width: 12px; height: 36px; background: ${country.flag}; border-radius: 3px;
      `);
      card.appendChild(flag);
      const info = el('div', 'flex: 1;');
      info.appendChild(el('div', 'font-weight: 800; font-size: 16px;', country.name));
      info.appendChild(el('div', `font-size: 11px; color: ${C.dim};`,
        `${country.divisions.length} division${country.divisions.length === 1 ? '' : 's'} • ${country.divisions[0].name}`));
      card.appendChild(info);
      card.addEventListener('mouseover', () => card.style.borderColor = C.accent);
      card.addEventListener('mouseout',  () => card.style.borderColor = C.border);
      card.addEventListener('click', () => {
        pickerStep.country = country;
        renderTeamPickerFor(country);
      });
      grid.appendChild(card);
    }
  }

  function renderTeamPickerFor(country) {
    pickerStep = { stage: 'team', country, team: null };
    body.innerHTML = '';
    const wrap = el('div', 'width: 100%; max-width: 1100px; margin: 0 auto;');
    body.appendChild(wrap);

    const backRow = el('div', 'margin-bottom: 10px;');
    const backBtn = button('← Back to countries', C.dim);
    backBtn.addEventListener('click', renderCountryPicker);
    backRow.appendChild(backBtn);
    wrap.appendChild(backRow);

    wrap.appendChild(pickerIntro(`Pick a club in ${country.name}`,
      'Clubs are shown in their natural division. After you pick one, you choose which division to start in.'));

    for (const D of country.divisions) {
      const sec = el('div', `
        margin-bottom: 14px; background: ${C.panel}; border: 1px solid ${C.border};
        border-radius: 10px; padding: 12px;
      `);
      const head = el('div', 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;');
      head.appendChild(el('div', `width: 8px; height: 24px; background: ${D.accent}; border-radius: 2px;`));
      head.appendChild(el('div', `font-weight: 800; font-size: 14px;`, D.name));
      head.appendChild(el('div', `font-size: 11px; color: ${C.dim};`, `Tier ${D.tier + 1}`));
      sec.appendChild(head);

      const grid = el('div', `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px;
      `);
      sec.appendChild(grid);
      for (let idx = 0; idx < D.teams.length; idx++) {
        const tn = D.teams[idx];
        const tBtn = el('button', `
          background: ${C.panel2}; color: ${C.text};
          border: 1px solid ${C.border}; border-radius: 6px;
          padding: 8px 10px; font-size: 12px; text-align: left;
          cursor: pointer; font-weight: 700;
        `, tn);
        tBtn.addEventListener('mouseover', () => tBtn.style.borderColor = D.accent);
        tBtn.addEventListener('mouseout',  () => tBtn.style.borderColor = C.border);
        tBtn.addEventListener('click', () => {
          renderDivisionPickerFor(country, { name: tn, naturalDivision: D, naturalIndex: idx });
        });
        grid.appendChild(tBtn);
      }
      wrap.appendChild(sec);
    }
  }

  function renderDivisionPickerFor(country, team) {
    pickerStep = { stage: 'division', country, team };
    body.innerHTML = '';
    const wrap = el('div', 'width: 100%; max-width: 1100px; margin: 0 auto;');
    body.appendChild(wrap);

    const backRow = el('div', 'margin-bottom: 10px;');
    const backBtn = button(`← Back to ${country.name} clubs`, C.dim);
    backBtn.addEventListener('click', () => renderTeamPickerFor(country));
    backRow.appendChild(backBtn);
    wrap.appendChild(backRow);

    wrap.appendChild(pickerIntro(`Where will ${team.name} start?`,
      `Their natural division is ${team.naturalDivision.name}. Pick a higher division and you'll be in for a beating; pick a lower one and ${team.name}'s squad rating will drop to match that division.`));

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;
    `);
    wrap.appendChild(grid);

    for (const D of country.divisions) {
      const isNatural = D.id === team.naturalDivision.id;
      const isLower = D.tier > team.naturalDivision.tier;
      const tag = isNatural ? 'NATURAL' : isLower ? `↓ Drop to tier ${D.tier + 1}` : `↑ Climb to tier ${D.tier + 1}`;
      const tagColor = isNatural ? C.accent : isLower ? C.warn : '#48a0ff';
      const card = el('button', `
        text-align: left; cursor: pointer;
        background: ${C.panel}; color: ${C.text};
        border: 2px solid ${C.border}; border-radius: 10px;
        padding: 14px; display: flex; flex-direction: column; gap: 6px;
      `);
      card.appendChild(el('div', `font-weight: 800; font-size: 16px;`, D.name));
      card.appendChild(el('div', `font-size: 11px; color: ${tagColor}; letter-spacing: 1px;`, tag));
      card.appendChild(el('div', `font-size: 11px; color: ${C.dim};`,
        `Budget at this tier: ~${formatMoney(estimateTierBudget(D.tier))}`));
      if (isLower) {
        card.appendChild(el('div', `font-size: 11px; color: ${C.warn};`,
          `${team.name}'s squad will be rebuilt to match the worst team here.`));
      }
      card.addEventListener('mouseover', () => card.style.borderColor = tagColor);
      card.addEventListener('mouseout',  () => card.style.borderColor = C.border);
      card.addEventListener('click', () => {
        const teamId = team.naturalDivision.id + ':' + team.naturalIndex;
        career = newCareer(username, teamId, D.id);
        saveCareer(career);
        activeTab = 'home';
        render();
      });
      grid.appendChild(card);
    }
  }

  function pickerIntro(title, desc) {
    const intro = el('div', `
      padding: 16px; background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; margin-bottom: 16px;
    `);
    intro.appendChild(el('div', 'font-size: 20px; font-weight: 900; margin-bottom: 4px;', title));
    intro.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, desc));
    return intro;
  }

  function estimateTierBudget(tier) {
    return [100_000_000, 25_000_000, 6_000_000, 2_000_000][Math.max(0, Math.min(3, tier))];
  }

  // ---------- Home (dashboard) ----------
  function renderHome() {
    const me = myTeam(career);
    const lg = findLeague(career.world, career.leagueId);
    const rating = teamRating(me);
    const pos = positionInTable(career);

    const head = el('div', `
      display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 16px;
    `);
    body.appendChild(head);

    const card = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 16px;
    `);
    card.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, 'YOUR CLUB'));
    card.appendChild(el('div', 'font-size: 26px; font-weight: 900; margin: 4px 0;', me.name));
    card.appendChild(el('div', `font-size: 12px; color: ${C.dim}; margin-bottom: 10px;`,
      `${lg.name} • ${lg.country}`));
    const stats = el('div', 'display: flex; gap: 18px;');
    stats.appendChild(stat('Team Rating', String(rating), C.accent));
    stats.appendChild(stat('Budget', formatMoney(me.budget), C.warn));
    stats.appendChild(stat('League Pos', pos || '—', C.accent));
    stats.appendChild(stat('Squad Size', String(me.squad.length), C.dim));
    card.appendChild(stats);
    head.appendChild(card);

    const right = el('div', 'display: flex; flex-direction: column; gap: 10px;');
    head.appendChild(right);
    const nextFx = career.fixtures[career.week];
    if (nextFx) {
      const myMatch = nextFx.find((m) => m.home === career.teamId || m.away === career.teamId);
      if (myMatch) {
        const opp = findTeam(career.world, myMatch.home === career.teamId ? myMatch.away : myMatch.home);
        const isHome = myMatch.home === career.teamId;
        const matchCard = el('div', `
          background: ${C.panel}; border: 1px solid ${C.border};
          border-radius: 10px; padding: 14px;
        `);
        matchCard.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, 'NEXT MATCH'));
        matchCard.appendChild(el('div', 'font-size: 16px; font-weight: 800; margin: 6px 0;',
          isHome ? `${me.name} vs ${opp.name}` : `${opp.name} vs ${me.name}`));
        matchCard.appendChild(el('div', `font-size: 11px; color: ${C.dim};`,
          `Opp rating: ${teamRating(opp)} • ${isHome ? 'Home' : 'Away'}`));
        right.appendChild(matchCard);
      }
    }

    // Decide which kind of match the play button triggers (priority order:
    // playoff > FA Cup > europe > Carabao > end-of-season > league).
    const playoffActive = hasActivePlayoff(career);
    const faCupActive = !!(career.faCup && career.faCup.stage !== 'done');
    const euroActive = hasActiveEurope(career);
    const carabaoActive = !!(career.carabaoCup && career.carabaoCup.stage !== 'done');
    let label;
    if (playoffActive) label = 'PLAY PLAYOFF MATCH';
    else if (faCupActive) label = 'PLAY FA CUP MATCH';
    else if (euroActive) label = `PLAY ${euroLongName(career.europe.type).toUpperCase()} MATCH`;
    else if (carabaoActive) label = 'PLAY CARABAO MATCH';
    else label = isSeasonOver(career) ? 'END OF SEASON' : 'PLAY NEXT MATCH';
    const playBtn = button(label, C.accent, true);
    playBtn.style.fontSize = '14px';
    playBtn.style.padding = '14px';
    playBtn.addEventListener('click', () => {
      if (playoffActive) {
        const r = playPlayoffMatch(career);
        saveCareer(career);
        if (r) showMatchResultModal(r); else render();
        if (career.playoff && career.playoff.stage === 'done') clearFinishedPlayoff(career);
        return;
      }
      if (faCupActive) {
        const r = playCupMatch(career);
        saveCareer(career);
        if (r) showMatchResultModal(r); else render();
        clearFinishedCup(career);
        saveCareer(career);
        return;
      }
      if (euroActive) {
        const result = playEuropeanMatch(career);
        saveCareer(career);
        if (result) showMatchResultModal(result); else render();
        if (career.europe && career.europe.stage === 'done') clearFinishedEurope(career);
        return;
      }
      if (carabaoActive) {
        const r = playCupMatch(career);
        saveCareer(career);
        if (r) showMatchResultModal(r); else render();
        clearFinishedCup(career);
        saveCareer(career);
        return;
      }
      if (isSeasonOver(career)) {
        endSeason(career);
        saveCareer(career);
        render();
        return;
      }
      // Find this week's opponent so the picker knows who you're playing
      const fx = career.fixtures[career.week];
      const myMatch = fx && fx.find((m) => m.home === career.teamId || m.away === career.teamId);
      const opp = myMatch ? findTeam(career.world, myMatch.home === career.teamId ? myMatch.away : myMatch.home) : null;
      const isHomeMatch = myMatch && myMatch.home === career.teamId;
      showLineupPicker(opp, isHomeMatch, (lineup) => {
        const result = playWeek(career);
        saveCareer(career);
        if (result && result.myResult) {
          result.myResult._lineup = lineup;
          showMatchResultModal(result.myResult);
        } else render();
      });
    });
    right.appendChild(playBtn);

    const log = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
      padding: 14px; max-height: 240px; overflow: auto;
    `);
    log.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 8px;`, 'NEWS'));
    const recent = career.eventLog.slice(-30).reverse();
    if (recent.length === 0) {
      log.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, 'No news yet.'));
    } else {
      for (const line of recent) {
        log.appendChild(el('div', `font-size: 13px; margin: 4px 0;`, line));
      }
    }
    body.appendChild(log);
  }

  function stat(label, val, color) {
    const w = el('div', '');
    w.appendChild(el('div', `font-size: 10px; color: ${C.dim}; letter-spacing: 1px;`, label.toUpperCase()));
    w.appendChild(el('div', `font-size: 20px; font-weight: 900; color: ${color};`, val));
    return w;
  }

  // Plays a "simulated" match scoreboard before showing the result modal.
  // Black screen, big score in the middle, clock advances rapidly. Used
  // for EVERY user match — league, FA Cup, Carabao, Europe, playoff.
  function showMatchResultModal(myResult) {
    if (!myResult) return;
    // If no lineup was supplied (tournament match), auto-pick the best XI
    // so the playback can name scorers, cards, etc.
    if (!myResult._lineup) myResult._lineup = pickAutoLineup(career);
    playSimulatedMatch(myResult, () => showVerdictModal(myResult));
  }

  // ---------- Pre-match lineup picker ----------
  // Auto-picks the strongest available 11 in a 1 GK / 4 DEF / 3 MID / 3 FWD
  // formation. User can swap any slot via dropdowns of available players.
  function pickAutoLineup(career) {
    const me = myTeam(career);
    const pool = [...me.squad, ...(me.youth || [])].filter((p) => isAvailable(p));
    function pickN(pos, n) {
      return pool.filter((p) => p.pos === pos)
        .sort((a, b) => b.rating - a.rating).slice(0, n);
    }
    const lineup = [...pickN('GK', 1), ...pickN('DEF', 4), ...pickN('MID', 3), ...pickN('FWD', 3)];
    const used = new Set(lineup.map((p) => p.id));
    if (lineup.length < 11) {
      const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - a.rating);
      while (lineup.length < 11 && rest.length > 0) lineup.push(rest.shift());
    }
    return lineup.slice(0, 11);
  }

  function showLineupPicker(opp, isHomeMatch, onConfirm) {
    const me = myTeam(career);
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 18px 22px; width: 600px; max-width: 96vw;
      max-height: 90vh; overflow: auto;
    `);
    overlay.appendChild(box);

    box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, 'PRE-MATCH LINEUP'));
    box.appendChild(el('div', 'font-size: 18px; font-weight: 800; margin: 4px 0 4px;',
      opp ? (isHomeMatch ? `${me.name} vs ${opp.name}` : `${opp.name} vs ${me.name}`) : me.name));
    if (opp) {
      box.appendChild(el('div', `font-size: 12px; color: ${C.dim}; margin-bottom: 10px;`,
        `Opp rating: ${teamRating(opp)} • ${isHomeMatch ? 'Home' : 'Away'}`));
    }

    let lineup = pickAutoLineup(career);
    const allAvailable = [...me.squad, ...(me.youth || [])].filter((p) => isAvailable(p));

    // Show injured/suspended counts
    const unavailable = [...me.squad, ...(me.youth || [])].filter((p) => !isAvailable(p));
    if (unavailable.length > 0) {
      const u = el('div', `
        background: rgba(255,82,82,0.08); border: 1px solid rgba(255,82,82,0.3);
        border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;
        font-size: 11px; color: #ff8a80;
      `);
      const lines = unavailable.map((p) => {
        if ((p.injuryWeeksLeft || 0) > 0) return `${p.name} — injured (${p.injuryWeeksLeft}w)`;
        return `${p.name} — suspended (${p.suspendMatchesLeft})`;
      });
      u.textContent = 'Out: ' + lines.join(' • ');
      box.appendChild(u);
    }

    const list = el('div', 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;');
    box.appendChild(list);

    function renderList() {
      list.innerHTML = '';
      for (let i = 0; i < lineup.length; i++) {
        const p = lineup[i];
        const row = el('div', `
          display: flex; align-items: center; gap: 8px; padding: 5px 10px;
          background: ${C.panel2}; border-radius: 6px; font-size: 12px;
        `);
        row.appendChild(el('div', `font-weight: 800; color: ${posColor(p.pos)}; min-width: 36px;`, p.pos));
        row.appendChild(el('div', 'flex: 1; font-weight: 800;', p.name));
        row.appendChild(el('div', `color: ${ratingColor(p.rating)}; font-weight: 800; min-width: 30px; text-align: right;`, String(p.rating)));
        const sel = document.createElement('select');
        sel.style.cssText = `
          background: ${C.bg}; color: ${C.text}; border: 1px solid ${C.border};
          padding: 3px 6px; border-radius: 4px; font-size: 11px; max-width: 200px;
        `;
        const opt0 = document.createElement('option');
        opt0.textContent = 'Swap…'; opt0.value = ''; sel.appendChild(opt0);
        for (const cand of allAvailable) {
          if (lineup.find((x) => x.id === cand.id)) continue;
          const o = document.createElement('option'); o.value = cand.id;
          o.textContent = `${cand.pos}  ${cand.name}  (${cand.rating})`;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
          const newP = allAvailable.find((x) => x.id === sel.value);
          if (newP) { lineup[i] = newP; renderList(); }
        });
        row.appendChild(sel);
        list.appendChild(row);
      }
    }
    renderList();

    const btnRow = el('div', 'display: flex; gap: 8px; justify-content: flex-end;');
    box.appendChild(btnRow);
    const cancelBtn = button('CANCEL', C.danger);
    cancelBtn.addEventListener('click', () => overlay.remove());
    btnRow.appendChild(cancelBtn);
    const playBtn = button('PLAY MATCH', C.accent, true);
    playBtn.addEventListener('click', () => {
      if (lineup.length < 11) { alert('Not enough available players for a full XI.'); return; }
      overlay.remove();
      onConfirm(lineup);
    });
    btnRow.appendChild(playBtn);
  }

  // ---------- Simulated match playback ----------
  // Smooth ticking clock (configurable). Pre-generates a timeline of events
  // (cards, fouls, offsides, penalties, injuries, etc.) and applies them
  // as the clock catches up. Side effects (injuries, suspensions) are
  // applied to the user's actual squad records.
  function playSimulatedMatch(myResult, onDone) {
    const lineup = myResult._lineup || [];
    const me = myTeam(career);
    const subsPool = [...me.squad, ...(me.youth || [])]
      .filter((p) => isAvailable(p) && !lineup.find((x) => x.id === p.id));

    const overlay = el('div', `
      position: fixed; inset: 0; background: #000; z-index: 10000;
      display: flex; flex-direction: row; color: #fff;
      font-family: system-ui, sans-serif;
    `);
    root.appendChild(overlay);

    // Left: events log (1/4 of the screen, full height)
    const logPanel = el('div', `
      width: 25%; min-width: 240px; height: 100%;
      background: #0a0a0a; border-right: 2px solid #2d3a5e;
      display: flex; flex-direction: column;
    `);
    overlay.appendChild(logPanel);
    const logHeader = el('div', `
      padding: 14px 16px; background: #111a2f;
      font-size: 13px; font-weight: 800; color: #ffd54f;
      letter-spacing: 2px; border-bottom: 1px solid #2d3a5e;
    `, 'MATCH EVENTS');
    logPanel.appendChild(logHeader);
    const log = el('div', `
      flex: 1; overflow-y: auto;
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px 14px; font-size: 13px;
    `);
    logPanel.appendChild(log);

    // Right: scoreboard (3/4 of the screen)
    const main = el('div', `
      flex: 1; height: 100%;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; position: relative;
    `);
    overlay.appendChild(main);

    const clockEl = el('div', `
      position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
      font-size: 72px; font-weight: 900;
      letter-spacing: 4px; color: #ffd54f;
      font-variant-numeric: tabular-nums;
    `, '0:00');
    main.appendChild(clockEl);

    const scoreRow = el('div', `
      display: flex; align-items: center; gap: 24px;
      font-size: 64px; font-weight: 900;
    `);
    main.appendChild(scoreRow);
    scoreRow.appendChild(el('div', 'min-width: 260px; text-align: right; font-size: 30px;', myResult.home.name));
    const sH = el('div', 'color: #48ffaf; min-width: 80px; text-align: center; font-size: 96px;', '0');
    scoreRow.appendChild(sH);
    scoreRow.appendChild(el('div', 'opacity: 0.4;', '–'));
    const sA = el('div', 'color: #48ffaf; min-width: 80px; text-align: center; font-size: 96px;', '0');
    scoreRow.appendChild(sA);
    scoreRow.appendChild(el('div', 'min-width: 260px; text-align: left; font-size: 30px;', myResult.away.name));

    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'SKIP';
    skipBtn.style.cssText = `
      position: absolute; top: 30px; right: 30px;
      background: transparent; color: #ffab40; border: 1.5px solid #ffab40;
      padding: 6px 14px; border-radius: 6px; font-weight: 800; cursor: pointer;
      font-family: system-ui, sans-serif;
    `;
    main.appendChild(skipBtn);

    // ---- Build timeline ----
    const userIsHome = myResult.mine === 'home';
    const myTeamObj = userIsHome ? myResult.home : myResult.away;
    const oppTeamObj = userIsHome ? myResult.away : myResult.home;

    function randomLineupPlayer() {
      if (lineup.length === 0) return { name: 'Unknown', id: null };
      return lineup[Math.floor(Math.random() * lineup.length)];
    }
    function oppName() { return oppTeamObj.name; }

    const events = [];
    const totalGoalsHome = myResult.hs;
    const totalGoalsAway = myResult.as;
    function rmin() { return 1 + Math.floor(Math.random() * 89); }
    function add(minute, kind) { events.push({ minute, ...kind }); }

    for (let i = 0; i < totalGoalsHome; i++) {
      add(rmin(), { type: 'goal', side: 'home', isMine: userIsHome });
    }
    for (let i = 0; i < totalGoalsAway; i++) {
      add(rmin(), { type: 'goal', side: 'away', isMine: !userIsHome });
    }
    // Yellows: 2-5 spread across the match, roughly half on each side
    const yellows = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < yellows; i++) add(rmin(), { type: 'yellow', isMine: Math.random() < 0.5 });
    // Red card: ~12% per match
    if (Math.random() < 0.12) add(rmin(), { type: 'red', isMine: Math.random() < 0.5 });
    // Fouls
    const fouls = 12 + Math.floor(Math.random() * 14);
    for (let i = 0; i < fouls; i++) add(rmin(), { type: 'foul', isMine: Math.random() < 0.5 });
    // Offsides
    const offsides = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < offsides; i++) add(rmin(), { type: 'offside', isMine: Math.random() < 0.5 });
    // Missed shots
    const misses = 4 + Math.floor(Math.random() * 8);
    for (let i = 0; i < misses; i++) add(rmin(), { type: 'miss', isMine: Math.random() < 0.5 });
    // Missed penalty: ~12% per match. Doesn't affect the score so it can
    // stand on its own.
    if (Math.random() < 0.12) {
      const isMine = Math.random() < 0.5;
      add(rmin(), { type: 'penaltyMiss', isMine });
    }
    // Scored penalty: flag a real goal as "via penalty" so the score
    // counter actually moves when the line is shown.
    if (events.some((e) => e.type === 'goal') && Math.random() < 0.35) {
      const goalEvents = events.filter((e) => e.type === 'goal');
      const pick = goalEvents[Math.floor(Math.random() * goalEvents.length)];
      pick.viaPenalty = true;
    }
    // Injury: ~25% per match
    if (Math.random() < 0.25) {
      const isMine = Math.random() < 0.5;
      add(rmin(), { type: 'injury', isMine, weeks: 1 + Math.floor(Math.random() * 12) });
    }
    // Own goal flag: 4% of goals
    for (const ev of events) if (ev.type === 'goal' && Math.random() < 0.04) ev.ownGoal = true;
    events.sort((a, b) => a.minute - b.minute);

    // Track which players are still on the pitch (for sub on red)
    let active = lineup.slice();

    // ---- Smooth tick ----
    let clock = 0;            // game seconds
    const SPEED = 300;        // 300 game seconds per real second (10 game minutes per 2 real sec)
    const TOTAL = 90 * 60;
    let raf = 0;
    let last = performance.now();
    let ended = false;
    let homeScore = 0, awayScore = 0;

    function flashScore(node) {
      node.style.transition = 'transform 0.15s';
      node.style.transform = 'scale(1.4)';
      setTimeout(() => { node.style.transform = 'scale(1)'; }, 200);
    }

    function logLine(text, color) {
      const line = el('div', `color: ${color}; font-weight: 700; padding: 4px 6px; border-radius: 4px; background: rgba(255,255,255,0.04);`, text);
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }

    function applyEvent(ev) {
      const minute = ev.minute;
      const sideName = ev.isMine ? myTeamObj.name : oppName();
      const playerName = ev.isMine ? randomLineupPlayer().name : null;
      const who = playerName ? `${playerName} (${sideName})` : sideName;
      switch (ev.type) {
        case 'goal': {
          if (ev.side === 'home') { homeScore++; sH.textContent = String(homeScore); flashScore(sH); }
          else                     { awayScore++; sA.textContent = String(awayScore); flashScore(sA); }
          const tag = ev.ownGoal ? ' (own goal)' : '';
          const icon = ev.viaPenalty ? '🎯' : '⚽';
          const penText = ev.viaPenalty ? 'Penalty SCORED' : null;
          let text;
          if (ev.isMine && !ev.ownGoal) {
            const scorer = randomLineupPlayer();
            let assister = randomLineupPlayer();
            if (assister.id === scorer.id && lineup.length > 1) {
              assister = lineup.find((p) => p.id !== scorer.id) || assister;
            }
            if (penText) {
              text = `${minute}'  ${icon} ${penText} — ${scorer.name}${tag}`;
            } else {
              text = `${minute}'  ${icon}  ${scorer.name}${tag}  •  assist ${assister.name}`;
            }
          } else {
            text = penText
              ? `${minute}'  ${icon} ${penText} — ${sideName}${tag}`
              : `${minute}'  ${icon}  ${sideName}${tag}`;
          }
          logLine(text, ev.side === (userIsHome ? 'home' : 'away') ? '#48ffaf' : '#ff8a80');
          break;
        }
        case 'yellow':
          logLine(`${minute}'  🟨 Yellow card  —  ${who}`, '#ffd54f');
          break;
        case 'red': {
          logLine(`${minute}'  🟥 Red card  —  ${who}`, '#ff5252');
          if (ev.isMine && playerName) {
            // Find the actual player object in the lineup and apply consequence
            const idx = active.findIndex((p) => p.name === playerName);
            if (idx >= 0) {
              const off = active[idx];
              // Suspend them 1 match
              suspendPlayer(off, 1);
              // Auto-substitute from bench
              if (subsPool.length > 0) {
                const sub = subsPool.shift();
                active[idx] = sub;
                logLine(`${minute}'  🔁 Sub  —  ${sub.name} comes on for ${off.name}`, '#48a0ff');
              } else {
                active.splice(idx, 1);
                logLine(`${minute}'  ⚠ ${off.name} sent off — no sub available`, '#ffab40');
              }
            }
          }
          break;
        }
        case 'foul':
          logLine(`${minute}'  Foul by ${who}`, '#cce');
          break;
        case 'offside':
          logLine(`${minute}'  🚩 Offside — ${sideName}`, '#cce');
          break;
        case 'miss':
          logLine(`${minute}'  Shot off target — ${who}`, '#cce');
          break;
        case 'penaltyMiss':
          logLine(`${minute}'  ❌ Penalty MISSED — ${who}`, '#ff8a80');
          break;
        case 'injury': {
          const wks = ev.weeks;
          let injName = playerName || 'a player';
          if (ev.isMine && active.length > 0) {
            // Pick a random ACTIVE lineup player and apply real injury
            const victim = active[Math.floor(Math.random() * active.length)];
            injName = victim.name;
            injurePlayer(victim, wks);
            // Auto-sub if possible
            if (subsPool.length > 0) {
              const sub = subsPool.shift();
              const idx = active.indexOf(victim);
              if (idx >= 0) active[idx] = sub;
              logLine(`${minute}'  🚑 ${victim.name} injured (${wks}w)  •  Sub: ${sub.name}`, '#ff8a80');
              break;
            }
          }
          logLine(`${minute}'  🚑 ${injName} injured (${wks} week${wks === 1 ? '' : 's'})`, '#ff8a80');
          break;
        }
      }
    }

    function tickFrame(now) {
      if (ended) return;
      const dt = Math.min(0.2, (now - last) / 1000);
      last = now;
      clock = Math.min(TOTAL, clock + dt * SPEED);
      const m = Math.floor(clock / 60), s = Math.floor(clock % 60);
      clockEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
      const minuteNow = Math.floor(clock / 60);
      while (events.length > 0 && events[0].minute <= minuteNow) {
        applyEvent(events.shift());
      }
      if (clock >= TOTAL) { finish(); return; }
      raf = requestAnimationFrame(tickFrame);
    }
    raf = requestAnimationFrame(tickFrame);

    function finish() {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      // Apply remaining events instantly
      while (events.length > 0) applyEvent(events.shift());
      // Force final score numbers in case anything got clipped
      sH.textContent = String(myResult.hs); sA.textContent = String(myResult.as);
      clockEl.textContent = '90:00';
      // Persist injuries/suspensions
      saveCareer(career);
      setTimeout(() => { overlay.remove(); onDone(); }, 800);
    }

    skipBtn.addEventListener('click', finish);
  }

  function showVerdictModal(myResult) {
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 24px 28px; min-width: 320px; text-align: center;
    `);
    overlay.appendChild(box);
    const { home, away, hs, as, mine, stage, leg } = myResult;
    const myScore = mine === 'home' ? hs : as;
    const oppScore = mine === 'home' ? as : hs;
    const verdict = myScore > oppScore ? 'WIN!' : myScore === oppScore ? 'DRAW' : 'LOSS';
    const verdictColor = myScore > oppScore ? C.accent : myScore === oppScore ? C.warn : C.danger;
    if (stage) {
      const stageLabel = stage === 'group' ? 'GROUP STAGE'
        : stage === 'r16' ? 'ROUND OF 16'
        : stage === 'qf' ? 'QUARTER-FINAL'
        : stage === 'sf' ? 'SEMI-FINAL'
        : stage === 'final' ? 'FINAL' : '';
      const legText = leg ? ` • LEG ${leg}` : '';
      box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 4px;`,
        stageLabel + legText));
    }
    box.appendChild(el('div', `font-size: 32px; font-weight: 900; color: ${verdictColor};`, verdict));
    box.appendChild(el('div', `font-size: 28px; font-weight: 800; margin: 10px 0;`,
      `${home.name} ${hs} - ${as} ${away.name}`));
    const memo = myScore > oppScore
      ? '3 points and bragging rights.'
      : myScore === oppScore ? 'A point on the board.' : 'Tough one. Back to training.';
    box.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, memo));
    const okBtn = button('OK', C.accent);
    okBtn.style.marginTop = '14px';
    okBtn.addEventListener('click', () => { overlay.remove(); render(); });
    box.appendChild(okBtn);
  }

  // ---------- Negotiation modal ----------
  function showNegotiationModal(neg) {
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.78);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 22px 24px; width: 460px; max-width: 92vw;
      display: flex; flex-direction: column; gap: 12px;
    `);
    overlay.appendChild(box);

    const isBuy = neg.type === 'buy';
    box.appendChild(el('div', `
      font-size: 11px; color: ${C.dim}; letter-spacing: 2px;
    `, isBuy ? 'TRANSFER NEGOTIATION — BUY' : 'TRANSFER NEGOTIATION — SELL'));

    const head = el('div', `
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; background: ${C.panel2};
      border: 1px solid ${C.border}; border-radius: 8px;
    `);
    head.appendChild(el('div', `
      font-weight: 800; font-size: 14px; color: ${posColor(neg.player.pos)};
      width: 38px;
    `, neg.player.pos));
    const info = el('div', 'flex: 1;');
    info.appendChild(el('div', 'font-weight: 800; font-size: 16px;', neg.player.name));
    info.appendChild(el('div', `font-size: 11px; color: ${C.dim};`,
      `Rating ${neg.player.rating} • Age ${neg.player.age} • Value ${formatMoney(neg.player.value)} • ${neg.fromTeamName}`));
    head.appendChild(info);
    box.appendChild(head);

    const targetLabel = el('div', `font-size: 12px; color: ${C.dim};`);
    box.appendChild(targetLabel);

    // History log
    const log = el('div', `
      max-height: 160px; overflow: auto;
      background: ${C.panel2}; border: 1px solid ${C.border};
      border-radius: 8px; padding: 8px 12px;
      display: flex; flex-direction: column; gap: 4px;
    `);
    box.appendChild(log);

    // Input row
    const inputRow = el('div', 'display: flex; gap: 8px; align-items: center;');
    box.appendChild(inputRow);
    const lbl = el('div', `font-size: 12px; color: ${C.dim}; min-width: 76px;`,
      isBuy ? 'Your offer' : 'You ask');
    inputRow.appendChild(lbl);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.style.cssText = `
      flex: 1; background: ${C.bg}; color: ${C.text};
      border: 1px solid ${C.border}; border-radius: 6px;
      padding: 8px 10px; font-size: 14px;
    `;
    input.value = String(isBuy ? Math.round(neg.currentDemand * 0.85) : Math.round(neg.currentBid * 1.4));
    inputRow.appendChild(input);

    // Action buttons
    const btnRow = el('div', 'display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;');
    box.appendChild(btnRow);

    const offerBtn = button(isBuy ? 'MAKE OFFER' : 'PROPOSE PRICE', C.accent, true);
    const acceptBtn = button(isBuy ? 'ACCEPT DEMAND' : 'ACCEPT BID', '#48a0ff', true);
    const walkBtn = button('WALK AWAY', C.danger);
    btnRow.appendChild(walkBtn);
    btnRow.appendChild(acceptBtn);
    btnRow.appendChild(offerBtn);

    walkBtn.addEventListener('click', () => overlay.remove());

    function refresh() {
      log.innerHTML = '';
      for (const entry of neg.history) {
        const isYou = entry.side === 'you';
        const row = el('div', `
          display: flex; gap: 8px; align-items: center; font-size: 12px;
          padding: 4px 6px; border-radius: 4px;
          background: ${isYou ? 'rgba(72,255,175,0.10)' : 'rgba(255,171,64,0.10)'};
        `);
        row.appendChild(el('div', `
          font-weight: 800; min-width: 50px;
          color: ${isYou ? C.accent : C.warn};
        `, isYou ? 'YOU' : 'THEM'));
        row.appendChild(el('div', `flex: 1; color: ${C.dim};`, entry.label));
        row.appendChild(el('div', 'font-weight: 800;', entry.amount > 0 ? formatMoney(entry.amount) : '—'));
        log.appendChild(row);
      }
      log.scrollTop = log.scrollHeight;
      const target = isBuy ? neg.currentDemand : neg.currentBid;
      targetLabel.innerHTML = isBuy
        ? `They want <b style="color:${C.warn}">${formatMoney(target)}</b>. Your budget: <b style="color:${C.accent}">${formatMoney(myTeam(career).budget)}</b>.`
        : `Their current bid: <b style="color:${C.warn}">${formatMoney(target)}</b>.`;
    }
    refresh();

    function endWithDeal(price) {
      const result = completeTransfer(career, neg, price);
      saveCareer(career);
      overlay.remove();
      if (result.ok) {
        flashBanner(result.msg, C.accent);
      } else {
        alert(result.msg);
      }
      render();
    }

    function endWithReject(reason) {
      // Show the rejection in the log, then disable further offers.
      offerBtn.disabled = true; acceptBtn.disabled = true;
      offerBtn.style.opacity = '0.5'; acceptBtn.style.opacity = '0.5';
      input.disabled = true;
      const line = el('div', `
        font-size: 12px; color: ${C.danger}; font-weight: 700; margin-top: 4px;
      `, reason || 'Negotiations ended.');
      box.insertBefore(line, btnRow);
      walkBtn.textContent = 'CLOSE';
    }

    offerBtn.addEventListener('click', () => {
      const amt = parseInt(input.value, 10);
      if (!Number.isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return; }
      const res = submitNegotiationOffer(career, neg, amt);
      if (res.status === 'no-money') { alert('You can\'t afford that.'); return; }
      if (res.status === 'accepted') { endWithDeal(res.agreedPrice); return; }
      if (res.status === 'rejected') { refresh(); endWithReject(res.reason); return; }
      // Countered
      input.value = String(isBuy ? Math.round((res.counter * 0.85)) : Math.round(res.counter * 1.2));
      refresh();
    });

    acceptBtn.addEventListener('click', () => {
      const res = acceptCurrentNegotiation(career, neg);
      if (res.status === 'no-money') { alert('You can\'t afford their demand.'); return; }
      if (res.status === 'accepted') endWithDeal(res.agreedPrice);
    });
  }

  // A small banner that fades in at the top, used for happy news.
  function flashBanner(text, color) {
    const b = el('div', `
      position: fixed; top: 70px; left: 50%; transform: translate(-50%, -10px);
      background: ${color}; color: #0a0a1a;
      padding: 10px 18px; border-radius: 10px;
      font-weight: 800; font-size: 13px; z-index: 10001;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      opacity: 0; transition: opacity 0.25s, transform 0.25s;
    `, text);
    root.appendChild(b);
    requestAnimationFrame(() => {
      b.style.opacity = '1';
      b.style.transform = 'translate(-50%, 0)';
    });
    setTimeout(() => {
      b.style.opacity = '0';
      b.style.transform = 'translate(-50%, -10px)';
      setTimeout(() => b.remove(), 300);
    }, 2200);
  }

  function positionInTable(career) {
    const sorted = sortTable(career.table);
    const idx = sorted.findIndex((r) => r.teamId === career.teamId);
    if (idx < 0) return null;
    const rank = idx + 1;
    const suffix = (rank === 1) ? 'st' : (rank === 2) ? 'nd' : (rank === 3) ? 'rd' : 'th';
    return `${rank}${suffix}`;
  }

  // ---------- Squad ----------
  function renderSquad() {
    const me = myTeam(career);
    const sorted = me.squad.slice().sort((a, b) => posOrder(a.pos) - posOrder(b.pos) || b.rating - a.rating);
    const table = makePlayerTable(sorted, {
      actions: (p) => [
        { label: 'Sell', color: C.danger, onClick: () => {
          const neg = openSellNegotiation(career, p.id);
          if (!neg.ok) { alert(neg.msg); return; }
          showNegotiationModal(neg);
        }},
      ],
    });
    body.appendChild(table);
  }

  function posOrder(pos) { return { GK: 0, DEF: 1, MID: 2, FWD: 3 }[pos] ?? 4; }

  // ---------- Youth squad ----------
  function renderYouth() {
    const me = myTeam(career);
    const youth = (me.youth || []).slice().sort((a, b) => posOrder(a.pos) - posOrder(b.pos) || b.potential - a.potential);

    // Make sure the shop exists
    maybeRestockScoutShop(career);

    const intro = el('div', `
      padding: 14px; background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; margin-bottom: 12px; font-size: 12px; color: ${C.dim};
    `);
    intro.innerHTML = `<b style="color:${C.accent}">Under-21 squad.</b> Hire scouts below to bring in new youth — better stars find better players. Stock refreshes every 25s.`;
    body.appendChild(intro);

    // ---- Owned scouts (your hired scouts) ----
    renderOwnedScouts();

    // ---- Scout shop ----
    renderScoutShop();

    // ---- Youth table ----
    body.appendChild(el('div', `
      font-size: 11px; color: ${C.dim}; letter-spacing: 2px;
      margin: 16px 0 6px;
    `, 'YOUR YOUTH SQUAD'));
    if (youth.length === 0) {
      body.appendChild(el('div', `
        padding: 20px; color: ${C.dim}; text-align: center;
        background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
      `, 'No youth players yet. Hire a scout above!'));
      return;
    }
    let table;
    table = makePlayerTable(youth, {
      actions: (p) => [
        { label: 'PROMOTE', color: '#48a0ff', onClick: () => {
          const r = promoteYouth(career, p.id);
          saveCareer(career);
          if (!r.ok) alert(r.msg);
          else render();
        }},
        { label: 'SELL', color: C.danger, onClick: () => {
          const neg = openSellNegotiation(career, p.id);
          if (!neg.ok) { alert(neg.msg); return; }
          showNegotiationModal(neg);
        }},
      ],
    });
    body.appendChild(table);
  }

  function starsString(stars) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      if (stars >= i) s += '★';
      else if (stars >= i - 0.5) s += '⯨';     // half
      else s += '☆';
    }
    return s;
  }

  function starsColor(stars) {
    if (stars >= 4.5) return '#ff5252';
    if (stars >= 3.5) return '#ffd700';
    if (stars >= 2.5) return '#ffab40';
    if (stars >= 1.5) return '#48ffaf';
    return C.dim;
  }

  function renderOwnedScouts() {
    const scouts = career.scouts || [];
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px; margin-bottom: 10px;
    `);
    wrap.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 6px;`,
      `YOUR SCOUTS (${scouts.length})`));
    if (scouts.length === 0) {
      wrap.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
        'No scouts on staff yet — hire one from the market below.'));
      body.appendChild(wrap);
      return;
    }
    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    `);
    wrap.appendChild(grid);
    const me = myTeam(career);
    for (const s of scouts.slice().sort((a, b) => b.stars - a.stars)) {
      const sc = starsColor(s.stars);
      const fee = scoutSearchFee(s);
      const canAfford = me.budget >= fee;
      const card = el('div', `
        background: ${C.panel2}; border: 2px solid ${sc};
        border-radius: 8px; padding: 10px;
        display: flex; flex-direction: column; gap: 6px;
      `);
      const headRow = el('div', 'display: flex; align-items: baseline; gap: 6px;');
      headRow.appendChild(el('div', `font-weight: 800; font-size: 13px; flex: 1;`, s.name));
      headRow.appendChild(el('div', `color: ${C.dim}; font-size: 10px;`, `${s.searchesDone || 0} finds`));
      card.appendChild(headRow);
      const starRow = el('div', `display: flex; align-items: baseline; gap: 6px;`);
      starRow.appendChild(el('div', `color: ${sc}; font-size: 16px;`, starsString(s.stars)));
      starRow.appendChild(el('div', `color: ${C.dim}; font-size: 10px;`, `(${s.stars.toFixed(1)})`));
      card.appendChild(starRow);
      card.appendChild(el('div', `color: ${C.warn}; font-size: 11px;`,
        `Search: ${formatMoney(fee)}`));
      const btnRow = el('div', 'display: flex; gap: 6px;');
      const findBtn = button('FIND PLAYER', sc, true);
      findBtn.style.padding = '6px 8px'; findBtn.style.fontSize = '11px'; findBtn.style.flex = '1';
      findBtn.disabled = !canAfford;
      findBtn.style.opacity = canAfford ? '1' : '0.5';
      findBtn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
      findBtn.addEventListener('click', () => {
        const r = scoutSearch(career, s.id);
        saveCareer(career);
        if (!r.ok) { alert(r.msg); return; }
        flashBanner(`✨ ${r.scout.name} found ${r.player.name} — Rating ${r.player.rating}, Pot ${r.player.potential}`,
          starsColor(r.scout.stars));
        render();
      });
      btnRow.appendChild(findBtn);
      const fireBtn = button('✕', C.danger);
      fireBtn.style.padding = '6px 8px'; fireBtn.style.fontSize = '11px';
      fireBtn.title = 'Let this scout go (no refund)';
      fireBtn.addEventListener('click', () => {
        if (!confirm(`Let ${s.name} go? No refund.`)) return;
        fireScout(career, s.id);
        saveCareer(career);
        render();
      });
      btnRow.appendChild(fireBtn);
      card.appendChild(btnRow);
      grid.appendChild(card);
    }
    body.appendChild(wrap);
  }

  function renderScoutShop() {
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px;
    `);
    const head = el('div', `
      display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
    `);
    head.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, 'SCOUT MARKET'));
    const ms = scoutShopMsLeft(career);
    const secs = Math.ceil(ms / 1000);
    head.appendChild(el('div', `flex: 1;`, ''));
    head.appendChild(el('div', `font-size: 11px; color: ${C.warn};`,
      `New scouts in ${secs}s`));
    head.appendChild(el('div', `font-size: 11px; color: ${C.accent};`,
      formatMoney(myTeam(career).budget)));
    wrap.appendChild(head);

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
    `);
    wrap.appendChild(grid);
    const shop = (career.scoutShop || []).slice().sort((a, b) => b.stars - a.stars);
    if (shop.length === 0) {
      grid.appendChild(el('div', `color: ${C.dim}; padding: 14px; grid-column: 1/-1; text-align: center;`,
        'Scouts are travelling — check back soon.'));
    }
    const me = myTeam(career);
    for (const s of shop) {
      const canAfford = me.budget >= s.price;
      const sc = starsColor(s.stars);
      const card = el('div', `
        background: ${C.panel2}; border: 2px solid ${sc};
        border-radius: 8px; padding: 10px;
        display: flex; flex-direction: column; gap: 6px;
        opacity: ${canAfford ? 1 : 0.6};
      `);
      card.appendChild(el('div', `font-weight: 800; font-size: 13px;`, s.name));
      const starRow = el('div', `display: flex; align-items: baseline; gap: 6px;`);
      starRow.appendChild(el('div', `color: ${sc}; font-size: 16px; letter-spacing: 1px;`, starsString(s.stars)));
      starRow.appendChild(el('div', `color: ${C.dim}; font-size: 10px;`, `(${s.stars.toFixed(1)})`));
      card.appendChild(starRow);
      card.appendChild(el('div', `color: ${C.warn}; font-weight: 800; font-size: 12px;`, formatMoney(s.price)));
      const btn = button('HIRE', sc, true);
      btn.style.padding = '6px 10px';
      btn.disabled = !canAfford;
      btn.style.opacity = canAfford ? '1' : '0.5';
      btn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
      btn.addEventListener('click', () => {
        const r = hireScout(career, s.id);
        saveCareer(career);
        if (!r.ok) { alert(r.msg); return; }
        flashBanner(`✍️ ${r.scout.name} hired (${r.scout.stars}★)`, starsColor(r.scout.stars));
        render();
      });
      card.appendChild(btn);
      grid.appendChild(card);
    }
    body.appendChild(wrap);
  }

  function makePlayerTable(players, { actions } = {}) {
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; overflow: hidden;
    `);
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
    wrap.appendChild(tbl);
    const thead = document.createElement('thead');
    tbl.appendChild(thead);
    const trh = document.createElement('tr');
    thead.appendChild(trh);
    for (const h of ['Pos','Name','Rating','Pot','Age','Morale','Value', actions ? '' : null]) {
      if (h == null) continue;
      const th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = `
        text-align: left; padding: 8px 10px; font-size: 11px;
        color: ${C.dim}; letter-spacing: 1px; border-bottom: 1px solid ${C.border};
        background: ${C.panel2};
      `;
      trh.appendChild(th);
    }
    const tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    // Map of playerId -> { tr, ratingTd, moraleTd, valueTd } so action
    // handlers can update a single row without re-rendering the whole table.
    const rows = new Map();
    for (const p of players) {
      const tr = document.createElement('tr');
      tr.style.cssText = `border-bottom: 1px solid ${C.border};`;
      const cells = [
        { txt: p.pos, color: posColor(p.pos), bold: true },
        { txt: p.name, bold: true },
        { txt: String(p.rating), color: ratingColor(p.rating), bold: true, key: 'rating' },
        { txt: String(p.potential), color: C.dim },
        { txt: String(p.age) },
        { txt: String(p.morale), key: 'morale' },
        { txt: formatMoney(p.value), color: C.warn, key: 'value' },
      ];
      const rowRef = { tr, ratingTd: null, moraleTd: null, valueTd: null };
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const td = document.createElement('td');
        td.style.cssText = `padding: 8px 10px; color: ${c.color || C.text}; ${c.bold ? 'font-weight: 700;' : ''} position: relative;`;
        if (i === 1) {
          // Name cell — also show injury / red-card badges
          const wrap = document.createElement('div');
          wrap.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;';
          wrap.appendChild(document.createTextNode(c.txt));
          if ((p.injuryWeeksLeft || 0) > 0) {
            const b = document.createElement('span');
            b.style.cssText = `
              color: #ff5252; font-size: 10px; font-weight: 800; letter-spacing: 1px;
              background: rgba(255,82,82,0.15); padding: 1px 5px; border-radius: 3px;
              border: 1px solid rgba(255,82,82,0.45);
            `;
            b.textContent = `🚑 ${p.injuryWeeksLeft}w`;
            wrap.appendChild(b);
          }
          if ((p.suspendMatchesLeft || 0) > 0) {
            const b = document.createElement('span');
            b.style.cssText = `
              color: #ff5252; font-size: 10px; font-weight: 800; letter-spacing: 1px;
              background: rgba(255,82,82,0.15); padding: 1px 5px; border-radius: 3px;
              border: 1px solid rgba(255,82,82,0.45);
            `;
            b.textContent = `🟥 ${p.suspendMatchesLeft}m`;
            wrap.appendChild(b);
          }
          td.appendChild(wrap);
        } else {
          td.textContent = c.txt;
        }
        if (c.key === 'rating') rowRef.ratingTd = td;
        if (c.key === 'morale') rowRef.moraleTd = td;
        if (c.key === 'value')  rowRef.valueTd  = td;
        tr.appendChild(td);
      }
      rows.set(p.id, rowRef);
      if (actions) {
        const td = document.createElement('td');
        td.style.cssText = 'padding: 6px 10px; text-align: right;';
        // Pass the row handle through so actions can animate updates.
        for (const a of actions(p, rowRef)) {
          const b = button(a.label, a.color);
          b.style.fontSize = '11px';
          b.style.padding = '4px 8px';
          b.style.marginLeft = '4px';
          b.addEventListener('click', a.onClick);
          td.appendChild(b);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    wrap._rows = rows;
    return wrap;
  }

  // Float an arrow + amount up out of a cell, then fade.
  function floatRatingChange(cell, delta) {
    if (!cell) return;
    const badge = document.createElement('div');
    badge.textContent = `↑ +${delta}`;
    badge.style.cssText = `
      position: absolute; left: 100%; top: 50%;
      transform: translate(6px, -50%);
      background: ${C.accent}; color: #0a0a1a;
      font-weight: 900; font-size: 12px; padding: 2px 8px;
      border-radius: 999px; white-space: nowrap;
      pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      animation: cc-float-up 1.2s ease-out forwards;
    `;
    cell.appendChild(badge);
    setTimeout(() => badge.remove(), 1250);
  }

  function flashCell(cell, color = C.accent) {
    if (!cell) return;
    cell.style.transition = 'background 0.25s';
    cell.style.background = color + '33';
    setTimeout(() => { cell.style.background = ''; }, 700);
  }

  // Apply a training result to a player row inline (no re-render).
  // Picker for the 3D training match — choose which of your players to BE.
  function openMatchPlayerPicker() {
    const me = myTeam(career);
    const eligible = [...me.squad, ...(me.youth || [])];
    if (eligible.length < 10) {
      alert('You need at least 10 players for a 5v5 training match.');
      return;
    }

    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 18px 22px; width: 560px; max-width: 96vw; max-height: 88vh;
      overflow: auto;
    `);
    overlay.appendChild(box);
    box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`,
      'PICK A PLAYER TO CONTROL'));
    box.appendChild(el('div', 'font-size: 16px; font-weight: 800; margin-bottom: 10px;',
      'You will see the match through their eyes (first-person).'));

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px;
    `);
    box.appendChild(grid);

    const youthIds = new Set((me.youth || []).map((p) => p.id));
    const sorted = eligible.slice().sort((a, b) => posOrder(a.pos) - posOrder(b.pos) || b.rating - a.rating);
    for (const p of sorted) {
      const isYouth = youthIds.has(p.id);
      const card = el('button', `
        background: ${C.panel2}; color: ${C.text};
        border: 1px solid ${isYouth ? '#48a0ff' : C.border}; border-radius: 8px;
        padding: 10px; cursor: pointer; text-align: left;
      `);
      const head = el('div', 'display: flex; align-items: center; gap: 8px;');
      head.appendChild(el('div', `font-weight: 800; color: ${posColor(p.pos)};`, p.pos));
      head.appendChild(el('div', `flex: 1; font-weight: 800; font-size: 13px;`, p.name));
      if (isYouth) {
        head.appendChild(el('div', `font-size: 9px; color: #48a0ff; font-weight: 800; letter-spacing: 1px;`, 'YOUTH'));
      }
      head.appendChild(el('div', `color: ${ratingColor(p.rating)}; font-weight: 800;`, String(p.rating)));
      card.appendChild(head);
      card.appendChild(el('div', `font-size: 11px; color: ${C.dim}; margin-top: 4px;`,
        `Age ${p.age}  •  Pot ${p.potential}`));
      card.addEventListener('mouseover', () => card.style.borderColor = C.accent);
      card.addEventListener('mouseout',  () => card.style.borderColor = C.border);
      card.addEventListener('click', () => {
        overlay.remove();
        // Snapshot every player's rating BEFORE the match so we can show
        // the total improvement (live bumps + post-match bumps) afterward.
        const preMatch = {};
        for (const pl of eligible) preMatch[pl.id] = pl.rating;
        startMatchTraining({
          squad: eligible,
          parent: root,
          controlledId: p.id,
          onFinish: (stats, scoreA, scoreB) => {
            const result = applyMatchTraining(career, stats, preMatch);
            saveCareer(career);
            showMatchTrainingResults(result, stats, scoreA, scoreB, p.id);
          },
        });
      });
      grid.appendChild(card);
    }

    const closeRow = el('div', 'display: flex; justify-content: flex-end; margin-top: 12px;');
    box.appendChild(closeRow);
    const cancelBtn = button('CANCEL', C.danger);
    cancelBtn.addEventListener('click', () => overlay.remove());
    closeRow.appendChild(cancelBtn);
  }

  function showMatchTrainingResults(result, stats, scoreA, scoreB, controlledId) {
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 20px 24px; width: 480px; max-width: 96vw; max-height: 86vh; overflow: auto;
    `);
    overlay.appendChild(box);
    box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`,
      'TRAINING MATCH RESULT'));
    box.appendChild(el('div', `font-size: 28px; font-weight: 900; margin: 8px 0;`,
      `Blues ${scoreA} — ${scoreB} Reds`));

    const me = myTeam(career);
    const youthIds = new Set((me.youth || []).map((p) => p.id));
    const youPlayer = controlledId ? [...me.squad, ...(me.youth || [])].find((p) => p.id === controlledId) : null;
    const youImproved = result.events.some((ev) => ev.playerId === controlledId);

    box.appendChild(el('div', `font-size: 12px; color: ${C.dim}; letter-spacing: 1px; margin-bottom: 6px;`,
      'PLAYERS IMPROVED'));
    const list = el('div', 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;');
    box.appendChild(list);

    // Always show YOU at the top, even if they didn't improve
    if (youPlayer && !youImproved) {
      const row = el('div', `
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 10px; border-radius: 6px; font-size: 12px;
        background: rgba(255,82,82,0.10); border: 1px solid ${C.danger};
        color: ${C.danger}; font-weight: 800;
      `);
      const left = el('div', 'display: flex; gap: 8px; align-items: center;');
      left.appendChild(el('div', '', youPlayer.name));
      left.appendChild(el('div',
        `font-size: 9px; color: ${C.danger}; font-weight: 900; letter-spacing: 1px;
         border: 1px solid ${C.danger}; padding: 1px 5px; border-radius: 3px;`,
        'YOU'));
      if (youthIds.has(youPlayer.id)) {
        left.appendChild(el('div',
          `font-size: 9px; color: #48a0ff; font-weight: 800; letter-spacing: 1px;
           border: 1px solid #48a0ff; padding: 1px 4px; border-radius: 3px;`,
          'YOUTH'));
      }
      row.appendChild(left);
      row.appendChild(el('div', `color: ${C.dim}; font-weight: 700;`, 'no improvement'));
      list.appendChild(row);
    }

    if (result.events.length === 0 && !youPlayer) {
      box.appendChild(el('div', `font-size: 13px; color: ${C.dim}; margin-bottom: 10px;`,
        'No players improved this session.'));
    }
    {
      for (const ev of result.events) {
        const isYouth = youthIds.has(ev.playerId);
        const isYou = ev.playerId === controlledId;
        const row = el('div', `
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 10px; border-radius: 6px; font-size: 12px;
          background: ${isYou ? 'rgba(255,82,82,0.18)' : C.panel2};
          border: 1px solid ${isYou ? C.danger : 'transparent'};
          color: ${isYou ? C.danger : C.text};
          font-weight: ${isYou ? 800 : 500};
        `);
        const left = el('div', 'display: flex; gap: 8px; align-items: center;');
        left.appendChild(el('div', '', ev.name));
        if (isYou) {
          left.appendChild(el('div',
            `font-size: 9px; color: ${C.danger}; font-weight: 900; letter-spacing: 1px;
             border: 1px solid ${C.danger}; padding: 1px 5px; border-radius: 3px;`,
            'YOU'));
        }
        if (isYouth) {
          left.appendChild(el('div',
            `font-size: 9px; color: #48a0ff; font-weight: 800; letter-spacing: 1px;
             border: 1px solid #48a0ff; padding: 1px 4px; border-radius: 3px;`,
            'YOUTH'));
        }
        row.appendChild(left);
        row.appendChild(el('div', `color: ${isYou ? C.danger : C.accent}; font-weight: 800;`,
          `${ev.oldRating} → ${ev.newRating}  (+${ev.delta})`));
        list.appendChild(row);
      }
    }

    const okBtn = button('OK', C.accent, true);
    okBtn.addEventListener('click', () => { overlay.remove(); render(); });
    box.appendChild(okBtn);
  }

  // Open the multi-drill training mini-game. Player can attempt each of
  // the seven drills within a 2-minute window; their core-position skills
  // decide whether they improve, non-core skills decide the bump size.
  function runTrainingMinigame(player, intensity, table) {
    const me = myTeam(career);
    const cost = intensity === 'hard' ? 250_000 : 80_000;
    if (me.budget < cost) { alert('Not enough cash for that session.'); return; }
    showTrainingMinigame({
      player, intensity, parent: root,
      onFinish: (scores) => {
        const r = applyDrillTraining(career, player.id, intensity, scores);
        saveCareer(career);
        if (r.ok) applyTrainingResult(table, r);
        else alert(r.msg);
      },
    });
  }

  // (Old single-shot shooting drill kept disabled below for reference.)
  function _legacyTrainingMinigame(player, intensity, table) {
    const me = myTeam(career);
    const cost = intensity === 'hard' ? 250_000 : 80_000;
    if (me.budget < cost) { alert('Not enough cash for that session.'); return; }

    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    `);
    root.appendChild(overlay);

    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 20px 22px; width: 500px; max-width: 96vw;
      display: flex; flex-direction: column; gap: 10px;
    `);
    overlay.appendChild(box);
    box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`,
      `${intensity === 'hard' ? 'HARD' : 'NORMAL'} TRAINING`));
    box.appendChild(el('div', 'font-size: 18px; font-weight: 800;', player.name));
    const sub = el('div', `font-size: 12px; color: ${C.dim};`,
      'Click in the goal to shoot. Beat the keeper 5 times.');
    box.appendChild(sub);

    const scoreLine = el('div', 'font-size: 14px; font-weight: 800;');
    scoreLine.textContent = 'Shot 0/5  •  Goals 0';
    box.appendChild(scoreLine);

    const canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 220;
    canvas.style.cssText = `
      background: #2e7d32; border: 2px solid ${C.border};
      border-radius: 8px; cursor: crosshair; display: block; width: 100%;
      max-width: 460px; margin: 0 auto;
    `;
    box.appendChild(canvas);

    const btnRow = el('div', 'display: flex; gap: 8px; justify-content: flex-end;');
    box.appendChild(btnRow);
    const cancelBtn = button('CANCEL', C.danger);
    btnRow.appendChild(cancelBtn);
    const finishBtn = button('FINISH', C.accent, true);
    finishBtn.disabled = true; finishBtn.style.opacity = '0.5';
    btnRow.appendChild(finishBtn);

    const ctx = canvas.getContext('2d');
    const goal = { left: 50, right: 410, top: 30, bottom: 180 };
    const keeperW = intensity === 'hard' ? 110 : 90;
    const keeperSpeed = intensity === 'hard' ? 3.2 : 2.4;
    let keeperX = (goal.left + goal.right) / 2;
    let keeperVel = keeperSpeed;
    let shots = 0, hits = 0;
    let lastResult = null;
    let lastResultUntil = 0;
    let raf = 0;

    function draw() {
      ctx.fillStyle = '#3a8b3a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Pitch lines
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, goal.bottom + 20); ctx.lineTo(canvas.width, goal.bottom + 20);
      ctx.stroke();
      // Goal frame
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeRect(goal.left, goal.top, goal.right - goal.left, goal.bottom - goal.top);
      // Net pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      for (let x = goal.left; x <= goal.right; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, goal.top); ctx.lineTo(x, goal.bottom); ctx.stroke();
      }
      for (let y = goal.top; y <= goal.bottom; y += 12) {
        ctx.beginPath(); ctx.moveTo(goal.left, y); ctx.lineTo(goal.right, y); ctx.stroke();
      }
      // Keeper
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(keeperX - keeperW / 2, goal.top + 8, keeperW, goal.bottom - goal.top - 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(keeperX - 10, goal.top + 18, 20, 18);     // head
      // Last result overlay
      if (lastResult && performance.now() < lastResultUntil) {
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = lastResult === 'GOAL' ? '#48ffaf'
          : lastResult === 'SAVED' ? '#ff5252' : '#ffab40';
        ctx.fillText(lastResult, canvas.width / 2, 110);
      }
    }

    function tick() {
      keeperX += keeperVel;
      if (keeperX > goal.right - keeperW / 2 - 4 || keeperX < goal.left + keeperW / 2 + 4) {
        keeperVel = -keeperVel;
      }
      draw();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function updateScoreLine() {
      scoreLine.textContent = `Shot ${shots}/5  •  Goals ${hits}`;
      if (shots >= 5) {
        finishBtn.disabled = false;
        finishBtn.style.opacity = '1';
      }
    }

    canvas.addEventListener('click', (e) => {
      if (shots >= 5) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (x < goal.left || x > goal.right || y < goal.top || y > goal.bottom) {
        lastResult = 'MISS';
      } else if (x > keeperX - keeperW / 2 - 4 && x < keeperX + keeperW / 2 + 4) {
        lastResult = 'SAVED';
      } else {
        lastResult = 'GOAL';
        hits++;
      }
      lastResultUntil = performance.now() + 700;
      shots++;
      updateScoreLine();
    });

    function close() {
      cancelAnimationFrame(raf);
      overlay.remove();
    }

    cancelBtn.addEventListener('click', close);
    finishBtn.addEventListener('click', () => {
      close();
      const performanceScore = hits / 5;
      const r = applyTrainingFromMinigame(career, player.id, intensity, performanceScore);
      saveCareer(career);
      if (r.ok) applyTrainingResult(table, r);
      else alert(r.msg);
    });
  }

  function applyTrainingResult(table, r) {
    const ref = table && table._rows && table._rows.get(r.playerId);
    if (!ref) return;
    if (r.improved) {
      ref.ratingTd.textContent = String(r.newRating);
      ref.ratingTd.style.color = ratingColor(r.newRating);
      floatRatingChange(ref.ratingTd, r.delta);
      flashCell(ref.ratingTd);
    }
    if (ref.moraleTd) ref.moraleTd.textContent = String(r.morale);
    if (ref.valueTd)  ref.valueTd.textContent  = formatMoney(r.value);
    // Update the top status bar (budget changed)
    const me = myTeam(career);
    status.textContent = `${me.name} • Season ${career.world.season} • Week ${career.week}/${career.fixtures.length} • ${formatMoney(me.budget)}`;
  }

  function posColor(pos) {
    return { GK: '#ffd54f', DEF: '#4fc3f7', MID: '#69f0ae', FWD: '#ff7043' }[pos] || C.text;
  }
  function ratingColor(r) {
    if (r >= 100) return '#ffd700';
    if (r >= 88)  return '#ff5252';
    if (r >= 80)  return '#ffab40';
    if (r >= 70)  return '#48ffaf';
    return C.text;
  }

  // ---------- Table ----------
  function renderTable() {
    const sorted = sortTable(career.table);
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; overflow: hidden;
    `);
    body.appendChild(wrap);
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
    wrap.appendChild(tbl);
    const trh = document.createElement('tr');
    for (const h of ['#','','Team','P','W','D','L','GF','GA','GD','Pts']) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = `
        text-align: left; padding: 8px 10px; font-size: 11px;
        color: ${C.dim}; letter-spacing: 1px; border-bottom: 1px solid ${C.border};
        background: ${C.panel2};
      `;
      trh.appendChild(th);
    }
    tbl.appendChild(trh);
    const total = sorted.length;
    sorted.forEach((row, i) => {
      const team = findTeam(career.world, row.teamId);
      const isMe = row.teamId === career.teamId;
      const rank = i + 1;
      const zone = tableZone(career, i, total);
      const bg = zoneBg(zone) || (isMe ? 'rgba(255,255,255,0.06)' : 'transparent');
      const tr = document.createElement('tr');
      tr.style.cssText = `
        border-bottom: 1px solid ${C.border};
        background: ${bg};
        ${isMe ? 'font-weight: 800;' : ''}
      `;
      const cells = [String(rank), zoneLabel(zone), team.name, row.P, row.W, row.D, row.L, row.GF, row.GA, row.GD, row.Pts];
      cells.forEach((c, idx) => {
        const td = document.createElement('td');
        td.textContent = String(c);
        // idx 1 is the zone label; idx 10 is Pts
        let style = `padding: 8px 10px;`;
        if (idx === 10) style += ` color: ${C.accent}; font-weight: 900;`;
        if (idx === 1) {
          const c2 = zone === 'cl' || zone === 'promoted' ? C.accent
                  : zone === 'el' ? '#48a0ff'
                  : zone === 'confl' ? '#b388ff'
                  : zone === 'playoff' ? '#ffd54f'
                  : zone === 'relegated' ? C.danger : C.dim;
          style += ` color: ${c2}; font-weight: 800; font-size: 10px;`;
        }
        td.style.cssText = style;
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
    });

    // Legend
    const legend = el('div', `
      padding: 10px 12px; border-top: 1px solid ${C.border};
      display: flex; flex-wrap: wrap; gap: 14px; font-size: 11px; color: ${C.dim};
    `);
    const league = findLeague(career.world, career.leagueId);
    const tier = league.tier ?? 0;
    if (tier === 0) {
      legend.appendChild(legendDot(C.zoneCL, 'Champions League'));
      legend.appendChild(legendDot(C.zoneEL, 'Europa League'));
      legend.appendChild(legendDot(C.zoneConfL, 'Conference League'));
      legend.appendChild(legendDot(C.zoneRelegated, 'Relegation'));
    } else {
      legend.appendChild(legendDot(C.zonePromoted, 'Auto-promoted'));
      legend.appendChild(legendDot(C.zonePlayoff, 'Promotion playoff'));
      let bottomTier = tier;
      for (const L of career.world.leagues) {
        if (L.countryId === league.countryId && (L.tier ?? 0) > bottomTier) bottomTier = L.tier;
      }
      if (tier !== bottomTier) legend.appendChild(legendDot(C.zoneRelegated, 'Relegation'));
    }
    wrap.appendChild(legend);
  }

  function legendDot(bg, label) {
    const wrap = el('div', 'display: flex; align-items: center; gap: 6px;');
    const dot = el('div', `width: 12px; height: 12px; border-radius: 3px; background: ${bg};`);
    wrap.appendChild(dot);
    wrap.appendChild(el('span', '', label));
    return wrap;
  }

  // ---------- Fixtures ----------
  function renderFixtures() {
    const me = myTeam(career);
    const myFixtures = [];
    career.fixtures.forEach((round, wk) => {
      const m = round.find((x) => x.home === career.teamId || x.away === career.teamId);
      if (m) myFixtures.push({ week: wk, ...m });
    });
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; overflow: hidden;
    `);
    body.appendChild(wrap);
    for (const f of myFixtures) {
      const isHome = f.home === career.teamId;
      const opp = findTeam(career.world, isHome ? f.away : f.home);
      const result = career.results.find((r) => r.week === f.week
        && r.home === f.home && r.away === f.away);
      const played = !!result;
      const myScore = result ? (isHome ? result.hs : result.as) : null;
      const oppScore = result ? (isHome ? result.as : result.hs) : null;
      const row = el('div', `
        display: flex; align-items: center; gap: 14px;
        padding: 8px 14px; border-bottom: 1px solid ${C.border};
        ${f.week === career.week ? `background: rgba(72,255,175,0.10);` : ''}
      `);
      row.appendChild(el('div', `width: 40px; color: ${C.dim}; font-size: 11px;`, `W${f.week + 1}`));
      row.appendChild(el('div', `width: 40px; color: ${C.dim}; font-size: 11px;`, isHome ? 'HOME' : 'AWAY'));
      row.appendChild(el('div', `flex: 1; font-weight: 700;`, 'vs ' + opp.name));
      row.appendChild(el('div', `width: 60px; font-size: 11px; color: ${C.dim};`, 'Rating ' + teamRating(opp)));
      if (played) {
        const won = myScore > oppScore;
        const draw = myScore === oppScore;
        const c = won ? C.accent : draw ? C.warn : C.danger;
        row.appendChild(el('div', `width: 90px; font-weight: 800; color: ${c};`, `${myScore} - ${oppScore}`));
      } else {
        row.appendChild(el('div', `width: 90px; color: ${C.dim};`, '—'));
      }
      wrap.appendChild(row);
    }
  }

  // ---------- Transfers ----------
  let transferFilter = { league: null, pos: null };
  function renderTransfers() {
    const me = myTeam(career);
    const head = el('div', 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;');
    body.appendChild(head);
    head.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, 'Filter:'));
    const lgSel = document.createElement('select');
    lgSel.style.cssText = `background: ${C.panel2}; color: ${C.text}; border: 1px solid ${C.border}; padding: 4px 8px; border-radius: 6px;`;
    const opt0 = document.createElement('option'); opt0.value = ''; opt0.textContent = 'All leagues'; lgSel.appendChild(opt0);
    for (const L of career.world.leagues) {
      const o = document.createElement('option'); o.value = L.id;
      o.textContent = `${L.country} — ${L.name}`;
      if (transferFilter.league === L.id) o.selected = true;
      lgSel.appendChild(o);
    }
    lgSel.addEventListener('change', () => { transferFilter.league = lgSel.value || null; render(); });
    head.appendChild(lgSel);

    const posSel = document.createElement('select');
    posSel.style.cssText = lgSel.style.cssText;
    for (const p of ['', 'GK', 'DEF', 'MID', 'FWD']) {
      const o = document.createElement('option'); o.value = p; o.textContent = p || 'All positions';
      if ((transferFilter.pos || '') === p) o.selected = true;
      posSel.appendChild(o);
    }
    posSel.addEventListener('change', () => { transferFilter.pos = posSel.value || null; render(); });
    head.appendChild(posSel);

    head.appendChild(el('div', `flex: 1;`, ''));
    head.appendChild(el('div', `font-size: 13px; color: ${C.warn}; font-weight: 800;`,
      `Budget: ${formatMoney(me.budget)}`));

    // Pool of available players: from teams in selected league(s), excluding mine.
    const pool = [];
    for (const L of career.world.leagues) {
      if (transferFilter.league && L.id !== transferFilter.league) continue;
      for (const t of L.teams) {
        if (t.id === career.teamId) continue;
        for (const p of t.squad) {
          if (transferFilter.pos && p.pos !== transferFilter.pos) continue;
          pool.push({ ...p, fromTeam: t });
        }
      }
    }
    pool.sort((a, b) => b.rating - a.rating);
    const shown = pool.slice(0, 80);

    const wrap = el('div', `background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px; overflow: hidden;`);
    body.appendChild(wrap);
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
    wrap.appendChild(tbl);
    const trh = document.createElement('tr');
    for (const h of ['Pos','Name','Rating','Age','Club','Value','']) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = `text-align: left; padding: 8px 10px; font-size: 11px; color: ${C.dim}; letter-spacing: 1px; border-bottom: 1px solid ${C.border}; background: ${C.panel2};`;
      trh.appendChild(th);
    }
    tbl.appendChild(trh);

    for (const p of shown) {
      const tr = document.createElement('tr');
      tr.style.cssText = `border-bottom: 1px solid ${C.border};`;
      const cells = [
        { txt: p.pos, color: posColor(p.pos), bold: true },
        { txt: p.name, bold: true },
        { txt: String(p.rating), color: ratingColor(p.rating), bold: true },
        { txt: String(p.age) },
        { txt: p.fromTeam.name, color: C.dim },
        { txt: formatMoney(p.value), color: C.warn },
      ];
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = c.txt;
        td.style.cssText = `padding: 8px 10px; color: ${c.color || C.text}; ${c.bold ? 'font-weight: 700;' : ''}`;
        tr.appendChild(td);
      }
      const tdBtn = document.createElement('td');
      tdBtn.style.cssText = 'padding: 6px 10px; text-align: right;';
      const b = button('NEGOTIATE', C.accent);
      b.style.fontSize = '11px'; b.style.padding = '4px 10px';
      b.addEventListener('click', () => {
        const neg = openBuyNegotiation(career, p.fromTeam.id, p.id);
        if (!neg.ok) { alert(neg.msg); return; }
        showNegotiationModal(neg);
      });
      tdBtn.appendChild(b);
      tr.appendChild(tdBtn);
      tbl.appendChild(tr);
    }

    if (shown.length === 0) {
      const empty = el('div', `padding: 20px; color: ${C.dim}; text-align: center;`, 'No players found.');
      wrap.appendChild(empty);
    }
  }

  // ---------- Training ----------
  function renderTraining() {
    const me = myTeam(career);
    const intro = el('div', `
      padding: 14px; background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; margin-bottom: 12px; font-size: 12px; color: ${C.dim};
    `);
    intro.textContent = 'Train your players by playing the 3D match below. Players who do well get rating boosts.';
    body.appendChild(intro);

    // 3D training match section
    const matchBox = el('div', `
      padding: 14px; background: ${C.panel}; border: 2px solid ${C.accent};
      border-radius: 10px; margin-bottom: 12px;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    `);
    const matchInfo = el('div', 'flex: 1; min-width: 200px;');
    matchInfo.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, '3D TRAINING MATCH'));
    matchInfo.appendChild(el('div', 'font-size: 18px; font-weight: 800; margin: 4px 0;',
      'Play a 5v5 match — first-person'));
    matchInfo.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      'Pick a player, run around in their boots. Players who do well in the match get rating boosts. The other squad members run their own sessions in the background.'));
    matchBox.appendChild(matchInfo);
    const startMatchBtn = button('PICK PLAYER & PLAY', C.accent, true);
    startMatchBtn.style.fontSize = '14px';
    startMatchBtn.style.padding = '12px 18px';
    startMatchBtn.addEventListener('click', () => openMatchPlayerPicker());
    matchBox.appendChild(startMatchBtn);
    body.appendChild(matchBox);

    const sorted = me.squad.slice().sort((a, b) => posOrder(a.pos) - posOrder(b.pos) || b.rating - a.rating);
    const table = makePlayerTable(sorted, {});
    body.appendChild(table);
  }

  // ---------- Trophies ----------
  function renderTrophies() {
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 18px;
    `);
    body.appendChild(wrap);
    wrap.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, 'YOUR TROPHIES'));
    wrap.appendChild(el('div', `font-size: 22px; font-weight: 900; margin: 4px 0 12px;`,
      `${career.trophies.length} won`));
    if (career.trophies.length === 0) {
      wrap.appendChild(el('div', `font-size: 13px; color: ${C.dim};`, 'No trophies yet. Win the league!'));
    } else {
      const grid = el('div', 'display: flex; flex-wrap: wrap; gap: 10px;');
      wrap.appendChild(grid);
      for (const t of career.trophies) {
        const card = el('div', `
          background: linear-gradient(135deg, #ffab40, #ff6f00); color: #1a1300;
          padding: 10px 14px; border-radius: 8px; font-weight: 800; font-size: 13px;
        `, `🏆 ${t.league} (Season ${t.season})`);
        grid.appendChild(card);
      }
    }
  }

  // ---------- Europe (Champions / Europa / Conference League) ----------
  function renderEurope() {
    const E = career.europe;
    if (!E) {
      body.appendChild(el('div', `padding: 20px; color: ${C.dim};`, 'No active European competition.'));
      return;
    }
    const accent = E.type === 'cl' ? C.accent : E.type === 'el' ? '#48a0ff' : '#b388ff';

    // Header
    const header = el('div', `
      background: ${C.panel}; border: 2px solid ${accent}; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 14px;
      display: flex; align-items: center; gap: 14px;
    `);
    header.appendChild(el('div', `
      width: 8px; height: 36px; background: ${accent}; border-radius: 3px;
    `));
    const headInfo = el('div', 'flex: 1;');
    headInfo.appendChild(el('div', 'font-size: 20px; font-weight: 900;', euroLongName(E.type)));
    const stageLabel = E.stage === 'group' ? 'Group Stage'
      : E.stage === 'qf' ? 'Quarter-Finals'
      : E.stage === 'sf' ? 'Semi-Finals'
      : E.stage === 'final' ? 'Final'
      : 'Tournament Complete';
    headInfo.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      `${stageLabel} • Season ${career.world.season - 1}`));
    header.appendChild(headInfo);

    if (E.stage !== 'done') {
      const playBtn = button('PLAY EUROPE MATCH', accent, true);
      playBtn.addEventListener('click', () => {
        const r = playEuropeanMatch(career);
        saveCareer(career);
        if (r) showMatchResultModal(r); else render();
        if (career.europe && career.europe.stage === 'done') clearFinishedEurope(career);
      });
      header.appendChild(playBtn);
    } else {
      const finishBtn = button('CLOSE COMPETITION', C.warn);
      finishBtn.addEventListener('click', () => {
        clearFinishedEurope(career);
        saveCareer(career);
        activeTab = 'home';
        render();
      });
      header.appendChild(finishBtn);
    }
    body.appendChild(header);

    if (E.stage === 'group') {
      renderEuropeGroups(E, accent);
    } else {
      renderEuropeBracket(E, accent);
    }

    // Tournament log
    const log = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px 14px; margin-top: 14px;
      max-height: 200px; overflow: auto;
    `);
    log.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 6px;`, 'COMPETITION LOG'));
    for (const line of E.log.slice().reverse()) {
      log.appendChild(el('div', `font-size: 12px; margin: 3px 0;`, line));
    }
    body.appendChild(log);
  }

  function renderEuropeGroups(E, accent) {
    const wrap = el('div', `
      display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 14px;
    `);
    body.appendChild(wrap);
    for (const g of E.groups) {
      const box = el('div', `
        background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
        overflow: hidden;
      `);
      const head = el('div', `
        padding: 8px 12px; background: ${C.panel2};
        font-weight: 800; font-size: 13px; display: flex; gap: 10px; align-items: center;
      `);
      head.appendChild(el('div', `color: ${accent};`, `GROUP ${g.id}`));
      head.appendChild(el('div', `font-size: 11px; color: ${C.dim}; font-weight: 600;`,
        `Matchday ${Math.min(g.played, g.fixtures.length)}/${g.fixtures.length}`));
      box.appendChild(head);

      // Table
      const tbl = document.createElement('table');
      tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
      box.appendChild(tbl);
      const trh = document.createElement('tr');
      for (const h of ['#','Team','P','W','D','L','GD','Pts']) {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = `text-align: left; padding: 6px 10px; font-size: 10px; color: ${C.dim}; border-bottom: 1px solid ${C.border};`;
        trh.appendChild(th);
      }
      tbl.appendChild(trh);
      const sorted = sortTable(g.table);
      sorted.forEach((row, i) => {
        const team = findTeam(career.world, row.teamId);
        const isMe = row.teamId === career.teamId;
        const tr = document.createElement('tr');
        // Top 2 advance to knockout — green tint
        const bg = i < 2 ? C.zoneCL : (isMe ? 'rgba(255,255,255,0.05)' : 'transparent');
        tr.style.cssText = `border-bottom: 1px solid ${C.border}; background: ${bg}; ${isMe ? 'font-weight: 800;' : ''}`;
        const cells = [String(i + 1), team.name, row.P, row.W, row.D, row.L, row.GD, row.Pts];
        cells.forEach((c, idx) => {
          const td = document.createElement('td');
          td.textContent = String(c);
          td.style.cssText = `padding: 6px 10px; ${idx === 7 ? `color: ${accent}; font-weight: 900;` : ''}`;
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });

      // Latest results for this group
      const recent = g.results.slice(-2);
      if (recent.length > 0) {
        const resBox = el('div', `padding: 6px 10px; font-size: 11px; color: ${C.dim}; border-top: 1px solid ${C.border};`);
        for (const r of recent) {
          const home = findTeam(career.world, r.home);
          const away = findTeam(career.world, r.away);
          resBox.appendChild(el('div', '', `MD${r.matchday}: ${home.name} ${r.hs}-${r.as} ${away.name}`));
        }
        box.appendChild(resBox);
      }
      wrap.appendChild(box);
    }
  }

  function renderEuropeBracket(E, accent) {
    const stages = ['qf','sf','final'];
    const labels = { qf: 'Quarter-Finals', sf: 'Semi-Finals', final: 'Final' };
    const wrap = el('div', 'display: flex; gap: 14px; flex-wrap: wrap;');
    body.appendChild(wrap);
    for (const s of stages) {
      const ties = E.knockout[s];
      if (!ties) continue;
      const col = el('div', `
        flex: 1; min-width: 280px;
        background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
        padding: 10px;
      `);
      col.appendChild(el('div', `font-size: 12px; color: ${accent}; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;`,
        labels[s].toUpperCase()));
      for (const t of ties) {
        const a = findTeam(career.world, t.teamA);
        const b = findTeam(career.world, t.teamB);
        const isMine = t.teamA === career.teamId || t.teamB === career.teamId;
        const tie = el('div', `
          padding: 8px 10px; margin-bottom: 8px;
          background: ${isMine ? 'rgba(72,255,175,0.10)' : C.panel2};
          border: 1px solid ${C.border}; border-radius: 8px;
          font-size: 12px;
        `);
        // Aggregate / leg display
        let aggA = 0, aggB = 0;
        let legLines = [];
        for (let li = 0; li < t.legs.length; li++) {
          const l = t.legs[li];
          const homeName = findTeam(career.world, l.home).name;
          const awayName = findTeam(career.world, l.away).name;
          if (l.hs == null) {
            legLines.push(`Leg ${li + 1}: ${homeName} vs ${awayName} (—)`);
          } else {
            legLines.push(`Leg ${li + 1}: ${homeName} ${l.hs}-${l.as} ${awayName}`);
            if (l.home === t.teamA) { aggA += l.hs; aggB += l.as; }
            else                     { aggB += l.hs; aggA += l.as; }
          }
        }
        const headRow = el('div', 'display: flex; justify-content: space-between; font-weight: 800;');
        const left = el('div', `color: ${t.winnerId === t.teamA ? accent : C.text};`, a.name);
        const mid  = el('div', `color: ${C.dim};`, `${aggA} - ${aggB}`);
        const right = el('div', `color: ${t.winnerId === t.teamB ? accent : C.text};`, b.name);
        headRow.appendChild(left); headRow.appendChild(mid); headRow.appendChild(right);
        tie.appendChild(headRow);
        for (const ll of legLines) {
          tie.appendChild(el('div', `font-size: 11px; color: ${C.dim}; margin-top: 2px;`, ll));
        }
        if (t.winnerId) {
          const w = findTeam(career.world, t.winnerId);
          tie.appendChild(el('div', `font-size: 11px; color: ${accent}; font-weight: 800; margin-top: 4px;`,
            `→ ${w.name} advance`));
        }
        col.appendChild(tie);
      }
      wrap.appendChild(col);
    }
  }

  // ---------- Promotion Playoff ----------
  // ---------- Domestic Cup (Carabao / FA) ----------
  function renderCup() {
    const ac = activeCup(career);
    if (!ac) {
      body.appendChild(el('div', `padding: 20px; color: ${C.dim};`, 'No active cup.'));
      return;
    }
    const cup = ac.cup;
    const isCarabao = ac.key === 'carabaoCup';
    const accent = isCarabao ? '#ffab40' : '#48a0ff';

    const header = el('div', `
      background: ${C.panel}; border: 2px solid ${accent}; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 14px;
      display: flex; align-items: center; gap: 14px;
    `);
    header.appendChild(el('div', `width: 8px; height: 36px; background: ${accent}; border-radius: 3px;`));
    const info = el('div', 'flex: 1;');
    info.appendChild(el('div', 'font-size: 20px; font-weight: 900;', cup.name));
    info.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      `${cupStageName(cup.stage)} • Single-leg knockout`));
    header.appendChild(info);
    const playBtn = button(`PLAY ${cup.name.toUpperCase()} MATCH`, accent, true);
    playBtn.addEventListener('click', () => {
      const r = playCupMatch(career);
      saveCareer(career);
      if (r) showMatchResultModal(r); else render();
      clearFinishedCup(career);
      saveCareer(career);
    });
    header.appendChild(playBtn);
    body.appendChild(header);

    // Past rounds — summary list of completed rounds
    const stages = ['r1', 'r2', 'r3', 'qf', 'sf', 'final'];
    const labels = {
      r1: 'Round 1', r2: 'Round 2', r3: 'Round 3',
      qf: 'Quarter-Finals', sf: 'Semi-Finals', final: 'Final',
    };

    // Current round in detail
    const curTies = cup.rounds[cup.stage] || [];
    const curBox = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px; margin-bottom: 14px;
    `);
    curBox.appendChild(el('div', `font-size: 14px; color: ${accent}; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;`,
      `${labels[cup.stage].toUpperCase()} — ${curTies.length} ${curTies.length === 1 ? 'TIE' : 'TIES'}`));
    if (cup.stage === 'r1' && cup.byes && cup.byes.length > 0) {
      curBox.appendChild(el('div', `font-size: 11px; color: ${C.dim}; margin-bottom: 8px;`,
        `${cup.byes.length} teams have byes into Round 2`));
    }
    // Find user's tie and put it first
    const myIdx = curTies.findIndex((t) => t.teamA === career.teamId || t.teamB === career.teamId);
    const orderedTies = [];
    if (myIdx >= 0) orderedTies.push(curTies[myIdx]);
    for (let i = 0; i < curTies.length; i++) if (i !== myIdx) orderedTies.push(curTies[i]);
    const tiesBox = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 6px; max-height: 380px; overflow-y: auto;
    `);
    for (const t of orderedTies) tiesBox.appendChild(renderTie(t, accent, null));
    curBox.appendChild(tiesBox);
    body.appendChild(curBox);

    // Past rounds — collapsed summary
    const pastBox = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px; margin-bottom: 14px;
    `);
    pastBox.appendChild(el('div', `font-size: 12px; color: ${C.dim}; letter-spacing: 1px; margin-bottom: 6px;`,
      'PREVIOUS ROUNDS'));
    let hasPast = false;
    for (const s of stages) {
      if (s === cup.stage) break;
      const ties = cup.rounds[s];
      if (!ties || ties.length === 0) continue;
      hasPast = true;
      const head = el('div', `font-size: 11px; color: ${accent}; margin: 6px 0 2px;`, labels[s]);
      pastBox.appendChild(head);
      // Show how user did + final scores condensed
      const myRoundTie = ties.find((t) => t.teamA === career.teamId || t.teamB === career.teamId);
      if (myRoundTie) {
        const a = findTeam(career.world, myRoundTie.teamA);
        const b = findTeam(career.world, myRoundTie.teamB);
        let aG = 0, bG = 0;
        for (const l of myRoundTie.legs) {
          if (l.hs == null) continue;
          if (l.home === myRoundTie.teamA) { aG += l.hs; bG += l.as; }
          else                              { bG += l.hs; aG += l.as; }
        }
        const won = myRoundTie.winnerId === career.teamId;
        pastBox.appendChild(el('div', `
          font-size: 12px; padding: 4px 8px; border-radius: 4px;
          background: rgba(72,255,175,0.10);
          color: ${won ? C.accent : C.danger}; font-weight: 800;
        `, `You: ${a.name} ${aG}-${bG} ${b.name}  ${won ? '✓' : '✗'}`));
      }
    }
    if (!hasPast) pastBox.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, '—'));
    body.appendChild(pastBox);

    // Log
    const log = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px 14px; margin-top: 14px;
      max-height: 200px; overflow: auto;
    `);
    log.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 6px;`, 'CUP LOG'));
    for (const line of cup.log.slice().reverse()) {
      log.appendChild(el('div', `font-size: 12px; margin: 3px 0;`, line));
    }
    body.appendChild(log);
  }

  function renderPlayoff() {
    const P = career.playoff;
    if (!P) {
      body.appendChild(el('div', `padding: 20px; color: ${C.dim};`, 'No active playoff.'));
      return;
    }
    const accent = '#ffd54f';
    const header = el('div', `
      background: ${C.panel}; border: 2px solid ${accent}; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 14px;
      display: flex; align-items: center; gap: 14px;
    `);
    header.appendChild(el('div', `width: 8px; height: 36px; background: ${accent}; border-radius: 3px;`));
    const info = el('div', 'flex: 1;');
    info.appendChild(el('div', 'font-size: 20px; font-weight: 900;', 'Promotion Playoff'));
    const stageLabel = P.stage === 'sf' ? 'Semi-Finals' : P.stage === 'final' ? 'Final' : 'Complete';
    info.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      `${stageLabel} • Winner is promoted to the league above`));
    header.appendChild(info);

    if (P.stage !== 'done') {
      const playBtn = button('PLAY PLAYOFF MATCH', accent, true);
      playBtn.addEventListener('click', () => {
        const r = playPlayoffMatch(career);
        saveCareer(career);
        if (r) showMatchResultModal(r); else render();
        if (career.playoff && career.playoff.stage === 'done') clearFinishedPlayoff(career);
      });
      header.appendChild(playBtn);
    } else {
      const closeBtn = button('CLOSE', C.warn);
      closeBtn.addEventListener('click', () => {
        clearFinishedPlayoff(career);
        saveCareer(career);
        activeTab = 'home';
        render();
      });
      header.appendChild(closeBtn);
    }
    body.appendChild(header);

    // Bracket: SFs (2 ties) then Final
    const wrap = el('div', 'display: flex; gap: 14px; flex-wrap: wrap;');
    body.appendChild(wrap);
    const sfCol = el('div', `
      flex: 1; min-width: 280px;
      background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
      padding: 10px;
    `);
    sfCol.appendChild(el('div', `font-size: 12px; color: ${accent}; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;`,
      'SEMI-FINALS (two legs)'));
    P.ties.sf.forEach((t, i) => sfCol.appendChild(renderTie(t, accent, P.seedNames ? `${P.seedNames[i === 0 ? 0 : 1]} vs ${P.seedNames[i === 0 ? 3 : 2]}` : null)));
    wrap.appendChild(sfCol);

    const finalCol = el('div', `
      flex: 1; min-width: 280px;
      background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
      padding: 10px;
    `);
    finalCol.appendChild(el('div', `font-size: 12px; color: ${accent}; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;`,
      'FINAL (one leg)'));
    if (P.ties.final) {
      finalCol.appendChild(renderTie(P.ties.final, accent, null));
    } else {
      finalCol.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, 'Awaiting semi-final winners…'));
    }
    wrap.appendChild(finalCol);

    // Log
    const log = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 12px 14px; margin-top: 14px;
    `);
    log.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 6px;`, 'PLAYOFF LOG'));
    for (const line of P.log.slice().reverse()) {
      log.appendChild(el('div', `font-size: 12px; margin: 3px 0;`, line));
    }
    body.appendChild(log);
  }

  function renderTie(t, accent, seedLabel) {
    const a = findTeam(career.world, t.teamA);
    const b = findTeam(career.world, t.teamB);
    const isMine = t.teamA === career.teamId || t.teamB === career.teamId;
    const tie = el('div', `
      padding: 8px 10px; margin-bottom: 8px;
      background: ${isMine ? 'rgba(72,255,175,0.10)' : C.panel2};
      border: 1px solid ${C.border}; border-radius: 8px;
      font-size: 12px;
    `);
    if (seedLabel) {
      tie.appendChild(el('div', `font-size: 10px; color: ${C.dim}; letter-spacing: 1px; margin-bottom: 4px;`, seedLabel));
    }
    let aggA = 0, aggB = 0;
    const legLines = [];
    for (let li = 0; li < t.legs.length; li++) {
      const l = t.legs[li];
      const hName = findTeam(career.world, l.home).name;
      const aName = findTeam(career.world, l.away).name;
      if (l.hs == null) {
        legLines.push(`Leg ${li + 1}: ${hName} vs ${aName} (—)`);
      } else {
        legLines.push(`Leg ${li + 1}: ${hName} ${l.hs}-${l.as} ${aName}`);
        if (l.home === t.teamA) { aggA += l.hs; aggB += l.as; }
        else                     { aggB += l.hs; aggA += l.as; }
      }
    }
    const headRow = el('div', 'display: flex; justify-content: space-between; font-weight: 800;');
    headRow.appendChild(el('div', `color: ${t.winnerId === t.teamA ? accent : C.text};`, a.name));
    headRow.appendChild(el('div', `color: ${C.dim};`, `${aggA} - ${aggB}`));
    headRow.appendChild(el('div', `color: ${t.winnerId === t.teamB ? accent : C.text};`, b.name));
    tie.appendChild(headRow);
    for (const ll of legLines) {
      tie.appendChild(el('div', `font-size: 11px; color: ${C.dim}; margin-top: 2px;`, ll));
    }
    if (t.winnerId) {
      const w = findTeam(career.world, t.winnerId);
      tie.appendChild(el('div', `font-size: 11px; color: ${accent}; font-weight: 800; margin-top: 4px;`,
        `→ ${w.name} advance`));
    }
    return tie;
  }

  // Initial render
  render();

  // Auto-restock the scout shop every second; only re-renders if the
  // youth tab is open so we don't constantly thrash the rest of the UI.
  const scoutTimer = setInterval(() => {
    if (!career) return;
    const restocked = maybeRestockScoutShop(career);
    if (restocked) saveCareer(career);
    if (activeTab === 'youth') render();
  }, 1000);

  return {
    destroy() {
      clearInterval(scoutTimer);
      if (root.parentNode) root.remove();
    },
  };
}

function button(label, color, fill = false) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `
    background: ${fill ? color : 'transparent'};
    color: ${fill ? '#0a0a1a' : color};
    border: 1.5px solid ${color}; border-radius: 6px;
    padding: 6px 12px; font-weight: 800; font-size: 12px;
    letter-spacing: 1px; cursor: pointer;
  `;
  return b;
}
