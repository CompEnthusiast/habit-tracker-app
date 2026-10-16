# Habit RPG — Setup & Deployment Guide

## 1. Architecture Overview

- **Frontend**: React 19 + Vite 8 Progressive Web App (PWA) with Neo-Brutalist design tokens (`#100E0C` canvas, `#1E1D1C` surface, `#FF7A00` electric orange, solid `#494848` borders).
- **Client Storage**: Offline-first IndexedDB (`habit_tracker_db`) with `habits`, `day_records`, `sync_queue`, and `metadata` stores.
- **Backend**: Node.js + Express with MongoDB Atlas (or Supabase/Firebase) and secure JWT authentication.
- **AI Coach Proxy**: Rate-limited server endpoint (`/api/ai`) using Gemini with zero frontend API key exposure and 100% deterministic rule-based fallback.
- **Audio Ambience Engine**: Pure Web Audio API synthesizers for White Noise, Brown Noise, Rain, Lo-Fi chords, and stereo-panned Binaural Beats.
- **Voice Check-in**: Native browser Web Speech API (SpeechRecognition + SpeechSynthesis) supporting English and Hindi/Hinglish.

---

## 2. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/habits` |
| `JWT_SECRET` | Secret key for JWT signing | `openssl rand -hex 32` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `https://your-app.vercel.app,http://localhost:5173` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for AI habit coach | `AIzaSy...` (falls back to rule-based tips if omitted) |

### Frontend (`.env.production`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for remote API server | `https://your-backend.onrender.com` |

---

## 3. Local Development Setup

1. **Install Dependencies**:
   ```bash
   # In root directory (Frontend)
   npm install

   # In backend directory
   cd backend && npm install && cd ..
   ```

2. **Configure Environment Variables**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI and JWT Secret
   ```

3. **Run Automated Unit Tests**:
   ```bash
   npm test
   # Runs 15 unit tests covering midnight rollover, XP curve, streak freezes, and conflict resolution
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend API
   cd backend && npm start

   # Terminal 2: Frontend Vite App
   npm run dev
   ```

---

## 4. Production Deployment

### Option A: Vercel (Frontend) + Render / Railway (Backend)

#### Backend on Render:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
3. Add Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `GEMINI_API_KEY`.

#### Frontend on Vercel:
1. Import repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://<your-render-app>.onrender.com`

---

### Option B: Netlify (Full Stack)

1. Connect your repository to [Netlify](https://netlify.com).
2. Configure build settings in `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/api/*"
     to = "https://your-backend-service/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

---

## 5. PWA Installation & Verification

- **Chrome / Edge / Android**: An **"Install Now"** banner appears automatically at the top of the dashboard. Click to install as a standalone desktop/mobile app.
- **iOS Safari (16.4+)**: Tap the **Share** button ➔ select **"Add to Home Screen"**. This activates standalone window mode, Web Push notifications, and offline caching.
- **Badging API**: The app dynamically badges the number of pending tasks remaining today on supported OS docks/home screens.
- **Lock Screen Audio**: Focus sounds and Pomodoro continue uninterrupted when your device screen locks via the `MediaSession` API.
