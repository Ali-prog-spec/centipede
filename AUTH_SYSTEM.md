# CENTIPEDE — Authentication System & MongoDB Setup

## Overview
The Centipede arcade game features a complete authentication system with MongoDB for persistent data storage. All players must create an account and authenticate before playing.

## Database: MongoDB

This project uses **MongoDB** with **Mongoose** ODM for:
- Player authentication and profiles
- Game score tracking
- Daily challenges
- Achievement system
- Leaderboards

## Features

### Account System
- **Signup**: Create new account with username and password
- **Login**: Authenticate with existing credentials  
- **Password Security**: All passwords are hashed using bcryptjs (10 salt rounds)
- **Token-based Auth**: JWT tokens (30-day expiration) for stateless authentication
- **Coin System**: Each new account starts with 1 coin to play

### Authentication Pages
- **`/auth.html`** - Retro arcade-styled login/signup interface
- **`/`** (index.html) - Requires authentication; redirects to auth.html if not logged in

## MongoDB Setup

### Installation

1. **Local MongoDB**:
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Linux (Ubuntu)
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   
   # Windows
   Download and install from https://www.mongodb.com/try/download/community
   ```

2. **MongoDB Atlas (Cloud)**:
   - Create free account at https://www.mongodb.com/cloud/atlas
   - Create a cluster
   - Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/centipede`

### Configuration

Create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/centipede
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
```

Or use MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/centipede
```

## Database Collections

### Players
```javascript
{
  _id: ObjectId,
  username: String (unique, lowercase),
  password: String (hashed),
  coins: Number (default: 1),
  totalGames: Number,
  bestScore: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Scores
```javascript
{
  _id: ObjectId,
  playerId: ObjectId (ref: Player),
  score: Number,
  level: Number,
  kills: Number,
  mushroomsHit: Number,
  durationSec: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Daily Challenges
```javascript
{
  _id: ObjectId,
  playerId: ObjectId (ref: Player),
  challengeDate: String (YYYY-MM-DD),
  score: Number,
  completed: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Achievements
```javascript
{
  _id: ObjectId,
  code: String (unique),
  name: String,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Player Achievements
```javascript
{
  _id: ObjectId,
  playerId: ObjectId (ref: Player),
  achievementId: ObjectId (ref: Achievement),
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/signup`
Create a new account
```json
{
  "username": "player123",
  "password": "mypassword"
}
```
Returns:
```json
{
  "success": true,
  "data": {
    "player": { id, username, coins, totalGames, bestScore, createdAt },
    "token": "jwt-token-here"
  }
}
```

#### `POST /api/auth/login`
Authenticate existing account
```json
{
  "username": "player123",
  "password": "mypassword"
}
```
Returns same format as signup.

#### `POST /api/auth/verify`
Verify token validity (authenticated endpoint)
```
Headers: Authorization: Bearer <jwt-token>
```
Returns: `{ success: true, data: player }`

### Protected Endpoints
All endpoints that modify player data require JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

#### `POST /api/scores` (Protected)
Submit completed game score
```json
{
  "score": 1500,
  "level": 3,
  "kills": 45,
  "mushrooms_hit": 12,
  "duration_sec": 120
}
```
Note: Username is extracted from authenticated token, not from request body.

## Client-Side Implementation

### Authentication Flow

1. **Check Auth on Load** (`ui.js`):
   ```javascript
   if (!localStorage.getItem('centipede-auth-token')) {
     window.location.href = '/auth.html';
   }
   ```

2. **Store Session**:
   - Token stored in `localStorage['centipede-auth-token']`
   - User data stored in `localStorage['centipede-auth-user']`

3. **API Requests**:
   - All requests include token in Authorization header
   - See `public/js/api.js` for implementation

### Auth Service (`public/js/auth.js`)

Provides methods:
- `AuthService.signup(username, password, confirmPassword)`
- `AuthService.login(username, password)`
- `AuthService.verify()` - Verify token is still valid
- `AuthService.logout()` - Clear session
- `AuthService.getToken()` - Get stored token
- `AuthService.getUser()` - Get stored user data

### Game Integration

- Player **INSERT COIN** now requires authentication
- Game checks for available coins before starting
- Player cannot start game without coins
- User info (username, coins) displayed in header

## Coin System

### Current Implementation
- Each new account starts with **1 coin**
- Required to start each game
- Coins deducted when game starts

### Future Enhancement
- Daily coin rewards
- Coin shop for purchasing coins
- Leaderboard rewards with coins
- Daily challenges with bonus coins

## Security Considerations

- ✅ Passwords hashed with bcryptjs (10 salt rounds)
- ✅ JWT tokens with 30-day expiration
- ✅ CORS enabled for API requests
- ✅ MongoDB connection with authentication
- ⚠️ JWT_SECRET should be set via environment variable in production
- ⚠️ HTTPS recommended for production deployment
- ⚠️ Consider rate limiting on auth endpoints
- ⚠️ MongoDB credentials should be secured in production

## Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/centipede  # MongoDB connection
PORT=3000                                         # Server port
JWT_SECRET=your-secret-key                        # JWT signing secret
NODE_ENV=production                               # Environment
```

## File Changes Summary

### New Files
- `public/auth.html` - Authentication page
- `public/js/auth.js` - Client authentication logic
- `.env.example` - Environment configuration template

### Modified Files
- `package.json` - Replaced better-sqlite3 with mongoose
- `db/schema.js` - Mongoose models instead of SQLite schema
- `db/repository.js` - MongoDB queries with Mongoose
- `server/index.js` - Async routes, MongoDB initialization
- `public/index.html` - Updated header with user info
- `public/js/api.js` - Added auth token to requests
- `public/js/ui.js` - Added auth check, updated player setup
- `public/css/style.css` - Added header user section styles

## Testing the System

### Prerequisites
1. MongoDB running locally or MongoDB Atlas connection configured
2. `.env` file with MONGODB_URI set

### Test Signup
1. Navigate to `http://localhost:3000/auth.html`
2. Click SIGNUP tab
3. Enter username and password
4. Should be redirected to main game page

### Test Login
1. Create account via signup
2. Logout (click LOGOUT button in header)
3. Login with existing credentials
4. Should show your profile with coins

### Test Protected Routes
1. Login to get token
2. Try to submit score - should work
3. Try to access `/api/scores` without token - should get 401 error

## Troubleshooting

**MongoDB Connection Refused**
- Check if MongoDB is running: `mongosh` or `mongo`
- Verify MONGODB_URI in .env file
- Check firewall settings

**"No token provided" error**
- User is not authenticated
- Check localStorage for token
- Ensure auth.html login completed successfully

**"Invalid username or password"**
- Credentials are incorrect
- Usernames are case-insensitive (stored as lowercase)
- Verify password is exactly as entered

**Redirects to auth.html immediately**
- Token has expired (30 days)
- Token is corrupted
- Clear localStorage and login again

**Mongoose connection errors**
- Check .env MONGODB_URI is correct
- Verify MongoDB server is running
- Check network connectivity for MongoDB Atlas

---

Last Updated: May 2026
Database: MongoDB with Mongoose ODM


## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/signup`
Create a new account
```json
{
  "username": "player123",
  "password": "mypassword"
}
```
Returns:
```json
{
  "success": true,
  "data": {
    "player": { id, username, coins, created_at, total_games, best_score },
    "token": "jwt-token-here"
  }
}
```

#### `POST /api/auth/login`
Authenticate existing account
```json
{
  "username": "player123",
  "password": "mypassword"
}
```
Returns same format as signup.

#### `POST /api/auth/verify`
Verify token validity (authenticated endpoint)
```
Headers: Authorization: Bearer <jwt-token>
```
Returns: `{ success: true, data: player }`

### Protected Endpoints
All endpoints that modify player data require JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

#### `POST /api/scores` (Protected)
Submit completed game score
```json
{
  "score": 1500,
  "level": 3,
  "kills": 45,
  "mushrooms_hit": 12,
  "duration_sec": 120
}
```
Note: Username is extracted from authenticated token, not from request body.

## Client-Side Implementation

### Authentication Flow

1. **Check Auth on Load** (`ui.js`):
   ```javascript
   if (!localStorage.getItem('centipede-auth-token')) {
     window.location.href = '/auth.html';
   }
   ```

2. **Store Session**:
   - Token stored in `localStorage['centipede-auth-token']`
   - User data stored in `localStorage['centipede-auth-user']`

3. **API Requests**:
   - All requests include token in Authorization header
   - See `public/js/api.js` for implementation

### Auth Service (`public/js/auth.js`)

Provides methods:
- `AuthService.signup(username, password, confirmPassword)`
- `AuthService.login(username, password)`
- `AuthService.verify()` - Verify token is still valid
- `AuthService.logout()` - Clear session
- `AuthService.getToken()` - Get stored token
- `AuthService.getUser()` - Get stored user data

### Game Integration

- Player **INSERT COIN** now requires authentication
- Game checks for available coins before starting
- Player cannot start game without coins
- User info (username, coins) displayed in header

## Coin System

### Current Implementation
- Each new account starts with **1 coin**
- Required to start each game
- Coins deducted when game starts

### Future Enhancement
- Daily coin rewards
- Coin shop for purchasing coins
- Leaderboard rewards with coins
- Daily challenges with bonus coins

## Security Considerations

- ✅ Passwords hashed with bcryptjs (10 salt rounds)
- ✅ JWT tokens with 30-day expiration
- ✅ CORS enabled for API requests
- ⚠️  JWT_SECRET should be set via environment variable in production
- ⚠️  HTTPS recommended for production deployment
- ⚠️  Consider rate limiting on auth endpoints

## Environment Variables

```bash
PORT=3000                                    # Server port
JWT_SECRET=your-secret-key-change-in-prod   # JWT signing secret
NODE_ENV=production                          # Environment
```

## File Changes Summary

### New Files
- `public/auth.html` - Authentication page
- `public/js/auth.js` - Client authentication logic

### Modified Files
- `package.json` - Added bcryptjs, jsonwebtoken
- `db/schema.js` - Added password, coins fields
- `db/repository.js` - Added auth methods, secured output fields
- `server/index.js` - Added auth routes, middleware, JWT handling
- `public/index.html` - Updated header with user info, removed username input
- `public/js/api.js` - Added auth token to requests
- `public/js/ui.js` - Added auth check, updated player setup
- `public/css/style.css` - Added header user section styles

## Testing the System

### Test Signup
1. Navigate to `http://localhost:3000/auth.html`
2. Click SIGNUP tab
3. Enter username and password
4. Should be redirected to main game page

### Test Login
1. Create account via signup
2. Logout (click LOGOUT button in header)
3. Login with existing credentials
4. Should show your profile with coins

### Test Protected Routes
1. Login to get token
2. Try to submit score - should work
3. Try to access `/api/scores` without token - should get 401 error

## Migration from Unauthenticated System

For existing players without passwords:
1. Old `/api/players/register` still works for backward compatibility
2. New players must use `/api/auth/signup`
3. Existing scores remain associated with players
4. Can add password reset endpoint if needed

## Troubleshooting

**"No token provided" error**
- User is not authenticated
- Check localStorage for token
- Ensure auth.html login completed successfully

**"Invalid username or password"**
- Credentials are incorrect
- Case-sensitive username check (collate nocase in SQL)
- Verify password is exactly as entered

**Redirects to auth.html immediately**
- Token has expired (30 days)
- Token is corrupted
- Clear localStorage and login again

**Database locked error**
- Multiple simultaneous writes
- WAL mode should handle this
- Check file permissions on centipede.db

---

Last Updated: May 2026
