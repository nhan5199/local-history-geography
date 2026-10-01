# Interactive Đồng Nai map

Open `/map` (the **Bản đồ Đồng Nai** navigation link). The map is a centered
full-window canvas with search at the top-right and zoom controls at the
bottom-left. The top-left icon rail expands into a floating menu for lessons,
search and returning to the full map. Outside click or Escape closes it. On
narrow screens search temporarily hides while the menu is expanded to avoid
overlap. Drag the map to pan; zoom with
the mouse wheel or the +/− controls. Search accepts Vietnamese with or without
accents. Its dropdown opens on focus/click and shows up to ten rows at a time,
with scrolling for additional matches. Selecting a result closes the dropdown,
highlights the area, and smoothly fits its bounds into view.

Each xã/phường remains a separate SVG region with thin outlines that keep their
screen width while zooming. Clicking or tapping a region shows a compact info
card; it never covers the map with a modal. Keyboard access and reduced-motion
preferences are supported. Search selection keeps the map visible and shows
the selected name in the same compact card.
Mouse selection does not show a rectangular SVG focus outline or a heavy
selected boundary; keyboard focus remains indicated by the region's stroke.

Hovering an area with a mouse or pen shows a cursor-adjacent card with its name,
image and introduction. It flips/clamps inside the visible map and disappears
on leave, drag, zoom, scrolling, or Escape. Touch input keeps tap selection.

By default each image is a thumbnail generated from that area's actual boundary,
explicitly labeled as a diagram; no local photographs have been supplied yet.
The introduction identifies the administrative unit without inventing local
history or landmarks. Add curated content in `AREA_PROFILES` in
`src/app/features/map/components/area-preview/area-preview.ts`, keyed by administrative code:

```ts
'26068': {
  description: 'Your verified introduction to Biên Hòa.',
  imageUrl: '/images/bien-hoa.jpg', // local file or Firebase Storage download URL
  imageAlt: 'Describe the actual image here',
},
```

The sample URL above is illustrative, not a bundled photo. Broken photo URLs
fall back to the boundary thumbnail with its matching caption and alt text.

## Administrative snapshot

The names/types reflect **30 April 2026**: Thành phố Đồng Nai, **95 units**, of
which **33 are phường** and **62 are xã**. Former districts are not presented as
current administrative units. The extent includes the former Bình Phước and
Đồng Nai provinces.

- [Resolution 30/2026/QH16](https://vanban.chinhphu.vn/?classid=1&docid=218009&orggroupid=1&pageid=27160)
  establishes the city over the unchanged provincial extent.
- [Đồng Nai administrative-reform announcement](https://caicachhanhchinh.dongnai.gov.vn/Pages/newsdetail.aspx?CatId=97&NewsId=1689)
  describes the ten new wards, unchanged territorial extents, effective date,
  and resulting counts.

## Geometry and attribution

`public/maps/dong-nai.json` is a local, projected derivative of the 95 GeoJSON
files in [vietnamese-provinces-database's March 2026 GIS archive](https://github.com/thanglequoc/vietnamese-provinces-database/tree/8b78ba5118715e1fa81769286724db79346abf52/dataset-generation-scripts/resources/gis/geojson_11Mar2026).
The archive identifies **Bando.com.vn** as its original geometry source and
records retrieval on 13 March 2026. Its GIS README refers to the publisher's
usage terms; the repository's MIT code license is not asserted here as a
separate license for that underlying map data.

These are reference boundaries for the learning interface, not an official
cadastral survey. Popup content does not invent population, area, or landmarks.
Geometry has not been surveyed or independently certified by this project.

The generator uses a local equirectangular projection corrected for longitude
scale at the midpoint latitude, with north up, fits the result into 900×900,
and rounds coordinates to 0.2 SVG units. Polygon rings are retained, including
holes; render with `fill-rule="evenodd"`. Display enlargement is temporary and
does not modify the stored geometry.

Administrative labels/codes come from the same pinned repository's structured
unit dataset. Ten ward types are updated from the April resolution. Four source
filename ambiguities have explicit code mappings: Định Quán (26206), Tân Quan
(25351), Lộc Thành (25294, southern polygon), Lộc Thạnh (25280, northern Hoa Lư
border polygon). The source filename is retained with each region for auditing.

## Refreshing the data

```powershell
node scripts/generate-dong-nai-map.mjs
node scripts/validate-dong-nai-map.mjs
```

The generator downloads only Đồng Nai from a pinned source commit and caches
source files under ignored `tmp/dong-nai-source`. It checks all 95 distinct
administrative codes and 33 ward classifications before writing the asset.
To adopt a later reorganization, update the source revision, explicit mappings,
status overrides, snapshot dates and validation assertions together after
checking the corresponding official decision.

The Angular page fetches this asset only when visited; it needs no map API key,
third-party tile requests, Firebase writes, or new runtime dependencies.
