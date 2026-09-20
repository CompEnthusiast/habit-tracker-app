# Deploy Habit Tracker

This app uses three services:

1. MongoDB Atlas for the database.
2. Render, Railway, or another Node host for `backend/`.
3. Vercel, Netlify, or another static host for the project root.

## Backend

Create a Node web service with:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables on the backend service:

- `MONGODB_URI`: your MongoDB Atlas connection string
- `JWT_SECRET`: a long random secret
- `CLIENT_URL`: the final frontend URL
- `PORT`: supplied automatically by most hosts; `5000` works locally

After deployment, check `https://YOUR-BACKEND/api/health`.

## Frontend

Set `VITE_API_URL` to the deployed backend URL without `/api`, for example:

```text
VITE_API_URL=https://your-backend.example.com
```

Build with `npm run build` and deploy the generated `dist` directory. Configure the host to rewrite unknown routes to `index.html`, so `/login`, `/register`, and `/dashboard` work after refresh.

Update the backend `CLIENT_URL` after the frontend receives its final public URL, then restart the backend.

Never commit either `.env` file. Use the provider's environment-variable settings for production secrets.

## Android app

Capacitor Android support is included in the `android/` folder.

Install Android Studio and an Android SDK, then run:

```bash
npm run mobile:sync
npm run mobile:open
```

In Android Studio, connect your phone with USB debugging enabled or start an emulator, then press **Run**. To create an APK, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

The phone app still needs the deployed backend. Set `VITE_API_URL` to the public backend URL before running `npm run mobile:sync`; do not use `localhost` for a phone build.
