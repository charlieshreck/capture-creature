// "Pro" Homepage - a DOM-rendered version of Albie's hub with the same
// elements (games list, avatar badge, logout, theme toggle, made-by-Albie
// footer) but nicer typography, gradients, hover states, and animation.
// Lives entirely in the DOM; the Phaser canvas is hidden while this is up.

export function createProHomepage({ username, onPickGame, onLogout, onClassic, onAvatar, onAvatar3D }) {
  const root = document.createElement('div');
  root.id = 'cc-pro-hub';
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 90;
    background:
      radial-gradient(1000px 600px at 20% 10%, #2f1b5c 0%, transparent 60%),
      radial-gradient(900px 500px at 85% 80%, #0d3d6b 0%, transparent 60%),
      linear-gradient(160deg, #0a0a1a 0%, #140a25 50%, #0a1829 100%);
    color: #fff; font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  `;
  document.body.appendChild(root);

  // Animated soft orbs in the background
  for (let i = 0; i < 3; i++) {
    const orb = document.createElement('div');
    const size = 220 + i * 60;
    const colors = ['rgba(255,102,68,0.10)', 'rgba(66,165,245,0.10)', 'rgba(255,171,64,0.10)'];
    orb.style.cssText = `
      position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%;
      background: ${colors[i]}; filter: blur(40px);
      left: ${20 + i * 30}%; top: ${15 + i * 20}%;
      animation: cc-float-${i} ${8 + i * 4}s ease-in-out infinite alternate;
    `;
    root.appendChild(orb);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cc-float-0 { to { transform: translate(60px, -40px); } }
    @keyframes cc-float-1 { to { transform: translate(-80px, 50px); } }
    @keyframes cc-float-2 { to { transform: translate(40px, 60px); } }
    #cc-pro-hub .game-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
    #cc-pro-hub .game-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.45); border-color: #fff; }
    #cc-pro-hub button.pro-btn:hover { filter: brightness(1.15); }
    #cc-pro-hub .fade-in { animation: cc-fade 0.35s ease-out both; }
    @keyframes cc-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `;
  root.appendChild(style);

  const container = el('div', `
    position: relative; width: 100%; height: 100%;
    max-width: 1100px; margin: 0 auto; padding: 24px 28px;
    display: flex; flex-direction: column; gap: 18px;
  `);
  root.appendChild(container);

  // Top bar
  const top = el('div', 'display: flex; align-items: center; justify-content: space-between; gap: 16px;');
  container.appendChild(top);

  const brand = el('div', 'display: flex; align-items: center; gap: 12px;');
  const badge = el('div', `
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, #ff6644, #ffab40);
    display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 16px; letter-spacing: 0.5px;
    box-shadow: 0 4px 12px rgba(255,102,68,0.45);
  `);
  badge.textContent = 'GH';
  brand.appendChild(badge);
  const brandText = el('div', 'line-height: 1.1;');
  brandText.innerHTML = `
    <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px;">GAME HUB</div>
    <div style="font-size: 11px; opacity: 0.65;">Welcome back, ${escapeHtml(username)}</div>
  `;
  brand.appendChild(brandText);
  top.appendChild(brand);

  const topRight = el('div', 'display: flex; align-items: center; gap: 8px;');
  top.appendChild(topRight);
  topRight.appendChild(chipButton('Pixel Avatar', '#42a5f5', onAvatar));
  topRight.appendChild(chipButton('3D Avatar', '#ffab40', onAvatar3D));
  topRight.appendChild(chipButton('Classic view', '#6b7280', onClassic));
  topRight.appendChild(chipButton('Log out', '#c62828', onLogout));

  // Main grid: hero + games
  const main = el('div', `
    flex: 1; display: grid; grid-template-columns: 280px 1fr; gap: 24px;
    min-height: 0;
  `);
  container.appendChild(main);

  // Hero card (avatar-ish)
  const hero = el('div', `
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
    padding: 20px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; gap: 10px;
  `);
  hero.classList.add('fade-in');
  const avatarCircle = el('div', `
    width: 140px; height: 140px; border-radius: 50%;
    background: conic-gradient(from 120deg, #ff6644, #ffab40, #42a5f5, #ff6644);
    display: flex; align-items: center; justify-content: center;
    font-size: 44px; font-weight: 900; letter-spacing: 1px;
    color: #0a0a1a; box-shadow: inset 0 0 30px rgba(0,0,0,0.2), 0 10px 30px rgba(0,0,0,0.35);
    animation: cc-float-0 6s ease-in-out infinite alternate;
  `);
  avatarCircle.textContent = (username[0] || 'A').toUpperCase();
  hero.appendChild(avatarCircle);
  const heroName = el('div', 'font-size: 20px; font-weight: 800;');
  heroName.textContent = username;
  hero.appendChild(heroName);
  const heroTag = el('div', 'font-size: 11px; opacity: 0.7;');
  heroTag.textContent = 'Adventurer of the Hub';
  hero.appendChild(heroTag);
  main.appendChild(hero);

  // Games grid
  const games = el('div', `
    display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px; align-content: start; overflow: auto; padding: 4px;
  `);
  main.appendChild(games);

  const GAMES = [
    {
      id: 'World',
      title: 'Capture Creature',
      tag: 'Adventure',
      desc: 'Explore wild zones, battle creatures, capture them with orbs.',
      grad: 'linear-gradient(135deg, #1b5e20 0%, #004d40 100%)',
      accent: '#66bb6a',
    },
    {
      id: 'CreateMovie',
      title: 'Create a Movie',
      tag: 'Creative',
      desc: 'Pick a genre, a star, and a plot - make your own film.',
      grad: 'linear-gradient(135deg, #311b92 0%, #4527a0 100%)',
      accent: '#ffd600',
    },
    {
      id: 'BrainrotHub',
      title: 'Win A Brainrot',
      tag: '3D Mini-games',
      desc: 'Clear levels, earn coins, collect brainrots in the 3D plaza.',
      grad: 'linear-gradient(135deg, #4a1a00 0%, #7f1d1d 100%)',
      accent: '#ff6644',
    },
  ];

  for (const g of GAMES) {
    const card = el('div', `
      background: ${g.grad}; border: 2px solid ${g.accent}55;
      border-radius: 14px; padding: 18px; cursor: pointer;
      display: flex; flex-direction: column; gap: 10px; min-height: 150px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    `);
    card.classList.add('game-card', 'fade-in');
    card.addEventListener('click', () => onPickGame(g.id));

    const tag = el('div', `
      align-self: flex-start; font-size: 10px; letter-spacing: 1.5px;
      font-weight: 700; padding: 3px 8px; border-radius: 999px;
      background: ${g.accent}33; color: ${g.accent}; text-transform: uppercase;
    `);
    tag.textContent = g.tag;
    card.appendChild(tag);

    const t = el('div', 'font-size: 18px; font-weight: 800;');
    t.textContent = g.title;
    card.appendChild(t);

    const d = el('div', 'font-size: 12px; opacity: 0.85; line-height: 1.45; flex: 1;');
    d.textContent = g.desc;
    card.appendChild(d);

    const playRow = el('div', 'display: flex; justify-content: flex-end;');
    const play = el('div', `
      background: ${g.accent}; color: #0a0a1a; font-weight: 800; font-size: 12px;
      padding: 8px 16px; border-radius: 8px; letter-spacing: 1px;
    `);
    play.textContent = 'PLAY \u2192';
    playRow.appendChild(play);
    card.appendChild(playRow);

    games.appendChild(card);
  }

  // Footer
  const footer = el('div', 'text-align: center; font-size: 10px; opacity: 0.5;');
  footer.textContent = 'Made by Albie';
  container.appendChild(footer);

  return {
    destroy() { root.remove(); },
  };
}

function chipButton(text, color, onClick) {
  const b = document.createElement('button');
  b.className = 'pro-btn';
  b.textContent = text;
  b.style.cssText = `
    background: ${color}22; color: ${color}; border: 1px solid ${color}66;
    font-family: inherit; font-weight: 700; font-size: 11px;
    letter-spacing: 1px; text-transform: uppercase;
    padding: 8px 12px; border-radius: 8px; cursor: pointer;
  `;
  b.addEventListener('click', onClick);
  return b;
}

function el(tag, css) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  return e;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
