// DOM overlay for the 3D Brainrot hub: back button, coins, multiplier,
// interaction prompt near pedestals, and the PLAY levels panel.

import { generateMap } from '../iso/MapData.js';

export function createBrainrotUI({ brData, username, onBack, onPlayLevel, onBuy }) {
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
  title.textContent = 'WIN A BRAINROT';
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
  hint.textContent = 'WASD to walk \u00b7 drag to look \u00b7 walk up to a pedestal to buy';
  root.appendChild(hint);

  // PLAY floating button (bottom right)
  const playBtn = button('\u25B6 PLAY LEVELS', '#ff6644');
  playBtn.style.cssText += 'position: absolute; right: 20px; bottom: 20px; padding: 10px 18px; font-size: 14px;';
  playBtn.addEventListener('click', () => showLevels(true));
  root.appendChild(playBtn);

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

  function renderLevels() {
    grid.innerHTML = '';
    for (let lvl = 1; lvl <= 20; lvl++) {
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
      ? `x${mult.toFixed(2)} multiplier (${brData.owned.length} brainrots)`
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

  return {
    destroy() { root.remove(); },
    refresh: refreshCoins,
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
