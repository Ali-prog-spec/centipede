# 🐛 Centipede Arcade: Web Application Report

Welcome to the comprehensive documentation for **Centipede Arcade**, a full-stack web application that brings a classic arcade shooter into the modern browser. This project combines a fully functional HTML5 Canvas game engine with a robust backend featuring secure authentication, a token-based economy, and an administrative dashboard.

---

## 1. Project Overview

The objective of this project was to develop an engaging web-based arcade game backed by a secure, database-driven backend. Players can register, log in, earn tokens, unlock skins, and compete on global leaderboards. Administrators have access to a dedicated dashboard where they can manage users, assign tokens, and oversee all platform activity.

---

## 2. Technology Stack

This application is built from the ground up without relying on heavy frontend frameworks (like React or Vue), ensuring blazing-fast load times and total control over the DOM. 

*   **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), HTML5 Canvas API
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB, Mongoose ODM
*   **Security & Auth:** JSON Web Tokens (JWT), bcryptjs (Password Hashing), native Crypto API

---

## 3. Core Features Implemented

### 3.1. Secure Authentication & Data Integrity
*   **End-to-End Auth:** Fully functional Signup and Login system using JWT for stateless session management.
*   **Strict Password Policies:** Passwords must be at least 8 characters long, containing at least one letter, one number, and one special character. Validated on both the frontend and backend.
*   **Password Encryption:** All passwords are mathematically hashed using `bcryptjs` before being saved to the database. Plain text passwords are never logged or stored.
*   **Password Reset Flow:** Includes a secure "Forgot Password" flow that utilizes temporary, time-limited cryptographic tokens (15-minute expiry).
*   **Inactivity Timeout:** A background process monitors user activity (mouse, keyboard, scroll). If a user is completely idle for 15 minutes, their session is aggressively cleared and they are redirected to the login page.

### 3.2. Role-Based Access Control (RBAC)
The system differentiates between two primary roles: `player` and `admin`.
*   **Backend Guards:** API endpoints are protected by `authMiddleware` (validates JWT) and `adminMiddleware` / `playerMiddleware` (validates role access).
*   **Admin Dashboard:** Administrators are routed to a separate UI (`admin.html`) where they can view all registered players, manually grant/revoke tokens, deactivate bad actors, and promote/demote user roles.

### 3.3. Game Engine Mechanics
*   **Canvas Rendering:** The game runs entirely on a 640x640 HTML5 Canvas element using `requestAnimationFrame` for a smooth 60FPS loop.
*   **Responsive Canvas:** The canvas utilizes CSS aspect-ratio logic to perfectly scale down for mobile devices without distortion or horizontal scrollbars.
*   **Dynamic Entities:** Includes animated player movement, shooting mechanics, mushroom generation, and a dynamically splitting centipede. The centipede features procedurally animated legs that sync with its movement speed!

### 3.4. Economy & Progression
*   **Token System:** Players require 1 Token to start a run. If they run out, they can request more via the UI, which an Admin can approve or deny.
*   **Leaderboards:** Tracks All-Time High Scores, Recent Games, and Daily Challenges.
*   **Store & Skins:** Players can spend earned tokens to purchase custom ship skins. These skins dynamically alter the colors rendered inside the Canvas engine.
*   **Achievements:** Over 100+ unlockable achievements are tracked and awarded automatically during gameplay (stored in `gameData.js` and synced to MongoDB on boot).

### 3.5. UI/UX & Aesthetics
*   **Retro Aesthetic:** Uses a unified dark-mode color palette (`--surface`, `--green`, `--amber`) and "Press Start 2P" pixel fonts.
*   **Live Background:** A custom JavaScript particle system generates a "Green Glowy Ashes" effect that floats behind the main interface.
*   **Single Page Application (SPA) Feel:** The main player dashboard uses inline tab switching to prevent jarring page reloads, keeping the user immersed.
*   **Global Footer:** Every page includes a unified footer with support/contact links (integrated with WhatsApp) and an About section.

---

## 4. Code Architecture & Structure

```text
/
├── server/
│   └── index.js           # Express API router, middlewares, and server entry point
├── db/
│   ├── schema.js          # Mongoose Models (Player, Score, DailyChallenge, etc.)
│   ├── repository.js      # Core business logic, DB queries, Auth/Hash wrappers
│   └── gameData.js        # Static configuration (Skins, Achievements)
├── public/
│   ├── index.html         # Main Player Dashboard & Game View
│   ├── auth.html          # Login / Signup / Password Reset Portal
│   ├── admin.html         # Administrator Dashboard
│   ├── css/
│   │   └── style.css      # Unified stylesheet with CSS Variables and Media Queries
│   ├── js/
│   │   ├── api.js         # Fetch wrappers, JWT handling, and Inactivity Monitor
│   │   ├── auth.js        # Auth UI logic and Strict Form Validation
│   │   ├── game.js        # Canvas Game Engine Loop, Drawing, Input Handling
│   │   ├── ui.js          # Player Dashboard logic (Tabs, Store, Leaderboards)
│   │   ├── admin.js       # Admin UI logic (User Management, Token Requests)
│   │   └── particles.js   # Live Background Particle System
│   └── audio.mp3          # Background Track
└── package.json           # Project dependencies and npm scripts
```

---

## 5. Setup & Installation (How to Run)

To run this application locally, ensure you have **Node.js** (v18+) and **MongoDB** installed on your system.

### Step 1: Install Dependencies
Open your terminal in the root directory of the project and run:
```bash
npm install
```

### Step 2: Start MongoDB
Ensure that your local MongoDB server is running. The application looks for a local database at `mongodb://127.0.0.1:27017/centipede` by default. 
*(If you are using MongoDB Atlas, you can inject a connection string via a `MONGODB_URI` environment variable).*

### Step 3: Start the Server
To run the server in development mode (with hot-reloading via Nodemon):
```bash
npm run dev
```

To run the server in production mode:
```bash
npm start
```

### Step 4: Access the Application
Open your web browser and navigate to:
```text
http://localhost:3000
```
*(You can create an Admin account by selecting "Admin" in the dropdown menu on the Signup screen).*

---

## 6. Future Enhancements
While the project is feature-complete according to its primary specifications, future development could include:
*   **SMTP Email Integration:** Swapping out the simulated on-screen Password Reset tokens with a real email dispatcher (like SendGrid or Nodemailer).
*   **WebSockets:** Implementing Socket.io to make the Admin Dashboard and Leaderboards update in real-time without requiring a page refresh.
*   **Mobile Touch Controls:** Adding an on-screen D-Pad and Fire button specifically for players accessing the game on touch-screen devices.
