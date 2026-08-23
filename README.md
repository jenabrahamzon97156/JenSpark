# JenSpark — get this on your phone

This is a real Next.js app, so "installing" it means: put it somewhere on the
internet, then tell your iPhone to treat that page like an app. No App Store
submission needed since it's just for you.

## 0. Set up Supabase (your database)

**If you already ran `supabase/schema.sql` before:** this version adds several new tables. Phase 1: `daily_tasks`, `task_completions`, `stat_entries`. Phase 2 (Food Tracking): `food_items`, `meals`, `meal_items`, `recipes`, `recipe_ingredients`, `food_logs`, `nutrition_goals`. Phase 3 (Fitness restructure): `fitness_logs`, `fitness_sets`, `workouts`, `workout_items` — these replace the old `workout_days` table, which is left in place with any historical data but no longer written to. Later batch: a new `exercise_types` table (your editable weightlifting exercise library — seat/settings/notes), a `user_settings` table (rest timer default, distance unit default), a Storage bucket for activity photos, and new columns across `fitness_logs`/`fitness_sets`/`food_logs` (calories burned, set completion checkboxes, serving-size labels, and more). Latest batch: a new `fitness_tips` table, and `description`/`archived` columns on `workouts` for editable, archivable workout templates. Just run the SQL Editor step again with the updated file — every statement uses `create table if not exists` (and every security policy is written to safely replace itself), so your existing data is untouched.

This stores your workout history in the cloud, behind a login only you have,
instead of losing it when you close the browser tab.

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is
   plenty for one person).
2. Click **New Project**. Pick any name and a database password (save that
   password somewhere — you won't need it day-to-day, but you'll want it if
   you ever need direct database access).
3. Once the project's ready, open the **SQL Editor** in the left sidebar,
   click **New query**, paste in the entire contents of `supabase/schema.sql`
   from this project, and click **Run**. This creates the table that stores
   your workouts and locks it down so only your account can read or write it.
4. Go to **Project Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key (not the `service_role` key — that one should never
     go in a client app)
5. In this project folder, copy `.env.local.example` to `.env.local` and
   paste those two values in.
6. Optional but recommended for a personal app: in **Authentication →
   Providers → Email**, turn off "Confirm email" so you can sign up and start
   using the app immediately without clicking a confirmation link.

## 0.5. Get food search API keys

The Food Tracking tab's Search feature checks two databases so you can
compare results — set up either or both; skipping one just disables that
tab in the source toggle. There's also a no-API-key option: the app can
import a ~40-item starter library of common foods (real US household
servings) directly into your own food library any time from the My Foods
tab, which covers a lot of everyday logging without either key below.

**USDA FoodData Central** — free, confirmed no-cost, no credit card:

1. Go to [api.data.gov/signup](https://api.data.gov/signup/), fill in your
   name and email.
2. Check your email — the key arrives within a few seconds.
3. Add it to your `.env.local` (see step 1 below) as
   `NEXT_PUBLIC_USDA_API_KEY`.

**API Ninjas** — a second source, free tier confirmed (no credit card,
personal/non-commercial use is explicitly fine per their terms). Nutritionix
was tried first here but turned out to require a paid plan with no free
option, so this replaced it:

1. Sign up at [api-ninjas.com/register](https://api-ninjas.com/register).
2. Your **API Key** is on your account dashboard.
3. Add it as `NEXT_PUBLIC_API_NINJAS_KEY`.

If you skip both, the rest of the app works fine — only the food Search tab
will show an error until at least one key is added, and the starter library
import still works with no key at all.

## 1. Get it running on your Mac first

You need [Node.js](https://nodejs.org) installed (the free LTS version is fine).

```bash
cd workout-tracker
npm install
npm run dev
```

Open `http://localhost:3000` in your browser — you should see the dashboard.
Fix anything you want to change before deploying.

## 2. Put it on GitHub

Vercel (step 3) deploys straight from a GitHub repo.

```bash
git init
git add .
git commit -m "Workout tracker"
```

Create a new empty repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/workout-tracker.git
git branch -M main
git push -u origin main
```

## 3. Deploy it for free with Vercel

Vercel is made by the Next.js team — it's the path of least resistance.

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New → Project**, pick your `workout-tracker` repo.
3. Before deploying, expand **Environment Variables** and add the same
   values from your `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_USDA_API_KEY`, and (if you
   set it up) `NEXT_PUBLIC_API_NINJAS_KEY`. Without
   these the deployed app won't be
   able to save anything.
4. Click **Deploy**.
5. In a minute or two you'll get a URL like `workout-tracker-yourname.vercel.app`.

That URL is now live on the internet — but it's obscure enough that nobody
will find it by guessing, and there's no personal data at risk since
everything currently lives only in memory in the browser tab.

## 4. Add it to your iPhone home screen

1. Open the Vercel URL from step 3 in **Safari** on your iPhone (has to be
   Safari, not Chrome, for this to work).
2. Tap the **Share** icon (square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

You'll get a real icon on your home screen. Tapping it opens the app
full-screen with no browser address bar, and it'll use the icon and dark
theme baked into `public/manifest.json`.

## What "just for myself" means here

- Real login (Supabase email/password) — your workout data is only visible
  to your account, enforced at the database level via row-level security in
  `supabase/schema.sql`, not just hidden by an obscure URL.
- Every set you log saves to your phone's local storage instantly (so the
  app feels fast and still works if your connection drops mid-set) and syncs
  to Supabase in the background about a second later. Open the app on your
  Mac and you'll see the same data.
- Only today's workout loads on the dashboard right now. Past days are
  stored in the `workout_days` table already — a history/calendar view to
  browse them is a natural next step.
- Every time you `git push` to `main`, Vercel automatically redeploys — so
  future changes just need a commit and push, no reinstalling on your phone.
