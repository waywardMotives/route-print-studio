# Route Print Studio

The product configurator for our race-route prints. Customers upload a GPX, TCX or FIT file, pick a
theme, colours, fonts, layout, size and format, and see the print on a wall with a live street map behind
the route.

It is a plain static website: no build step, no server code, no npm install. The map engine
(MapLibre GL JS 4.7.1, BSD licence) loads from the jsDelivr CDN, pinned to that exact version. Everything that gets
published lives in `public/`. It is hosted on Cloudflare Workers (static assets), configured by
`wrangler.jsonc`; see `docs/DEPLOY.md`.

## Folder structure

```
wrangler.jsonc          Cloudflare config: publish the ./public folder
public/                 Everything below is the website itself
index.html              The page
css/app.css             Page styling
js/main.js              Configurator UI: customer choices, redraws, map sync
js/core/config.js       Every option customers can pick: themes, presets, fonts, layouts, sizes, map settings
js/core/color.js        Colour maths + guardrails (readable text, visible route, printable colours)
js/core/theme.js        Combines a theme with custom background/accent colours
js/core/parse.js        GPX / TCX / FIT file readers
js/core/geo.js          Distance, elevation, line simplification, map projection, formatting
js/core/poster.js       Draws the poster as SVG (no browser APIs, so the print server can reuse it)
js/map/style.js         Generates the map style from the poster colours
js/map/preview.js       The live map behind the preview, aligned exactly to the route
docs/DEPLOY.md          Step-by-step: put the site online
```

## Common changes

| To change | Edit |
|---|---|
| Add or remove a theme, colour preset, font, size or format | `public/js/core/config.js` |
| How strong the map looks, which map features show | `public/js/map/style.js` |
| Colour guardrail thresholds | `public/js/core/color.js` |
| Poster layouts | `public/js/core/poster.js` |

## How the map works

- Map data: OpenStreetMap, served as vector tiles by OpenFreeMap (free, commercial use allowed, no API key).
  Licence: every print shows "© OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap"; the website shows
  the same credit with links under the preview.
- The map is always rendered at the poster's own size (1000 px wide) and scaled down to fit the screen,
  so the zoom level depends on the route, not the visitor's screen. The preview therefore matches the print.
- The print server (next phase) renders the same style at the same 1000 px size with a pixel ratio of ~8–12
  to reach 300 dpi, then lays the SVG poster on top and exports a PDF.
- At marathon scale (zoom ~11–12) the map shows main roads, water and parks; local streets appear for
  shorter routes (zoom 13+). That's how the OpenMapTiles data is organised and it keeps big posters calm.

### Self-hosting the map data (before launch)

OpenFreeMap's public servers are donation-funded with no uptime guarantee. Before taking real orders:
1. Download the OpenFreeMap planet file (MBTiles) and convert it to a single PMTiles file with the `pmtiles` tool.
2. Upload it to Cloudflare R2 and serve it with the Protomaps Cloudflare Worker.
3. Change `MAP_SOURCE.url` in `public/js/core/config.js`. The schema stays the same, so no style changes are needed.

## Run it on your own computer

Browsers block modern JavaScript modules when a page is opened straight from disk, so serve the folder:

```
cd route-print-studio/public
python3 -m http.server 8000
```

Then open http://localhost:8000.
