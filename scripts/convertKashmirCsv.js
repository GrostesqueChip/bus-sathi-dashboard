/**
 * Convert Kashmir CSV outputs to JSON for the dashboard.
 * Usage: node scripts/convertKashmirCsv.js
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'route-rationalization-kashmir');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

function parseCsv(text) {
  // Handle BOM
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }
  return rows;
}

// Routes
const routesCsv = fs.readFileSync(path.join(PUBLIC_DIR, 'Rationalised_Routes_Kashmir_v3.csv'), 'utf8');
const routes = parseCsv(routesCsv);
fs.writeFileSync(path.join(DATA_DIR, 'routes.json'), JSON.stringify(routes, null, 0));
console.log(`routes.json: ${routes.length} rows`);

// Log
const logCsv = fs.readFileSync(path.join(PUBLIC_DIR, 'Rationalisation_Log_Kashmir_v3.csv'), 'utf8');
const log = parseCsv(logCsv);
fs.writeFileSync(path.join(DATA_DIR, 'log.json'), JSON.stringify(log, null, 0));
console.log(`log.json: ${log.length} rows`);

// Impact
const impactCsv = fs.readFileSync(path.join(PUBLIC_DIR, 'Passenger_Impact_Kashmir_v3.csv'), 'utf8');
const impact = parseCsv(impactCsv);
fs.writeFileSync(path.join(DATA_DIR, 'impact.json'), JSON.stringify(impact, null, 0));
console.log(`impact.json: ${impact.length} rows`);

// Also compute population stats for analysis
let totalPopServed = 0;
let activeRoutes = 0;
let totalFleet = 0;
let hpvTotal = 0;
let mpvTotal = 0;
let trunkCount = 0;
let feederCount = 0;
let mergedCount = 0;
let ssclRoutes = 0;
let socialCount = 0;

routes.forEach((r) => {
  const pop = Number(r.Population_Served) || 0;
  const fleet = Number(r.Fleet_Required) || 0;
  const hpv = Number(r.HPV_Count) || 0;
  const mpv = Number(r.MPV_Count) || 0;
  const action = r.Action_Taken || '';

  totalPopServed += pop;

  if (action !== 'MERGED_INTO_TRUNK') {
    activeRoutes++;
    totalFleet += fleet;
    hpvTotal += hpv;
    mpvTotal += mpv;
  }

  if (action === 'UPGRADED_TO_TRUNK') trunkCount++;
  if (action.includes('FEEDER')) feederCount++;
  if (action === 'MERGED_INTO_TRUNK') mergedCount++;
  if ((r.New_Route_ID || '').startsWith('SSCL-')) ssclRoutes++;
  if (r.Social_Flag === 'True') socialCount++;
});

console.log('\n--- Kashmir Network Summary ---');
console.log(`Total route rows: ${routes.length}`);
console.log(`Active routes: ${activeRoutes}`);
console.log(`Trunk routes: ${trunkCount}`);
console.log(`Feeder routes: ${feederCount}`);
console.log(`Merged routes: ${mergedCount}`);
console.log(`SSCL backbone routes: ${ssclRoutes}`);
console.log(`Social obligation routes: ${socialCount}`);
console.log(`Total fleet required: ${totalFleet}`);
console.log(`HPV total: ${hpvTotal}`);
console.log(`MPV total: ${mpvTotal}`);
console.log(`Sum of Population_Served (all rows): ${totalPopServed}`);
console.log(`Avg pop served per active route: ${activeRoutes ? (totalPopServed / activeRoutes).toFixed(0) : 0}`);
