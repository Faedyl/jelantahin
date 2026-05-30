# 🫒 Jelantahin

**Platform connecting UMKM with used cooking oil to Perusahaan/Kolektor.**

Jelantahin makes it easy for small businesses (UMKM) to sell their used cooking oil directly to companies that need it for recycling, biodiesel, or industrial use.

---

## Tech Stack

- **Frontend**: SvelteKit 5 + TailwindCSS
- **Backend**: Supabase (Auth, PostgreSQL, Row-Level Security)
- **Deployment**: SvelteKit Adapter Auto (Vercel/Cloudflare/Netlify)

## Project Structure

```
jelantahin/
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js    # Supabase client init
│   │   └── supabase.js          # Data layer (auth, profiles, listings, orders, transactions)
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout with Navbar + auth state
│   │   ├── +layout.js           # SPA mode (SSR disabled)
│   │   ├── +page.svelte         # Landing page
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration with role selection
│   │   ├── logout/              # Logout handler
│   │   └── dashboard/
│   │       ├── +page.svelte     # Dashboard overview + profile
│   │       ├── umkm/            # UMKM-specific pages
│   │       │   ├── +page.svelte       # UMKM dashboard (stats, orders, listings)
│   │       │   ├── listing/           # Create new oil listing
│   │       │   │   └── +page.svelte
│   │       │   └── history/           # History of listings & orders
│   │       │       └── +page.svelte
│   │       └── perusahaan/      # Perusahaan-specific pages
│   │           ├── +page.svelte       # Perusahaan dashboard (stats, active orders)
│   │           ├── browse/            # Browse available oil listings
│   │           │   └── +page.svelte
│   │           └── orders/            # Orders management (confirm, pick up, complete)
│   │               └── +page.svelte
│   └── app.css                  # Tailwind + component styles
├── supabase/migrations/
│   └── 00001_init.sql           # Full schema (types, tables, RLS, indexes)
├── .env.example                 # Environment variable template
├── package.json
├── svelte.config.js
├── vite.config.js
├── tailwind.config.js           # Custom jelantah brand colors
└── postcss.config.js
```

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with role (`umkm`/`perusahaan`), business info |
| `oil_listings` | UMKM posts available used cooking oil |
| `orders` | Perusahaan claims oil for collection |
| `transactions` | Completed pickups with payment tracking |

Row-Level Security (RLS) enforces that:
- Users can only edit their own profile
- UMKM can only manage their own listings
- Orders are visible only to involved parties
- Transactions are visible only through linked orders

## Setup

### 1. Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### 2. Configure Supabase

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

In the Supabase SQL Editor, paste and run `supabase/migrations/00001_init.sql`.

Or with Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## User Roles

### 🏪 UMKM (Penjual Minyak Jelantah)
- Create listings with quantity, price, address
- View incoming orders from companies
- Track earnings and history

### 🏭 Perusahaan / Kolektor (Pembeli Minyak Jelantah)
- Browse available oil listings from UMKM
- Claim / request collection
- Manage orders through: Pending → Confirmed → Picked Up → Completed
- Track total liters collected

## Order Lifecycle

```
UMKM posts listing (available)
        ↓
Perusahaan claims listing (claimed)
        ↓
Perusahaan confirms order (confirmed)
        ↓
Pickup occurs (picked_up)
        ↓
Order completed → Transaction created (completed)
```
