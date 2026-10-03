import Phaser from 'phaser';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Dark background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a23);

    // Title
    this.add.text(w / 2, 50, 'GAME HUB', {
      fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(w / 2, 85, 'Log in or create an account to play', {
      fontSize: '13px', color: '#666666', fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Mode: 'login' or 'signup'
    this.mode = 'login';

    // Tab buttons
    this.loginTab = this.add.text(w / 2 - 80, 140, 'LOG IN', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1565c0', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.signupTab = this.add.text(w / 2 + 80, 140, 'SIGN UP', {
      fontSize: '16px', color: '#aaaaaa',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a2e', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.loginTab.on('pointerdown', () => this.setMode('login'));
    this.signupTab.on('pointerdown', () => this.setMode('signup'));

    // Form panel
    this.add.rectangle(w / 2, 300, 340, 240, 0x16213e)
      .setStrokeStyle(2, 0x333366);

    // Labels
    this.add.text(w / 2 - 140, 205, 'Username', {
      fontSize: '13px', color: '#aaaaaa', fontFamily: 'Arial, sans-serif',
    });
    this.add.text(w / 2 - 140, 275, 'Password', {
      fontSize: '13px', color: '#aaaaaa', fontFamily: 'Arial, sans-serif',
    });

    // Create HTML input elements
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();

    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = 'Enter username';
    this.usernameInput.maxLength = 16;
    this.usernameInput.style.cssText = `
      position: absolute; width: 280px; height: 32px; font-size: 16px;
      background: #0a0a23; color: #ffffff; border: 2px solid #333366;
      border-radius: 4px; padding: 0 8px; outline: none;
      font-family: Arial, sans-serif;
    `;
    this.usernameInput.addEventListener('focus', () => {
      this.usernameInput.style.borderColor = '#1565c0';
    });
    this.usernameInput.addEventListener('blur', () => {
      this.usernameInput.style.borderColor = '#333366';
    });
    document.body.appendChild(this.usernameInput);

    this.passwordInput = document.createElement('input');
    this.passwordInput.type = 'password';
    this.passwordInput.placeholder = 'Enter password';
    this.passwordInput.style.cssText = `
      position: absolute; width: 280px; height: 32px; font-size: 16px;
      background: #0a0a23; color: #ffffff; border: 2px solid #333366;
      border-radius: 4px; padding: 0 8px; outline: none;
      font-family: Arial, sans-serif;
    `;
    this.passwordInput.addEventListener('focus', () => {
      this.passwordInput.style.borderColor = '#1565c0';
    });
    this.passwordInput.addEventListener('blur', () => {
      this.passwordInput.style.borderColor = '#333366';
    });
    document.body.appendChild(this.passwordInput);

    // Enter key to submit
    this.passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });
    this.usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.passwordInput.focus();
    });

    // Submit button
    this.submitBtn = this.add.text(w / 2, 370, 'LOG IN', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1565c0', padding: { x: 50, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.submitBtn.on('pointerover', () => this.submitBtn.setStyle({ backgroundColor: '#1976d2' }));
    this.submitBtn.on('pointerout', () => this.submitBtn.setStyle({ backgroundColor: '#1565c0' }));
    this.submitBtn.on('pointerdown', () => this.submit());

    // Error text
    this.errorText = this.add.text(w / 2, 410, '', {
      fontSize: '13px', color: '#ff4444', fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Position inputs on resize
    this.positionInputs();
    this.scale.on('resize', () => this.positionInputs());

    // Also reposition on next frames to handle initial layout
    this.time.addEvent({
      delay: 100, repeat: 5,
      callback: () => this.positionInputs(),
    });
  }

  positionInputs() {
    if (!this.cameras || !this.cameras.main || !this.usernameInput || !this.passwordInput) return;
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.cameras.main.width;
    const scaleY = rect.height / this.cameras.main.height;
    const offsetX = rect.left;
    const offsetY = rect.top;

    const w = this.cameras.main.width;

    // Username input at y=225 in game coords
    const ux = (w / 2 - 140) * scaleX + offsetX;
    const uy = 225 * scaleY + offsetY;
    this.usernameInput.style.left = ux + 'px';
    this.usernameInput.style.top = uy + 'px';
    this.usernameInput.style.width = (280 * scaleX) + 'px';
    this.usernameInput.style.height = (32 * scaleY) + 'px';
    this.usernameInput.style.fontSize = (16 * scaleY) + 'px';

    // Password input at y=295 in game coords
    const py = 295 * scaleY + offsetY;
    this.passwordInput.style.left = ux + 'px';
    this.passwordInput.style.top = py + 'px';
    this.passwordInput.style.width = (280 * scaleX) + 'px';
    this.passwordInput.style.height = (32 * scaleY) + 'px';
    this.passwordInput.style.fontSize = (16 * scaleY) + 'px';
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'login') {
      this.loginTab.setStyle({ color: '#ffffff', backgroundColor: '#1565c0', fontStyle: 'bold' });
      this.signupTab.setStyle({ color: '#aaaaaa', backgroundColor: '#1a1a2e', fontStyle: '' });
      this.submitBtn.setText('LOG IN');
    } else {
      this.signupTab.setStyle({ color: '#ffffff', backgroundColor: '#1565c0', fontStyle: 'bold' });
      this.loginTab.setStyle({ color: '#aaaaaa', backgroundColor: '#1a1a2e', fontStyle: '' });
      this.submitBtn.setText('SIGN UP');
    }
    this.errorText.setText('');
  }

  async submit() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    if (!username || !password) {
      this.errorText.setText('Please enter username and password');
      return;
    }

    this.submitBtn.setText('...');
    this.errorText.setText('');

    const endpoint = this.mode === 'login' ? '/api/login' : '/api/register';

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();

      if (!data.ok) {
        this.errorText.setText(data.error);
        this.submitBtn.setText(this.mode === 'login' ? 'LOG IN' : 'SIGN UP');
        return;
      }

      // Success — store user info and go to homepage
      this.registry.set('username', data.displayName);
      this.registry.set('serverGameData', data.gameData);
      this.registry.set('avatar', data.avatar || { outfit: 0, hat: 0 });

      // Merge server with localStorage (in case an earlier save on this
      // device didn't make it to the server).
      const serverBr = data.brainrotData || { coins: 0, owned: [], bestLevels: {} };
      let finalBr = serverBr;
      try {
        const key = 'cc_brdata_' + (data.displayName || '_').toLowerCase();
        const raw = localStorage.getItem(key);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.data) {
            const c = cached.data;
            const union = (a, b) => { const s = new Set(); if (Array.isArray(a)) for (const x of a) s.add(x); if (Array.isArray(b)) for (const x of b) s.add(x); return Array.from(s); };
            const lastSeenServer = typeof cached.lastServerCoins === 'number'
              ? cached.lastServerCoins
              : (typeof c.coins === 'number' ? c.coins : 0);
            const serverCoins = serverBr.coins || 0;
            const bump = Math.max(0, serverCoins - lastSeenServer);
            const localCoins = typeof c.coins === 'number' ? c.coins : 0;
            const mergeLvls = (a, b) => {
              const out = {};
              if (a) for (const k of Object.keys(a)) out[k] = a[k];
              if (b) for (const k of Object.keys(b)) out[k] = Math.max(out[k] || 0, b[k] || 0);
              return out;
            };
            finalBr = {
              coins: localCoins + bump,
              owned: union(serverBr.owned, c.owned),
              bestLevels: Object.assign({}, serverBr.bestLevels || {}, c.bestLevels || {}),
              abilities: {
                owned: union(serverBr.abilities && serverBr.abilities.owned, c.abilities && c.abilities.owned),
                equipped: (c.abilities && c.abilities.equipped && c.abilities.equipped.length
                  ? c.abilities.equipped
                  : (serverBr.abilities && serverBr.abilities.equipped) || []).slice(0, 8),
              },
              abilityLevels: mergeLvls(serverBr.abilityLevels, c.abilityLevels),
              soldierLevel: Math.max(serverBr.soldierLevel || 0, c.soldierLevel || 0) || 1,
              healthLevel: Math.max(serverBr.healthLevel || 0, c.healthLevel || 0),
            };
          }
        }
      } catch {}
      this.registry.set('brainrotData', finalBr);

      // Persist session so a page refresh stays logged in
      if (data.token) {
        try { localStorage.setItem('cc_session', data.token); } catch {}
      }

      if (finalBr !== serverBr) {
        fetch('/api/save-brainrot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token, brainrotData: finalBr }),
          keepalive: true,
        }).catch(() => {});
      }

      // Clean up HTML inputs
      this.usernameInput.remove();
      this.passwordInput.remove();

      this.scene.start('Homepage');
    } catch (err) {
      this.errorText.setText('Connection error — is the server running?');
      this.submitBtn.setText(this.mode === 'login' ? 'LOG IN' : 'SIGN UP');
    }
  }
}
