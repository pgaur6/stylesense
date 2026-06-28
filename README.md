# StyleSense

AI-powered personal styling assistant for urban Indian shoppers. Built with Next.js, Node.js/Express, Supabase, Cloudinary, and GPT-4o.

---

## What It Does

StyleSense solves two connected problems: people don't know what to buy that will work for them, and they own clothes they never wear because they can't put outfits together. A style profile built from onboarding, combined with an AI-tagged virtual wardrobe, lets GPT-4o give advice that's specific to the user — not generic fashion tips.

**Four features:**

| Feature | What the user does | What they get |
|---|---|---|
| What Goes With This? | Uploads a garment photo or types a description | 3 complete outfit combinations referencing their wardrobe |
| Should I Buy This? | Uploads a product photo | Buy / Skip / Maybe verdict with wardrobe overlap check |
| Is This Outfit Okay? | Uploads a full outfit photo | What's working, what's off, one specific swap |
| Find Me Something Like This | Uploads any fashion image | Google Shopping results for the key item |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS → Vercel |
| Backend | Node.js + Express → Railway |
| Database | Supabase (PostgreSQL + pgvector) |
| Image storage | Cloudinary |
| AI | OpenAI GPT-4o + text-embedding-3-small |
| Shopping results | SerpAPI (Google Shopping, geo-targeted to India) |

---

## Project Structure

This is a monorepo with two separate apps:

```
stylesense/
├── frontend/       # Next.js app — deployed on Vercel
├── backend/        # Express API — deployed on Railway
├── .gitignore
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js 18 or higher (`node --version` to check)
- npm
- A code editor (VS Code recommended)
- Accounts on: OpenAI, Supabase, Cloudinary, SerpAPI

### 1. Clone the repository

```bash
git clone https://github.com/pgaur6/stylesense.git
cd stylesense
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Open `backend/.env` and add your real values for every variable (see Environment Variables section below).

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Open `frontend/.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:3001` for local development.

### 4. Set up the Supabase database

In your Supabase project, go to SQL Editor and run the following in order:

```sql
-- Step 1: Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: User profiles
CREATE TABLE user_profile (
  session_id    TEXT PRIMARY KEY,
  profile_json  JSONB NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Wardrobe items
CREATE TABLE wardrobe_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES user_profile(session_id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  tags          JSONB NOT NULL,
  embed_text    TEXT NOT NULL,
  embedding     VECTOR(1536),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Index for faster session queries
CREATE INDEX idx_wardrobe_session ON wardrobe_items(session_id);
```

### 5. Run both servers

Open two terminal windows.

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
You should see: `StyleSense backend running on port 3001`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
You should see: `Local: http://localhost:3000`

Open `http://localhost:3000` in your browser.

### 6. Verify the backend is alive

```bash
curl http://localhost:3001/api/health
```

Expected response: `{"status":"ok","message":"StyleSense backend is running"}`

---

## Environment Variables

### Backend (`backend/.env`)

Never commit this file. Add these to Railway for production.

```
PORT
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SERPAPI_KEY
GOOGLE_WEBHOOK_URL
```

`GOOGLE_WEBHOOK_URL` is optional — leave blank if not using the Google Sheets feedback logger.

### Frontend (`frontend/.env.local`)

Never commit this file. Add to Vercel environment variables for production.

```
NEXT_PUBLIC_API_URL
```

Set to `http://localhost:3001` for local development.
Set to your Railway backend URL (with `https://`) for production.

---

## Deployment

**The order matters.** You must deploy in this sequence:

```
1. Deploy backend to Railway  →  get your Railway URL
2. Deploy frontend to Vercel  →  get your Vercel URL
3. Add Vercel URL to CORS in backend/index.js
4. Redeploy backend to Railway
```

If you do Vercel before Railway, you won't have the Railway URL to put into `NEXT_PUBLIC_API_URL`. If you skip step 3, every API call from production will be blocked by the browser.

---

### Step 1 — Deploy the Backend to Railway

**1.1** Go to [railway.app](https://railway.app) and create a new project.

**1.2** Connect your GitHub account and select the `pgaur6/stylesense` repository.

**1.3** In the service settings, find **Root Directory** and set it to:
```
backend
```
This is critical. Without it, Railway looks at the repo root, sees both `frontend/` and `backend/` folders, and doesn't know what to build.

**1.4** In the service settings, find **Start Command** and make sure it is **empty**. Railway will fall back to the `start` script in `backend/package.json`, which is `node index.js`. Do not set a custom start command — dotenvx as a start command injects zero variables on Railway and crashes the server.

**1.5** Go to the **Variables** tab and add every backend environment variable listed above. Enter the raw values — no quotes, no `process.env.` prefix, no spaces around the `=`.

**1.6** Railway will deploy automatically after variables are saved. Watch the **Logs** tab. A successful deploy looks like:
```
StyleSense backend running on port 3001
```

**1.7** Go to Settings → Networking → Generate Domain. Enter port `3001`. Copy the URL Railway gives you — it looks like:
```
https://stylesense-production.up.railway.app
```
You need this for the next step.

---

### Step 2 — Deploy the Frontend to Vercel

**2.1** Go to [vercel.com](https://vercel.com) and click Add New Project.

**2.2** Import the `pgaur6/stylesense` repository from GitHub.

**2.3** On the configuration screen, find **Root Directory** and set it to:
```
frontend
```
This tells Vercel the Next.js app is inside `frontend/`, not at the repo root.

**2.4** Under **Environment Variables**, add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway URL from Step 1.7 (must start with `https://`) |

Example: `https://stylesense-production.up.railway.app`

**2.5** Click Deploy. The build takes 60–90 seconds.

**2.6** When the build succeeds, copy your Vercel URL — it looks like:
```
https://stylesense-one.vercel.app
```
You need this for the next step.

---

### Step 3 — Add the Vercel URL to CORS

Open `backend/index.js`. Find the CORS configuration and add your Vercel URL:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app'   // ← replace with your actual Vercel URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

Use the exact URL from Vercel — no trailing slash.

---

### Step 4 — Redeploy the Backend

Push the CORS change to GitHub:

```bash
git add .
git commit -m "Add Vercel URL to CORS allowed origins"
git push origin main
```

Railway will detect the push and redeploy automatically (if auto-deploy is enabled), or go to the Railway Deployments tab and click Redeploy manually.

Wait for the deploy to complete, then proceed to smoke testing.

---

## Deployment Smoke Test

Run these checks after every production deployment to confirm everything is working end to end.

### Infrastructure checks

- [ ] **Backend health** — visit `https://your-railway-url/api/health` in your browser. Should return `{"status":"ok","message":"StyleSense backend is running"}`
- [ ] **Frontend loads** — visit `https://stylesense-one.vercel.app`. The page should load with no blank screen or build error
- [ ] **No CORS errors** — open browser dev tools (Cmd+Option+I → Network tab), trigger any API call, click the request, check Response Headers for `access-control-allow-origin: https://stylesense-one.vercel.app`

### User flow checks

- [ ] **Onboarding completes** — go through all 7 steps, confirm the style profile is generated and saved (no error on the final step)
- [ ] **Wardrobe upload works** — upload one clothing photo, confirm it appears in the wardrobe gallery with AI-generated tags
- [ ] **Outfit pairing works** — use "What Goes With This?" with a text description, confirm 3 outfit combinations are returned
- [ ] **Buy decision works** — upload a product photo, confirm a Buy / Skip / Maybe verdict is returned
- [ ] **Outfit check works** — upload a full outfit photo, confirm structured feedback is returned
- [ ] **Find similar works** — upload a fashion image, confirm shopping results appear

### Edge case checks

- [ ] **Empty wardrobe state** — in a fresh browser session (incognito), go to the wardrobe page before completing onboarding. Should show the empty state with a call to action, not a blank screen or error
- [ ] **Daily spend limit** — if the app returns a 503, it should display a friendly message ("Service paused for today") not a raw error

### API key security check

- [ ] Visit `https://github.com/pgaur6/stylesense` and confirm there is no `.env` or `.env.local` file visible in the repository
- [ ] Confirm the `.env` file is listed in `.gitignore` at the repo root

---

## Hard Rules

- Never use `origin: '*'` in CORS — always list specific URLs
- Never commit `.env` or `.env.local` to GitHub
- The Railway start command must be empty — `node index.js` comes from `package.json`
- Railway Root Directory must be set to `backend`
- Vercel Root Directory must be set to `frontend`
- `NEXT_PUBLIC_API_URL` must include `https://` — without it the browser treats it as a relative path

---

## Cost Controls

- Daily spend cap of $2 enforced in `backend/middleware/costGuard.js` — returns 503 when exceeded
- Hard billing cap of $25/month set in the OpenAI dashboard
- All AI calls are logged with token count, latency, and cost estimate

---

*StyleSense — AI assists. Humans decide.*
