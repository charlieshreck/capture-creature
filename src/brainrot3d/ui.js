// DOM overlay for the 3D Brainrot hub: back button, coins, multiplier,
// interaction prompt near pedestals, PLAY levels panel, and ABILITIES
// shop (abilities are bought here and kept forever; up to 8 equipped).

import { generateMap } from '../iso/MapData.js';

export const HUB_ABILITIES = [
  { id: 'flame',   name: 'Flame Throw',     desc: 'Cone of fire \u00b7 22 dmg',          price: 120, color: '#ff6a00' },
  { id: 'water',   name: 'Water Blast',     desc: 'Water orb projectile \u00b7 28 dmg',  price: 160, color: '#3dabff' },
  { id: 'vine',    name: 'Vine Slash',      desc: 'Whipping vines arc \u00b7 25 dmg',    price: 180, color: '#3bb54a' },
  { id: 'magma',   name: 'Magma Burn',      desc: 'Ground-of-lava DoT \u00b7 10 dps',    price: 240, color: '#ff3a00' },
  { id: 'soldier', name: 'Soldier Spawner', desc: 'Summon an ally \u00b7 stays alive',   price: 300, color: '#9ccc65' },
  { id: 'demon',   name: 'Demon Strike',    desc: 'Shadow pierces all \u00b7 40 dmg',    price: 380, color: '#7b1fa2' },
  { id: 'dragon',  name: 'Dragon Bite',     desc: 'Lunging bite \u00b7 60 dmg',           price: 480, color: '#43a047' },
  { id: 'honey',   name: 'Honey Trap',      desc: 'Sticky patch \u00b7 holds bots',       price: 220, color: '#ffb300' },
];
export const MAX_EQUIPPED_ABILITIES = 8;

// Same costs for every ability upgrade; index = current level (cost to reach next).
const UPGRADE_COSTS = [0, 500, 2000, 8000, 30000];
const ABILITY_DMG_LABEL = ['x1', 'x1.3', 'x1.7', 'x2.2', 'x3.0'];
// Soldier-specific HP per level (same multiplier table as damage)
const SOLDIER_HP_BY_LEVEL = [50, 75, 110, 165, 250];

export function createBrainrotUI({ brData, username, onBack, onPlayLevel, onBuy, onBuyAbility, onEquipAbility, onUnequipAbility, onUpgradeAbility, onUpgradeHealth }) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none; z-index: 100;
    font-family: system-ui, sans-serif; color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
  `;
  document.body.appendChild(root);

  // Top bar
  const topBar = el('div', `
    position: absolute; top: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 14px 18px;
  `);
  root.appendChild(topBar);

  const backBtn = button('\u2190 BACK', '#42a5f5');
  backBtn.addEventListener('click', onBack);
  topBar.appendChild(backBtn);

  const title = el('div', 'font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #ff6644;');
  title.textContent = 'WIN A CREATURE';
  topBar.appendChild(title);

  const coinsBox = el('div', 'text-align: right; font-weight: 700;');
  const coinsLine = el('div', 'font-size: 16px; color: #ffdd00;');
  const multLine = el('div', 'font-size: 11px; color: #ffab40; margin-top: 2px;');
  coinsBox.appendChild(coinsLine);
  coinsBox.appendChild(multLine);
  topBar.appendChild(coinsBox);

  // Prompt card (appears when near a pedestal)
  const prompt = el('div', `
    position: absolute; left: 50%; bottom: 90px; transform: translateX(-50%);
    background: rgba(20,8,25,0.92); border: 2px solid #ff6644;
    padding: 14px 20px; border-radius: 10px; min-width: 240px; text-align: center;
    pointer-events: auto; display: none;
  `);
  const promptName = el('div', 'font-size: 18px; font-weight: 800; margin-bottom: 6px;');
  const promptInfo = el('div', 'font-size: 12px; color: #ffdd00; margin-bottom: 10px;');
  const promptBtn = button('BUY', '#c62828');
  promptBtn.style.fontSize = '14px';
  promptBtn.style.padding = '6px 18px';
  prompt.appendChild(promptName);
  prompt.appendChild(promptInfo);
  prompt.appendChild(promptBtn);
  root.appendChild(prompt);

  // Hint bar
  const hint = el('div', `
    position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%);
    font-size: 12px; opacity: 0.75;
  `);
  hint.textContent = 'WASD to walk \u00b7 space to jump \u00b7 drag to look \u00b7 walk up to a pedestal to buy';
  root.appendChild(hint);

  // PLAY floating button (bottom right)
  const playBtn = button('\u25B6 PLAY LEVELS', '#ff6644');
  playBtn.style.cssText += 'position: absolute; right: 20px; bottom: 20px; padding: 10px 18px; font-size: 14px;';
  playBtn.addEventListener('click', () => showLevels(true));
  root.appendChild(playBtn);

  const abilityShopBtn = button('\u2731 ABILITIES', '#9944ff');
  abilityShopBtn.style.cssText += 'position: absolute; right: 180px; bottom: 20px; padding: 10px 18px; font-size: 14px;';
  abilityShopBtn.addEventListener('click', () => showAbilities(true));
  root.appendChild(abilityShopBtn);

  // Levels modal
  const levelsModal = el('div', `
    position: absolute; inset: 0;
    background: rgba(10,5,15,0.85);
    display: none; align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  const levelsPanel = el('div', `
    background: #1a0a1a; border: 2px solid #ff6644; border-radius: 12px;
    padding: 20px 24px; max-width: 760px; width: 92%;
  `);
  const levelsTitle = el('div', 'font-size: 18px; font-weight: 800; color: #ff6644; margin-bottom: 4px; text-align: center;');
  levelsTitle.textContent = 'SAFE BLAST \u2014 Pick a level';
  levelsPanel.appendChild(levelsTitle);

  const levelsSub = el('div', 'font-size: 11px; color: #aaa; margin-bottom: 14px; text-align: center;');
  levelsSub.textContent = 'Higher levels = more coins';
  levelsPanel.appendChild(levelsSub);

  const grid = el('div', 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;');
  levelsPanel.appendChild(grid);

  const closeBtn = button('Close', '#333');
  closeBtn.style.cssText += 'display: block; margin: 14px auto 0; padding: 6px 18px; font-size: 12px;';
  closeBtn.addEventListener('click', () => showLevels(false));
  levelsPanel.appendChild(closeBtn);

  levelsModal.appendChild(levelsPanel);
  root.appendChild(levelsModal);

  // --- Abilities modal ----------------------------------------------------
  const abilityModal = el('div', `
    position: absolute; inset: 0;
    background: rgba(10,5,15,0.85);
    display: none; align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  const abilityPanel = el('div', `
    background: #1a0a30; border: 2px solid #9944ff; border-radius: 12px;
    padding: 20px 24px; max-width: 760px; width: 94%;
  `);

  // Header row: title block on the left, health upgrade panel on the right
  const headerRow = el('div', 'display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px;');
  const titleBlock = el('div', 'flex: 1; min-width: 0;');
  const abilityTitle = el('div', 'font-size: 20px; font-weight: 800; color: #bb88ff; margin-bottom: 4px; letter-spacing: 1px;');
  abilityTitle.textContent = 'ABILITIES';
  titleBlock.appendChild(abilityTitle);
  headerRow.appendChild(titleBlock);

  // Health upgrade panel - right side of header (no longer absolute, no overlap)
  const healthPanel = el('div', `
    background: #142433; border: 2px solid #66bb6a; border-radius: 8px;
    padding: 10px 12px; min-width: 220px; text-align: center; flex-shrink: 0;
  `);
  const healthTitle = el('div', 'font-size: 12px; font-weight: 800; color: #66bb6a; letter-spacing: 1px; margin-bottom: 4px;');
  healthTitle.textContent = 'MAX HEALTH';
  healthPanel.appendChild(healthTitle);
  const healthStat = el('div', 'font-size: 13px; color: #fff; margin-bottom: 6px;');
  healthPanel.appendChild(healthStat);
  // Multiplier toggle row
  const multRow = el('div', 'display: flex; gap: 4px; justify-content: center; margin-bottom: 6px;');
  healthPanel.appendChild(multRow);
  const multValues = [1, 5, 10, 25, 100];
  let buyMult = 1;
  const multBtns = {};
  for (const m of multValues) {
    const b = el('button', `
      background: ${m === 1 ? '#66bb6a' : '#243a4d'}; color: #fff;
      border: none; border-radius: 4px; padding: 3px 8px;
      font-weight: 700; font-size: 10px; cursor: pointer; pointer-events: auto;
    `);
    b.textContent = `x${m}`;
    b.addEventListener('click', () => {
      buyMult = m;
      for (const v of multValues) {
        multBtns[v].style.background = (v === buyMult) ? '#66bb6a' : '#243a4d';
      }
    });
    multBtns[m] = b;
    multRow.appendChild(b);
  }
  const buyHealthBtn = el('button', `
    background: #2e7d32; color: #fff;
    border: none; border-radius: 5px; padding: 6px 10px;
    font-weight: 700; font-size: 12px; width: 100%;
    cursor: pointer; pointer-events: auto;
  `);
  buyHealthBtn.addEventListener('click', () => onUpgradeHealth && onUpgradeHealth(buyMult));
  healthPanel.appendChild(buyHealthBtn);
  headerRow.appendChild(healthPanel);
  abilityPanel.appendChild(headerRow);

  const abilitySub = el('div', 'font-size: 11px; color: #ccc; margin-bottom: 14px; text-align: center;');
  abilitySub.textContent = 'Buy with your creature coins. Equip up to ' + MAX_EQUIPPED_ABILITIES + ' to use in-game.';
  abilityPanel.appendChild(abilitySub);

  const equippedCount = el('div', 'font-size: 11px; color: #bb88ff; margin-bottom: 10px; text-align: center; font-weight: 700;');
  abilityPanel.appendChild(equippedCount);

  function refreshHealthPanel() {
    const lvl = brData.healthLevel || 0;
    const maxHp = 100 + lvl * 10;
    healthStat.textContent = `${maxHp} HP \u00b7 L${lvl} / 100`;
    if (lvl >= 100) {
      buyHealthBtn.textContent = 'MAX';
      buyHealthBtn.disabled = true;
      buyHealthBtn.style.background = '#444';
      buyHealthBtn.style.cursor = 'not-allowed';
    } else {
      const cost = 50 + lvl * 10;
      const totalCost = cost * buyMult;
      const canAfford = (brData.coins || 0) >= cost; // single-buy affordable
      buyHealthBtn.textContent = `+${buyMult * 10} HP (${totalCost}c)`;
      buyHealthBtn.disabled = !canAfford;
      buyHealthBtn.style.background = canAfford ? '#2e7d32' : '#444';
      buyHealthBtn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
    }
  }
  // Wire mult buttons to refresh too
  for (const m of multValues) {
    multBtns[m].addEventListener('click', refreshHealthPanel);
  }

  const abilityGrid = el('div', 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;');
  abilityPanel.appendChild(abilityGrid);

  const abilityCloseBtn = button('Close', '#333');
  abilityCloseBtn.style.cssText += 'display: block; margin: 14px auto 0; padding: 6px 18px; font-size: 12px;';
  abilityCloseBtn.addEventListener('click', () => showAbilities(false));
  abilityPanel.appendChild(abilityCloseBtn);

  abilityModal.appendChild(abilityPanel);
  root.appendChild(abilityModal);

  function renderAbilities() {
    refreshHealthPanel();
    const ad = brData.abilities || { owned: [], equipped: [] };
    const equipped = ad.equipped || [];
    const owned = ad.owned || [];
    equippedCount.textContent = `Equipped: ${equipped.length} / ${MAX_EQUIPPED_ABILITIES}`;

    abilityGrid.innerHTML = '';
    for (const ab of HUB_ABILITIES) {
      const isOwned = owned.includes(ab.id);
      const isEquipped = equipped.includes(ab.id);
      const canAfford = (brData.coins || 0) >= ab.price;
      const card = el('div', `
        background: #241335; border: 2px solid ${isEquipped ? '#ffdd00' : isOwned ? '#66bb6a' : '#553355'};
        border-radius: 10px; padding: 14px 12px; text-align: center;
      `);
      const ico = el('div', `
        margin: 2px auto 10px; width: 48px; height: 48px;
        background: ${ab.color}; border-radius: 50%;
        box-shadow: 0 0 18px ${ab.color};
      `);
      card.appendChild(ico);
      const name = el('div', 'font-weight: 800; font-size: 15px; margin-bottom: 3px;');
      name.textContent = ab.name;
      card.appendChild(name);
      const desc = el('div', 'font-size: 11px; color: #ffab40; margin-bottom: 10px;');
      desc.textContent = ab.desc;
      card.appendChild(desc);

      if (!isOwned) {
        const buy = el('button', `
          background: ${canAfford ? '#c62828' : '#444'}; color: #fff;
          border: none; border-radius: 6px; padding: 7px 12px;
          font-weight: 700; font-size: 12px; width: 100%;
          cursor: ${canAfford ? 'pointer' : 'not-allowed'}; pointer-events: auto;
        `);
        buy.textContent = canAfford ? `Buy ${ab.price}c` : `Need ${ab.price}c`;
        buy.disabled = !canAfford;
        buy.addEventListener('click', () => onBuyAbility && onBuyAbility(ab.id));
        card.appendChild(buy);
      } else {
        const atCap = !isEquipped && equipped.length >= MAX_EQUIPPED_ABILITIES;
        const toggle = el('button', `
          background: ${isEquipped ? '#ffdd00' : '#66bb6a'};
          color: ${isEquipped ? '#1a1000' : '#fff'};
          border: none; border-radius: 6px; padding: 7px 12px;
          font-weight: 700; font-size: 12px; width: 100%;
          cursor: ${atCap ? 'not-allowed' : 'pointer'}; pointer-events: auto;
          opacity: ${atCap ? 0.5 : 1};
        `);
        toggle.textContent = isEquipped ? 'UNEQUIP' : (atCap ? 'FULL (8/8)' : 'EQUIP');
        toggle.disabled = atCap;
        toggle.addEventListener('click', () => {
          if (isEquipped) onUnequipAbility && onUnequipAbility(ab.id);
          else if (!atCap) onEquipAbility && onEquipAbility(ab.id);
        });
        card.appendChild(toggle);

        // Upgrade row available on every owned ability
        const lvls = brData.abilityLevels || {};
        const lv = lvls[ab.id] || 1;
        const stat = el('div', 'font-size: 10px; color: #cfd8dc; margin-top: 8px;');
        if (ab.id === 'soldier') {
          stat.textContent = `L${lv} \u00b7 ${SOLDIER_HP_BY_LEVEL[lv - 1]} HP \u00b7 dmg ${ABILITY_DMG_LABEL[lv - 1]}`;
        } else {
          stat.textContent = `L${lv} \u00b7 dmg ${ABILITY_DMG_LABEL[lv - 1]}`;
        }
        card.appendChild(stat);

        if (lv < 5) {
          const upCost = UPGRADE_COSTS[lv];
          const canAfford = (brData.coins || 0) >= upCost;
          const up = el('button', `
            background: ${canAfford ? '#7c4dff' : '#444'}; color: #fff;
            border: none; border-radius: 6px; padding: 6px 10px; margin-top: 6px;
            font-weight: 700; font-size: 11px; width: 100%;
            cursor: ${canAfford ? 'pointer' : 'not-allowed'}; pointer-events: auto;
          `);
          up.textContent = `Upgrade to L${lv + 1} (${upCost}c)`;
          up.disabled = !canAfford;
          up.addEventListener('click', () => onUpgradeAbility && onUpgradeAbility(ab.id));
          card.appendChild(up);
        } else {
          const max = el('div', 'font-size: 10px; color: #ffd166; margin-top: 6px; font-weight: 700;');
          max.textContent = 'MAX LEVEL';
          card.appendChild(max);
        }
      }

      abilityGrid.appendChild(card);
    }
  }

  function showAbilities(show) {
    if (show) renderAbilities();
    abilityModal.style.display = show ? 'flex' : 'none';
  }

  function renderLevels() {
    grid.innerHTML = '';
    for (let lvl = 1; lvl <= 50; lvl++) {
      const beaten = brData.bestLevels && brData.bestLevels[lvl];
      const coins = lvl * 10;
      let mapName = '';
      try { mapName = generateMap(lvl).name; } catch { mapName = ''; }
      const cell = el('div', `
        background: ${beaten ? '#1b5e20' : '#2a1a1a'};
        border: 2px solid ${beaten ? '#66bb6a' : '#663333'};
        border-radius: 6px; padding: 10px 6px; cursor: pointer;
        text-align: center; transition: transform 0.1s;
      `);
      cell.addEventListener('mouseenter', () => { cell.style.transform = 'scale(1.05)'; cell.style.borderColor = '#fff'; });
      cell.addEventListener('mouseleave', () => { cell.style.transform = 'scale(1)'; cell.style.borderColor = beaten ? '#66bb6a' : '#663333'; });
      cell.addEventListener('click', () => onPlayLevel(lvl));
      cell.innerHTML = `
        <div style="font-weight:800;font-size:13px;">Level ${lvl}</div>
        <div style="font-size:9px;color:#aaa;margin:3px 0;">${mapName}</div>
        <div style="font-size:11px;color:#ffdd00;">${coins} coins</div>
        ${beaten ? '<div style="font-size:10px;color:#66bb6a;margin-top:3px;">\u2605 BEATEN</div>' : ''}
      `;
      grid.appendChild(cell);
    }
  }

  function showLevels(show) {
    if (show) renderLevels();
    levelsModal.style.display = show ? 'flex' : 'none';
  }

  function refreshCoins() {
    coinsLine.textContent = `Coins: ${brData.coins}`;
    const mult = 1 + ((brData.owned && brData.owned.length) * 0.05);
    multLine.textContent = brData.owned && brData.owned.length
      ? `x${mult.toFixed(2)} multiplier (${brData.owned.length} creatures)`
      : '';
  }

  let currentBr = null;
  function setNearPedestal(br) {
    currentBr = br;
    const owned = brData.owned && brData.owned.includes(br.id);
    promptName.textContent = br.name;
    if (owned) {
      promptInfo.textContent = 'Already owned';
      promptBtn.style.display = 'none';
    } else {
      const canAfford = brData.coins >= br.price;
      promptInfo.textContent = `${br.price} coins` + (canAfford ? '' : ' (not enough)');
      promptBtn.style.display = 'inline-block';
      promptBtn.disabled = !canAfford;
      promptBtn.style.opacity = canAfford ? '1' : '0.5';
      promptBtn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
    }
    prompt.style.display = 'block';
  }
  function clearNearPedestal() {
    currentBr = null;
    prompt.style.display = 'none';
  }

  promptBtn.addEventListener('click', () => {
    if (!currentBr) return;
    const owned = brData.owned && brData.owned.includes(currentBr.id);
    if (owned) return;
    if (brData.coins < currentBr.price) return;
    onBuy(currentBr);
  });

  refreshCoins();

  // Small save indicator in the top bar
  const saveToast = el('div', `
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%) translateY(-30px);
    background: rgba(20,120,60,0.9); color: #fff;
    padding: 6px 14px; border-radius: 6px;
    font-weight: 700; font-size: 12px; letter-spacing: 1px;
    opacity: 0; transition: opacity 0.25s, transform 0.25s;
    pointer-events: none;
  `);
  root.appendChild(saveToast);
  let saveTimer = null;
  function showSaveToast(text, isError) {
    saveToast.textContent = text;
    saveToast.style.background = isError ? 'rgba(198,40,40,0.92)' : 'rgba(20,120,60,0.9)';
    saveToast.style.opacity = '1';
    saveToast.style.transform = 'translateX(-50%) translateY(0)';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveToast.style.opacity = '0';
      saveToast.style.transform = 'translateX(-50%) translateY(-30px)';
      saveTimer = null;
    }, 1400);
  }

  return {
    destroy() { root.remove(); },
    refresh: () => { refreshCoins(); if (abilityModal.style.display === 'flex') renderAbilities(); },
    refreshAbilities: () => { if (abilityModal.style.display === 'flex') renderAbilities(); },
    showSaveToast,
    setNearPedestal,
    clearNearPedestal,
    setOwned(brId) {
      if (currentBr && currentBr.id === brId) setNearPedestal(currentBr);
    },
  };
}

function el(tag, css) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  return e;
}

function button(text, color) {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = `
    background: ${color}; color: #fff; border: none; border-radius: 6px;
    padding: 8px 14px; font-weight: 700; font-family: inherit; font-size: 12px;
    letter-spacing: 1px; cursor: pointer; pointer-events: auto;
  `;
  return b;
}
