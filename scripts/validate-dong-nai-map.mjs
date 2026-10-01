import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const map = JSON.parse(await readFile(new URL('../public/maps/dong-nai.json', import.meta.url), 'utf8'));
assert.equal(map.viewBox, '0 0 900 900');
assert.equal(map.regions.length, 95);
assert.equal(new Set(map.regions.map(region => region.id)).size, 95);
assert.equal(new Set(map.regions.map(region => region.path)).size, 95);
assert.equal(map.regions.filter(region => region.type === 'Phường').length, 33);
assert.equal(map.regions.filter(region => region.type === 'Xã').length, 62);
for (const region of map.regions) {
  assert.match(region.id, /^\d{5}$/);
  assert.ok(region.name.length > 0);
  assert.match(region.path, /^M[\d.,LMZ]+Z$/);
  assert.ok(region.cx > 0 && region.cx < 900 && region.cy > 0 && region.cy < 900);
  assert.ok(region.bounds.every(value => Number.isFinite(value) && value >= 49 && value <= 851));
  assert.ok(region.bounds[0] < region.bounds[2] && region.bounds[1] < region.bounds[3]);
}
const find = id => map.regions.find(region => region.id === id);
assert.equal(find('26206').name, 'Định Quán');
assert.equal(find('25351').name, 'Tân Quan');
assert.equal(find('25280').name, 'Lộc Thạnh');
assert.equal(find('25294').name, 'Lộc Thành');
assert.ok(find('25280').cy < find('25294').cy);
for (const id of ['25270', '25357', '25363', '26116', '26170', '26248', '26326', '26368', '26425', '26485']) {
  assert.equal(find(id).type, 'Phường');
}
console.log('Map checks passed: 95 unique geometries/codes, 33 wards, 62 communes, projected bounds and name overrides.');
