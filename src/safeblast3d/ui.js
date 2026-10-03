// DOM overlay for the 3D SafeBlast: back button, level name, HP + safe
// bars, coins, attack button, sword shop, win/lose panel. No Three.js in here.

const SWORDS = [
  { id: 'wooden_sword',  name: 'Wood Sword',    damage: 8,  price: 0,  color: '#8b5a2b' },
  { id: 'iron_sword',    name: 'Iron Sword',    damage: 14, price: 20, color: '#cfd8dc' },
  { id: 'diamond_sword', name: 'Diamond Sword', damage: 22, price: 50, color: '#5fffd9' },
];

// In-game ability metadata for drawing cast buttons. Abilities are bought
// in the hub, not here - this is just display info.
const ABILITIES = [
  { id: 'flame',   name: 'Flame Throw',     color: '#ff6a00', key: '1' },
  { id: 'water',   name: 'Water Blast',     color: '#3dabff', key: '2' },
  { id: 'vine',    name: 'Vine Slash',      color: '#3bb54a', key: '3' },
  { id: 'magma',   name: 'Magma Burn',      color: '#ff3a00', key: '4' },
  { id: 'soldier', name: 'Soldier Spawner', color: '#9ccc65', key: '5' },
  { id: 'demon',   name: 'Demon Strike',    color: '#7b1fa2', key: '6' },
  { id: 'dragon',  name: 'Dragon Bite',     color: '#43a047', key: '7' },
  { id: 'honey',   name: 'Honey Trap',      color: '#ffb300', key: '8' },
];

export function createSafeBlastUI({ levelName, level, onBack, onAttack, onLevelEnd, onBuySword, onCastAbility, onReleaseHoney }) {
  const root = document.createElement('div');
  root.className = 'sb3d-ui';
  root.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 100;
    font-family: system-ui, sans-serif; color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
  `;
  document.body.appendChild(root);

  // Top bar
  const top = el('div', `
    position: absolute; top: 0; left: 0; right: 0;
    padding: 12px 16px; display: flex; justify-content: space-between;
    align-items: flex-start;
  `);
  root.appendChild(top);

  const back = button('\u2190 BACK', '#42a5f5');
  back.addEventListener('click', onBack);
  top.appendChild(back);

  const title = el('div', 'font-size: 16px; font-weight: 800; letter-spacing: 1px; text-align: center;');
  title.innerHTML = `<div style="color:#ff6644;">SAFE BLAST</div><div style="font-size:12px;opacity:0.85;">LEVEL ${level || '?'} &middot; ${levelName}</div>`;
  top.appendChild(title);

  const rightCol = el('div', 'display: flex; flex-direction: column; align-items: flex-end; gap: 6px;');
  const coinsBox = el('div', 'font-weight: 700; font-size: 14px; color: #ffdd00;');
  coinsBox.textContent = 'Coins: 0';
  rightCol.appendChild(coinsBox);
  const shopBtn = button('SHOP', '#ff6644');
  shopBtn.addEventListener('click', () => showShop(true));
  rightCol.appendChild(shopBtn);
  top.appendChild(rightCol);

  // Safe HP bars (left side under back button)
  const safeBars = el('div', `
    position: absolute; top: 58px; left: 16px;
    display: flex; flex-direction: column; gap: 6px; min-width: 180px;
  `);
  root.appendChild(safeBars);
  const blueBar = makeBar('Your safe', '#42a5f5');
  const redBar = makeBar('Enemy safe', '#ff4444');
  safeBars.appendChild(blueBar.row);
  safeBars.appendChild(redBar.row);

  // Sword name lives bottom-left (HP moved to the giant bottom-centre bar)
  const hpBox = el('div', `
    position: absolute; bottom: 24px; left: 16px; min-width: 220px;
    display: flex; flex-direction: column; gap: 6px;
  `);
  root.appendChild(hpBox);
  const swordLine = el('div', `
    background: rgba(0,0,0,0.35); padding: 6px 10px; border-radius: 8px;
    font-size: 12px; font-weight: 700; display: flex; justify-content: space-between;
  `);
  swordLine.innerHTML = '<span>Sword</span><span style="color:#ffd166;">Wood</span>';
  hpBox.appendChild(swordLine);

  // Attack button (bottom-right)
  const atk = el('button', `
    position: absolute; bottom: 24px; right: 24px;
    background: #c62828; color: #fff; border: 3px solid #ff7777;
    width: 82px; height: 82px; border-radius: 50%;
    font-weight: 800; font-size: 15px; letter-spacing: 1px;
    cursor: pointer; pointer-events: auto;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
  `);
  atk.textContent = 'ATTACK';
  atk.addEventListener('click', onAttack);
  atk.addEventListener('touchstart', (e) => { e.preventDefault(); onAttack(); });
  root.appendChild(atk);

  // Ability cast buttons - appear left of the attack button
  const abilityButtons = {};
  ABILITIES.forEach((ab, idx) => {
    const b = el('button', `
      position: absolute; bottom: 34px; right: ${120 + idx * 72}px;
      background: ${ab.color}; color: #fff; border: 3px solid rgba(255,255,255,0.4);
      width: 62px; height: 62px; border-radius: 50%;
      font-weight: 800; font-size: 11px; letter-spacing: 0.5px;
      cursor: pointer; pointer-events: auto;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4), 0 0 14px ${ab.color};
      display: none; position: absolute;
    `);
    b.innerHTML = `${ab.name.split(' ')[0].toUpperCase()}<div style="font-size:9px;opacity:0.8;">[${ab.key}]</div>`;
    b.addEventListener('click', () => onCastAbility && onCastAbility(ab.id));
    b.addEventListener('touchstart', (e) => { e.preventDefault(); onCastAbility && onCastAbility(ab.id); });
    root.appendChild(b);
    abilityButtons[ab.id] = b;
  });

  // Giant PLAYER HP bar - centred above the hint bar, doesn't overlap
  // sword line (bottom-left), Attack/abilities (bottom-right), or hint.
  const playerBar = el('div', `
    position: absolute;
    left: 50%; transform: translateX(-50%);
    bottom: 150px;
    width: 460px; max-width: 70vw;
    background: rgba(0,0,0,0.55);
    border: 2px solid #66bb6a;
    border-radius: 10px;
    padding: 8px 12px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  `);
  const playerLabel = el('div', 'font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #aaffaa; text-align: center; margin-bottom: 4px;');
  playerLabel.textContent = 'YOUR HP';
  playerBar.appendChild(playerLabel);
  const playerTrack = el('div', 'position: relative; height: 24px; background: rgba(255,255,255,0.12); border-radius: 4px; overflow: hidden;');
  const playerFill = el('div', 'height: 100%; background: linear-gradient(90deg, #4caf50, #66bb6a); width: 100%; transition: width 0.12s;');
  playerTrack.appendChild(playerFill);
  const playerText = el('div', 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.85);');
  playerTrack.appendChild(playerText);
  playerBar.appendChild(playerTrack);
  root.appendChild(playerBar);

  // Honey trap release button (hidden until at least one trap is placed)
  const honeyBtn = el('button', `
    position: absolute; right: 24px; bottom: 130px;
    background: #ffb300; color: #1a1000;
    border: 3px solid #ffe082; border-radius: 8px;
    padding: 8px 14px;
    font-weight: 800; font-size: 12px; letter-spacing: 1px;
    cursor: pointer; pointer-events: auto;
    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
    display: none;
  `);
  honeyBtn.textContent = 'RELEASE TRAPS';
  honeyBtn.addEventListener('click', () => onReleaseHoney && onReleaseHoney());
  honeyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onReleaseHoney && onReleaseHoney(); });
  root.appendChild(honeyBtn);

  // Hint bar
  const hint = el('div', `
    position: absolute; bottom: 120px; right: 20px;
    font-size: 11px; opacity: 0.75; text-align: right;
  `);
  hint.innerHTML = 'WASD move &middot; space attack &middot; 1-4 abilities<br>Q/E or drag to rotate camera &middot; aim with mouse';
  root.appendChild(hint);

  // Toast / warning message
  const toast = el('div', `
    position: absolute; top: 38%; left: 50%; transform: translateX(-50%);
    background: rgba(198,40,40,0.95); color: #fff;
    padding: 10px 20px; border-radius: 8px;
    font-weight: 800; font-size: 14px; letter-spacing: 1px;
    pointer-events: none; display: none;
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    border: 2px solid #ff7a7a;
  `);
  root.appendChild(toast);
  let toastTimer = null;
  function showToast(text, duration = 1800) {
    toast.textContent = text;
    toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; toastTimer = null; }, duration);
  }

  // Result panel
  const resultOverlay = el('div', `
    position: absolute; inset: 0; display: none;
    background: rgba(10,5,15,0.78);
    align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  const resultCard = el('div', `
    background: #1a1030; border: 3px solid #ff6644;
    border-radius: 14px; padding: 28px 40px; max-width: 420px;
    text-align: center;
  `);
  resultOverlay.appendChild(resultCard);
  root.appendChild(resultOverlay);

  // Shop modal
  const shopOverlay = el('div', `
    position: absolute; inset: 0; display: none;
    background: rgba(10,5,15,0.82);
    align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  const shopPanel = el('div', `
    background: #1a1030; border: 3px solid #ff6644;
    border-radius: 14px; padding: 22px 24px; min-width: 380px; max-width: 600px;
  `);
  const shopTitle = el('div', 'font-size: 20px; font-weight: 800; color: #ff6644; text-align: center; margin-bottom: 4px; letter-spacing: 1px;');
  shopTitle.textContent = 'SHOP';
  shopPanel.appendChild(shopTitle);
  const shopSub = el('div', 'font-size: 11px; opacity: 0.85; text-align: center; margin-bottom: 14px;');
  shopSub.textContent = 'Spend coins from generators to upgrade';
  shopPanel.appendChild(shopSub);

  const swordLabel = el('div', 'font-size: 11px; font-weight: 800; opacity: 0.8; margin-bottom: 6px; letter-spacing: 1px;');
  swordLabel.textContent = 'SWORDS';
  shopPanel.appendChild(swordLabel);
  const shopGrid = el('div', 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;');
  shopPanel.appendChild(shopGrid);

  const abilityNote = el('div', 'font-size: 11px; opacity: 0.6; text-align: center; margin-bottom: 14px; padding: 8px; border-top: 1px dashed #444;');
  abilityNote.textContent = 'Buy & equip abilities at the Win A Creature plaza';
  shopPanel.appendChild(abilityNote);

  const shopClose = button('Close', '#444');
  shopClose.style.cssText += 'display: block; margin: 0 auto;';
  shopClose.addEventListener('click', () => showShop(false));
  shopPanel.appendChild(shopClose);
  shopOverlay.appendChild(shopPanel);
  root.appendChild(shopOverlay);

  let currentSwordId = 'wooden_sword';
  let coinsAmount = 0;
  let ownedSet = new Set(['wooden_sword']);
  let ownedAbilities = new Set();
  const abilityCooldowns = { flame: 0, water: 0 };

  function renderShop() {
    shopGrid.innerHTML = '';
    for (const sw of SWORDS) {
      const owned = ownedSet.has(sw.id);
      const equipped = currentSwordId === sw.id;
      const canAfford = coinsAmount >= sw.price;
      const card = el('div', `
        background: #2a1a3a; border: 2px solid ${equipped ? '#ffdd00' : owned ? '#66bb6a' : '#553355'};
        border-radius: 10px; padding: 12px 8px; text-align: center; position: relative;
      `);
      // Sword glyph - simple coloured diamond
      const ico = el('div', `
        margin: 4px auto 8px; width: 38px; height: 38px;
        background: ${sw.color}; transform: rotate(45deg);
        border: 2px solid rgba(0,0,0,0.4); border-radius: 4px;
      `);
      card.appendChild(ico);
      const name = el('div', 'font-weight: 800; font-size: 13px; margin-bottom: 2px;');
      name.textContent = sw.name;
      card.appendChild(name);
      const dmg = el('div', 'font-size: 11px; color: #ffab40; margin-bottom: 8px;');
      dmg.textContent = `Damage ${sw.damage}`;
      card.appendChild(dmg);
      const action = el('button', `
        background: ${equipped ? '#ffdd00' : owned ? '#66bb6a' : (canAfford ? '#c62828' : '#444')};
        color: ${equipped ? '#221100' : '#fff'};
        border: none; border-radius: 5px; padding: 6px 10px;
        font-weight: 700; font-size: 11px; letter-spacing: 1px;
        cursor: ${equipped || owned ? 'default' : (canAfford ? 'pointer' : 'not-allowed')};
        pointer-events: auto; width: 100%;
      `);
      if (equipped) action.textContent = 'EQUIPPED';
      else if (owned) action.textContent = 'OWNED';
      else action.textContent = canAfford ? `Buy ${sw.price}c` : `Need ${sw.price}c`;
      action.disabled = equipped || owned || !canAfford;
      action.addEventListener('click', () => {
        if (!canAfford || owned) return;
        onBuySword && onBuySword(sw.id);
      });
      card.appendChild(action);
      shopGrid.appendChild(card);
    }
  }
  function showShop(show) {
    if (show) renderShop();
    shopOverlay.style.display = show ? 'flex' : 'none';
  }
  function updateSwordLine() {
    const sw = SWORDS.find((s) => s.id === currentSwordId) || SWORDS[0];
    swordLine.querySelector('span:last-child').textContent = sw.name;
  }

  return {
    setHp(v, max) {
      const m = max || 100;
      const r = Math.max(0, Math.min(1, v / m));
      playerFill.style.width = (r * 100) + '%';
      playerText.textContent = `${Math.max(0, Math.ceil(v))} / ${m}`;
    },
    setHoneyTraps(count, max) {
      if (count > 0) {
        honeyBtn.style.display = 'block';
        honeyBtn.textContent = `RELEASE TRAPS (${count}/${max})`;
      } else {
        honeyBtn.style.display = 'none';
      }
    },
    setSafeHp(team, v, max) {
      const b = team === 'blue' ? blueBar : redBar;
      b.set(v, max, `${Math.max(0, Math.ceil(v))} / ${max}`);
    },
    setCoins(v) {
      coinsAmount = v;
      coinsBox.textContent = `Coins: ${v}`;
      if (shopOverlay.style.display === 'flex') renderShop();
    },
    showToast,
    setSword(swordId, owned) {
      currentSwordId = swordId;
      ownedSet = new Set(owned || [swordId]);
      ownedSet.add('wooden_sword');
      updateSwordLine();
      if (shopOverlay.style.display === 'flex') renderShop();
    },
    setAbilities(owned) {
      ownedAbilities = new Set(owned || []);
      // Hide every button first, then reposition the equipped ones into
      // compact slots (1, 2, 3...) next to the Attack button.
      for (const ab of ABILITIES) {
        const btn = abilityButtons[ab.id];
        if (btn) btn.style.display = 'none';
      }
      (owned || []).forEach((id, idx) => {
        const btn = abilityButtons[id];
        if (!btn) return;
        const ab = ABILITIES.find((a) => a.id === id);
        if (!ab) return;
        btn.style.display = 'block';
        btn.style.right = (120 + idx * 72) + 'px';
        const short = ab.name.split(' ')[0].toUpperCase();
        btn.innerHTML = `${short}<div style="font-size:9px;opacity:0.8;">[${idx + 1}]</div>`;
      });
      if (shopOverlay.style.display === 'flex') renderShop();
    },
    setAbilityCooldown(id, ratio) {
      const btn = abilityButtons[id];
      if (!btn) return;
      if (ratio <= 0) {
        btn.style.opacity = '1';
        btn.disabled = false;
        btn.style.filter = 'none';
      } else {
        btn.style.opacity = (0.4 + (1 - ratio) * 0.5).toString();
        btn.disabled = true;
        btn.style.filter = 'grayscale(' + Math.min(1, ratio) + ')';
      }
    },
    showResult({ won, coins, level }) {
      resultCard.innerHTML = '';
      const h = el('div', `font-size: 26px; font-weight: 800; margin-bottom: 8px; color: ${won ? '#66bb6a' : '#ff4444'};`);
      h.textContent = won ? 'VICTORY' : 'DEFEAT';
      resultCard.appendChild(h);
      const sub = el('div', 'font-size: 13px; opacity: 0.9; margin-bottom: 14px;');
      sub.textContent = won ? `Level ${level} cleared \u00b7 +${coins} coins` : `Level ${level} - try again?`;
      resultCard.appendChild(sub);
      const row = el('div', 'display: flex; gap: 10px; justify-content: center;');
      const back = button('Back to hub', '#42a5f5');
      back.addEventListener('click', () => onLevelEnd('hub', { won, coins, level }));
      row.appendChild(back);
      if (!won) {
        const retry = button('Retry', '#ff6644');
        retry.addEventListener('click', () => onLevelEnd('retry', { level }));
        row.appendChild(retry);
      }
      resultCard.appendChild(row);
      resultOverlay.style.display = 'flex';
    },
    destroy() { root.remove(); },
  };
}

function makeBar(label, color) {
  const row = el('div', 'background: rgba(0,0,0,0.35); padding: 6px 10px; border-radius: 8px;');
  const top = el('div', 'display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 3px;');
  const name = el('span', ''); name.textContent = label;
  const val = el('span', 'opacity: 0.85;'); val.textContent = '0';
  top.appendChild(name); top.appendChild(val); row.appendChild(top);
  const track = el('div', 'height: 10px; background: rgba(255,255,255,0.12); border-radius: 5px; overflow: hidden;');
  const fill = el('div', `height: 100%; background: ${color}; width: 100%; transition: width 0.15s;`);
  track.appendChild(fill); row.appendChild(track);
  return {
    row,
    set(v, max, text) {
      const r = Math.max(0, Math.min(1, v / max));
      fill.style.width = (r * 100) + '%';
      val.textContent = text;
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
