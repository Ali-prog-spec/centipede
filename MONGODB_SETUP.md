# MongoDB Setup Guide for Centipede Web

This project now uses **MongoDB** instead of SQLite for data persistence. Follow these steps to get started.

## Quick Start

### Option 1: Local MongoDB (Recommended for Development)

#### Windows
1. Download MongoDB Community from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the installation wizard
3. MongoDB will start automatically as a service
4. Create `.env` file with:
   ```
   MONGODB_URI=mongodb://localhost:27017/centipede
   JWT_SECRET=dev-secret-key
   PORT=3000
   ```

#### macOS
```bash
# Install with Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/centipede" > .env
echo "JWT_SECRET=dev-secret-key" >> .env
echo "PORT=3000" >> .env
```

#### Linux (Ubuntu/Debian)
```bash
# Install MongoDB
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/centipede" > .env
echo "JWT_SECRET=dev-secret-key" >> .env
echo "PORT=3000" >> .env
```

### Option 2: MongoDB Atlas (Cloud, Free Tier Available)

1. Create free account: https://www.mongodb.com/cloud/atlas
2. Create a cluster (free tier available)
3. Create database user with password
4. Get connection string: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/centipede`
5. Create `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/centipede
   JWT_SECRET=your-secure-secret-key
   PORT=3000
   ```

## Installation & Running

```bash
# Install dependencies
npm install

# Start development server (with nodemon auto-reload)
npm run dev

# Or start production server
npm start
```

The server will automatically:
- Connect to MongoDB
- Create required collections and indexes
- Seed default achievements
- Start listening on port 3000

## Verification

### Check MongoDB Connection

**Local MongoDB:**
```bash
# Install mongodb-shell if not already installed
brew install mongosh

# Connect to local database
mongosh mongodb://localhost:27017/centipede

# View collections
show collections

# View users
db.players.find()

# Exit
exit
```

**MongoDB Atlas:**
```bash
# Use the connection string provided by Atlas
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/centipede"
```

### Test the Application

1. Navigate to http://localhost:3000/auth.html
2. Create a new account
3. Login and play the game
4. Check MongoDB for stored data:
   ```
   mongosh
   use centipede
   db.players.find()
   db.scores.find()
   ```

## Collections Created

The application automatically creates these collections:

- **players** - User accounts with hashed passwords
- **scores** - Individual game sessions
- **daily_challenges** - Daily challenge leaderboard
- **achievements** - Achievement definitions
- **player_achievements** - User achievement progress

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/centipede` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |

## Troubleshooting

### MongoDB Connection Error
```
✗ MongoDB connection failed: connect ECONNREFUSED
```
**Solution:**
- Make sure MongoDB is running
- Check MONGODB_URI in .env is correct
- For local: `mongosh` should work if running

### No Database Selected Error
```
MongoNetworkError: connection refused
```
**Solution:**
- Verify MongoDB service is running
- Check firewall settings
- Restart MongoDB service

### Mongoose Validation Error
```
ValidationError: username: Cast to String failed
```
**Solution:**
- Clear MongoDB database and restart
- Delete centipede database: `mongosh` → `use centipede` → `db.dropDatabase()`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
- Change PORT in .env to a different number
- Or kill process: `lsof -i :3000` then `kill -9 <PID>`

## Data Backup

### Local MongoDB
```bash
# Backup
mongodump --db centipede --out ./backup

# Restore
mongorestore --db centipede ./backup/centipede
```

### MongoDB Atlas
- Use Atlas backup features in the console
- Export to JSON: https://docs.mongodb.com/mongosh/reference/export/

## Converting from SQLite (Already Done)

The following changes were made to migrate from SQLite:
- ✅ Replaced `better-sqlite3` with `mongoose`
- ✅ Converted SQL queries to MongoDB operations
- ✅ Updated schema to Mongoose models
- ✅ Made all repository functions async
- ✅ Added MongoDB initialization in server startup

## Next Steps

1. Install MongoDB (local or Atlas)
2. Create `.env` file with connection string
3. Run `npm install` and `npm run dev`
4. Navigate to http://localhost:3000/auth.html
5. Create an account and start playing!

---

For more info on MongoDB: https://docs.mongodb.com/
For Mongoose documentation: https://mongoosejs.com/docs/
