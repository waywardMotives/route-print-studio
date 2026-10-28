// Product configuration: themes, fonts, layouts, sizes, formats and map options.
// Everything the customer can choose lives here, so adding or retiring an option is a one-line change.

// map = per-layer map colours (land is the background). casing = outline drawn under light roads.
export const THEMES = {
  midnight:  {name:'Midnight',  bg:'#0e131d', pat:'none',     patC:'',        route:'#f4efe6', glow:true, rw:3.2, accent:'#f2b134', text:'#f4efe6', muted:'#8790a3', elev:'#f4efe6', elevOp:.16, rule:'#2a3242',
    map:{water:'#1b2b45', park:'#15261f', building:'#171e2b', minor:'#222b3b', road:'#2d384d', motorway:'#3c4860', rail:'#2d384d'}},
  paper:     {name:'Paper',     bg:'#f4f4f0', pat:'none',     patC:'',        route:'#15171c', rw:2.8, accent:'#d6402f', text:'#15171c', muted:'#6e7179', elev:'#15171c', elevOp:.09, rule:'#d5d5ce',
    map:{water:'#dde5ea', park:'#e5e9da', building:'#eaeae4', minor:'#dcdcd5', road:'#cfcfc7', motorway:'#c1c1b8', rail:'#cfcfc7'}},
  trail:     {name:'Trail',     bg:'#e5e9d9', pat:'contours', patC:'#c9cfb5', route:'#c4461b', rw:3.6, accent:'#2f3b26', text:'#2b3522', muted:'#68725d', elev:'#2f3b26', elevOp:.13, rule:'#c2c9ad',
    map:{water:'#b4d0d3', park:'#cad9ad', building:'#dbe0cc', minor:'#d2d7c0', road:'#c4caaf', motorway:'#cdb48c', rail:'#bfc5aa'}},
  blueprint: {name:'Blueprint', bg:'#173556', pat:'grid',     patC:'#24496f', route:'#ffffff', rw:3,   accent:'#ffcf5c', text:'#eef3f9', muted:'#9cb2cb', elev:'#ffffff', elevOp:.15, rule:'#2f5884',
    map:{water:'#112846', park:'#1b3e5c', building:'#1d3c5f', minor:'#294c73', road:'#3a618e', motorway:'#5079a9', rail:'#3a618e'}},
  coastal:   {name:'Coastal',   bg:'#dce7ec', pat:'dots',     patC:'#b8cbd5', route:'#0c3b5e', rw:3.2, accent:'#e76f51', text:'#0c3b5e', muted:'#5a7889', elev:'#0c3b5e', elevOp:.11, rule:'#b8cbd5',
    map:{water:'#a6c7db', park:'#cde0d2', building:'#d2dfe5', minor:'#c4d4dc', road:'#b2c6d0', motorway:'#9db5c1', rail:'#b2c6d0'}},
  // Colourful, map-first themes
  tangerine: {name:'Tangerine', bg:'#f7efe4', pat:'none', patC:'', route:'#e2522a', rw:3.4, accent:'#1f6f8b', text:'#2a1e17', muted:'#7a6658', elev:'#2a1e17', elevOp:.1, rule:'#e3d5c3',
    map:{water:'#9fd0de', park:'#cfe0a8', building:'#efe1cf', minor:'#ffffff', road:'#ffffff', motorway:'#f6c46a', rail:'#d9c8b4', casing:'#cbae89'}},
  alpine:    {name:'Alpine',    bg:'#eef1ea', pat:'none', patC:'', route:'#d62828', rw:3.4, accent:'#1d3557', text:'#1d2a24', muted:'#5f6e66', elev:'#1d2a24', elevOp:.1, rule:'#d4dbce',
    map:{water:'#8fbce0', park:'#b4d3a2', building:'#e1e5db', minor:'#ffffff', road:'#ffffff', motorway:'#f2cf6b', rail:'#c9cfc3', casing:'#acb8a2'}},
  riso:      {name:'Riso',      bg:'#f3e9df', pat:'none', patC:'', route:'#ff4a3d', rw:3.4, accent:'#1f2a5a', text:'#1f2a5a', muted:'#5f6488', elev:'#1f2a5a', elevOp:.1, rule:'#e3d3c4',
    map:{water:'#5c86c8', park:'#f4b6a6', building:'#eadacb', minor:'#ffffff', road:'#ffffff', motorway:'#f2c14e', rail:'#d8c4b3', casing:'#c8a78d'}},
  lagoon:    {name:'Lagoon',    bg:'#0f3b3d', pat:'none', patC:'', route:'#ffb000', rw:3.4, accent:'#ffb000', text:'#f3ead7', muted:'#9ebab3', elev:'#f3ead7', elevOp:.14, rule:'#23585a',
    map:{water:'#1c6c7b', park:'#1b5143', building:'#134649', minor:'#285e5d', road:'#8f9c7c', motorway:'#d8c58f', rail:'#285e5d'}},
  neon:      {name:'Neon',      bg:'#140f26', pat:'none', patC:'', route:'#2ef2d0', glow:true, rw:3.2, accent:'#ff4fa3', text:'#f5f0ff', muted:'#9b90c4', elev:'#f5f0ff', elevOp:.14, rule:'#2b2350',
    map:{water:'#1b2552', park:'#172d2b', building:'#1c1737', minor:'#33265f', road:'#56399d', motorway:'#ff4fa3', rail:'#33265f'}},
  // Ink themes: classic city-map prints with crisp, high-contrast streets (ink:true lifts the contrast cap
  // on the theme's own map colours, uses full map strength and slightly heavier roads; rail is shown).
  // detail = map detail switched to when the theme is picked (customers can still change it).
  ink:       {name:'Ink',       bg:'#f6f3ee', pat:'none', patC:'', route:'#c9473a', rw:4.4, accent:'#c9473a', text:'#151515', muted:'#6d6862', elev:'#151515', elevOp:.1, rule:'#ddd7cd', ink:true, detail:'detailed',
    map:{water:'#c9c3ba', park:'#ebe7df', building:'#e4dfd6', minor:'#2e2e2e', road:'#161616', motorway:'#0b0b0b', rail:'#8d8780'}},
  noir:      {name:'Noir',      bg:'#0b0b0b', pat:'none', patC:'', route:'#d9534f', rw:4.4, accent:'#d9534f', text:'#f5f5f2', muted:'#9a9a96', elev:'#f5f5f2', elevOp:.14, rule:'#2a2a2a', ink:true, detail:'detailed',
    map:{water:'#161616', park:'#121212', building:'#171717', minor:'#9d9d9d', road:'#f4f4f4', motorway:'#ffffff', rail:'#6e6e6e'}},
  copper:    {name:'Copper',    bg:'#f9f8f6', pat:'none', patC:'', route:'#d64a3c', rw:4.4, accent:'#8a2b12', text:'#2b1a13', muted:'#79685f', elev:'#2b1a13', elevOp:.1, rule:'#e6e1dc', ink:true, detail:'detailed',
    map:{water:'#e6e2df', park:'#f0eeea', building:'#ece9e5', minor:'#5c5c5c', road:'#8a2b12', motorway:'#8a2b12', rail:'#a3a3a3'}},
  sepia:     {name:'Sepia',     bg:'#f2e7d7', pat:'none', patC:'', route:'#3b6e7b', rw:4.4, accent:'#3b6e7b', text:'#3d2b21', muted:'#7b6656', elev:'#3d2b21', elevOp:.11, rule:'#e0d1bb', ink:true, detail:'detailed',
    map:{water:'#d5c5a9', park:'#e7dbc5', building:'#e8dbc7', minor:'#6e5648', road:'#3e2c22', motorway:'#33241b', rail:'#8f7d6b'}},
  harbour:   {name:'Harbour',   bg:'#f6f4ef', pat:'none', patC:'', route:'#d24a37', rw:4.4, accent:'#d24a37', text:'#1c2333', muted:'#676b75', elev:'#1c2333', elevOp:.1, rule:'#dedbd3', ink:true, detail:'detailed',
    map:{water:'#1c2333', park:'#e5e9de', building:'#e8e5de', minor:'#3b3e46', road:'#141619', motorway:'#0d0f12', rail:'#8b8d92'}},
};

export const BG_PRESETS = [
  {name:'Ink',hex:'#0e131d'},{name:'Charcoal',hex:'#1f2124'},{name:'Forest',hex:'#1c2a21'},{name:'Navy',hex:'#173556'},{name:'Burgundy',hex:'#3b1a22'},
  {name:'Paper',hex:'#f4f4f0'},{name:'Sand',hex:'#ece4d6'},{name:'Sage',hex:'#e5e9d9'},{name:'Mist',hex:'#dce7ec'},{name:'Blush',hex:'#f3e3df'}];

export const ACCENT_PRESETS = [
  {name:'Signal red',hex:'#d6402f'},{name:'Ember',hex:'#e76f51'},{name:'Saffron',hex:'#f2b134'},{name:'Moss',hex:'#4f7a3a'},{name:'Teal',hex:'#1f8a8a'},
  {name:'Cobalt',hex:'#2f5fd0'},{name:'Violet',hex:'#6b4fbf'},{name:'Rose',hex:'#d4577b'},{name:'Ink',hex:'#15171c'},{name:'Chalk',hex:'#f4efe6'}];

// heavy = big titles and the distance figure, bold = secondary headings.
// scale = how much bigger the font can be set than Montserrat in the same space (condensed faces > 1).
export const HEAD_FONTS = [
  {id:'montserrat', name:'Montserrat',      f:'Montserrat,"Helvetica Neue",Arial,sans-serif',             heavy:800, bold:700, scale:1},
  {id:'shoulders', name:'Big Shoulders',    f:'"Big Shoulders Display","Arial Narrow",Impact,sans-serif', heavy:800, bold:700, scale:1.6},
  {id:'barlowc',   name:'Barlow Condensed', f:'"Barlow Condensed","Arial Narrow",sans-serif',            heavy:800, bold:700, scale:1.4},
  {id:'oswald',    name:'Oswald',           f:'Oswald,"Arial Narrow",sans-serif',                         heavy:700, bold:600, scale:1.35},
  {id:'archivo',   name:'Archivo',          f:'Archivo,"Helvetica Neue",Arial,sans-serif',                heavy:800, bold:700, scale:1.08},
  {id:'playfair',  name:'Playfair',         f:'"Playfair Display",Georgia,serif',                         heavy:800, bold:700, scale:1.12},
  {id:'fraunces',  name:'Fraunces',         f:'Fraunces,Georgia,serif',                                   heavy:800, bold:700, scale:1.08},
];

// stat = numbers, label = small caps labels and subtitle. wv/wl = their weights.
export const DETAIL_FONTS = [
  {id:'plex',      name:'Plex Mono + Figtree', stat:'"IBM Plex Mono",ui-monospace,monospace',  label:'Figtree,system-ui,sans-serif',             wv:500, wl:600},
  {id:'jetbrains', name:'JetBrains Mono',      stat:'"JetBrains Mono",ui-monospace,monospace', label:'"JetBrains Mono",ui-monospace,monospace',  wv:500, wl:600},
  {id:'dmmono',    name:'DM Mono',             stat:'"DM Mono",ui-monospace,monospace',        label:'"DM Mono",ui-monospace,monospace',         wv:500, wl:500},
  {id:'figtree',   name:'Figtree',             stat:'Figtree,system-ui,sans-serif',            label:'Figtree,system-ui,sans-serif',             wv:600, wl:600},
  {id:'barlow',    name:'Barlow',              stat:'Barlow,system-ui,sans-serif',             label:'Barlow,system-ui,sans-serif',              wv:500, wl:600},
];

export const LAYOUTS = [{id:'classic',name:'Classic'},{id:'foundation',name:'Foundation'},{id:'statement',name:'Statement'},{id:'minimal',name:'Minimal'},{id:'tile',name:'Gallery tile'}];

export const SIZES = [
  {id:'20x20',name:'20×20',w:20,h:20},{id:'30x30',name:'30×30',w:30,h:30},{id:'40x40',name:'40×40',w:40,h:40},{id:'50x50',name:'50×50',w:50,h:50},
  {id:'a4',name:'A4',w:21,h:29.7},{id:'30x40',name:'30×40',w:30,h:40},{id:'a3',name:'A3',w:29.7,h:42},
  {id:'50x70',name:'50×70',w:50,h:70},{id:'70x100',name:'70×100',w:70,h:100}];

// Orientation decides which sizes are offered: square sizes for Square, the rest for Portrait/Landscape.
// Gallery tiles are always square.
export const ORIENTS = [{id:'portrait',name:'Portrait'},{id:'landscape',name:'Landscape'},{id:'square',name:'Square'}];
export const SQUARE_ONLY_LAYOUTS = ['tile'];

export const FORMATS = [{id:'poster',name:'Poster'},{id:'framed',name:'Framed'},{id:'canvas',name:'Canvas'}];
export const FRAMES = [{id:'black',name:'Black',c:'#1b1b1d'},{id:'white',name:'White',c:'#f1f0ec'},{id:'oak',name:'Oak',c:'linear-gradient(135deg,#c99d66,#a77843 50%,#c59860)'}];
export const SPORTS = [{id:'run',name:'Run'},{id:'ride',name:'Ride'},{id:'swim',name:'Swim'},{id:'tri',name:'Triathlon'},{id:'hike',name:'Hike'}];

// ---------- Map ----------
// OpenFreeMap serves OpenStreetMap vector tiles in the OpenMapTiles schema, free and keyless.
// Production: swap `url` for our own copy (see README, "Self-hosting the map data").
export const MAP_SOURCE = {
  url: 'https://tiles.openfreemap.org/planet',
  attribution: '© OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap',
};
// k = render scale: the map is drawn k× larger and scaled down, which loads one zoom level more street data
// (OpenMapTiles only carries local streets from zoom 13) while line widths are corrected to look the same.
export const MAP_DETAILS = [{id:'minimal',name:'Minimal',k:1},{id:'streets',name:'Streets',k:2},{id:'detailed',name:'Detailed',k:4}];
// v = tint strength for themes without a palette; p = how far palette colours are applied (1 = full colour).
export const MAP_STRENGTHS = [{id:'subtle',name:'Subtle',v:.6,p:.5},{id:'balanced',name:'Balanced',v:1,p:.8},{id:'bold',name:'Bold',v:1.5,p:1}];
// Map layers customers can recolour.
export const MAP_LAYERS = [{id:'water',name:'Water'},{id:'park',name:'Parks'},{id:'road',name:'Roads'},{id:'building',name:'Buildings'}];
