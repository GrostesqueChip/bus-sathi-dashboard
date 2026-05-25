/**
 * Converts kashmir_routes_geocoded.csv (the official RTO permit register
 * with geocoded From/To/Via coordinates) into a GeoJSON FeatureCollection
 * of LineStrings for the "Before" map.
 *
 * Each row -> one LineString [From, Via?, To]. Points outside the Kashmir
 * Valley bounding box are dropped (some via geocodes are wildly wrong).
 * Rows with fewer than 2 valid points after filtering are skipped.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'route-rationalization-kashmir');
const CSV_PATH = path.join(PUBLIC_DIR, 'kashmir_routes_geocoded.csv');
const GEOJSON_PATH = path.join(PUBLIC_DIR, 'existing-routes.geojson');

// Kashmir Valley bbox tightened to where real Srinagar/Anantnag/Baramulla
// bus operations live. Outside this we treat the geocode as broken.
const BBOX = { latMin: 33.7, latMax: 34.5, lonMin: 74.3, lonMax: 75.3 };

// Via points more than this many km from the origin-destination midpoint are
// treated as bad geocodes and dropped (keeping just the origin -> destination
// straight line). Stops the wild detour artifacts.
const VIA_MAX_DEVIATION_KM = 25;

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else if (ch === '\r') {
      // ignore
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parsePoint(latStr, lonStr) {
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) return null;
  return [lon, lat]; // GeoJSON is [lon, lat]
}

function nearlyEqual(a, b) {
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < 1e-5 && Math.abs(a[1] - b[1]) < 1e-5;
}

function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV is empty');

  const header = rows[0].map((h) => h.trim());
  const idx = (name) => header.indexOf(name);

  const COL = {
    sno: idx('S. No'),
    office: idx('Office Name'),
    regNo: idx('Registration No.'),
    vehicleCategory: idx('Vehicle Category'),
    vehicleType: idx('Vehicle Type'),
    vehicleClass: idx('Vehicle Class'),
    permitType: idx('Permit Type'),
    permitCategory: idx('Permit Category'),
    region: idx('Region Covered'),
    from: idx('From Location'),
    to: idx('To Location'),
    via: idx('Via Location'),
    service: idx('Permit Service Type Name'),
    fuel: idx('Vehicle Fuel'),
    fromLat: idx('From_Lat'),
    fromLon: idx('From_Lon'),
    toLat: idx('To_Lat'),
    toLon: idx('To_Lon'),
    viaLat: idx('Via_Lat'),
    viaLon: idx('Via_Lon'),
  };

  const features = [];
  const corridorCounts = new Map();
  let skippedNoGeometry = 0;
  let skippedDot = 0;
  let droppedVia = 0;
  let permitIndex = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;

    const fromPt = parsePoint(row[COL.fromLat], row[COL.fromLon]);
    const toPt = parsePoint(row[COL.toLat], row[COL.toLon]);
    let viaPt = parsePoint(row[COL.viaLat], row[COL.viaLon]);

    if ((row[COL.viaLat] || row[COL.viaLon]) && !viaPt) droppedVia++;

    if (!fromPt && !toPt) {
      skippedNoGeometry++;
      continue;
    }
    if (fromPt && toPt && nearlyEqual(fromPt, toPt) && !viaPt) {
      skippedDot++;
      continue;
    }

    // Sanity-check via point against the origin-destination midpoint. If it
    // would drag the line tens of km off course, the geocode is almost
    // certainly wrong (common in this dataset). Drop it.
    if (viaPt && fromPt && toPt) {
      const mid = [(fromPt[0] + toPt[0]) / 2, (fromPt[1] + toPt[1]) / 2];
      if (haversineKm(viaPt, mid) > VIA_MAX_DEVIATION_KM) {
        viaPt = null;
        droppedVia++;
      }
    }

    const coords = [];
    if (fromPt) coords.push(fromPt);
    if (viaPt && (!coords.length || !nearlyEqual(coords[coords.length - 1], viaPt))) coords.push(viaPt);
    if (toPt && (!coords.length || !nearlyEqual(coords[coords.length - 1], toPt))) coords.push(toPt);

    if (coords.length < 2) {
      skippedNoGeometry++;
      continue;
    }

    const fromName = (row[COL.from] || '').trim();
    const toName = (row[COL.to] || '').trim();
    const corridorKey = `${fromName.toUpperCase()} ↔ ${toName.toUpperCase()}`;
    corridorCounts.set(corridorKey, (corridorCounts.get(corridorKey) || 0) + 1);

    permitIndex++;
    features.push({
      type: 'Feature',
      properties: {
        permitId: `P${String(permitIndex).padStart(4, '0')}`,
        registrationNo: (row[COL.regNo] || '').trim(),
        office: (row[COL.office] || '').trim(),
        origin: fromName,
        destination: toName,
        via: (row[COL.via] || '').trim(),
        vehicleCategory: (row[COL.vehicleCategory] || '').trim(),
        vehicleType: (row[COL.vehicleType] || '').trim(),
        vehicleClass: (row[COL.vehicleClass] || '').trim(),
        permitType: (row[COL.permitType] || '').trim(),
        permitCategory: (row[COL.permitCategory] || '').trim(),
        region: (row[COL.region] || '').trim(),
        serviceType: (row[COL.service] || '').trim(),
        fuel: (row[COL.fuel] || '').trim(),
        corridorKey,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  features.forEach((f) => {
    f.properties.duplicateCount = corridorCounts.get(f.properties.corridorKey) || 1;
  });

  const collection = {
    type: 'FeatureCollection',
    name: 'Existing_RTO_Permits',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features,
  };

  fs.writeFileSync(GEOJSON_PATH, JSON.stringify(collection));

  console.log(`Wrote ${features.length} permit features.`);
  console.log(`  ${skippedNoGeometry} rows skipped (no usable origin/destination).`);
  console.log(`  ${skippedDot} rows skipped (origin == destination, no via).`);
  console.log(`  ${droppedVia} via points dropped (out of Kashmir bbox).`);
  console.log(`Top duplicated corridors:`);
  Array.from(corridorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)} permits — ${k}`));
}

main();
