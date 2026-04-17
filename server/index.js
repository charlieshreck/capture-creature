const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');

// Load accounts from file
function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Save accounts to file
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// In-memory session tokens. Cleared on server restart; client falls back
// to the login screen in that case, which is fine for a personal game.
const sessions = new Map(); // token -> username (lowercase)

function createSession(usernameLower) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, usernameLower);
  return token;
}

function accountPayload(account) {
  return {
    displayName: account.displayName,
    gameData: account.gameData,
    avatar: account.avatar || { outfit: 0, hat: 0 },
    brainrotData: account.brainrotData || { coins: 0, owned: [], bestLevels: {} },
  };
}

app.use(express.json());

// Serve built files
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ ok: false, error: 'Username and password required' });
  }
  if (username.length < 3 || username.length > 16) {
    return res.json({ ok: false, error: 'Username must be 3-16 characters' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.json({ ok: false, error: 'Username can only have letters, numbers, and underscores' });
  }
  if (password.length < 4) {
    return res.json({ ok: false, error: 'Password must be at least 4 characters' });
  }

  const accounts = loadAccounts();
  if (accounts[username.toLowerCase()]) {
    return res.json({ ok: false, error: 'Username already taken' });
  }

  const usernameLower = username.toLowerCase();
  accounts[usernameLower] = {
    displayName: username,
    password: hashPassword(password),
    gameData: null,
    avatar: { outfit: 0, hat: 0 },
    brainrotData: { coins: 0, owned: [], bestLevels: {} },
  };
  saveAccounts(accounts);

  const token = createSession(usernameLower);
  res.json({ ok: true, token, ...accountPayload(accounts[usernameLower]) });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ ok: false, error: 'Username and password required' });
  }

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];

  if (!account) {
    return res.json({ ok: false, error: 'Account not found' });
  }
  if (account.password !== hashPassword(password)) {
    return res.json({ ok: false, error: 'Wrong password' });
  }

  const token = createSession(username.toLowerCase());
  res.json({ ok: true, token, ...accountPayload(account) });
});

// Resume a session using a saved token (for stay-logged-in across refreshes)
app.post('/api/resume', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.json({ ok: false, error: 'No token' });

  const usernameLower = sessions.get(token);
  if (!usernameLower) return res.json({ ok: false, error: 'Session expired' });

  const accounts = loadAccounts();
  const account = accounts[usernameLower];
  if (!account) {
    sessions.delete(token);
    return res.json({ ok: false, error: 'Account not found' });
  }

  res.json({ ok: true, token, ...accountPayload(account) });
});

// Invalidate a session (called on explicit logout)
app.post('/api/logout', (req, res) => {
  const { token } = req.body || {};
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// Save game data
app.post('/api/save', (req, res) => {
  const { username, gameData } = req.body;

  if (!username) {
    return res.json({ ok: false, error: 'Not logged in' });
  }

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];

  if (!account) {
    return res.json({ ok: false, error: 'Account not found' });
  }

  account.gameData = gameData;
  saveAccounts(accounts);

  res.json({ ok: true });
});

// Give creature to a specific user
app.post('/api/give-creature', (req, res) => {
  const { targetUsername, creature } = req.body;

  if (!targetUsername || !creature) {
    return res.json({ ok: false, error: 'Missing username or creature' });
  }

  const accounts = loadAccounts();
  const account = accounts[targetUsername.toLowerCase()];

  if (!account) {
    return res.json({ ok: false, error: 'Player not found' });
  }

  if (!account.gameData) {
    account.gameData = { creatures: [], orbs: 5, gold: 0 };
  }
  account.gameData.creatures.push(creature);
  saveAccounts(accounts);

  res.json({ ok: true, displayName: account.displayName });
});

// Give creature to all users
app.post('/api/give-creature-all', (req, res) => {
  const { creature } = req.body;

  if (!creature) {
    return res.json({ ok: false, error: 'Missing creature' });
  }

  const accounts = loadAccounts();
  let count = 0;
  for (const key of Object.keys(accounts)) {
    if (!accounts[key].gameData) {
      accounts[key].gameData = { creatures: [], orbs: 5, gold: 0 };
    }
    accounts[key].gameData.creatures.push({ ...creature });
    count++;
  }
  saveAccounts(accounts);

  res.json({ ok: true, count });
});

// Save brainrot data
app.post('/api/save-brainrot', (req, res) => {
  const { username, brainrotData } = req.body;

  if (!username || !brainrotData) {
    return res.json({ ok: false, error: 'Missing data' });
  }

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];

  if (!account) {
    return res.json({ ok: false, error: 'Account not found' });
  }

  account.brainrotData = brainrotData;
  saveAccounts(accounts);

  res.json({ ok: true });
});

// Save avatar choice
app.post('/api/save-avatar', (req, res) => {
  const { username, avatar } = req.body;

  if (!username || !avatar) {
    return res.json({ ok: false, error: 'Missing data' });
  }

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];

  if (!account) {
    return res.json({ ok: false, error: 'Account not found' });
  }

  account.avatar = { outfit: avatar.outfit || 0, hat: avatar.hat || 0 };
  saveAccounts(accounts);

  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Capture Creature server running on port ${PORT}`);
});
