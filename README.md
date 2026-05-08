# 🐛 Centipede — Arcade Web Edition

A full-stack web conversion of the classic SFML/C++ Centipede game.

## Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Frontend    | HTML5 Canvas, Vanilla JS, CSS3      |
| Backend     | Node.js + Express                  |
| Database    | SQLite 3 via `better-sqlite3`       |

---

## Project Structure

```
centipede-web/
├── db/
│   ├── schema.js        ← Run once to create tables + seed achievements
│   └── repository.js    ← All SQL queries (data access layer)
├── server/
│   └── index.js         ← Express REST API server
├── public/
│   ├── index.html       ← Single-page app shell
│   ├── css/style.css    ← Retro CRT arcade styles
│   └── js/
│       ├── api.js       ← Fetch wrapper for backend
│       ├── game.js      ← Canvas game engine (ported from C++/SFML)
│       └── ui.js        ← Tab routing, leaderboards, profile UI
└── package.json
```

---

## Database Schema

### `players`
Stores registered players and their aggregate stats.
| Column       | Type    | Notes                        |
|--------------|---------|------------------------------|
| id           | INTEGER | Primary key                  |
| username     | TEXT    | Unique, case-insensitive     |
| created_at   | TEXT    | ISO datetime                 |
| total_games  | INTEGER |                              |
| best_score   | INTEGER |                              |

### `scores`
One row per completed game session.
| Column        | Type    | Notes                       |
|---------------|---------|-----------------------------|
| id            | INTEGER | Primary key                 |
| player_id     | INTEGER | FK → players.id             |
| score         | INTEGER |                             |
| level         | INTEGER | Level reached               |
| kills         | INTEGER | Centipede segments killed   |
| mushrooms_hit | INTEGER | Mushrooms destroyed         |
| duration_sec  | INTEGER | Seconds survived            |
| played_at     | TEXT    | ISO datetime                |

### `achievements`
Badge definitions (seeded on init).

### `player_achievements`
Junction: which player earned which achievement, and when.

### `daily_challenges`
Tracks per-player score for each calendar day.

---

## REST API

| Method | Endpoint                          | Description                   |
|--------|-----------------------------------|-------------------------------|
| POST   | `/api/players/register`           | Find-or-create player         |
| GET    | `/api/players/:username`          | Full profile + achievements   |
| GET    | `/api/players/:username/history`  | Recent game history           |
| POST   | `/api/scores`                     | Submit game score             |
| GET    | `/api/leaderboard`                | All-time best scores          |
| GET    | `/api/leaderboard/recent`         | Latest game sessions          |
| GET    | `/api/daily`                      | Today's challenge leaderboard |
| POST   | `/api/daily`                      | Submit daily challenge score  |

---

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Create the database (run once)
node db/schema.js

# 3. Start the server
npm start
# → http://localhost:3000

# Development (auto-reload)
npm run dev
```

---

## Controls

| Key | Action  |
|-----|---------|
| W   | Move Up |
| S   | Move Down |
| A   | Move Left |
| D   | Move Right |
| X   | Shoot |
| P   | Pause / Resume |

---

## Game Rules

- Shoot the centipede segments before they reach the player zone.
- Hitting a segment leaves a mushroom behind and splits the centipede.
- Mushrooms take 2 hits to destroy (+1 pt first hit, +5 pts on destroy).
- Each centipede kill = **10 points**.
- Player has **3 lives**. Touching a centipede costs one life.
- Clearing all segments advances to the next level (centipede moves faster).
- Scores are saved to the database and shown on the leaderboard.
