<div align="center">

# 🚌 Bus Tracker Dashboard

### Intelligent Fleet Analytics & Route Rationalisation Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

*A modern, data-driven admin dashboard for real-time bus trip monitoring, driver analytics, and evidence-based route rationalisation across the Kashmir Valley transit network.*

---

</div>

## 🎯 Overview

Bus Tracker Dashboard is a full-stack web platform that connects to a companion Android app, aggregating GPS trip data from bus operators to deliver actionable fleet intelligence. Beyond simple tracking, the platform includes a **Kashmir Valley Route Rationalisation Engine** — a data-driven system that transformed 342 legacy bus routes into an optimised 192-route network serving 2.6L+ residents.

> **📖 For detailed technical documentation on the Kashmir route rationalisation, see [`KASHMIR_HANDOVER.md`](./KASHMIR_HANDOVER.md)**

---

## ✨ Key Features

### 📊 Fleet Intelligence Dashboard
- **Real-time trip monitoring** — view active and historical trips with GPS traces
- **Driver performance analytics** — per-driver stats, trip counts, distance, and behavioural patterns
- **Interactive map visualisation** — Leaflet-based maps with OpenStreetMap tiles
- **Advanced filtering** — search by trip ID, driver name, email, or date range
- **Anomaly detection** — flagged trips surfaced via automated analysis
- **PDF/CSV export** — generate driver reports and trip logs on demand

### 🤖 AI Copilot
- **Conversational fleet assistant** — ask natural language questions about fleet status, anomalies, and drivers
- **Cached snapshot architecture** — Vercel Cron pre-computes a compact data snapshot every 12 hours
- **Streaming responses** — OpenAI-powered answers streamed in real-time via the chat widget

### 🗺️ Kashmir Valley Route Rationalisation (v3.3.7)
- **342 legacy routes → 207 active routes** with a 3-tier hierarchy (Trunk / Feeder / SSCL Backbone)
- **Composite Demand Index (CDI)** — population, POI density, road quality, and congestion-weighted scoring
- **SSCL e-bus backbone integration** — 30 trunk routes from CHALO ridership data with 15-min headways
- **35-minute headway ceiling** — no route waits longer than 35 min anywhere (headways are 15 / 20 / 35 min)
- **Balanced trunk fleet** — 50/50 HPV/MPV split so neither bus class dominates a trunk corridor
- **Interactive network explorer** — native Leaflet map + generated master transit HTML map
- **Per-route decision audit trail** — every merge, retention, or upgrade decision is logged with reasoning
- **One-click bus-schedule download** — the pretty RTO Excel workbook front-and-centre, with all other Excel / GeoJSON / CSV outputs one click away

### 🔐 Admin-Only Access
- Firebase Custom Claims (`admin: true`) for role-based access control
- Protected routes with server-side verification
- Firestore security rules ensuring drivers can only write, admins can only read

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL DEPLOYMENT                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Next.js App │  │  API Routes  │  │  Vercel Cron (12hr)   │ │
│  │  (App Router)│  │  /api/chat   │  │  /api/cron/cache-snap │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
│         │                 │                       │             │
└─────────┼─────────────────┼───────────────────────┼─────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
   ┌─────────────┐  ┌─────────────┐        ┌─────────────┐
   │  Firebase    │  │  OpenAI API │        │  Firestore  │
   │  Auth        │  │  (GPT-4o)   │        │  cache/     │
   │  (Admin)     │  │             │        │  latest_    │
   └─────────────┘  └─────────────┘        │  snapshot   │
                                           └─────────────┘
          ▲
          │
   ┌─────────────┐
   │  Android    │
   │  Bus Tracker│
   │  App        │
   └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | SSR, routing, API routes |
| **Language** | TypeScript 5.3 | Type safety across the codebase |
| **Styling** | Tailwind CSS 3.4 | Utility-first responsive design |
| **Database** | Firebase Firestore | Real-time trip storage + cache |
| **Auth** | Firebase Auth + Custom Claims | Admin-only access control |
| **Maps** | Leaflet + React Leaflet | Interactive GPS visualisation |
| **Charts** | Recharts 3.6 | Driver analytics & distribution charts |
| **AI** | OpenAI GPT-4o-mini | Conversational fleet copilot |
| **PDF** | jsPDF + AutoTable | Driver report generation |
| **Icons** | Lucide React | Modern icon system |
| **Hosting** | Vercel | Edge deployment + Cron jobs |
| **Analytics** | Vercel Analytics + Speed Insights | Performance monitoring |

---

## 📁 Project Structure

```
BusTrackerAppDashboard-main/
├── app/                                    # Next.js App Router pages
│   ├── api/
│   │   ├── chat/                           # AI copilot streaming endpoint
│   │   └── cron/                           # Vercel Cron snapshot builder
│   ├── active-drivers/                     # Active driver monitoring
│   ├── driver-report/                      # Per-driver PDF reports
│   ├── flagged-trips/                      # Anomaly detection view
│   ├── login/                              # Firebase auth login page
│   ├── map-visualizer/                     # Multi-trip map overlay
│   ├── registered-drivers/                 # Driver registry
│   ├── route-rationalization/              # Generic rationalization (v1)
│   ├── route-rationalization-kashmir/      # ⭐ Kashmir Valley engine
│   ├── route-rationalization-v3/           # V3 engine iteration
│   ├── trip/                               # Trip detail + GPS trace
│   ├── trip-logs/                          # Historical trip log browser
│   ├── page.tsx                            # Dashboard homepage
│   └── layout.tsx                          # Root layout
│
├── components/
│   ├── rationalization-kashmir/            # ⭐ Kashmir dashboard components
│   │   ├── KashmirPresentationDashboard    # Main presentation view
│   │   ├── KashmirBeforeAfterDashboard     # Before & After comparison dashboard
│   │   ├── KashmirBeforeAfterMap           # Before & After side-by-side map
│   │   ├── KashmirBeforeAfter              # Trunk consolidation & permit lookup card
│   │   ├── KashmirNetworkMap               # Leaflet network explorer
│   │   ├── KashmirRouteTable               # Sortable route table
│   │   ├── KashmirCards                    # KPI & policy cards
│   │   ├── KashmirSourceFiles              # Downloadable outputs
│   │   └── KashmirRouteUtils               # Route key & priority helpers
│   ├── ChatWidget.tsx                      # AI copilot floating panel
│   ├── Sidebar.tsx                         # Navigation sidebar
│   └── ...                                 # Shared components
│
├── lib/
│   ├── routeRationalizationKashmir.ts      # ⭐ Kashmir data loader + types
│   ├── firebase.ts                         # Client Firebase config
│   ├── firebaseAdmin.ts                    # Admin SDK config
│   ├── copilot.ts                          # AI system prompt builder
│   └── snapshot.ts                         # Cache snapshot logic
│
├── public/
│   └── route-rationalization-kashmir/      # ⭐ Kashmir output files
│       ├── data/
│       │   ├── routes.json                 # 342 routes with full metrics
│       │   ├── log.json                    # Decision audit log
│       │   └── impact.json                 # Passenger impact analysis
│       ├── Rationalised_Routes_Kashmir_v3.geojson
│       ├── Master_Transit_Map_Kashmir_v3.html
│       ├── before-after.html               # ⭐ Before & After standalone comparative map
│       ├── Kashmir_Route_Frequency_Plan_v3.xlsx
│       ├── Kashmir_Route_Frequency_Plan_v3.3.7_RTO.xlsx          # 9-sheet master
│       ├── Kashmir_Route_Frequency_Plan_v3.3.7_RTO_Pretty.xlsx   # ⭐ bus schedule (primary download)
│       ├── Routes_with_Codes.xlsx
│       └── route_maps_kashmir/             # Per-route HTML maps
│
├── scripts/
│   ├── setAdmin.js                         # Firebase admin claim script
│   └── convertKashmirCsv.js               # CSV → JSON converter
│
├── generate_route_codes.py                 # Route code generator (Excel → codes)
├── update_route_codes.py                   # TMP code resolver + JSON patcher
├── Kashmir_Stops_Sectored_V2.csv           # 187 stops with sectors & coordinates
├── exportData.js                           # Firestore → CSV export
└── KASHMIR_HANDOVER.md                     # ⭐ Technical handover document
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0
- **npm** or **yarn**
- Firebase project with Firestore + Auth enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/bus-tracker-dashboard.git
cd bus-tracker-dashboard

# Install dependencies
npm install
```

### Environment Configuration

Create `.env.local` in the project root:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Copilot
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Vercel Cron
CRON_SECRET=your_cron_secret
```

> ⚠️ **Never commit `.env.local`** — it contains sensitive credentials. It's already in `.gitignore`.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Deploy — Vercel auto-detects Next.js and configures the build
5. Cron jobs (`/api/cron/cache-snapshot`) are configured via `vercel.json`

### Netlify (Alternative)

1. Push code to GitHub
2. Import in [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables
6. Deploy

---

## 🔧 Admin Setup

The dashboard uses **Firebase Custom Claims** for admin-only access. See the detailed guide:

📖 **[`ADMIN_SETUP.md`](./ADMIN_SETUP.md)**

Quick reference:

```bash
# Set admin claim for a user
cd scripts
node setAdmin.js  # Edit the email in the script first
```

---

## 🤖 AI Copilot Architecture

The copilot uses a 2-layer caching strategy to minimise Firestore reads:

1. **`GET /api/cron/cache-snapshot`** — Vercel Cron runs every 12 hours. Reads `trips` and `anomalies`, computes flagged trip signals, and stores a compact JSON payload in `cache/latest_snapshot`.

2. **`POST /api/chat`** — reads one document from `cache/latest_snapshot`, injects it as system context, and streams GPT-4o-mini responses back to the client.

3. **`ChatWidget.tsx`** — floating assistant panel for fleet, anomaly, and driver questions.

---

## 🗺️ Kashmir Route Rationalisation

The platform includes a comprehensive route rationalisation engine for the Kashmir Valley. This is documented extensively in the handover document:

📖 **[`KASHMIR_HANDOVER.md`](./KASHMIR_HANDOVER.md)** — Complete technical specification, before/after analysis, route code system, and instructions for continuing development.

**Quick Summary:**
- **Input:** 342 legacy bus routes from RTO permit register
- **Output:** 192 optimised routes (5 trunk + 157 feeder + 30 SSCL backbone)
- **Method:** Composite Demand Index (CDI) scoring with population, POI, road quality, and congestion factors
- **Coverage:** ~2.6 lakh residents across 10 districts in the Kashmir Valley

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|---------|
| **"Failed to load trips"** | Verify Firebase credentials in `.env.local`. Check Firestore is enabled and rules allow admin read. |
| **Map not displaying** | Ensure Leaflet CSS is loaded. Verify trip has valid GPS coordinates. |
| **"Access Denied"** | Run `setAdmin.js` for the user. User must log out and log back in. Clear browser cache. |
| **"Missing permissions"** | Check Firestore rules include `request.auth.token.admin == true`. Verify rules are published. |
| **AI chat not responding** | Verify `OPENAI_API_KEY` is set. Check `cache/latest_snapshot` exists in Firestore. |

---

## 📜 License

MIT

---

<div align="center">

**Built with ❤️ for smarter public transport**

*Kashmir Valley Transit • Route Rationalisation • Fleet Intelligence*

</div>
