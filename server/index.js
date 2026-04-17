const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');

function loadAccounts() {
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, error: 'Username and password required' });
  if (username.length < 3 || username.length > 16) return res.json({ ok: false, error: 'Username must be 3-16 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ ok: false, error: 'Letters, numbers, and underscores only' });
  if (password.length < 4) return res.json({ ok: false, error: 'Password must be at least 4 characters' });

  const accounts = loadAccounts();
  if (accounts[username.toLowerCase()]) return res.json({ ok: false, error: 'Username already taken' });

  accounts[username.toLowerCase()] = {
    displayName: username,
    password: hashPassword(password),
    gameData: null,
  };
  saveAccounts(accounts);
  res.json({ ok: true, displayName: username, gameData: null });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, error: 'Username and password required' });

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];
  if (!account) return res.json({ ok: false, error: 'Account not found' });
  if (account.password !== hashPassword(password)) return res.json({ ok: false, error: 'Wrong password' });

  res.json({ ok: true, displayName: account.displayName, gameData: account.gameData });
});

app.post('/api/save', (req, res) => {
  const { username, gameData } = req.body;
  if (!username) return res.json({ ok: false, error: 'Not logged in' });

  const accounts = loadAccounts();
  const account = accounts[username.toLowerCase()];
  if (!account) return res.json({ ok: false, error: 'Account not found' });

  account.gameData = gameData;
  saveAccounts(accounts);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Capture Creature 3D server running on port ${PORT}`);
});
