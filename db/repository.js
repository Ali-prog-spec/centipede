const bcryptjs = require('bcryptjs');
const {
  Player,
  Score,
  DailyChallenge,
  Achievement,
  PlayerAchievement,
  TokenRequest,
} = require('./schema');

const { STORE_SKINS, getEarnedAchievements } = require('./gameData');

function serializePlayer(player) {
  if (!player) return null;
  return {
    id: String(player._id),
    username: player.username,
    coins: player.coins,
    tokens: player.tokens,
    role: player.role,
    isActive: player.isActive !== false,
    totalGames: player.totalGames,
    bestScore: player.bestScore,
    ownedSkins: player.ownedSkins || ['classic-blaster'],
    selectedSkin: player.selectedSkin || 'classic-blaster',
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

function getSkinById(skinId) {
  return STORE_SKINS.find((skin) => skin.id === skinId);
}

async function createPlayer(username, password, role = 'player') {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedRole = role === 'admin' ? 'admin' : 'player';
  const existing = await Player.findOne({ username: normalizedUsername });
  if (existing) {
    throw new Error('Username already taken');
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);
  const player = await Player.create({
    username: normalizedUsername,
    password: hashedPassword,
    coins: 1,
    tokens: normalizedRole === 'admin' ? 9999 : 3,
    role: normalizedRole,
    ownedSkins: ['classic-blaster'],
    selectedSkin: 'classic-blaster',
  });

  return serializePlayer(player);
}

async function authenticatePlayer(username, password) {
  const player = await Player.findOne({ username: username.toLowerCase() });
  if (!player) return null;

  const isValid = bcryptjs.compareSync(password, player.password);
  if (!isValid) return null;

  if (player.isActive === false) {
    throw new Error('Account is deactivated. Please contact an admin.');
  }

  return serializePlayer(player);
}

async function getPlayerByUsername(username) {
  const player = await Player.findOne({ username: username.toLowerCase() });
  return serializePlayer(player);
}

async function getPlayerById(id) {
  const player = await Player.findById(id);
  return serializePlayer(player);
}

async function upsertPlayer(username) {
  const normalizedUsername = username.toLowerCase();
  let player = await Player.findOne({ username: normalizedUsername });

  if (!player) {
    player = await Player.create({
      username: normalizedUsername,
      password: bcryptjs.hashSync('legacy-player', 10),
      coins: 1,
      tokens: 3,
      role: 'player',
      ownedSkins: ['classic-blaster'],
      selectedSkin: 'classic-blaster',
    });
  }

  return serializePlayer(player);
}

async function startPlay(playerId) {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (player.role !== 'player') throw new Error('Only players can start games');
  if (player.tokens <= 0) throw new Error('No play tokens left');

  player.tokens -= 1;
  player.coins = player.tokens;
  await player.save();
  return serializePlayer(player);
}

async function submitScore({
  username,
  score,
  level = 1,
  kills = 0,
  mushrooms_hit = 0,
  duration_sec = 0,
}) {
  const player = await upsertPlayer(username);
  const playerDoc = await Player.findById(player.id);

  const scoreDoc = await Score.create({
    playerId: player.id,
    score: Math.floor(score),
    level,
    kills,
    mushroomsHit: mushrooms_hit,
    durationSec: duration_sec,
  });

  playerDoc.totalGames += 1;
  playerDoc.bestScore = Math.max(playerDoc.bestScore, score);
  await playerDoc.save();

  const newAchievements = await checkAndAwardAchievements(player.id, {
    score,
    kills,
    mushrooms_hit,
    duration_sec,
  });

  return {
    scoreId: String(scoreDoc._id),
    player: serializePlayer(playerDoc),
    newAchievements,
  };
}

async function checkAndAwardAchievements(
  playerId,
  { score, kills, mushrooms_hit, duration_sec }
) {
  const player = await Player.findById(playerId);
  const allScores = await Score.find({ playerId });
  const totalKills = allScores.reduce((sum, entry) => sum + entry.kills, 0);
  const totalMushrooms = allScores.reduce((sum, entry) => sum + entry.mushroomsHit, 0);
  
  const topScore = await Score.findOne().sort({ score: -1 }).populate('playerId');
  const isLegend = topScore && String(topScore.playerId._id) === String(playerId);

  const playerStats = {
    totalGames: player.totalGames,
    totalKills,
    totalMushrooms
  };

  const currentRunStats = {
    score,
    kills,
    mushrooms_hit,
    duration_sec,
    isLegend
  };

  const candidates = getEarnedAchievements(playerStats, currentRunStats);

  const earnedAlready = await PlayerAchievement.find({ playerId }).populate('achievementId');
  const earnedCodes = earnedAlready.map((entry) => entry.achievementId.code);
  const newCodes = candidates.filter((code) => !earnedCodes.includes(code));
  const achievements = await Achievement.find({ code: { $in: newCodes } });

  for (const achievement of achievements) {
    await PlayerAchievement.create({
      playerId,
      achievementId: achievement._id,
    });
  }

  return achievements.map((achievement) => achievement.toObject());
}

async function getLeaderboard(limit = 20) {
  const players = await Player.find({ role: 'player', bestScore: { $gt: 0 } })
    .sort({ bestScore: -1 })
    .limit(limit)
    .select('-password');

  return players.map((player, index) => ({
    id: String(player._id),
    username: player.username,
    score: player.bestScore,
    bestScore: player.bestScore,
    totalGames: player.totalGames,
    rank: index + 1,
  }));
}

async function getRecentGames(limit = 10) {
  const scores = await Score.find()
    .populate('playerId', 'username role')
    .sort({ createdAt: -1 })
    .limit(limit);

  return scores
    .filter((entry) => entry.playerId?.role === 'player')
    .map((entry) => ({
      id: String(entry._id),
      username: entry.playerId.username,
      score: entry.score,
      level: entry.level,
      kills: entry.kills,
      mushrooms_hit: entry.mushroomsHit,
      duration_sec: entry.durationSec,
      played_at: entry.createdAt,
    }));
}

async function getPlayerHistory(username, limit = 10) {
  const player = await Player.findOne({ username: username.toLowerCase() });
  if (!player) return [];

  const scores = await Score.find({ playerId: player._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  return scores.map((entry) => ({
    id: String(entry._id),
    score: entry.score,
    level: entry.level,
    kills: entry.kills,
    mushrooms_hit: entry.mushroomsHit,
    duration_sec: entry.durationSec,
    played_at: entry.createdAt,
  }));
}

async function getPlayerProfile(username) {
  const player = await Player.findOne({ username: username.toLowerCase() }).select('-password');
  if (!player) return null;

  const betterScores = await Player.countDocuments({
    role: 'player',
    bestScore: { $gt: player.bestScore },
  });
  const rank = betterScores + 1;

  const playerAchievements = await PlayerAchievement.find({ playerId: player._id })
    .populate('achievementId')
    .sort({ createdAt: -1 });

  const achievements = playerAchievements.map((entry) =>
    entry.achievementId.toObject()
  );

  const scores = await Score.find({ playerId: player._id });
  const totalScore = scores.reduce((sum, entry) => sum + entry.score, 0);
  const stats = {
    totalGames: scores.length,
    totalScore,
    bestScore: player.bestScore,
    totalKills: scores.reduce((sum, entry) => sum + entry.kills, 0),
    totalMushrooms: scores.reduce((sum, entry) => sum + entry.mushroomsHit, 0),
    avgScore: scores.length > 0 ? Math.round(totalScore / scores.length) : 0,
    longestRun: scores.length > 0 ? Math.max(...scores.map((entry) => entry.durationSec)) : 0,
  };

  return {
    ...serializePlayer(player),
    rank,
    achievements,
    stats,
  };
}

async function submitDailyChallenge({ username, score, completed = false }) {
  const player = await upsertPlayer(username);
  const today = new Date().toISOString().split('T')[0];

  const existing = await DailyChallenge.findOne({
    playerId: player.id,
    challengeDate: today,
  });

  if (existing) {
    existing.score = Math.max(existing.score, score);
    existing.completed = existing.completed || completed;
    await existing.save();
  } else {
    await DailyChallenge.create({
      playerId: player.id,
      challengeDate: today,
      score,
      completed,
    });
  }

  return { success: true };
}

async function getDailyLeaderboard() {
  const today = new Date().toISOString().split('T')[0];
  const dailyChallenges = await DailyChallenge.find({ challengeDate: today })
    .populate('playerId', 'username role')
    .sort({ score: -1 })
    .limit(20);

  return dailyChallenges
    .filter((entry) => entry.playerId?.role === 'player')
    .map((entry, index) => ({
      username: entry.playerId.username,
      score: entry.score,
      completed: entry.completed,
      played_at: entry.createdAt,
      rank: index + 1,
    }));
}

async function getAllPlayers() {
  const players = await Player.find({ role: 'player' }).select('-password').sort({ createdAt: -1 });
  return players.map((player) => serializePlayer(player));
}

async function searchPlayers(query) {
  const players = await Player.find({
    role: 'player',
    username: { $regex: query || '', $options: 'i' },
  })
    .select('-password')
    .sort({ username: 1 });

  return players.map((player) => serializePlayer(player));
}

async function assignTokens(playerId, tokens) {
  const amount = Number(tokens);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Token amount must be greater than 0');
  }

  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');

  player.tokens += amount;
  player.coins = player.tokens;
  await player.save();
  return serializePlayer(player);
}

async function rewardVictoryToken(playerId) {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (player.role !== 'player') throw new Error('Only players can receive victory rewards');

  player.tokens += 1;
  player.coins = player.tokens;
  await player.save();
  return serializePlayer(player);
}

async function listAdmins() {
  const admins = await Player.find({ role: 'admin' })
    .select('username role createdAt')
    .sort({ username: 1 });

  return admins.map((admin) => ({
    id: String(admin._id),
    username: admin.username,
    role: admin.role,
    createdAt: admin.createdAt,
  }));
}

async function createTokenRequest(playerId, adminId, requestedTokens, message = '') {
  const player = await Player.findById(playerId);
  if (!player || player.role !== 'player') {
    throw new Error('Player not found');
  }

  const admin = await Player.findById(adminId);
  if (!admin || admin.role !== 'admin') {
    throw new Error('Admin not found');
  }

  const amount = Number(requestedTokens);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Requested tokens must be greater than 0');
  }

  const request = await TokenRequest.create({
    playerId,
    adminId,
    requestedTokens: amount,
    message: message || '',
  });

  return getTokenRequestById(request._id);
}

async function getTokenRequestById(requestId) {
  const request = await TokenRequest.findById(requestId)
    .populate('playerId', 'username')
    .populate('adminId', 'username');

  if (!request) return null;

  return {
    id: String(request._id),
    playerId: String(request.playerId._id),
    playerUsername: request.playerId.username,
    adminId: String(request.adminId._id),
    adminUsername: request.adminId.username,
    requestedTokens: request.requestedTokens,
    resolvedTokens: request.resolvedTokens,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

async function getRequestsForPlayer(playerId) {
  const requests = await TokenRequest.find({ playerId })
    .populate('adminId', 'username')
    .sort({ createdAt: -1 });

  return requests.map((request) => ({
    id: String(request._id),
    adminId: String(request.adminId._id),
    adminUsername: request.adminId.username,
    requestedTokens: request.requestedTokens,
    resolvedTokens: request.resolvedTokens,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }));
}

async function getRequestsForAdmin(adminId) {
  const requests = await TokenRequest.find({ adminId })
    .populate('playerId', 'username')
    .sort({ status: 1, createdAt: -1 });

  return requests.map((request) => ({
    id: String(request._id),
    playerId: String(request.playerId._id),
    playerUsername: request.playerId.username,
    requestedTokens: request.requestedTokens,
    resolvedTokens: request.resolvedTokens,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }));
}

async function processTokenRequest(requestId, action, resolvedTokens = 0) {
  const request = await TokenRequest.findById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending') {
    throw new Error('Request already processed');
  }

  if (action === 'approve') {
    const amount = Number(resolvedTokens) > 0 ? Number(resolvedTokens) : request.requestedTokens;
    await assignTokens(request.playerId, amount);
    request.status = 'approved';
    request.resolvedTokens = amount;
  } else if (action === 'reject') {
    request.status = 'rejected';
    request.resolvedTokens = 0;
  } else {
    throw new Error('Invalid request action');
  }

  await request.save();
  return getTokenRequestById(request._id);
}

async function buySkin(playerId, skinId) {
  const skin = getSkinById(skinId);
  if (!skin) throw new Error('Skin not found');

  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (player.role !== 'player') throw new Error('Only players can buy skins');

  if ((player.ownedSkins || []).includes(skin.id)) {
    player.selectedSkin = skin.id;
    await player.save();
    return {
      player: serializePlayer(player),
      skin,
      purchased: false,
    };
  }

  if (player.tokens < skin.price) {
    throw new Error('Not enough tokens for this skin');
  }

  player.tokens -= skin.price;
  player.coins = player.tokens;
  player.ownedSkins = [...new Set([...(player.ownedSkins || []), skin.id])];
  player.selectedSkin = skin.id;
  await player.save();

  return {
    player: serializePlayer(player),
    skin,
    purchased: true,
  };
}

async function selectSkin(playerId, skinId) {
  const skin = getSkinById(skinId);
  if (!skin) throw new Error('Skin not found');

  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (!(player.ownedSkins || []).includes(skin.id)) {
    throw new Error('Skin not owned');
  }

  player.selectedSkin = skin.id;
  await player.save();
  return serializePlayer(player);
}

function getStoreSkins() {
  return STORE_SKINS;
}

async function setPlayerStatus(playerId, isActive) {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (player.username === 'admin') throw new Error('Cannot deactivate the default admin account');

  player.isActive = Boolean(isActive);
  await player.save();
  return serializePlayer(player);
}

async function setPlayerRole(playerId, newRole) {
  if (!['player', 'admin'].includes(newRole)) {
    throw new Error('Invalid role. Must be "player" or "admin".');
  }

  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  if (player.username === 'admin') throw new Error('Cannot change the default admin role');

  player.role = newRole;
  if (newRole === 'admin') {
    player.tokens = Math.max(player.tokens, 9999);
  }
  await player.save();
  return serializePlayer(player);
}

module.exports = {
  STORE_SKINS,
  createPlayer,
  authenticatePlayer,
  upsertPlayer,
  getPlayerByUsername,
  getPlayerById,
  startPlay,
  submitScore,
  getLeaderboard,
  getRecentGames,
  getPlayerHistory,
  getPlayerProfile,
  submitDailyChallenge,
  getDailyLeaderboard,
  getAllPlayers,
  searchPlayers,
  assignTokens,
  rewardVictoryToken,
  listAdmins,
  createTokenRequest,
  getRequestsForPlayer,
  getRequestsForAdmin,
  processTokenRequest,
  buySkin,
  selectSkin,
  getStoreSkins,
  setPlayerStatus,
  setPlayerRole,
};
