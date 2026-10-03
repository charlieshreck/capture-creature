const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');

// Players who are allowed to use admin endpoints (give-creature, give-creature-all).
// Stored lowercase. Only the server enforces this — never trust the client.
const ADMINS = new Set(['albie', 'chaz']);

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

// --- Password hashing -------------------------------------------------------
// New accounts: account.password = { salt: hex, hash: hex } using scrypt.
// Legacy accounts: account.password = "<sha256 hex>" — kept working so nobody
// is locked out, but transparently upgraded to scrypt on next successful login.

const SCRYPT_KEYLEN = 64;

function hashPasswordScrypt(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { salt, hash };
}

function legacyHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, stored) {
  if (typeof stored === 'string') {
    // Legacy unsalted SHA-256
    return stored === legacyHash(password);
  }
  if (stored && typeof stored === 'object' && stored.salt && stored.hash) {
    const candidate = crypto.scryptSync(password, stored.salt, SCRYPT_KEYLEN).toString('hex');
    // Constant-time compare to avoid timing attacks
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(stored.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  return false;
}

// In-memory session tokens. Cleared on server restart; client falls back
// to the login screen in that case, which is fine for a personal game.
const sessions = new Map(); // token -> username (lowercase)

function createSession(usernameLower) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, usernameLower);
  return token;
}

// Resolve a request's session token to { usernameLower, account, accounts }
// or send an error response and return null. Use at the top of every
// endpoint that mutates user data — never trust a username from req.body.
function requireAuth(req, res) {
  const token = req.body && req.body.token;
  if (!token) {
    res.json({ ok: false, error: 'Not logged in' });
    return null;
  }
  const usernameLower = sessions.get(token);
  if (!usernameLower) {
    res.json({ ok: false, error: 'Session expired' });
    return null;
  }
  const accounts = loadAccounts();
  const account = accounts[usernameLower];
  if (!account) {
    sessions.delete(token);
    res.json({ ok: false, error: 'Account not found' });
    return null;
  }
  return { usernameLower, account, accounts };
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
    password: hashPasswordScrypt(password),
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
  const usernameLower = username.toLowerCase();
  const account = accounts[usernameLower];

  if (!account) {
    return res.json({ ok: false, error: 'Account not found' });
  }
  if (!verifyPassword(password, account.password)) {
    return res.json({ ok: false, error: 'Wrong password' });
  }

  // Lazy upgrade: if the account is still on the legacy unsalted SHA-256
  // format, replace it with a scrypt+salt hash now that we have the
  // plaintext password and have just verified it.
  if (typeof account.password === 'string') {
    account.password = hashPasswordScrypt(password);
    saveAccounts(accounts);
  }

  const token = createSession(usernameLower);
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

// Save game data — username comes from the session, never the body.
app.post('/api/save', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  auth.account.gameData = req.body.gameData;
  saveAccounts(auth.accounts);

  res.json({ ok: true });
});

// Save brainrot data
app.post('/api/save-brainrot', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!req.body.brainrotData) {
    return res.json({ ok: false, error: 'Missing data' });
  }

  auth.account.brainrotData = req.body.brainrotData;
  saveAccounts(auth.accounts);

  res.json({ ok: true });
});

// Save avatar choice
app.post('/api/save-avatar', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const avatar = req.body.avatar;
  if (!avatar) {
    return res.json({ ok: false, error: 'Missing data' });
  }

  auth.account.avatar = { outfit: avatar.outfit || 0, hat: avatar.hat || 0 };
  saveAccounts(auth.accounts);

  res.json({ ok: true });
});

// Give creature to a specific user — admin only.
app.post('/api/give-creature', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!ADMINS.has(auth.usernameLower)) {
    return res.json({ ok: false, error: 'Not allowed' });
  }

  const { targetUsername, creature } = req.body;
  if (!targetUsername || !creature) {
    return res.json({ ok: false, error: 'Missing username or creature' });
  }

  const targetAccount = auth.accounts[targetUsername.toLowerCase()];
  if (!targetAccount) {
    return res.json({ ok: false, error: 'Player not found' });
  }

  if (!targetAccount.gameData) {
    targetAccount.gameData = { creatures: [], orbs: 5, gold: 0 };
  }
  targetAccount.gameData.creatures.push(creature);
  saveAccounts(auth.accounts);

  res.json({ ok: true, displayName: targetAccount.displayName });
});

// Give creature to all users — admin only.
app.post('/api/give-creature-all', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!ADMINS.has(auth.usernameLower)) {
    return res.json({ ok: false, error: 'Not allowed' });
  }

  const { creature } = req.body;
  if (!creature) {
    return res.json({ ok: false, error: 'Missing creature' });
  }

  let count = 0;
  for (const key of Object.keys(auth.accounts)) {
    if (!auth.accounts[key].gameData) {
      auth.accounts[key].gameData = { creatures: [], orbs: 5, gold: 0 };
    }
    auth.accounts[key].gameData.creatures.push({ ...creature });
    count++;
  }
  saveAccounts(auth.accounts);

  res.json({ ok: true, count });
});

// SPA fallback — regex form so it keeps working under Express 5,
// where bare '*' is no longer accepted by path-to-regexp.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Capture Creature server running on port ${PORT}`);
});
