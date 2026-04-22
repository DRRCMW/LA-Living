# HAUSFIND — LA Property Search Dashboard

A Zillow-style loft, apartment & home search dashboard for Southern California.
Auto-regenerating AI listings, favorites/leads CRM, viewing scheduler, and maps.
Fully responsive: mobile, tablet, and desktop.

---

## 🚀 Deploy to GitHub + Vercel (Step-by-Step)

### Step 1 — Install dependencies locally
```bash
npm install
npm run dev   # test at http://localhost:5173
```

### Step 2 — Push to GitHub

1. Go to https://github.com/new
2. Create a new repository named `hausfind` (public or private)
3. Copy the repo URL (e.g. `https://github.com/YOUR_USERNAME/hausfind.git`)
4. In your terminal, inside this folder:

```bash
git init
git add .
git commit -m "Initial commit — HAUSFIND dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hausfind.git
git push -u origin main
```

### Step 3 — Deploy to Vercel

**Option A — Vercel Dashboard (easiest)**
1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `hausfind` repo
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy** — done in ~30 seconds ✓

**Option B — Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel          # follow prompts
vercel --prod   # deploy to production
```

Your live URL will be: `https://hausfind.vercel.app` (or similar)

---

## 🔄 Updating After Changes

Every push to `main` triggers an auto-deploy on Vercel:
```bash
git add .
git commit -m "Update: description of changes"
git push
```

---

## 📱 Features
- ⬛ Lofts + 🏢 Apartments + 🏡 Homes across 20 LA neighborhoods
- Auto-regenerating AI listings every 60 seconds
- ♥ Leads CRM with status tracking (New → Watching → Scheduled → Toured)
- 📅 Viewing scheduler with in-person / virtual / self-tour options
- 📍 Google Maps integration per listing and neighborhood
- 📱 Fully responsive — mobile bottom nav, tablet 2-col, desktop 3-col
- 💾 Persistent favorites via localStorage

## Budget Filters
- Solo 1BD: $1,700 – $3,000/mo
- With Brother 2BD: $2,200 – $4,000/mo
