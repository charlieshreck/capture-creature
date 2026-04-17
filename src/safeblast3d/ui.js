// DOM overlay for the 3D SafeBlast: back button, level name, HP + safe
// bars, coins, attack button, win/lose panel. No Three.js in here.

export function createSafeBlastUI({ levelName, onBack, onAttack, onLevelEnd }) {
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
  title.innerHTML = `<div style="color:#ff6644;">SAFE BLAST</div><div style="font-size:12px;opacity:0.85;">${levelName}</div>`;
  top.appendChild(title);

  const coinsBox = el('div', 'text-align: right; font-weight: 700; font-size: 14px; color: #ffdd00;');
  coinsBox.textContent = 'Coins: 0';
  top.appendChild(coinsBox);

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

  // Player HP bar (bottom-left)
  const hpBox = el('div', `
    position: absolute; bottom: 24px; left: 16px; min-width: 220px;
  `);
  root.appendChild(hpBox);
  const hpBar = makeBar('HP', '#66bb6a');
  hpBox.appendChild(hpBar.row);

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

  // Hint bar
  const hint = el('div', `
    position: absolute; bottom: 120px; right: 20px;
    font-size: 11px; opacity: 0.75; text-align: right;
  `);
  hint.innerHTML = 'WASD to move &middot; space to attack<br>drag to rotate camera';
  root.appendChild(hint);

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

  return {
    setHp(v) { hpBar.set(v, 100, `${Math.max(0, Math.ceil(v))} / 100`); },
    setSafeHp(team, v, max) {
      const b = team === 'blue' ? blueBar : redBar;
      b.set(v, max, `${Math.max(0, Math.ceil(v))} / ${max}`);
    },
    setCoins(v) { coinsBox.textContent = `Coins: ${v}`; },
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
