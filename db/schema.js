const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/centipede';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

const playerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    coins: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalGames: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['player', 'admin'],
      default: 'player',
    },
    tokens: {
      type: Number,
      default: 3,
      min: 0,
    },
    ownedSkins: {
      type: [String],
      default: ['classic-blaster'],
    },
    selectedSkin: {
      type: String,
      default: 'classic-blaster',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'players',
  }
);

const scoreSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    kills: {
      type: Number,
      default: 0,
      min: 0,
    },
    mushroomsHit: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSec: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'scores',
  }
);

const dailyChallengeSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    challengeDate: {
      type: String,
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'daily_challenges',
  }
);

const achievementSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
    },
    name: String,
    description: String,
    icon: String,
  },
  {
    timestamps: true,
    collection: 'achievements',
  }
);

const playerAchievementSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'player_achievements',
  }
);

const tokenRequestSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    requestedTokens: {
      type: Number,
      required: true,
      min: 1,
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    resolvedTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'token_requests',
  }
);

const Player = mongoose.model('Player', playerSchema);
const Score = mongoose.model('Score', scoreSchema);
const DailyChallenge = mongoose.model(
  'DailyChallenge',
  dailyChallengeSchema
);
const Achievement = mongoose.model(
  'Achievement',
  achievementSchema
);
const PlayerAchievement = mongoose.model(
  'PlayerAchievement',
  playerAchievementSchema
);
const TokenRequest = mongoose.model(
  'TokenRequest',
  tokenRequestSchema
);

async function initDB() {
  try {
    await connectDB();

    await Player.collection.createIndex({ username: 1 }, { unique: true });
    await Score.collection.createIndex({ playerId: 1, createdAt: -1 });
    await DailyChallenge.collection.createIndex(
      { playerId: 1, challengeDate: 1 },
      { unique: true }
    );
    await Achievement.collection.createIndex({ code: 1 }, { unique: true });
    await TokenRequest.collection.createIndex({
      adminId: 1,
      status: 1,
      createdAt: -1,
    });

    console.log('Database indexes created');

    const bcryptjs = require('bcryptjs');
    const adminExists = await Player.findOne({ username: 'admin' });
    if (!adminExists) {
      await Player.create({
        username: 'admin',
        password: bcryptjs.hashSync('admin123', 10),
        role: 'admin',
        tokens: 9999,
        ownedSkins: ['classic-blaster'],
        selectedSkin: 'classic-blaster',
      });
      console.log('Default admin created (admin/admin123)');
    }

    const { ACHIEVEMENTS_LIST } = require('./gameData');
    let added = 0;
    for (const ach of ACHIEVEMENTS_LIST) {
      const res = await Achievement.updateOne(
        { code: ach.code },
        { $set: ach },
        { upsert: true }
      );
      if (res.upsertedCount > 0) added++;
    }
    if (added > 0) {
      console.log(`Seeded ${added} achievements.`);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  initDB,
  Player,
  Score,
  DailyChallenge,
  Achievement,
  PlayerAchievement,
  TokenRequest,
  mongoose,
};
