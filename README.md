# 🏓 Table Tennis Tournament Platform

Angular 17 + Supabase application for managing table tennis tournaments.

---

## Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Configure Environment

Edit `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseKey: 'YOUR_ANON_KEY',
};
```

### 3. Install & Run

```bash
npm install
ng serve
```

App runs at `http://localhost:4200`

---

## Architecture

```
src/app/
├── core/
│   ├── auth/           AuthService, guards (authGuard, adminGuard, guestGuard)
│   ├── models/         TypeScript interfaces matching DB schema
│   └── supabase/       SupabaseService (singleton client)
├── features/
│   ├── auth/           Login, Register
│   ├── dashboard/      Overview with stats
│   ├── events/         List, Create, Edit, Detail (tabbed)
│   ├── players/        Player management + seeding
│   ├── groups/         Group draw + standings
│   ├── bracket/        Knockout bracket viewer (printable)
│   ├── matches/        Match list + score entry
│   └── admin/          User management (admin only)
└── shared/
    └── components/
        └── shell/      App shell with sidenav
```

---

## Features

| Feature | Status |
|---|---|
| Email/password auth | ✅ |
| Role-based access (Admin / Event Manager) | ✅ |
| Multiple events | ✅ |
| Event types: Groups, Knockout, Groups+Knockout | ✅ |
| Player management with rankings | ✅ |
| Snake seeding for group draw | ✅ |
| Round-robin match generation | ✅ |
| Score entry (set by set) | ✅ |
| Auto-advance knockout winners | ✅ |
| Group standings (W/L/Points) | ✅ |
| Knockout bracket visualizer | ✅ |
| Print bracket | ✅ |
| Row-Level Security via Supabase | ✅ |

---

## Event Flow

```
Create Event (draft)
  → Add Players (with rankings)
  → Generate Groups & Draw  ← snake seeding assigns players to groups
  → Enter group match scores  ← standings update automatically
  → Generate Knockout Bracket  ← top N from each group advance
  → Enter knockout scores  ← winners auto-advance each round
  → Final
```

---

## Group Seeding Algorithm (Snake)

Players ranked 1–8, 2 groups:
```
Round 1 → Group A: #1,  Group B: #2
Round 2 → Group B: #3,  Group A: #4   ← reversed
Round 3 → Group A: #5,  Group B: #6
Round 4 → Group B: #7,  Group A: #8   ← reversed
Result  → A: [1,4,5,8]  B: [2,3,6,7]
```
Each group's "favorite" = the top-ranked player in that group.

---

## Next Steps / Extensions

- [ ] Real-time score updates (Supabase Realtime subscriptions)
- [ ] Public event viewer (no login required)
- [ ] CSV import for bulk player upload
- [ ] Set-level score validation (e.g. must reach 11, win by 2)
- [ ] Tiebreaker rules configuration (head-to-head, set ratio)
- [ ] Email notifications for players
- [ ] QR code per match for mobile score entry
