# Bus Tracker Dashboard

A modern, responsive admin web dashboard for viewing and analyzing bus trip data from the Bus Tracker Android app. Built with Next.js, TypeScript, and Firebase.

## Features

-  **Dashboard Overview**: View statistics including total trips, total distance, and average distance
-  **Advanced Filtering**: Search trips by ID, driver name, or email
-  **Trip Listing**: Comprehensive table view of all trips with key metrics
-  **Interactive Maps**: Visualize trip routes on OpenStreetMap with Leaflet
-  **Responsive Design**: Works seamlessly on desktop and mobile devices
-  **Modern UI**: Clean interface built with Tailwind CSS
-  **Real-time Data**: Connects directly to Firebase Firestore

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Maps**: Leaflet + React Leaflet
- **Date Formatting**: date-fns

## Prerequisites

- Node.js 18.0 or higher
- npm or yarn
- Firebase project with Firestore enabled

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/bus-tracker-dashboard.git
   cd bus-tracker-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**

   Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Firebase credentials:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

   **Important**: Never commit your `.env.local` file to version control. It contains sensitive credentials.

## Running the Dashboard

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables from your `.env.local` file
4. Deploy

### Deploy to Netlify

1. Push code to GitHub
2. Import project in [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables
6. Deploy

## Environment Variables

All environment variables should be added to `.env.local` for local development, and to your hosting platform for production:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
CRON_SECRET=
```

## Troubleshooting

### "Failed to load trips" Error

- Verify Firebase credentials in `.env.local` are correct
- Check that Firestore is enabled in Firebase Console
- Ensure Firestore rules allow read access

### Map not displaying

- Check that Leaflet CSS is loaded properly
- Verify trip has valid GPS coordinates

## Project Structure

```
Dashboard/
 app/                    # Next.js app directory
    login/             # Login page
    trip/              # Trip detail pages
    layout.tsx         # Root layout
    page.tsx           # Homepage
 components/            # React components
 lib/                   # Firebase config & context
 services/              # API services
 types/                 # TypeScript types
 utils/                 # Utility functions
 scripts/               # Admin scripts
```

## License

MIT


## AI Copilot Snapshot Architecture

- `GET /api/cron/cache-snapshot` runs every 12 hours using Vercel Cron, reads `trips` and `anomalies`, computes flagged trip signals, and stores a compact payload in `cache/latest_snapshot`.
- `POST /api/chat` performs one document read from `cache/latest_snapshot`, injects that JSON into the system prompt, and streams model output back to the dashboard chat widget.
- `components/ChatWidget.tsx` provides a floating assistant panel for fleet, anomaly, and driver questions.
