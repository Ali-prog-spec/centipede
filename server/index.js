const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const repo = require('../db/repository');
const { initDB } = require('../db/schema');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || 'centipede-arcade-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function ok(res, data) {
  res.json({ success: true, data });
}

function err(res, msg, status = 400) {
  res.status(status).json({ success: false, error: msg });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function generateToken(player) {
  return jwt.sign(
    { id: player.id, username: player.username, role: player.role || 'player' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return err(res, 'No token provided', 401);

  const decoded = verifyToken(token);
  if (!decoded) return err(res, 'Invalid or expired token', 401);

  req.user = decoded;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return err(res, 'Admin access required', 403);
  }
  next();
}

function playerMiddleware(req, res, next) {
  if (req.user.role !== 'player') {
    return err(res, 'Player access required', 403);
  }
  next();
}

app.post('/api/auth/signup', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || username.trim().length < 2) {
    return err(res, 'Username must be at least 2 characters');
  }
  if (username.trim().length > 20) {
    return err(res, 'Username must be 20 characters or fewer');
  }
  if (!password || password.length < 8) {
    return err(res, 'Password must be at least 8 characters');
  }
  const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passRegex.test(password)) {
    return err(res, 'Password must contain at least one letter, one number, and one special character');
  }

  try {
    const player = await repo.createPlayer(username.trim(), password, role || 'player');
    const token = generateToken(player);
    ok(res, { player, token });
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return err(res, 'Username and password required');
  }

  try {
    const player = await repo.authenticatePlayer(username, password);
    if (!player) {
      return err(res, 'Invalid username or password', 401);
    }
    const token = generateToken(player);
    ok(res, { player, token });
  } catch (error) {
    const status = error.message.includes('deactivated') ? 403 : 500;
    err(res, error.message, status);
  }
});

app.post('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    const player = await repo.getPlayerById(req.user.id);
    if (!player) return err(res, 'Player not found', 404);
    ok(res, player);
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return err(res, 'Username required');
  try {
    const token = await repo.createResetToken(username);
    // In a real app, send this via email. We return it here for testing.
    ok(res, { message: 'Reset token generated', token });
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return err(res, 'Token and new password required');
  
  if (newPassword.length < 8) {
    return err(res, 'Password must be at least 8 characters');
  }
  const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passRegex.test(newPassword)) {
    return err(res, 'Password must contain at least one letter, one number, and one special character');
  }

  try {
    const player = await repo.resetPassword(token, newPassword);
    ok(res, { message: 'Password reset successfully', player });
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/players/register', async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 2) {
    return err(res, 'Username must be at least 2 characters');
  }

  try {
    const player = await repo.upsertPlayer(username.trim());
    ok(res, player);
  } catch (error) {
    err(res, `Could not register player: ${error.message}`, 500);
  }
});

app.get('/api/players/:username', async (req, res) => {
  try {
    const profile = await repo.getPlayerProfile(req.params.username);
    if (!profile) return err(res, 'Player not found', 404);
    ok(res, profile);
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/api/players/:username/history', async (req, res) => {
  try {
    const history = await repo.getPlayerHistory(req.params.username, 15);
    ok(res, history);
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/play/start', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    const player = await repo.startPlay(req.user.id);
    ok(res, player);
  } catch (error) {
    err(res, error.message, 403);
  }
});

app.get('/api/store/skins', authMiddleware, async (req, res) => {
  ok(res, repo.getStoreSkins());
});

app.post('/api/store/buy', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    const { skinId } = req.body;
    ok(res, await repo.buySkin(req.user.id, skinId));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/store/select', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    const { skinId } = req.body;
    ok(res, await repo.selectSkin(req.user.id, skinId));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.get('/api/admin/list', authMiddleware, async (req, res) => {
  try {
    ok(res, await repo.listAdmins());
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/api/player/requests', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    ok(res, await repo.getRequestsForPlayer(req.user.id));
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/player/requests', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    const { adminId, requestedTokens, message } = req.body;
    ok(res, await repo.createTokenRequest(req.user.id, adminId, requestedTokens, message));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/player/reward-victory', authMiddleware, playerMiddleware, async (req, res) => {
  try {
    ok(res, await repo.rewardVictoryToken(req.user.id));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.get('/api/admin/players', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    ok(res, await repo.getAllPlayers());
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/api/admin/search', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    ok(res, await repo.searchPlayers(req.query.q || ''));
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/admin/assign-tokens', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { playerId, tokens } = req.body;
    ok(res, await repo.assignTokens(playerId, tokens));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.get('/api/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    ok(res, await repo.getRequestsForAdmin(req.user.id));
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/admin/requests/:id/process', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action, resolvedTokens } = req.body;
    ok(res, await repo.processTokenRequest(req.params.id, action, resolvedTokens));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.patch('/api/admin/players/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return err(res, 'isActive must be a boolean');
    }
    ok(res, await repo.setPlayerStatus(req.params.id, isActive));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.patch('/api/admin/players/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    ok(res, await repo.setPlayerRole(req.params.id, role));
  } catch (error) {
    err(res, error.message, 400);
  }
});

app.post('/api/scores', authMiddleware, async (req, res) => {
  const { score, level, kills, mushrooms_hit, duration_sec } = req.body;
  const username = req.user.username;

  if (typeof score !== 'number' || score < 0) {
    return err(res, 'Score must be a non-negative number');
  }

  try {
    const result = await repo.submitScore({
      username,
      score: Math.floor(score),
      level: level || 1,
      kills: kills || 0,
      mushrooms_hit: mushrooms_hit || 0,
      duration_sec: duration_sec || 0,
    });
    ok(res, result);
  } catch (error) {
    err(res, `Score submission failed: ${error.message}`, 500);
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    ok(res, await repo.getLeaderboard(20));
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/api/leaderboard/recent', async (req, res) => {
  try {
    ok(res, await repo.getRecentGames(10));
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/api/daily', async (req, res) => {
  try {
    ok(res, await repo.getDailyLeaderboard());
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.post('/api/daily', async (req, res) => {
  const { username, score, completed } = req.body;
  if (!username || typeof score !== 'number') {
    return err(res, 'Username and score are required');
  }

  try {
    await repo.submitDailyChallenge({ username, score, completed });
    ok(res, { message: 'Daily score submitted' });
  } catch (error) {
    err(res, error.message, 500);
  }
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'auth.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Centipede Web running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
} else {
  initDB().catch(console.error);
}

module.exports = app;
