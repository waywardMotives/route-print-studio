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
js/map/geocode.js       Suggests the Location from the route's start point (OpenStreetMap Nominatim)
js/export/printfile.js  300 dpi print file export (internal, ?print)
docs/DEPLOY.md          Step-by-step: put the site online
```

## Common changes

| To change | Edit |
|---|---|
| Add or remove a theme, colour preset, font, size or format | `public/js/core/config.js` |
| How strong the map looks, which map features show | `public/js/map/style.js` |
| Colour guardrail thresholds | `public/js/core/color.js` |
| Poster layouts (mirroring the Figma "Layout components") | `public/js/core/poster.js` |
| Map palette of a theme | `map` of that theme in `public/js/core/config.js` |

## How the map works

- Each theme has a map palette (`map` in `config.js`): land, water, parks, buildings, minor/major roads,
  motorways, rail, and an optional road casing for light "printed city map" themes. Customers can recolour
  water, parks, roads and buildings; `core/theme.js` guards those choices (no neon, layers can't outshine the
  route). "Map strength" sets how strongly the palette is applied over the land colour.
- Map data: OpenStreetMap, served as vector tiles by OpenFreeMap (free, commercial use allowed, no API key).
  Licence: every print shows "© OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap"; the website shows
  the same credit with links under the preview.
- The map is always rendered at the poster's own size (1000 px wide) and scaled down to fit the screen,
  so the zoom level depends on the route, not the visitor's screen. The preview therefore matches the print.
- The print server (next phase) renders the same style at the same 1000 px size with a pixel ratio of ~8–12
  to reach 300 dpi, then lays the SVG poster on top and exports a PDF.
- OpenMapTiles only carries local streets from zoom 13, and a marathon poster sits around zoom 11–12. So the
  map detail setting also sets a render scale `k` (`MAP_DETAILS` in `config.js`): Minimal 1, Streets 2,
  Detailed 4. The map is drawn k× larger (zoom + log2 k) and shrunk back by 1/k, with line widths corrected
  in `map/style.js`, so lines look identical but the map pulls 1–2 zoom levels more street data. The print
  server must use the same k: render at (1000·k) px wide with pixel ratio / k.
- Designed "ink" themes (`ink:true`: Midnight, Ink, Noir, Regatta, Terracotta, Harbour, Copper, Sepia, Graphite,
  Volt, Alpine, Riso) are the house standard: bold, purposeful contrast. Their own map colours skip the contrast
  cap, Balanced uses full colour, roads follow a hierarchy (heavy motorways, fine side streets), and picking one
  switches the map to Detailed. The route keeps a background-coloured outline so it reads over any layer.
  Customer colour overrides on these themes are still guarded.

### Self-hosting the map data (before launch)

OpenFreeMap's public servers are donation-funded with no uptime guarantee. Before taking real orders:
1. Download the OpenFreeMap planet file (MBTiles) and convert it to a single PMTiles file with the `pmtiles` tool.
2. Upload it to Cloudflare R2 and serve it with the Protomaps Cloudflare Worker.
3. Change `MAP_SOURCE.url` in `public/js/core/config.js`. The schema stays the same, so no style changes are needed.

## Autofill from the uploaded file

- From the file: event name (GPX/TCX track name, else the file name), date and finish time, sport (FIT
  multisport → Triathlon), athlete name when present (GPX `metadata/author/name`, FIT user profile; most
  Strava/Garmin exports don't include it).
- Location: the route's start point is reverse geocoded with OpenStreetMap Nominatim ("Tallinn, Estonia").
  Nominatim allows ~1 request/second and light use; before heavy traffic, point `NOMINATIM` in
  `js/map/geocode.js` at a hosted provider (LocationIQ/Geoapify use the same format).
- Fields the customer has typed are never overwritten.

## Print files (internal)

Open the site with `?print` at the end of the address (e.g. `https://…workers.dev/?print`). The Print tab then
shows **Download print file**: it renders the current design at 300 dpi for the selected size and saves a JPEG
(50×70 cm + 4 mm bleed on every side = 6,000 × 8,362 px, the print area Gelato expects). Use desktop Chrome; very large sizes exceed Safari's canvas limits.

How it works (`js/export/printfile.js`): a hidden map renders the same style at print resolution in tiles that are
stitched together, then the poster SVG is drawn on top with its Google Fonts embedded. The print server will
reuse the same approach. Customers never see the button.

## Run it on your own computer

Browsers block modern JavaScript modules when a page is opened straight from disk, so serve the folder:

```
cd route-print-studio/public
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Ordering: saved designs and the Shopify cart

Pressing **Add to cart** (Print tab) does two things:

1. **Saves the design.** The settings and the route points are sent to `POST /api/designs`, which stores them
   (gzip-compressed) in the Cloudflare KV namespace `route-print-studio-designs` and returns a 12-character ID.
2. **Hands over to Shopify.** The browser goes to `https://<shop>/cart/add` with the matching product variant
   and these details on the cart line: Design (the event name), Orientation, Border, plus two for us:
   `_Design ID` and `_Print file` (a link that reopens the design with the print-file tool).

**Fulfilling an order:** open the order in the Shopify admin, click the `_Print file` link on the line item,
press *Download print file*, and upload that file to Gelato.

**Reopening a design:** `/?design=<id>` shows exactly what the customer saw. Uploaded points are rounded once,
on upload, to the stored precision, so the preview and the saved copy are built from the same numbers.
Nothing in a saved design is trusted when it is opened: unknown options fall back to the defaults, colours
must be plain hex, text is cut to the field lengths.

**Prices** are shown per delivery country: Germany has its own tier, every other EU country the `eu` tier.
`GET /api/context` returns the visitor's country. Shopify is the source of truth and charges by the delivery
address at checkout; the price table, variant IDs, shop domain and shipping rule shown here live in the
"Shop" block at the end of `public/js/core/config.js` and must be kept in step with Shopify by hand.

The server code is `src/worker.js`. It only runs for `/api/*`; everything else is served straight from `public/`.

