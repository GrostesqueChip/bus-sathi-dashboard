"""
update_route_codes.py

Reads the Kashmir_Route_Frequency_Plan_v3.xlsx from outputs_v3.3.5,
resolves TMP-* route codes using Kashmir_Stops_Sectored_V2.csv,
and patches all dashboard JSON + GeoJSON files in-place.
"""
import json
import re
import difflib
import csv
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# --- Paths ---
STOPS_FILE   = 'Kashmir_Stops_Sectored_V2.csv'
ROUTES_JSON  = 'public/route-rationalization-kashmir/data/routes.json'
LOG_JSON     = 'public/route-rationalization-kashmir/data/log.json'
IMPACT_JSON  = 'public/route-rationalization-kashmir/data/impact.json'
GEOJSON_FILE = 'public/route-rationalization-kashmir/Rationalised_Routes_Kashmir_v3.geojson'

# RTO Excel from v3.3.5 outputs (source of truth for route list + existing codes)
RTO_EXCEL    = 'E:/kash/outputs_v3.3.5/Kashmir_Route_Frequency_Plan_v3.3.5_RTO.xlsx'
V3_EXCEL     = 'E:/kash/outputs_v3.3.5/Kashmir_Route_Frequency_Plan_v3.xlsx'

# --- Load stops ---
stops = []
with open(STOPS_FILE, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row['Sector_ID'] = int(float(row.get('Sector_ID', 0) or 0))
        row['Stop_No']   = int(float(row.get('Stop_No', 0) or 0))
        row['Stop_Name_Clean'] = row['Stop_Name'].strip().upper()
        stops.append(row)

def compact(s):
    return re.sub(r'[^A-Z0-9]', '', str(s).upper())

for s in stops:
    s['Stop_Name_Compact'] = compact(s['Stop_Name_Clean'])

NOISE_SUFFIXES = [
    'BUS STAND', 'BUS STATION', 'RAILWAY STATION', 'CROSSING',
    'CHOWK', 'CHOK', 'HOSPITAL', 'COLLEGE', 'STOP', 'STAND',
]

def strip_noise(name):
    n = name
    for w in NOISE_SUFFIXES:
        n = re.sub(rf'\b{w}\b', '', n)
    return re.sub(r'\s+', ' ', n).strip()

# --- Additional manual mappings for stubborn TMP routes ---
MANUAL_STOP_MAP = {
    # name-as-in-route -> (Tehsil_Code, Sector_ID, Stop_No)
    'PANZINARA':                     ('SR', 10, 39),  # Pandach area / Srinagar
    'BATWARA':                       ('SR', 10, 11),  # near Buchpora
    'BONE JOINT HOSPITAL BARZALLA': ('SR', 10, 9),   # near Batmaloo
    'BARZALLA':                      ('SR', 10, 9),
    'NASRULLAH PORA':                ('SR', 10, 8),   # near Batmaloo
    'NASEEM BAGH':                   ('SR', 10, 18),  # Hazratbal area
    'NOORBAGH':                      ('SR', 10, 37),  # Nowhata area
    'GOJWARA':                       ('SR', 10, 37),  # near Nowhata
    'MILL STOP':                     ('SR', 10, 37),
    'AGRI KALAN':                    ('BG', 2, 5),    # near Chadoora
    'KANIHAMA':                      ('BG', 2, 5),    # near Chadoora
    'OLD CITY LOOP':                 ('SR', 10, 42),  # Rainawari
    'DOWNTOWN SRINAGAR':             ('SR', 10, 42),
    'KHONMOH':                       ('SR', 10, 40),  # near Pantha Chowk
    'JKPDC':                         ('SR', 10, 25),  # Jehangir Chowk area
    'WADWAN':                        ('BG', 2, 5),    # near Chadoora / Budgam
    'ARATH':                         ('BG', 2, 2),    # Arizal area
    'CHARESHARIEF':                  ('BG', 2, 7),    # ChariSharief  
    'PALHALAN':                      ('BR', 4, 3),    # Baramulla district
    'SANGRAMA':                      ('BR', 4, 3),    # near Baramulla
    'DADSARA':                       ('PW', 8, 13),   # near Tral
    'TRAL':                          ('PW', 8, 13),
    'AWANTIPORA':                    ('PW', 8, 5),    # near Pampore
    'KANGAN':                        ('GB', 5, 4),    # Ganderbal district
    'MANIGAM':                       ('GB', 5, 4),    # near Ganderbal
    'BATAMALOO':                     ('SR', 10, 8),
    'BATAMALLO':                     ('SR', 10, 8),
    'PARIMPORA':                     ('SR', 10, 54),  # using Srinagar sector
    'PANTHA CHOWK':                  ('SR', 10, 40),
    'PANTHACHOWK':                   ('SR', 10, 40),
    'SRINAGAR':                      ('SR', 10, 51),
    'KAMALKOTE':                     ('BR', 4, 9),
    'GARKOTE':                       ('SP', 9, 9),
    'NAMBIA':                        ('BR', 4, 12),
    'CHOWKIBAL':                     ('KW', 7, 1),
    'RAMBAGH':                       ('SR', 10, 25),  # near Jehangir Chowk
    'HYDERPORA':                     ('SR', 10, 21),  # near HMT
    'SOPORE':                        ('SR', 10, 49),  # Sopore-Srinagar entry
    'SOURA':                         ('PW', 8, 12),
    'JEHANGIR CHOWK':                ('SR', 10, 25),
    'JVC':                           ('SP', 9, 12),
    'HAZRATBAL':                     ('SR', 10, 18),
    'CIRCULAR':                      ('SR', 10, 8),   # Circular routes use Batmaloo
    # Compound destination names that fuzzy matching misses
    'AGRI KALAN KANIHAMA':           ('BG', 2, 5),    # near Chadoora, Budgam
    'OLD CITY':                      ('SR', 10, 42),  # Rainawari / old town
    'JKPDC JEHANGIR CHOWK':          ('SR', 10, 25),  # JKPDC is at Jehangir Chowk
    'DADSARA TRAL':                  ('PW', 8, 13),   # Tral area, Pulwama
    'DADSARA':                       ('PW', 8, 13),
}

def get_stop_info(stop_name):
    """Try a sequence of matching strategies, from strict to loose."""
    if not stop_name:
        return None

    name = stop_name.strip().upper()
    
    # 0. Manual map first (highest priority for known stubborn names)
    if name in MANUAL_STOP_MAP:
        tc, sid, sno = MANUAL_STOP_MAP[name]
        return {'Tehsil_Code': tc, 'Sector_ID': f'{sid:02d}', 'Stop_No': f'{sno:02d}'}
    
    name_compact = compact(name)
    name_stripped = strip_noise(name)
    name_stripped_compact = compact(name_stripped)

    # 1. Exact match on cleaned name
    for s in stops:
        if s['Stop_Name_Clean'] == name:
            return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                    'Sector_ID': f"{s['Sector_ID']:02d}",
                    'Stop_No': f"{s['Stop_No']:02d}"}

    # 2. Compact match
    if name_compact:
        for s in stops:
            if s['Stop_Name_Compact'] == name_compact:
                return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                        'Sector_ID': f"{s['Sector_ID']:02d}",
                        'Stop_No': f"{s['Stop_No']:02d}"}

    # 3. Compact match after stripping noise
    if name_stripped_compact:
        for s in stops:
            if s['Stop_Name_Compact'] == name_stripped_compact:
                return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                        'Sector_ID': f"{s['Sector_ID']:02d}",
                        'Stop_No': f"{s['Stop_No']:02d}"}

    # 4. Substring either way
    if name_stripped_compact:
        for s in stops:
            if name_stripped_compact in s['Stop_Name_Compact']:
                return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                        'Sector_ID': f"{s['Sector_ID']:02d}",
                        'Stop_No': f"{s['Stop_No']:02d}"}
        for s in stops:
            if s['Stop_Name_Compact'] in name_stripped_compact and len(s['Stop_Name_Compact']) >= 4:
                return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                        'Sector_ID': f"{s['Sector_ID']:02d}",
                        'Stop_No': f"{s['Stop_No']:02d}"}

    # 5. Close-match fallback
    if name_stripped_compact:
        all_compacts = [s['Stop_Name_Compact'] for s in stops]
        close = difflib.get_close_matches(name_stripped_compact, all_compacts, n=1, cutoff=0.80)
        if close:
            for s in stops:
                if s['Stop_Name_Compact'] == close[0]:
                    return {'Tehsil_Code': s['Tehsil_Code'].strip()[:2].upper(),
                            'Sector_ID': f"{s['Sector_ID']:02d}",
                            'Stop_No': f"{s['Stop_No']:02d}"}
    
    # 6. Try manual map with stripped name
    if name_stripped in MANUAL_STOP_MAP:
        tc, sid, sno = MANUAL_STOP_MAP[name_stripped]
        return {'Tehsil_Code': tc, 'Sector_ID': f'{sid:02d}', 'Stop_No': f'{sno:02d}'}

    return None

def extract_origin_dest(route_name):
    route_name = str(route_name).upper().strip()
    
    # Handle "X Circular via Y" -> origin=X, dest=X (circular)
    if 'CIRCULAR' in route_name:
        parts = route_name.split('CIRCULAR')
        origin = parts[0].strip()
        if origin:
            return origin, origin
        return None, None
    
    # Handle "Old City Loop Downtown Srinagar" style
    if 'LOOP' in route_name:
        parts = route_name.split('LOOP')
        if len(parts) >= 2:
            return parts[0].strip() or 'SRINAGAR', parts[1].strip() or 'SRINAGAR'
    
    if ' \u2194 ' in route_name:
        a, b = route_name.split(' \u2194 ', 1)
        return a.strip(), b.strip()
    if ' TO ' in route_name:
        origin, rest = route_name.split(' TO ', 1)
        dest = rest.split(' VIA ')[0] if ' VIA ' in rest else rest
        return origin.strip(), dest.strip()
    return None, None

def generate_code(route_name):
    origin, dest = extract_origin_dest(route_name)
    orig_info = get_stop_info(origin)
    dest_info = get_stop_info(dest)
    
    if orig_info and dest_info:
        district_block = orig_info['Tehsil_Code'] + dest_info['Tehsil_Code']
        sector_block   = orig_info['Sector_ID']   + dest_info['Sector_ID']
        stop_block     = orig_info['Stop_No']      + dest_info['Stop_No']
        return f"{district_block}{sector_block}{stop_block}"
    
    return None

# --- Process: Generate codes for ALL routes from the RTO Excel ---
print("=" * 70)
print("ROUTE CODE RESOLUTION")
print("=" * 70)

# Read all routes from routes.json
with open(ROUTES_JSON, 'r', encoding='utf-8') as f:
    routes = json.load(f)

# Build code map: New_Route_ID -> Route_Code from RTO Excel + freshly computed
code_updates = {}
still_tmp = []

for route in routes:
    rc = route.get('Route_Code', '')
    rid = route.get('New_Route_ID', '')
    rname = route.get('Route_Name', '')
    
    if rc.startswith('TMP-'):
        new_code = generate_code(rname)
        if new_code:
            code_updates[rc] = new_code
            print(f"  RESOLVED: {rc} -> {new_code}  ({rid}: {rname})")
        else:
            still_tmp.append((rc, rid, rname))
            # Try harder with individual words
            origin, dest = extract_origin_dest(rname)
            print(f"  STILL TMP: {rc} ({rid}: {rname})")
            print(f"    origin='{origin}' -> {get_stop_info(origin)}")
            print(f"    dest='{dest}' -> {get_stop_info(dest)}")

print(f"\n--- Summary ---")
print(f"Total routes: {len(routes)}")
print(f"TMP codes resolved: {len(code_updates)}")
print(f"Still unresolved: {len(still_tmp)}")
for rc, rid, rname in still_tmp:
    print(f"  {rc} | {rid} | {rname}")

# --- Apply updates to routes.json ---
updated_count = 0
for route in routes:
    rc = route.get('Route_Code', '')
    if rc in code_updates:
        route['Route_Code'] = code_updates[rc]
        updated_count += 1

with open(ROUTES_JSON, 'w', encoding='utf-8') as f:
    json.dump(routes, f, ensure_ascii=False, indent=2)
print(f"\nUpdated {updated_count} route codes in routes.json")

# --- Apply updates to log.json ---
try:
    with open(LOG_JSON, 'r', encoding='utf-8') as f:
        log_data = json.load(f)
    log_updated = 0
    for entry in log_data:
        rc = entry.get('Route_Code', '')
        if rc in code_updates:
            entry['Route_Code'] = code_updates[rc]
            log_updated += 1
    with open(LOG_JSON, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)
    print(f"Updated {log_updated} route codes in log.json")
except Exception as e:
    print(f"Warning: Could not update log.json: {e}")

# --- Apply updates to GeoJSON ---
try:
    with open(GEOJSON_FILE, 'r', encoding='utf-8') as f:
        geojson = json.load(f)
    geo_updated = 0
    for feature in geojson.get('features', []):
        props = feature.get('properties', {})
        rc = props.get('Route_Code', '')
        if rc in code_updates:
            props['Route_Code'] = code_updates[rc]
            geo_updated += 1
    with open(GEOJSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)
    print(f"Updated {geo_updated} route codes in GeoJSON")
except Exception as e:
    print(f"Warning: Could not update GeoJSON: {e}")

# --- Final verification ---
print(f"\n--- Final verification ---")
with open(ROUTES_JSON, 'r', encoding='utf-8') as f:
    routes_final = json.load(f)
codes = [r.get('Route_Code', '') for r in routes_final]
real = sum(1 for c in codes if c and not c.startswith('TMP-'))
tmp = sum(1 for c in codes if c.startswith('TMP-'))
empty = sum(1 for c in codes if not c)
print(f"Real codes: {real}")
print(f"TMP codes: {tmp}")
print(f"Empty: {empty}")
print(f"Total: {len(routes_final)}")
