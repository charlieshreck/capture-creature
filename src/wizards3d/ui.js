import { SPELLS, TOTAL_LEVELS } from './scene.js';

export function createWizardsUI({ collected, levelProgress, onBack, onPickLevel }) {
  const root = document.createElement('div');
  root.id = 'cc-wizards-ui';
  root.style.cssText = `
    position: fixed; inset: 0; pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif; color: #fff; z-index: 100;
  `;

  // Top bar (back + title)
  const top = el('div', `
    position: absolute; top: 14px; left: 14px; right: 14px;
    display: flex; justify-content: space-between; align-items: center;
    pointer-events: none;
  `);
  root.appendChild(top);

  const back = el('button', `
    pointer-events: auto; background: #1a1a2e; color: #ffab40;
    border: 2px solid #ffab40; border-radius: 8px; padding: 8px 14px;
    font-weight: 800; font-size: 13px; cursor: pointer; letter-spacing: 1px;
  `);
  back.textContent = '← BACK';
  back.addEventListener('click', () => onBack && onBack());
  top.appendChild(back);

  const title = el('div', `
    pointer-events: none; background: rgba(0,0,0,0.5); padding: 6px 14px;
    border-radius: 8px; font-weight: 800; font-size: 16px; letter-spacing: 2px;
    border: 1px solid #b388ff;
  `);
  title.textContent = 'WIZARDS';
  top.appendChild(title);

  const count = el('div', `
    pointer-events: none; background: rgba(0,0,0,0.5); padding: 6px 12px;
    border-radius: 8px; font-size: 12px; color: #fff176;
  `);
  count.textContent = `${collected.length} / ${SPELLS.length}`;
  top.appendChild(count);

  // Hint
  const hint = el('div', `
    position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.55); padding: 6px 12px; border-radius: 8px;
    font-size: 11px; color: #cce; pointer-events: none;
  `);
  hint.textContent = 'WASD walk • SHIFT sprint • Z/X turn • C/V camera up/down • SPACE jump • drag to look • walk up to a card to learn it';
  root.appendChild(hint);

  // Toast for "Spell learned"
  const toast = el('div', `
    position: absolute; top: 70px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.8); padding: 10px 18px; border-radius: 10px;
    font-weight: 800; font-size: 14px; letter-spacing: 1px;
    border: 2px solid #fff176; opacity: 0; transition: opacity 0.3s;
    pointer-events: none;
  `);
  root.appendChild(toast);
  let toastTimer = 0;
  function showToast(text, color = '#fff176') {
    toast.textContent = text;
    toast.style.borderColor = color;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  // Near-spell prompt
  const nearPrompt = el('div', `
    position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
    background: rgba(20,5,40,0.85); padding: 8px 14px; border-radius: 8px;
    font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.2s;
    border: 1px solid #b388ff;
  `);
  root.appendChild(nearPrompt);

  // Spells button
  const spellsBtn = el('button', `
    position: absolute; bottom: 14px; right: 14px; pointer-events: auto;
    background: linear-gradient(135deg, #4a148c, #6a1b9a); color: #fff;
    border: 2px solid #b388ff; border-radius: 10px; padding: 10px 16px;
    font-weight: 800; font-size: 14px; cursor: pointer; letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  `);
  spellsBtn.textContent = `SPELLS (${collected.length})`;
  spellsBtn.addEventListener('click', () => openModal());
  root.appendChild(spellsBtn);

  // Levels button
  const levelsBtn = el('button', `
    position: absolute; bottom: 14px; right: 200px; pointer-events: auto;
    background: linear-gradient(135deg, #b71c1c, #d84315); color: #fff;
    border: 2px solid #ffab91; border-radius: 10px; padding: 10px 16px;
    font-weight: 800; font-size: 14px; cursor: pointer; letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  `);
  levelsBtn.textContent = `LEVELS (${levelProgress}/${TOTAL_LEVELS})`;
  levelsBtn.addEventListener('click', () => openLevels());
  root.appendChild(levelsBtn);

  // Levels modal
  const levelsOverlay = el('div', `
    position: absolute; inset: 0; background: rgba(0,0,0,0.75);
    display: none; align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  root.appendChild(levelsOverlay);
  const levelsModal = el('div', `
    background: #150522; border: 2px solid #ffab91; border-radius: 14px;
    padding: 20px; width: min(90vw, 560px); max-height: 85vh; overflow: auto;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  `);
  levelsOverlay.appendChild(levelsModal);
  const levelsTitle = el('div', 'font-size: 20px; font-weight: 800; color: #ffab91; margin-bottom: 4px;');
  levelsTitle.textContent = 'Wizard Duels';
  levelsModal.appendChild(levelsTitle);
  const levelsSub = el('div', 'font-size: 11px; color: #b8a8d8; margin-bottom: 14px;');
  levelsSub.textContent = `Beat each level to unlock the next. You have ${collected.length} spell${collected.length === 1 ? '' : 's'} to fight with.`;
  levelsModal.appendChild(levelsSub);
  const grid = el('div', `
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
  `);
  levelsModal.appendChild(grid);

  const closeLevelsRow = el('div', 'display: flex; justify-content: flex-end; margin-top: 14px;');
  levelsModal.appendChild(closeLevelsRow);
  const closeLevelsBtn = el('button', `
    background: #6a1b9a; color: #fff; border: 1px solid #b388ff;
    border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 700;
  `);
  closeLevelsBtn.textContent = 'CLOSE';
  closeLevelsBtn.addEventListener('click', closeLevels);
  closeLevelsRow.appendChild(closeLevelsBtn);

  function openLevels() {
    grid.innerHTML = '';
    for (let l = 1; l <= TOTAL_LEVELS; l++) {
      const beaten = l <= levelProgress;
      const unlocked = l <= levelProgress + 1;
      const canPlay = unlocked && collected.length > 0;
      const tile = el('button', `
        pointer-events: auto;
        background: ${beaten ? 'linear-gradient(135deg, #2e7d32, #1b5e20)'
                  : unlocked ? 'linear-gradient(135deg, #4527a0, #311b92)'
                             : '#1a1a2e'};
        color: ${canPlay ? '#fff' : '#666'};
        border: 1px solid ${beaten ? '#66bb6a' : unlocked ? '#b388ff' : '#33334a'};
        border-radius: 8px; padding: 12px 0; font-weight: 800; font-size: 14px;
        cursor: ${canPlay ? 'pointer' : 'not-allowed'};
      `);
      tile.textContent = beaten ? `★ ${l}` : `${l}`;
      tile.disabled = !canPlay;
      if (canPlay) tile.addEventListener('click', () => {
        closeLevels();
        if (onPickLevel) onPickLevel(l);
      });
      grid.appendChild(tile);
    }
    if (collected.length === 0) {
      levelsSub.textContent = 'Find at least one spell card before you can fight.';
    } else {
      levelsSub.textContent = `Beat each level to unlock the next. You have ${collected.length} spell${collected.length === 1 ? '' : 's'} to fight with.`;
    }
    levelsOverlay.style.display = 'flex';
  }
  function closeLevels() { levelsOverlay.style.display = 'none'; }
  levelsOverlay.addEventListener('click', (e) => { if (e.target === levelsOverlay) closeLevels(); });

  // Modal
  const overlay = el('div', `
    position: absolute; inset: 0; background: rgba(0,0,0,0.7);
    display: none; align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  root.appendChild(overlay);

  const modal = el('div', `
    background: #1a0a2e; border: 2px solid #b388ff; border-radius: 14px;
    padding: 20px; min-width: 320px; max-width: 480px; max-height: 80vh;
    overflow: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  `);
  overlay.appendChild(modal);

  const modalTitle = el('div', 'font-size: 20px; font-weight: 800; margin-bottom: 4px; color: #fff176;');
  modalTitle.textContent = 'Your Spells';
  modal.appendChild(modalTitle);

  const modalSub = el('div', 'font-size: 11px; color: #b8a8d8; margin-bottom: 14px;');
  modal.appendChild(modalSub);

  const list = el('div', 'display: flex; flex-direction: column; gap: 8px;');
  modal.appendChild(list);

  const closeRow = el('div', 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;');
  modal.appendChild(closeRow);

  const closeBtn = el('button', `
    background: #6a1b9a; color: #fff; border: 1px solid #b388ff;
    border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 700;
  `);
  closeBtn.textContent = 'CLOSE';
  closeBtn.addEventListener('click', closeModal);
  closeRow.appendChild(closeBtn);

  function rarityColor(r) {
    return { common: '#bdbdbd', uncommon: '#4caf50' }[r] || '#fff';
  }

  function renderList() {
    list.innerHTML = '';
    for (const s of SPELLS) {
      const have = collected.includes(s.id);
      const row = el('div', `
        display: flex; align-items: center; gap: 12px;
        padding: 10px 12px; border-radius: 10px;
        background: ${have ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'};
        border: 1px solid ${have ? '#b388ff55' : '#33334a'};
        opacity: ${have ? 1 : 0.45};
      `);
      const gem = el('div', `
        width: 28px; height: 28px; border-radius: 50%;
        background: #${s.color.toString(16).padStart(6, '0')};
        box-shadow: 0 0 12px #${s.color.toString(16).padStart(6, '0')}aa;
        flex-shrink: 0;
      `);
      row.appendChild(gem);
      const info = el('div', 'flex: 1;');
      const name = el('div', 'font-weight: 800; font-size: 14px;');
      name.textContent = have ? s.name : '???';
      info.appendChild(name);
      const desc = el('div', 'font-size: 11px; color: #ccd; margin-top: 2px;');
      desc.textContent = have ? s.desc : 'Not yet found.';
      info.appendChild(desc);
      row.appendChild(info);
      const rar = el('div', `font-size: 10px; font-weight: 800; color: ${rarityColor(s.rarity)}; text-transform: uppercase; letter-spacing: 1px;`);
      rar.textContent = s.rarity;
      row.appendChild(rar);
      list.appendChild(row);
    }
    modalSub.textContent = `Found ${collected.length} of ${SPELLS.length}`;
  }

  function openModal() {
    renderList();
    overlay.style.display = 'flex';
  }
  function closeModal() {
    overlay.style.display = 'none';
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.body.appendChild(root);

  return {
    onCollected(spellId) {
      const s = SPELLS.find((x) => x.id === spellId);
      if (s) showToast(`Learned ${s.name}!`, `#${s.color.toString(16).padStart(6, '0')}`);
      count.textContent = `${collected.length} / ${SPELLS.length}`;
      spellsBtn.textContent = `SPELLS (${collected.length})`;
    },
    setNearSpell(spell) {
      if (collected.includes(spell.id)) {
        nearPrompt.textContent = `${spell.name} (already known)`;
      } else {
        nearPrompt.textContent = `A spell card glows here — walk up to it`;
      }
      nearPrompt.style.opacity = '1';
    },
    clearNearSpell() {
      nearPrompt.style.opacity = '0';
    },
    destroy() {
      clearTimeout(toastTimer);
      if (root.parentNode) root.remove();
    },
  };
}

function el(tag, css) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  return e;
}

// Battle overlay: HP bars, spell buttons, victory/defeat screen, retreat.
export function createBattleUI({ level, themeName, playerSpells, onCast, onRetreat, onContinue, onRetry }) {
  const root = document.createElement('div');
  root.id = 'cc-battle-ui';
  root.style.cssText = `
    position: fixed; inset: 0; pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif; color: #fff; z-index: 110;
  `;

  // Top bar — retreat + level + theme
  const top = el('div', `
    position: absolute; top: 14px; left: 14px; right: 14px;
    display: flex; justify-content: space-between; align-items: center;
    pointer-events: none;
  `);
  root.appendChild(top);

  const retreat = el('button', `
    pointer-events: auto; background: #1a1a2e; color: #ffab91;
    border: 2px solid #ffab91; border-radius: 8px; padding: 8px 14px;
    font-weight: 800; font-size: 12px; cursor: pointer; letter-spacing: 1px;
  `);
  retreat.textContent = '← RETREAT';
  retreat.addEventListener('click', () => onRetreat && onRetreat());
  top.appendChild(retreat);

  const lvl = el('div', `
    pointer-events: none; background: rgba(0,0,0,0.55); padding: 6px 14px;
    border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 1px;
    border: 1px solid #ffab91;
  `);
  lvl.textContent = `LEVEL ${level} — ${themeName}`;
  top.appendChild(lvl);

  const spacer = el('div', 'width: 90px;');     // balance flex
  top.appendChild(spacer);

  // HP bars
  const hpRow = el('div', `
    position: absolute; top: 60px; left: 14px; right: 14px;
    display: flex; justify-content: space-between; gap: 16px; pointer-events: none;
  `);
  root.appendChild(hpRow);
  const playerHpWrap = makeHpBar('You', '#42a5f5');
  const aiHpWrap = makeHpBar('Enemy', '#ef5350');
  hpRow.appendChild(playerHpWrap.root);
  hpRow.appendChild(aiHpWrap.root);

  // Hint: real-time + camera
  const hint = el('div', `
    position: absolute; top: 130px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.55); padding: 6px 14px; border-radius: 8px;
    font-size: 11px; color: #cce; letter-spacing: 1px; pointer-events: none;
  `);
  hint.textContent = 'Drag to look • scroll to zoom • cast any spell whenever its cooldown is ready';
  root.appendChild(hint);

  // Spell buttons (bottom)
  const spellRow = el('div', `
    position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
    display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
    max-width: 90vw; pointer-events: auto;
  `);
  root.appendChild(spellRow);

  const spellButtons = new Map();
  for (const id of playerSpells) {
    const s = SPELLS.find((x) => x.id === id);
    if (!s) continue;
    const hex = '#' + s.color.toString(16).padStart(6, '0');
    const btn = el('button', `
      pointer-events: auto;
      background: linear-gradient(135deg, ${hex}88, ${hex}cc);
      color: #fff; border: 2px solid ${hex}; border-radius: 10px;
      padding: 10px 14px; font-weight: 800; font-size: 13px;
      cursor: pointer; letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex; flex-direction: column; align-items: center; min-width: 78px;
    `);
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.innerHTML = `<div>${s.name.toUpperCase()}</div><div style="font-size:10px;opacity:0.85;">⚡ ${s.damage}</div>`;
    // Cooldown sweep overlay (a dark bar that drains downward)
    const cdOverlay = document.createElement('div');
    cdOverlay.style.cssText = `
      position: absolute; left: 0; right: 0; top: 0;
      background: rgba(0,0,0,0.55); height: 0%;
      pointer-events: none; transition: height 0.05s linear;
    `;
    btn.appendChild(cdOverlay);
    const cdText = document.createElement('div');
    cdText.style.cssText = `
      position: absolute; inset: 0; display: flex;
      align-items: center; justify-content: center;
      font-size: 14px; font-weight: 900; color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      pointer-events: none; opacity: 0;
    `;
    btn.appendChild(cdText);
    btn._cdOverlay = cdOverlay;
    btn._cdText = cdText;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onCast && onCast(id);
    });
    spellRow.appendChild(btn);
    spellButtons.set(id, btn);
  }

  // End-of-battle overlay
  const endOverlay = el('div', `
    position: absolute; inset: 0; background: rgba(0,0,0,0.7);
    display: none; align-items: center; justify-content: center;
    pointer-events: auto;
  `);
  root.appendChild(endOverlay);
  const endBox = el('div', `
    background: #150522; border: 2px solid #ffab91; border-radius: 14px;
    padding: 24px 28px; text-align: center; min-width: 280px;
  `);
  endOverlay.appendChild(endBox);
  const endTitle = el('div', 'font-size: 28px; font-weight: 900; margin-bottom: 8px;');
  endBox.appendChild(endTitle);
  const endSub = el('div', 'font-size: 12px; color: #b8a8d8; margin-bottom: 16px;');
  endBox.appendChild(endSub);
  const endRow = el('div', 'display: flex; gap: 8px; justify-content: center;');
  endBox.appendChild(endRow);
  const continueBtn = el('button', `
    background: #2e7d32; color: #fff; border: 1px solid #66bb6a;
    border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer;
  `);
  continueBtn.textContent = 'CONTINUE';
  continueBtn.addEventListener('click', () => onContinue && onContinue());
  const retryBtn = el('button', `
    background: #6a1b9a; color: #fff; border: 1px solid #b388ff;
    border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer;
  `);
  retryBtn.textContent = 'TRY AGAIN';
  retryBtn.addEventListener('click', () => onRetry && onRetry());
  endRow.appendChild(continueBtn);
  endRow.appendChild(retryBtn);

  document.body.appendChild(root);

  function applyCooldowns(cooldowns, cooldownMax, locked) {
    for (const [id, btn] of spellButtons) {
      const cd = cooldowns ? (cooldowns[id] || 0) : 0;
      const ready = !locked && cd <= 0;
      btn.disabled = !ready;
      btn.style.opacity = ready ? '1' : '0.85';
      btn.style.cursor = ready ? 'pointer' : 'wait';
      const pct = Math.max(0, Math.min(100, (cd / (cooldownMax || 2.5)) * 100));
      btn._cdOverlay.style.height = pct + '%';
      if (cd > 0.05) {
        btn._cdText.textContent = cd.toFixed(1);
        btn._cdText.style.opacity = '1';
      } else {
        btn._cdText.style.opacity = '0';
      }
    }
  }

  return {
    update({ playerHp, playerMaxHp, aiHp, aiMaxHp, cooldowns, cooldownMax, over }) {
      playerHpWrap.set(playerHp, playerMaxHp);
      aiHpWrap.set(aiHp, aiMaxHp);
      applyCooldowns(cooldowns, cooldownMax, !!over);
    },
    showEnd({ won }) {
      applyCooldowns({}, 2.5, true);
      endTitle.textContent = won ? 'VICTORY!' : 'DEFEAT';
      endTitle.style.color = won ? '#69f0ae' : '#ff5252';
      endSub.textContent = won
        ? `You beat level ${level}.`
        : `Try again — pick a different spell strategy.`;
      continueBtn.style.display = won ? '' : 'none';
      endOverlay.style.display = 'flex';
    },
    destroy() {
      if (root.parentNode) root.remove();
    },
  };
}

function makeHpBar(label, color) {
  const root = el('div', 'flex: 1; max-width: 280px;');
  const top = el('div', 'display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;');
  const labelEl = el('div', `font-weight: 800; letter-spacing: 1px; color: ${color};`);
  labelEl.textContent = label;
  const hpText = el('div', 'font-weight: 700;');
  top.appendChild(labelEl);
  top.appendChild(hpText);
  root.appendChild(top);
  const outer = el('div', `
    height: 14px; background: rgba(0,0,0,0.5); border: 1px solid ${color}66;
    border-radius: 7px; overflow: hidden;
  `);
  const inner = el('div', `
    height: 100%; width: 100%; background: ${color}; transition: width 0.25s ease-out;
  `);
  outer.appendChild(inner);
  root.appendChild(outer);
  return {
    root,
    set(hp, max) {
      const pct = Math.max(0, Math.min(100, (hp / max) * 100));
      inner.style.width = pct + '%';
      hpText.textContent = `${hp} / ${max}`;
    },
  };
}
