import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Pinned source snapshot; only the Dong Nai subset is downloaded.
const revision = '8b78ba5118715e1fa81769286724db79346abf52';
const repository = 'thanglequoc/vietnamese-provinces-database';
const raw = `https://raw.githubusercontent.com/${repository}/${revision}/`;
const folder = 'dataset-generation-scripts/resources/gis/geojson_11Mar2026/28_tinh_đong_nai/wards/';
const cache = resolve('tmp/dong-nai-source');
await mkdir(cache, { recursive: true });
async function json(url, key) {
  const file = resolve(cache, key);
  try { return JSON.parse(await readFile(file, 'utf8')); } catch {}
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const value = await response.json();
  await writeFile(file, JSON.stringify(value));
  return value;
}
const tree = await json(`https://api.github.com/repos/${repository}/git/trees/${revision}?recursive=1`, 'tree.json');
const files = tree.tree.filter(file => file.path.startsWith(folder) && file.path.endsWith('.geojson'));
const units = await json(raw + 'json/simplified_json_generated_data_vn_units.json', 'units.json');
const wards = units.find(unit => unit.Code === '75').Wards;
if (files.length !== 95 || wards.length !== 95) throw new Error('Expected 95 administrative areas.');
const normalize = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
const records = [];
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < files.length) {
    const file = files[cursor++];
    const filename = file.path.split('/').at(-1);
    const data = await json(raw + file.path, filename);
    const rings = data.features.flatMap(feature => {
      if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates;
      if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates.flat();
      throw new Error('Unsupported geometry');
    });
    const name = filename.replace(/^\d+_/, '').replace(/_(xa|phuong)\.geojson$/, '');
    const candidates = wards.filter(ward => normalize(ward.Name) === normalize(name));
    records.push({ filename, rings, candidates });
  }
}));
// The source sanitizer drops "quan" and tone marks. Explicitly resolve four
// filenames: Định Quán, Tân Quan, Lộc Thành (south), Lộc Thạnh (Hoa Lư, north).
const filenameCodes = { '24_đinh_xa.geojson': '26206', '74_tan_xa.geojson': '25351',
  '38_loc_thanh_xa.geojson': '25294', '39_loc_thanh_xa.geojson': '25280' };
const upgraded = new Set(['25270', '25357', '25363', '26116', '26170',
  '26248', '26326', '26368', '26425', '26485']);
let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
for (const record of records) for (const ring of record.rings) for (const [lon, lat] of ring) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error('Invalid coordinate');
  west = Math.min(west, lon); east = Math.max(east, lon);
  south = Math.min(south, lat); north = Math.max(north, lat);
}
const longitudeScale = Math.cos((north + south) / 2 * Math.PI / 180);
const width = (east - west) * longitudeScale, height = north - south;
const scale = 800 / Math.max(width, height);
const offsetX = (900 - width * scale) / 2, offsetY = (900 - height * scale) / 2;
const project = ([lon, lat]) => [
  Math.round(((lon - west) * longitudeScale * scale + offsetX) * 5) / 5,
  Math.round(((north - lat) * scale + offsetY) * 5) / 5,
];
const regions = records.map(record => {
  const override = filenameCodes[record.filename];
  const ward = override ? wards.find(w => w.Code === override) :
    record.candidates.length === 1 ? record.candidates[0] : undefined;
  if (!ward) throw new Error(`Unresolved administrative name: ${record.filename}`);
  const rings = record.rings.map(ring => {
    const points = ring.map(project);
    return points.filter((p, index) => index === 0 || p[0] !== points[index - 1][0] || p[1] !== points[index - 1][1]);
  }).filter(ring => ring.length >= 4);
  const points = rings.flat();
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { id: ward.Code, name: ward.Name,
    type: upgraded.has(ward.Code) || ward.FullName.startsWith('Phường ') ? 'Phường' : 'Xã',
    path: rings.map(ring => 'M' + ring.map(p => p.join(',')).join('L') + 'Z').join(''),
    cx: +(0.5 * (minX + maxX)).toFixed(1), cy: +(0.5 * (minY + maxY)).toFixed(1),
    bounds: [minX, minY, maxX, maxY], sourceFile: record.filename };
}).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
if (new Set(regions.map(r => r.id)).size !== 95 || regions.filter(r => r.type === 'Phường').length !== 33) {
  throw new Error('Administrative count or mapping mismatch');
}
const asset = { viewBox: '0 0 900 900', updatedAt: '2026-04-30', boundaryDate: '2026-03-13',
  sourceUrl: `https://github.com/${repository}/tree/${revision}/dataset-generation-scripts/resources/gis/geojson_11Mar2026`,
  attribution: 'Boundary source: Bando.com.vn, archived by thanglequoc/vietnamese-provinces-database. Reference geometry, not a cadastral survey.',
  regions };
await mkdir(resolve('public/maps'), { recursive: true });
await writeFile(resolve('public/maps/dong-nai.json'), JSON.stringify(asset));
console.log(`Generated ${regions.length} regions (33 wards / 62 communes), ${JSON.stringify(asset).length} characters.`);
