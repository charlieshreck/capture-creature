// FC Computer — full UI. Original visual design, no real-product styling.
//
// Layout:
//   [ top bar with FCP + Gems + tab buttons ]
//   [ active panel: Hub / Packs / Collection / Match ]

import {
  FCP_START, GEMS_START, TIERS, PACKS,
  openPack, generateCard, formatFCP, formatGems, pickTier, tierForRating,
  FORMATION_433, slotAccepts, teamOVR,
} from './data.js';

const C = {
  bg:       '#0b1224',
  panel:    '#121a33',
  panel2:   '#1d2748',
  border:   '#2b3a66',
  text:     '#e6ecff',
  dim:      '#8da2cf',
  accent:   '#3ee0c8',     // teal
  warn:     '#ffaf3a',
  danger:   '#ff5a6a',
  fcp:      '#ffd84f',
  gem:      '#7af0ff',
};

const SAVE_KEY = 'cc_fc_';

function loadSave(username) {
  try {
    const raw = localStorage.getItem(SAVE_KEY + username.toLowerCase());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveSave(username, state) {
  try { localStorage.setItem(SAVE_KEY + username.toLowerCase(), JSON.stringify(state)); }
  catch {}
}
function newState() {
  return {
    fcp: FCP_START,
    gems: GEMS_START,
    collection: [],
    squad: new Array(FORMATION_433.length).fill(null),     // card ids per slot
    packsOpened: 0,
    matchesWon: 0,
    matchesPlayed: 0,
    lastDailyTs: 0,
  };
}

function el(tag, css, text) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  return e;
}
function btn(label, color, fill = false) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `
    background: ${fill ? color : 'transparent'};
    color: ${fill ? '#08111e' : color};
    border: 1.5px solid ${color}; border-radius: 8px;
    padding: 8px 14px; font-weight: 800; font-size: 13px;
    letter-spacing: 1px; cursor: pointer;
  `;
  return b;
}

export function createFCComputerUI({ username, onBack }) {
  let state = loadSave(username);
  if (!state) {
    state = newState();
    saveSave(username, state);
  }
  // Backfill new fields for old saves
  if (!state.squad || state.squad.length !== FORMATION_433.length) {
    state.squad = new Array(FORMATION_433.length).fill(null);
  }

  const root = el('div', `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh; z-index: 9000;
    background: ${C.bg}; color: ${C.text};
    font-family: system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; overflow: hidden;
  `);
  document.body.appendChild(root);

  // Background pattern (subtle hex grid)
  const bgLayer = el('div', `
    position: absolute; inset: 0;
    background-image: radial-gradient(circle at 20% 20%, rgba(62,224,200,0.06) 0, transparent 40%),
                      radial-gradient(circle at 80% 80%, rgba(122,240,255,0.05) 0, transparent 40%);
    pointer-events: none;
  `);
  root.appendChild(bgLayer);

  // ---- Top bar ----
  const top = el('div', `
    display: flex; align-items: center; gap: 12px;
    padding: 12px 20px; background: ${C.panel};
    border-bottom: 1px solid ${C.border};
    position: relative; z-index: 1;
  `);
  root.appendChild(top);

  const backBtn = btn('← BACK', C.warn);
  backBtn.addEventListener('click', () => { saveSave(username, state); if (onBack) onBack(); });
  top.appendChild(backBtn);

  const titleEl = el('div', `
    font-weight: 900; font-size: 18px; letter-spacing: 3px;
    color: ${C.accent}; display: flex; align-items: center; gap: 8px;
  `);
  titleEl.innerHTML = `<span style="color:${C.text}">FC</span> COMPUTER`;
  top.appendChild(titleEl);

  const tabsBar = el('div', 'display: flex; gap: 6px; margin-left: 16px;');
  top.appendChild(tabsBar);

  const spacer = el('div', 'flex: 1;');
  top.appendChild(spacer);

  const cur = el('div', 'display: flex; gap: 14px; align-items: center; font-weight: 800;');
  top.appendChild(cur);
  const fcpEl = el('div', `color: ${C.fcp}; font-size: 14px;`, '');
  const gemEl = el('div', `color: ${C.gem}; font-size: 14px;`, '');
  cur.appendChild(fcpEl);
  cur.appendChild(gemEl);

  // ---- Main body ----
  const body = el('div', `
    flex: 1; overflow: auto; padding: 24px;
    display: flex; flex-direction: column; align-items: stretch;
    position: relative; z-index: 1;
  `);
  root.appendChild(body);

  // Animation styles
  if (!document.getElementById('cc-fc-style')) {
    const s = document.createElement('style');
    s.id = 'cc-fc-style';
    s.textContent = `
      @keyframes fc-flip-in {
        0%   { transform: rotateY(90deg) scale(0.7); opacity: 0; }
        100% { transform: rotateY(0deg) scale(1);   opacity: 1; }
      }
      @keyframes fc-pop {
        0% { transform: scale(0.6); opacity: 0; }
        80% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); }
      }
      .fc-card-hover { transition: transform 0.18s; }
      .fc-card-hover:hover { transform: translateY(-4px); }
    `;
    document.head.appendChild(s);
  }

  // ---- Tabs ----
  const TABS = [
    { id: 'hub',        label: 'Home' },
    { id: 'packs',      label: 'Packs' },
    { id: 'collection', label: 'Collection' },
    { id: 'squad',      label: 'Squad' },
    { id: 'match',      label: 'Quick Match' },
    { id: 'market',     label: 'Market' },
  ];
  let activeTab = 'hub';

  function refreshHeader() {
    fcpEl.textContent = formatFCP(state.fcp);
    gemEl.textContent = formatGems(state.gems);
    tabsBar.innerHTML = '';
    for (const t of TABS) {
      const b = el('button', `
        background: ${activeTab === t.id ? C.accent : C.panel2};
        color: ${activeTab === t.id ? '#08111e' : C.text};
        border: 1px solid ${C.border};
        border-radius: 6px; padding: 6px 12px;
        font-weight: 800; font-size: 12px; letter-spacing: 1px;
        cursor: pointer;
      `, t.label);
      b.addEventListener('click', () => { activeTab = t.id; render(); });
      tabsBar.appendChild(b);
    }
  }

  function render() {
    refreshHeader();
    body.innerHTML = '';
    // Market refs point to elements inside body — invalidate on each render
    marketCountdownEl = null;
    marketRefreshGrids = null;
    if (activeTab === 'hub') renderHub();
    else if (activeTab === 'packs') renderPacks();
    else if (activeTab === 'collection') renderCollection();
    else if (activeTab === 'squad') renderSquad();
    else if (activeTab === 'match') renderMatch();
    else if (activeTab === 'market') renderMarket();
  }

  // Look up a card by id from the user's collection.
  function findCard(id) {
    if (!id) return null;
    return state.collection.find((c) => c.id === id) || null;
  }
  // Cards currently assigned to the starting XI
  function squadCards() { return state.squad.map((id) => findCard(id)); }

  // ====================== HUB ======================
  function renderHub() {
    const wrap = el('div', 'max-width: 1100px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);

    const hero = el('div', `
      background: linear-gradient(135deg, ${C.panel} 0%, ${C.panel2} 100%);
      border: 1px solid ${C.border}; border-radius: 16px;
      padding: 28px 32px; margin-bottom: 18px;
      display: flex; align-items: center; gap: 22px;
    `);
    wrap.appendChild(hero);
    const heroLogo = el('div', `
      font-size: 56px; font-weight: 900; color: ${C.accent}; letter-spacing: 4px;
    `, 'FC');
    hero.appendChild(heroLogo);
    const heroInfo = el('div', 'flex: 1;');
    heroInfo.appendChild(el('div', `font-size: 13px; color: ${C.dim}; letter-spacing: 2px;`,
      `WELCOME, ${username.toUpperCase()}`));
    heroInfo.appendChild(el('div', 'font-size: 26px; font-weight: 900; margin: 4px 0;',
      `${state.collection.length} cards in your collection`));
    heroInfo.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      `${state.packsOpened} packs opened • ${state.matchesWon}/${state.matchesPlayed} matches won`));
    hero.appendChild(heroInfo);

    // Daily reward
    const now = Date.now();
    const canClaim = now - (state.lastDailyTs || 0) > 24 * 60 * 60 * 1000;
    const dailyBtn = btn(canClaim ? 'CLAIM DAILY (+250 FCP, +1 💎)' : 'DAILY CLAIMED',
      canClaim ? C.accent : C.dim, canClaim);
    dailyBtn.disabled = !canClaim;
    dailyBtn.style.opacity = canClaim ? '1' : '0.5';
    dailyBtn.style.cursor = canClaim ? 'pointer' : 'not-allowed';
    dailyBtn.addEventListener('click', () => {
      state.fcp += 250;
      state.gems += 1;
      state.lastDailyTs = now;
      saveSave(username, state);
      render();
    });
    hero.appendChild(dailyBtn);

    // Quick action tiles
    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    `);
    wrap.appendChild(grid);
    function tile(title, blurb, color, tab) {
      const card = el('button', `
        background: ${C.panel}; border: 2px solid ${color};
        border-radius: 12px; padding: 18px;
        cursor: pointer; text-align: left;
        display: flex; flex-direction: column; gap: 6px;
        color: ${C.text};
      `);
      card.appendChild(el('div', `font-size: 11px; color: ${color}; letter-spacing: 2px; font-weight: 800;`, title.toUpperCase()));
      card.appendChild(el('div', 'font-size: 16px; font-weight: 800;', blurb));
      card.addEventListener('click', () => { activeTab = tab; render(); });
      return card;
    }
    grid.appendChild(tile('Packs', 'Open packs to grow your collection', C.fcp, 'packs'));
    grid.appendChild(tile('Collection', 'View every card you own', C.accent, 'collection'));
    grid.appendChild(tile('Quick Match', 'Play against an AI side', C.gem, 'match'));
    grid.appendChild(tile('Market', 'Sell duplicates for FC Points', C.warn, 'market'));
  }

  // ====================== PACKS ======================
  function renderPacks() {
    const wrap = el('div', 'max-width: 1100px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);
    wrap.appendChild(headerBar('Pack Store',
      'Spend FC Points or Gems to open packs. Better packs guarantee rarer cards.'));

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    `);
    wrap.appendChild(grid);
    for (const p of PACKS) {
      const tierColor = p.guarantees && p.guarantees[0]
        ? (pickTier(p.guarantees[0]) || { glow: C.accent }).glow
        : C.accent;
      const card = el('div', `
        background: ${C.panel}; border: 2px solid ${tierColor}55;
        border-radius: 12px; padding: 16px;
        display: flex; flex-direction: column; gap: 8px;
        position: relative; overflow: hidden;
      `);
      // Tier glow bar
      const bar = el('div', `
        position: absolute; top: 0; left: 0; right: 0; height: 4px;
        background: ${tierColor};
      `);
      card.appendChild(bar);
      card.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`,
        p.cur === 'gems' ? 'PREMIUM' : 'STANDARD'));
      card.appendChild(el('div', 'font-size: 18px; font-weight: 900;', p.name));
      card.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, p.blurb));
      const priceRow = el('div', 'display: flex; align-items: center; gap: 10px; margin-top: 6px;');
      priceRow.appendChild(el('div', `
        font-weight: 900; font-size: 16px;
        color: ${p.cur === 'gems' ? C.gem : C.fcp};
      `, p.cur === 'gems' ? `${p.cost} 💎` : `${p.cost} FCP`));
      const buy = btn('OPEN', tierColor, true);
      const canAfford = p.cur === 'gems' ? state.gems >= p.cost : state.fcp >= p.cost;
      buy.disabled = !canAfford;
      buy.style.opacity = canAfford ? '1' : '0.4';
      buy.style.cursor = canAfford ? 'pointer' : 'not-allowed';
      buy.addEventListener('click', () => {
        if (!canAfford) return;
        if (p.cur === 'gems') state.gems -= p.cost;
        else state.fcp -= p.cost;
        const cards = openPack(p);
        state.collection.push(...cards);
        state.packsOpened++;
        saveSave(username, state);
        showPackReveal(cards, () => render());
      });
      priceRow.appendChild(buy);
      card.appendChild(priceRow);
      grid.appendChild(card);
    }
  }

  // Pack reveal: shows cards one-by-one with a flip animation.
  function showPackReveal(cards, onDone) {
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 20px;
    `);
    root.appendChild(overlay);
    overlay.appendChild(el('div', `font-size: 12px; color: ${C.dim}; letter-spacing: 3px;`,
      'PACK OPENING'));
    const slot = el('div', `
      display: flex; align-items: center; justify-content: center;
      min-width: 240px; min-height: 340px;
    `);
    overlay.appendChild(slot);
    const counter = el('div', `font-size: 14px; color: ${C.dim};`, '');
    overlay.appendChild(counter);
    const nextBtn = btn('NEXT', C.accent, true);
    overlay.appendChild(nextBtn);
    let idx = 0;
    function showNext() {
      if (idx >= cards.length) {
        overlay.remove();
        onDone && onDone();
        return;
      }
      const c = cards[idx];
      slot.innerHTML = '';
      const cardEl = makeCardDisplay(c, 'large');
      cardEl.style.animation = 'fc-flip-in 0.55s ease-out';
      slot.appendChild(cardEl);
      counter.textContent = `Card ${idx + 1} / ${cards.length}`;
      idx++;
      nextBtn.textContent = idx >= cards.length ? 'DONE' : 'NEXT';
    }
    nextBtn.addEventListener('click', showNext);
    showNext();
  }

  // ====================== COLLECTION ======================
  let collectionFilter = 'all';
  function renderCollection() {
    const wrap = el('div', 'max-width: 1300px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);
    wrap.appendChild(headerBar('Your Collection',
      `${state.collection.length} cards owned. Click filter buttons to narrow down.`));

    // Filter bar
    const filterRow = el('div', 'display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap;');
    wrap.appendChild(filterRow);
    function filterBtn(id, label, color) {
      const b = el('button', `
        background: ${collectionFilter === id ? color : C.panel2};
        color: ${collectionFilter === id ? '#08111e' : C.text};
        border: 1px solid ${color}; border-radius: 6px;
        padding: 6px 12px; font-weight: 800; font-size: 11px; letter-spacing: 1px;
        cursor: pointer;
      `, label);
      b.addEventListener('click', () => { collectionFilter = id; render(); });
      filterRow.appendChild(b);
    }
    filterBtn('all', `ALL (${state.collection.length})`, C.dim);
    for (const t of TIERS) {
      const n = state.collection.filter((c) => c.tier === t.id).length;
      filterBtn(t.id, `${t.name.toUpperCase()} (${n})`, t.glow);
    }

    const filtered = collectionFilter === 'all'
      ? state.collection
      : state.collection.filter((c) => c.tier === collectionFilter);
    const sorted = filtered.slice().sort((a, b) => b.rating - a.rating);

    if (sorted.length === 0) {
      wrap.appendChild(el('div', `
        padding: 40px; text-align: center; color: ${C.dim};
        background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 12px;
      `, 'No cards yet. Open some packs!'));
      return;
    }

    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
    `);
    wrap.appendChild(grid);
    for (const c of sorted) {
      grid.appendChild(makeCardDisplay(c, 'small'));
    }
  }

  // ====================== SQUAD ======================
  function renderSquad() {
    const wrap = el('div', 'max-width: 1300px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);
    const cards = squadCards();
    const ovr = teamOVR(cards);
    const filled = cards.filter(Boolean).length;

    // Header with team OVR
    const head = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 12px; padding: 18px 22px; margin-bottom: 16px;
      display: flex; align-items: center; gap: 24px;
    `);
    wrap.appendChild(head);
    const ovrBox = el('div', `text-align: center; min-width: 110px;`);
    ovrBox.appendChild(el('div', `font-size: 10px; color: ${C.dim}; letter-spacing: 2px;`, 'TEAM OVR'));
    ovrBox.appendChild(el('div', `font-size: 56px; font-weight: 900; color: ${C.accent}; line-height: 1;`, String(ovr)));
    head.appendChild(ovrBox);
    const info = el('div', 'flex: 1;');
    info.appendChild(el('div', 'font-size: 20px; font-weight: 800;', 'Your Starting XI'));
    info.appendChild(el('div', `font-size: 12px; color: ${C.dim};`,
      `${filled}/11 slots filled • Click an empty slot to pick a player`));
    head.appendChild(info);
    const clearBtn = btn('CLEAR ALL', C.danger);
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear every slot?')) return;
      state.squad = new Array(FORMATION_433.length).fill(null);
      saveSave(username, state);
      render();
    });
    head.appendChild(clearBtn);
    const autoBtn = btn('AUTO FILL', C.accent, true);
    autoBtn.addEventListener('click', () => {
      autoFillSquad();
      saveSave(username, state);
      render();
    });
    head.appendChild(autoBtn);

    // Pitch view with formation slots
    const pitch = el('div', `
      position: relative; width: 100%; aspect-ratio: 3 / 4;
      max-width: 560px; margin: 0 auto 18px;
      background:
        linear-gradient(180deg, #1f6b29 0%, #2e7d32 100%);
      border: 2px solid ${C.border}; border-radius: 12px;
      overflow: hidden;
    `);
    wrap.appendChild(pitch);
    // Pitch markings (simple)
    const markings = el('div', `
      position: absolute; inset: 12px;
      border: 2px solid rgba(255,255,255,0.45); border-radius: 6px;
    `);
    pitch.appendChild(markings);
    const halfLine = el('div', `
      position: absolute; left: 12px; right: 12px; top: 50%;
      height: 2px; background: rgba(255,255,255,0.45);
    `);
    pitch.appendChild(halfLine);
    const circle = el('div', `
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: 22%; aspect-ratio: 1; border: 2px solid rgba(255,255,255,0.45);
      border-radius: 50%;
    `);
    pitch.appendChild(circle);

    // Slots
    FORMATION_433.forEach((slot, idx) => {
      const card = cards[idx];
      const slotEl = el('div', `
        position: absolute; left: ${slot.x}%; top: ${slot.y}%;
        transform: translate(-50%, -50%);
        width: 84px; cursor: pointer;
      `);
      slotEl.addEventListener('click', () => openSlotPicker(idx));
      if (card) {
        slotEl.appendChild(makeCardDisplay(card, 'mini'));
        const slotLbl = el('div', `
          font-size: 9px; color: rgba(0,0,0,0.85); text-align: center;
          margin-top: 2px; font-weight: 800; letter-spacing: 1px;
        `, slot.slot);
        slotEl.appendChild(slotLbl);
      } else {
        const empty = el('div', `
          width: 84px; height: 110px;
          background: rgba(0,0,0,0.35);
          border: 2px dashed rgba(255,255,255,0.5);
          border-radius: 8px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.85); gap: 4px;
        `);
        empty.appendChild(el('div', 'font-size: 18px; font-weight: 900;', '+'));
        empty.appendChild(el('div', `font-size: 10px; letter-spacing: 1px;`, slot.slot));
        slotEl.appendChild(empty);
      }
      pitch.appendChild(slotEl);
    });

    // Reserves — cards not in the XI
    const usedIds = new Set(state.squad.filter(Boolean));
    const reserves = state.collection.filter((c) => !usedIds.has(c.id))
      .sort((a, b) => b.rating - a.rating);
    wrap.appendChild(el('div', `
      font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin: 4px 0 8px;
    `, `RESERVES (${reserves.length})`));
    if (reserves.length === 0) {
      wrap.appendChild(el('div', `
        padding: 20px; text-align: center; color: ${C.dim};
        background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px;
      `, 'No reserves. Open more packs.'));
      return;
    }
    const grid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    `);
    wrap.appendChild(grid);
    for (const c of reserves) grid.appendChild(makeCardDisplay(c, 'small'));
  }

  // Auto-fill: pick the best available card for each slot (respecting position).
  function autoFillSquad() {
    const usedIds = new Set();
    const pool = state.collection.slice().sort((a, b) => b.rating - a.rating);
    state.squad = FORMATION_433.map((slot) => {
      // First pass: position-matching cards
      const match = pool.find((c) => !usedIds.has(c.id) && slotAccepts(slot.slot, c.pos));
      if (match) { usedIds.add(match.id); return match.id; }
      // Fallback: best remaining card of any position
      const any = pool.find((c) => !usedIds.has(c.id));
      if (any) { usedIds.add(any.id); return any.id; }
      return null;
    });
  }

  // Open the slot picker modal for the given slot index.
  function openSlotPicker(slotIdx) {
    const slot = FORMATION_433[slotIdx];
    const current = findCard(state.squad[slotIdx]);
    const usedIds = new Set(state.squad.filter(Boolean));
    if (current) usedIds.delete(current.id);     // allow swapping the current
    // Eligible: accepted by slot AND not already in another slot
    const acceptable = state.collection.filter((c) => !usedIds.has(c.id) && slotAccepts(slot.slot, c.pos));
    const others     = state.collection.filter((c) => !usedIds.has(c.id) && !slotAccepts(slot.slot, c.pos));

    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${C.accent}; border-radius: 12px;
      padding: 18px 22px; width: 720px; max-width: 96vw; max-height: 86vh; overflow: auto;
    `);
    overlay.appendChild(box);
    box.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`,
      `PICK A PLAYER FOR ${slot.slot}`));
    if (current) {
      const curRow = el('div', `
        display: flex; align-items: center; gap: 12px; margin: 8px 0 14px;
        padding: 10px; background: ${C.panel2}; border-radius: 8px;
      `);
      const cur = el('div', '');
      cur.appendChild(makeCardDisplay(current, 'mini'));
      curRow.appendChild(cur);
      curRow.appendChild(el('div', 'flex: 1;',
        `Currently: ${current.fullName} (${current.rating})`));
      const removeBtn = btn('REMOVE', C.danger);
      removeBtn.addEventListener('click', () => {
        state.squad[slotIdx] = null;
        saveSave(username, state);
        overlay.remove();
        render();
      });
      curRow.appendChild(removeBtn);
      box.appendChild(curRow);
    }

    function renderList(title, list, color) {
      if (list.length === 0) return;
      box.appendChild(el('div', `
        font-size: 11px; color: ${color}; letter-spacing: 2px; margin: 8px 0 6px;
      `, title));
      const grid = el('div', `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 8px;
      `);
      box.appendChild(grid);
      for (const c of list.sort((a, b) => b.rating - a.rating)) {
        const wrapC = el('div', 'cursor: pointer;');
        wrapC.appendChild(makeCardDisplay(c, 'small'));
        wrapC.addEventListener('click', () => {
          state.squad[slotIdx] = c.id;
          saveSave(username, state);
          overlay.remove();
          render();
        });
        grid.appendChild(wrapC);
      }
    }
    renderList('BEST FIT', acceptable, C.accent);
    renderList('OUT OF POSITION', others, C.warn);
    if (acceptable.length === 0 && others.length === 0) {
      box.appendChild(el('div', `padding: 30px; text-align: center; color: ${C.dim};`,
        'No spare cards. Open more packs.'));
    }

    const closeRow = el('div', 'display: flex; justify-content: flex-end; margin-top: 14px;');
    box.appendChild(closeRow);
    const cancelBtn = btn('CANCEL', C.danger);
    cancelBtn.addEventListener('click', () => overlay.remove());
    closeRow.appendChild(cancelBtn);
  }

  // ====================== QUICK MATCH ======================
  function renderMatch() {
    const wrap = el('div', 'max-width: 1000px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);
    wrap.appendChild(headerBar('Quick Match',
      'Plays your starting XI against an AI opponent. Win to earn FC Points and gems.'));

    // Prefer the user's set squad; fall back to auto-pick top 11
    const sCards = squadCards();
    const filled = sCards.filter(Boolean);
    let xi, myRating, usedSquadTab;
    if (filled.length === 11) {
      xi = sCards;
      myRating = teamOVR(xi);
      usedSquadTab = true;
    } else {
      xi = state.collection.slice().sort((a, b) => b.rating - a.rating).slice(0, 11);
      if (xi.length < 11) {
        wrap.appendChild(el('div', `
          padding: 30px; text-align: center; color: ${C.dim};
          background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 12px;
        `, `You need at least 11 cards to play a match. You have ${xi.length}.`));
        return;
      }
      myRating = Math.round(xi.reduce((s, c) => s + c.rating, 0) / 11);
      usedSquadTab = false;
    }

    const box = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 12px; padding: 18px; margin-bottom: 12px;
    `);
    wrap.appendChild(box);
    const stats = el('div', 'display: flex; gap: 30px; margin-bottom: 14px;');
    box.appendChild(stats);
    stats.appendChild(stat('Team OVR', String(myRating), C.accent));
    stats.appendChild(stat('Matches', String(state.matchesPlayed), C.dim));
    stats.appendChild(stat('Win Rate', state.matchesPlayed > 0
      ? Math.round(state.matchesWon * 100 / state.matchesPlayed) + '%' : '–', C.fcp));
    if (!usedSquadTab) {
      stats.appendChild(stat('Using', 'auto top 11', C.warn));
    }

    const findBtn = btn('FIND MATCH', C.accent, true);
    findBtn.style.fontSize = '16px';
    findBtn.style.padding = '14px 20px';
    findBtn.addEventListener('click', () => {
      const oppRating = Math.max(50, Math.min(99, myRating + Math.floor((Math.random() - 0.5) * 12)));
      runMatch(myRating, oppRating);
    });
    box.appendChild(findBtn);

    wrap.appendChild(el('div', `
      font-size: 11px; color: ${C.dim}; letter-spacing: 2px; margin: 16px 0 8px;
    `, usedSquadTab ? 'YOUR STARTING XI' : 'AUTO-PICKED TOP XI (set a squad in the Squad tab)'));
    const xiGrid = el('div', `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
    `);
    for (const c of xi) xiGrid.appendChild(makeCardDisplay(c, 'small'));
    wrap.appendChild(xiGrid);
  }

  function runMatch(myR, oppR) {
    // Simple Poisson-based simulation, similar to manager game
    const baseMy  = 1.3 + (myR - oppR) * 0.04;
    const baseOpp = 1.1 - (myR - oppR) * 0.04;
    function poiss(lambda) {
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    }
    const mine = Math.max(0, poiss(Math.max(0.2, baseMy)));
    const theirs = Math.max(0, poiss(Math.max(0.2, baseOpp)));

    state.matchesPlayed++;
    const win = mine > theirs;
    const draw = mine === theirs;
    if (win) {
      state.matchesWon++;
      state.fcp += 300;
      state.gems += 1;
    } else if (draw) {
      state.fcp += 100;
    }
    saveSave(username, state);
    showMatchResult(mine, theirs, oppR, win, draw);
  }

  function showMatchResult(mine, theirs, oppR, win, draw) {
    const overlay = el('div', `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `);
    root.appendChild(overlay);
    const box = el('div', `
      background: ${C.panel}; border: 2px solid ${win ? C.accent : draw ? C.warn : C.danger};
      border-radius: 12px; padding: 28px 32px; min-width: 360px; text-align: center;
    `);
    overlay.appendChild(box);
    const verdict = win ? 'WIN!' : draw ? 'DRAW' : 'LOSS';
    const color = win ? C.accent : draw ? C.warn : C.danger;
    box.appendChild(el('div', `font-size: 36px; font-weight: 900; color: ${color};`, verdict));
    box.appendChild(el('div', `font-size: 12px; color: ${C.dim}; margin: 4px 0 14px;`,
      `Opponent rating ${oppR}`));
    box.appendChild(el('div', `font-size: 56px; font-weight: 900; margin: 10px 0;`,
      `${mine} - ${theirs}`));
    if (win) {
      box.appendChild(el('div', `color: ${C.fcp}; font-weight: 800;`,
        '+300 FCP • +1 💎'));
    } else if (draw) {
      box.appendChild(el('div', `color: ${C.fcp};`, '+100 FCP'));
    } else {
      box.appendChild(el('div', `color: ${C.dim};`, 'No reward — try again.'));
    }
    const ok = btn('OK', color, true);
    ok.style.marginTop = '16px';
    ok.addEventListener('click', () => { overlay.remove(); render(); });
    box.appendChild(ok);
  }

  // ====================== MARKET ======================
  // Market listings — auto-restocked every 45s. Stored on state so they
  // persist across renders and saves.
  const MARKET_RESTOCK_MS = 45_000;
  const MARKET_LISTING_COUNT = 18;
  function ensureMarketListings() {
    const now = Date.now();
    if (!state.marketListings || !state.marketUntil || now >= state.marketUntil) {
      state.marketListings = [];
      for (let i = 0; i < MARKET_LISTING_COUNT; i++) {
        const card = generateCard();
        state.marketListings.push({ ...card, askPrice: Math.round(card.value * 1.4) });
      }
      state.marketUntil = now + MARKET_RESTOCK_MS;
      saveSave(username, state);
    }
  }

  let marketSearch = '';
  // Refs that the 1s ticker uses to update the market view in place
  // without destroying the search input the user is typing in.
  let marketCountdownEl = null;
  let marketRefreshGrids = null;
  function renderMarket() {
    ensureMarketListings();
    const wrap = el('div', 'max-width: 1300px; width: 100%; margin: 0 auto;');
    body.appendChild(wrap);
    wrap.appendChild(headerBar('Market',
      'Buy cards from the live market or sell your spares for FC Points. Instant transactions.'));

    // ----- Search bar (built once per render; not recreated on keystroke) -----
    const searchBar = el('div', `
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 10px; padding: 8px 12px;
    `);
    wrap.appendChild(searchBar);
    searchBar.appendChild(el('div', `font-size: 11px; color: ${C.dim}; letter-spacing: 2px;`, '🔍 LOOK UP'));
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by player name or rating (e.g. "85" or "Smith")';
    searchInput.value = marketSearch;
    searchInput.style.cssText = `
      flex: 1; background: ${C.bg}; color: ${C.text};
      border: 1px solid ${C.border}; border-radius: 6px;
      padding: 6px 10px; font-size: 13px;
    `;
    searchInput.addEventListener('input', () => {
      marketSearch = searchInput.value;
      clearBtn.style.display = marketSearch ? '' : 'none';
      refreshGrids();
    });
    searchBar.appendChild(searchInput);
    const clearBtn = btn('CLEAR', C.danger);
    clearBtn.style.padding = '4px 10px'; clearBtn.style.fontSize = '11px';
    clearBtn.style.display = marketSearch ? '' : 'none';
    clearBtn.addEventListener('click', () => {
      marketSearch = '';
      searchInput.value = '';
      clearBtn.style.display = 'none';
      refreshGrids();
      searchInput.focus();
    });
    searchBar.appendChild(clearBtn);

    const matches = (c) => {
      if (!marketSearch) return true;
      const q = marketSearch.toLowerCase().trim();
      if (!q) return true;
      if (/^\d+$/.test(q) && c.rating >= parseInt(q, 10)) return true;
      const name = (c.fullName || c.name || '').toLowerCase();
      const surname = (c.surname || c.name || '').toLowerCase();
      return name.includes(q) || surname.includes(q) || c.pos.toLowerCase() === q;
    };

    // ----- BUY section shell -----
    const buyBox = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 12px; padding: 14px; margin-bottom: 16px;
    `);
    wrap.appendChild(buyBox);
    const buyHead = el('div', 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;');
    buyBox.appendChild(buyHead);
    const buyCountEl = el('div', `font-size: 12px; color: ${C.dim}; letter-spacing: 2px;`, '');
    buyHead.appendChild(buyCountEl);
    buyHead.appendChild(el('div', 'flex: 1;', ''));
    const countdownEl = el('div', `font-size: 11px; color: ${C.warn};`, '');
    buyHead.appendChild(countdownEl);
    marketCountdownEl = countdownEl;
    const buyBody = el('div', '');
    buyBox.appendChild(buyBody);

    // ----- SELL section shell -----
    const sellBox = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 12px; padding: 14px;
    `);
    wrap.appendChild(sellBox);
    const sellCountEl = el('div', `font-size: 12px; color: ${C.dim}; letter-spacing: 2px; margin-bottom: 10px;`, '');
    sellBox.appendChild(sellCountEl);
    const sellBody = el('div', '');
    sellBox.appendChild(sellBody);

    function buildBuyGrid() {
      buyBody.innerHTML = '';
      const listings = (state.marketListings || []).filter(matches).slice().sort((a, b) => b.rating - a.rating);
      buyCountEl.textContent = `BUY CARDS (${listings.length}${marketSearch ? ' matching' : ''})`;
      if (listings.length === 0) {
        buyBody.appendChild(el('div', `padding: 24px; text-align: center; color: ${C.dim};`,
          marketSearch ? 'No listings match your search.' : 'Market is restocking…'));
        return;
      }
      const grid = el('div', `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 10px;
      `);
      buyBody.appendChild(grid);
      for (const c of listings) {
        const wrapCard = el('div', 'display: flex; flex-direction: column; gap: 6px;');
        wrapCard.appendChild(makeCardDisplay(c, 'small'));
        const canAfford = state.fcp >= c.askPrice;
        const buyBtn = btn(`Buy · ${formatFCP(c.askPrice)}`, C.accent, true);
        buyBtn.style.padding = '6px 8px'; buyBtn.style.fontSize = '11px';
        buyBtn.disabled = !canAfford;
        buyBtn.style.opacity = canAfford ? '1' : '0.5';
        buyBtn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
        buyBtn.addEventListener('click', () => {
          if (!canAfford) return;
          const idx = state.marketListings.findIndex((x) => x.id === c.id);
          if (idx < 0) return;
          const listing = state.marketListings[idx];
          state.fcp -= listing.askPrice;
          const { askPrice, ...cleanCard } = listing;
          state.collection.push(cleanCard);
          state.marketListings.splice(idx, 1);
          saveSave(username, state);
          refreshHeader();
          refreshGrids();
        });
        wrapCard.appendChild(buyBtn);
        grid.appendChild(wrapCard);
      }
    }

    function buildSellGrid() {
      sellBody.innerHTML = '';
      const sorted = state.collection.filter(matches).slice().sort((a, b) => a.rating - b.rating);
      sellCountEl.textContent = `SELL CARDS (${sorted.length}${marketSearch ? ' matching' : ''})`;
      if (state.collection.length === 0) {
        sellBody.appendChild(el('div', `padding: 24px; text-align: center; color: ${C.dim};`,
          'You have no cards to sell yet.'));
        return;
      }
      if (sorted.length === 0) {
        sellBody.appendChild(el('div', `padding: 24px; text-align: center; color: ${C.dim};`,
          'No cards in your collection match your search.'));
        return;
      }
      const grid = el('div', `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 10px;
      `);
      sellBody.appendChild(grid);
      for (const c of sorted) {
        const wrapCard = el('div', 'display: flex; flex-direction: column; gap: 6px;');
        wrapCard.appendChild(makeCardDisplay(c, 'small'));
        const sellBtn = btn(`Sell · ${formatFCP(c.value)}`, C.warn, true);
        sellBtn.style.padding = '6px 8px'; sellBtn.style.fontSize = '11px';
        sellBtn.addEventListener('click', () => {
          const idx = state.collection.findIndex((x) => x.id === c.id);
          if (idx < 0) return;
          state.collection.splice(idx, 1);
          state.fcp += c.value;
          if (state.squad) state.squad = state.squad.map((id) => id === c.id ? null : id);
          saveSave(username, state);
          refreshHeader();
          refreshGrids();
        });
        wrapCard.appendChild(sellBtn);
        grid.appendChild(wrapCard);
      }
    }

    function refreshGrids() {
      buildBuyGrid();
      buildSellGrid();
    }
    marketRefreshGrids = refreshGrids;

    // Initial fill + countdown text
    refreshGrids();
    const secs = Math.max(0, Math.ceil(((state.marketUntil || 0) - Date.now()) / 1000));
    countdownEl.textContent = `Refresh in ${secs}s`;
  }

  // ====================== Helpers ======================
  // ---- Procedural face renderer ----
  // Draws a simple cartoon face on a canvas, varied by card.id so each
  // card always looks the same. Cached as a data URL.
  const faceCache = new Map();
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
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
  function drawFace(card, size, tier) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const rng = mulberry32(hashStr('face_' + card.id));
    // Expanded palettes for more variety across cards
    const SKIN = [
      '#fbe1c2','#f4c79c','#e8b889','#dba272','#c89968','#b6845a',
      '#9d6b48','#7d543a','#5d3e29','#3d2417',
    ];
    const HAIR = [
      '#0a0a0a','#1a0f08','#2a1a0e','#3b2a1a','#5a3a1d','#6b4523',
      '#8b5a2b','#a06a32','#c9a26a','#dec39c','#f3e1b8','#fffff0',
      '#2d2d2d','#555555','#888888','#cccccc','#aa3322','#cc4422',
    ];
    const skin = SKIN[Math.floor(rng() * SKIN.length)];
    const hair = HAIR[Math.floor(rng() * HAIR.length)];
    const hairStyle = Math.floor(rng() * 8);   // 0 short,1 long,2 bald,3 mohawk,4 buzz,5 side-part,6 curly,7 slicked
    const beardType = rng() < 0.4
      ? (rng() < 0.6 ? 'full' : rng() < 0.5 ? 'goatee' : 'mustache')
      : 'none';
    const hasHeadband = rng() < 0.10;
    const hasGlasses = rng() < 0.08;
    const browAngle = (rng() - 0.5) * 0.18;
    const mouthCurve = rng() < 0.72 ? 1 : -1;
    // Background — stronger for higher tier cards
    const tierRank = TIERS.findIndex((t) => tier && t.id === tier.id);
    const intensity = tierRank >= 4 ? '88' : tierRank >= 3 ? '66' : tierRank >= 2 ? '44' : '33';
    const grad = ctx.createRadialGradient(size/2, size*0.4, size*0.1, size/2, size/2, size*0.7);
    grad.addColorStop(0, (tier && tier.glow) ? tier.glow + intensity : '#1a244033');
    grad.addColorStop(1, '#0b1224');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Subtle rays for Icon/Legend
    if (tierRank >= 4) {
      ctx.save();
      ctx.translate(size/2, size*0.4);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI/6);
        const g = ctx.createLinearGradient(0, 0, 0, size*0.7);
        g.addColorStop(0, (tier.glow || '#fff') + '55');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-size*0.04, 0); ctx.lineTo(size*0.04, 0);
        ctx.lineTo(size*0.08, size*0.7); ctx.lineTo(-size*0.08, size*0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // Neck / shoulders
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(size*0.5, size*0.95, size*0.35, size*0.18, 0, 0, Math.PI*2);
    ctx.fill();
    // Shirt collar (tier-tinted)
    ctx.fillStyle = (tier && tier.glow) || '#3ee0c8';
    ctx.beginPath();
    ctx.ellipse(size*0.5, size*1.02, size*0.4, size*0.18, 0, 0, Math.PI*2);
    ctx.fill();
    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(size*0.5, size*0.5, size*0.27, size*0.32, 0, 0, Math.PI*2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.ellipse(size*0.22, size*0.52, size*0.04, size*0.07, 0, 0, Math.PI*2);
    ctx.ellipse(size*0.78, size*0.52, size*0.04, size*0.07, 0, 0, Math.PI*2);
    ctx.fill();
    // Hair
    if (hairStyle !== 2) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      if (hairStyle === 0) {
        // Short fade
        ctx.ellipse(size*0.5, size*0.3, size*0.27, size*0.13, 0, Math.PI, 2*Math.PI);
        ctx.fill();
      } else if (hairStyle === 1) {
        // Longer top + sides
        ctx.ellipse(size*0.5, size*0.32, size*0.3, size*0.22, 0, Math.PI, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size*0.23, size*0.45, size*0.05, size*0.1, 0, 0, Math.PI*2);
        ctx.ellipse(size*0.77, size*0.45, size*0.05, size*0.1, 0, 0, Math.PI*2);
        ctx.fill();
      } else if (hairStyle === 3) {
        // Mohawk
        ctx.fillRect(size*0.45, size*0.12, size*0.1, size*0.28);
      } else if (hairStyle === 4) {
        // Buzzcut — very thin layer
        ctx.ellipse(size*0.5, size*0.28, size*0.26, size*0.08, 0, Math.PI, 2*Math.PI);
        ctx.fill();
      } else if (hairStyle === 5) {
        // Side parted
        ctx.ellipse(size*0.5, size*0.3, size*0.27, size*0.14, 0, Math.PI, 2*Math.PI);
        ctx.fill();
        // Side sweep across forehead
        ctx.beginPath();
        ctx.moveTo(size*0.28, size*0.36);
        ctx.quadraticCurveTo(size*0.5, size*0.28, size*0.68, size*0.45);
        ctx.lineTo(size*0.6, size*0.46);
        ctx.quadraticCurveTo(size*0.5, size*0.34, size*0.34, size*0.42);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 6) {
        // Curly afro — cluster of small circles
        for (let i = 0; i < 14; i++) {
          const angle = Math.PI + (i / 13) * Math.PI;
          const px = size*0.5 + Math.cos(angle) * size*0.3;
          const py = size*0.3 + Math.sin(angle) * size*0.18;
          ctx.beginPath();
          ctx.arc(px, py, size*0.07, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        // Slicked back — flat top, sides
        ctx.ellipse(size*0.5, size*0.27, size*0.27, size*0.1, 0, Math.PI, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size*0.5, size*0.32, size*0.2, size*0.06, 0, Math.PI, 2*Math.PI);
        ctx.fill();
      }
    }
    // Headband
    if (hasHeadband) {
      const bandColors = ['#ff5252','#3ee0c8','#ffd84f','#ffffff','#222222','#7af0ff'];
      ctx.fillStyle = bandColors[Math.floor(rng() * bandColors.length)];
      ctx.fillRect(size*0.23, size*0.34, size*0.54, size*0.05);
    }
    // Eyebrows
    ctx.strokeStyle = hair;
    ctx.lineWidth = Math.max(1.4, size*0.025);
    ctx.lineCap = 'round';
    function brow(cx, cy, dir) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(dir * browAngle);
      ctx.beginPath();
      ctx.moveTo(-size*0.06, 0);
      ctx.lineTo( size*0.06, 0);
      ctx.stroke();
      ctx.restore();
    }
    brow(size*0.4, size*0.43, 1);
    brow(size*0.6, size*0.43, -1);
    // Eyes
    const eyeY = size*0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size*0.4, eyeY, size*0.045, 0, Math.PI*2);
    ctx.arc(size*0.6, eyeY, size*0.045, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(size*0.4, eyeY, size*0.025, 0, Math.PI*2);
    ctx.arc(size*0.6, eyeY, size*0.025, 0, Math.PI*2);
    ctx.fill();
    // Nose (tiny line)
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(1, size*0.015);
    ctx.beginPath();
    ctx.moveTo(size*0.5, size*0.55);
    ctx.lineTo(size*0.52, size*0.62);
    ctx.lineTo(size*0.5, size*0.64);
    ctx.stroke();
    // Mouth
    ctx.strokeStyle = '#5d2e2e';
    ctx.lineWidth = Math.max(1, size*0.02);
    ctx.beginPath();
    ctx.moveTo(size*0.42, size*0.72);
    ctx.quadraticCurveTo(size*0.5, size*0.72 + mouthCurve * size*0.02, size*0.58, size*0.72);
    ctx.stroke();
    // Beard / mustache
    if (beardType === 'full') {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(size*0.5, size*0.76, size*0.22, size*0.10, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(size*0.5, size*0.7, size*0.09, size*0.04, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#5d2e2e';
      ctx.lineWidth = Math.max(1, size*0.02);
      ctx.beginPath();
      ctx.moveTo(size*0.43, size*0.72);
      ctx.quadraticCurveTo(size*0.5, size*0.72 + mouthCurve * size*0.02, size*0.57, size*0.72);
      ctx.stroke();
    } else if (beardType === 'goatee') {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(size*0.5, size*0.78, size*0.07, size*0.07, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (beardType === 'mustache') {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(size*0.5, size*0.69, size*0.1, size*0.025, 0, 0, Math.PI*2);
      ctx.fill();
    }
    // Glasses
    if (hasGlasses) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(1, size*0.015);
      ctx.beginPath();
      ctx.arc(size*0.4, size*0.5, size*0.07, 0, Math.PI*2);
      ctx.arc(size*0.6, size*0.5, size*0.07, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size*0.47, size*0.5);
      ctx.lineTo(size*0.53, size*0.5);
      ctx.stroke();
    }
    return cv;
  }
  function makeFaceEl(card, size, tier) {
    const key = card.id + ':' + size;
    let url = faceCache.get(key);
    if (!url) {
      const dpi = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      url = drawFace(card, Math.round(size * dpi), tier).toDataURL();
      faceCache.set(key, url);
    }
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
      width: ${size}px; height: ${size}px; display: block;
      border-radius: 12px; margin: 0 auto;
      border: 2px solid ${tier && tier.glow ? tier.glow + '99' : 'rgba(255,255,255,0.2)'};
      background: #0b1224;
    `;
    return img;
  }

  function makeCardDisplay(c, size = 'small') {
    // Use the rating-derived tier (handles old saves with outdated tier ids).
    const tier = tierForRating(c.rating) || pickTier(c.tier) || TIERS[0];
    const big = size === 'large';
    const mini = size === 'mini';
    const w = big ? 240 : mini ? 84  : 150;
    const h = big ? 340 : mini ? 110 : 210;
    const card = el('div', `
      width: ${w}px; height: ${h}px;
      background: linear-gradient(160deg, ${tier.color}55 0%, ${C.panel} 60%);
      border: 2px solid ${tier.glow};
      border-radius: 12px; padding: 10px;
      display: flex; flex-direction: column; justify-content: space-between;
      color: ${C.text};
      box-shadow: 0 6px 18px rgba(0,0,0,0.4), 0 0 18px ${tier.glow}33;
    `);
    card.classList.add('fc-card-hover');

    // Top row: rating + position
    const topRow = el('div', 'display: flex; justify-content: space-between; align-items: flex-start;');
    card.appendChild(topRow);
    const ratingSize = big ? 48 : mini ? 22 : 32;
    const posSize    = big ? 16 : mini ? 10 : 12;
    const tagSize    = big ? 10 : mini ?  8 :  9;
    const nameSize   = big ? 18 : mini ? 10 : 13;
    const tierSize   = big ? 11 : mini ?  8 :  9;
    const rating = el('div', `
      font-size: ${ratingSize}px; font-weight: 900; line-height: 1; color: ${tier.glow};
    `, String(c.rating));
    topRow.appendChild(rating);
    const posTag = el('div', 'display: flex; flex-direction: column; align-items: flex-end; gap: 2px;');
    posTag.appendChild(el('div', `font-weight: 800; font-size: ${posSize}px;`, c.pos));
    posTag.appendChild(el('div', `font-size: ${tagSize}px; color: ${C.dim}; letter-spacing: 1px;`, c.tag));
    topRow.appendChild(posTag);

    // Face image (procedural cartoon)
    const faceSize = big ? 120 : mini ? 46 : 72;
    const faceWrap = el('div', `display: flex; justify-content: center; margin-top: 2px;`);
    faceWrap.appendChild(makeFaceEl(c, faceSize, tier));
    card.appendChild(faceWrap);

    // Name
    const name = el('div', `
      font-weight: 800; font-size: ${nameSize}px;
      text-align: center; line-height: 1.1;
      padding: 2px 2px 0;
    `, big ? c.fullName : c.name);
    card.appendChild(name);

    // Bottom: tier label
    const tierLbl = el('div', `
      font-size: ${tierSize}px; letter-spacing: 2px; font-weight: 800;
      color: ${tier.glow}; text-align: center;
    `, tier.name.toUpperCase());
    card.appendChild(tierLbl);
    if (big) {
      const stats = el('div', 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 6px;');
      stats.appendChild(statChip('PAC', c.pace));
      stats.appendChild(statChip('SHO', c.shoot));
      stats.appendChild(statChip('PAS', c.pass));
      stats.appendChild(statChip('DEF', c.defend));
      card.appendChild(stats);
    }
    return card;
  }
  function statChip(label, value) {
    const w = el('div', `
      background: rgba(0,0,0,0.35); border-radius: 4px;
      padding: 4px; text-align: center;
    `);
    w.appendChild(el('div', `font-size: 9px; color: ${C.dim}; letter-spacing: 1px;`, label));
    w.appendChild(el('div', `font-weight: 800; font-size: 14px; color: ${C.text};`, String(value)));
    return w;
  }
  function stat(label, val, color) {
    const w = el('div', '');
    w.appendChild(el('div', `font-size: 10px; color: ${C.dim}; letter-spacing: 1px;`, label.toUpperCase()));
    w.appendChild(el('div', `font-size: 22px; font-weight: 900; color: ${color};`, val));
    return w;
  }
  function headerBar(title, blurb) {
    const wrap = el('div', `
      background: ${C.panel}; border: 1px solid ${C.border};
      border-radius: 12px; padding: 16px 20px; margin-bottom: 14px;
    `);
    wrap.appendChild(el('div', 'font-size: 22px; font-weight: 900; margin-bottom: 4px;', title));
    wrap.appendChild(el('div', `font-size: 12px; color: ${C.dim};`, blurb));
    return wrap;
  }

  render();

  // 1s ticker — keeps the market countdown live and triggers restocks
  // without destroying the search input. Only updates DOM bits that need
  // updating; never does a full tab re-render here.
  const tick = setInterval(() => {
    if (!state) return;
    const now = Date.now();
    const restockDue = !state.marketUntil || now >= state.marketUntil;
    if (restockDue) {
      ensureMarketListings();
      if (activeTab === 'market' && marketRefreshGrids) marketRefreshGrids();
    }
    if (activeTab === 'market' && marketCountdownEl) {
      const secs = Math.max(0, Math.ceil(((state.marketUntil || 0) - Date.now()) / 1000));
      marketCountdownEl.textContent = `Refresh in ${secs}s`;
    }
  }, 1000);

  return {
    destroy() {
      clearInterval(tick);
      saveSave(username, state);
      if (root.parentNode) root.remove();
    },
  };
}
