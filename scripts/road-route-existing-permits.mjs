// One-off (re-runnable) generator: snaps the "before" RTO permit lines to real
// roads using OSRM, so the Before map follows roads like the After map instead
// of drawing straight origin→destination lines.
//
// - Reads  public/route-rationalization-kashmir/existing-routes.geojson
// - Backs up the original to  existing-routes.straight.geojson  (once)
// - Routes each permit through its existing waypoints via OSRM (overview=simplified)
// - Keeps all properties; only the geometry is replaced
// - Leaves out-of-valley / failed routes as their original straight line
//
// Run:  node scripts/road-route-existing-permits.mjs
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const DIR = path.join(process.cwd(), 'public', 'route-rationalization-kashmir');
const SRC = path.join(DIR, 'existing-routes.geojson');
const BACKUP = path.join(DIR, 'existing-routes.straight.geojson');

// Valley routing window — endpoints outside this stay as straight lines
// (inter-state / far-district permits would otherwise shoot off the map).
const BBOX = { minLat: 33.3, maxLat: 34.85, minLon: 73.9, maxLon: 75.5 };
const inValley = ([lon, lat]) =>
  lat >= BBOX.minLat && lat <= BBOX.maxLat && lon >= BBOX.minLon && lon <= BBOX.maxLon;

const OSRM = 'https://router.project-osrm.org';
const CONCURRENCY = 5;
const round5 = (n) => Math.round(n * 1e5) / 1e5;

function osrmRoute(coords) {
  const pts = coords.map(([lon, lat]) => `${lon},${lat}`).join(';');
  const url = `${OSRM}/route/v1/driving/${pts}?overview=simplified&geometries=geojson`;
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.code === 'Ok' && j.routes?.[0]?.geometry?.coordinates?.length > 1) {
            resolve(j.routes[0].geometry.coordinates.map(([lon, lat]) => [round5(lon), round5(lat)]));
          } else resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function main() {
  const geo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  if (!fs.existsSync(BACKUP)) {
    fs.writeFileSync(BACKUP, JSON.stringify(geo));
    console.log(`Backed up original → ${path.basename(BACKUP)}`);
  }

  const features = geo.features;
  let routed = 0;
  let skipped = 0;
  let failed = 0;
  let next = 0;

  async function worker() {
    while (next < features.length) {
      const i = next++;
      const f = features[i];
      const coords = f.geometry?.coordinates || [];
      if (coords.length < 2 || !coords.every(inValley)) {
        skipped++;
        continue;
      }
      const line = await osrmRoute(coords);
      if (line) {
        f.geometry = { type: 'LineString', coordinates: line };
        routed++;
      } else {
        failed++;
      }
      if ((routed + failed + skipped) % 25 === 0) {
        process.stdout.write(`  ...${routed + failed + skipped}/${features.length}\n`);
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  console.log(`Routing ${features.length} permits via OSRM (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(SRC, JSON.stringify(geo));
  const sizeKb = (fs.statSync(SRC).size / 1024).toFixed(0);
  console.log(`\nDone. road-routed: ${routed} | skipped (out of valley): ${skipped} | failed (kept straight): ${failed}`);
  console.log(`Wrote ${path.basename(SRC)} (${sizeKb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
