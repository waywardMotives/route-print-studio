// Product configuration: themes, fonts, layouts, sizes, formats and map options.
// Everything the customer can choose lives here, so adding or retiring an option is a one-line change.

// map = per-layer map colours (land is the background). casing = outline drawn under light roads.
// ink:true = designed city-print theme: bold, purposeful contrast (its own map colours skip the contrast cap,
// full map strength, road hierarchy with heavy motorways and fine side streets). detail = map detail switched
// to when the theme is picked (customers can still change it).
export const THEMES = {
  midnight:  {name:'Midnight', bg:'#0f1626', pat:'none', patC:'', route:'#f5b83d', rw:4.4, accent:'#f5b83d', text:'#eef2f8', muted:'#8e9ab0', elev:'#eef2f8', elevOp:0.15, rule:'#25314a', ink:true, detail:'detailed',
    map:{water:'#070c18', park:'#14213a', building:'#152036', minor:'#3f4f6c', road:'#a9b8d4', motorway:'#dce4f2', rail:'#34425c'}},
  ink:       {name:'Ink',       bg:'#f6f3ee', pat:'none', patC:'', route:'#c9473a', rw:4.4, accent:'#c9473a', text:'#151515', muted:'#6d6862', elev:'#151515', elevOp:.1, rule:'#ddd7cd', ink:true, detail:'detailed',
    map:{water:'#c9c3ba', park:'#ebe7df', building:'#e4dfd6', minor:'#2e2e2e', road:'#161616', motorway:'#0b0b0b', rail:'#8d8780'}},
  noir:      {name:'Noir',      bg:'#0b0b0b', pat:'none', patC:'', route:'#d9534f', rw:4.4, accent:'#d9534f', text:'#f5f5f2', muted:'#9a9a96', elev:'#f5f5f2', elevOp:.14, rule:'#2a2a2a', ink:true, detail:'detailed',
    map:{water:'#161616', park:'#121212', building:'#171717', minor:'#9d9d9d', road:'#f4f4f4', motorway:'#ffffff', rail:'#6e6e6e'}},
  regatta:   {name:'Regatta', bg:'#f2ede3', pat:'none', patC:'', route:'#e2553a', rw:4.4, accent:'#e2553a', text:'#18213a', muted:'#66697a', elev:'#18213a', elevOp:0.1, rule:'#ddd6c8', ink:true, detail:'detailed',
    map:{water:'#20409a', park:'#e2e6d4', building:'#e7e1d5', minor:'#414c66', road:'#18213a', motorway:'#0f1729', rail:'#7d8496'}},
  terracotta:{name:'Terracotta', bg:'#f6efe3', pat:'none', patC:'', route:'#e0472a', rw:4.4, accent:'#e0472a', text:'#3a2a20', muted:'#806a5a', elev:'#3a2a20', elevOp:0.1, rule:'#e6d9c6', ink:true, detail:'detailed',
    map:{water:'#468397', park:'#c4cfb0', building:'#ece2d2', minor:'#a8927e', road:'#c66f45', motorway:'#b25530', rail:'#9b8b7c'}},
  harbour:   {name:'Harbour',   bg:'#f6f4ef', pat:'none', patC:'', route:'#d24a37', rw:4.4, accent:'#d24a37', text:'#1c2333', muted:'#676b75', elev:'#1c2333', elevOp:.1, rule:'#dedbd3', ink:true, detail:'detailed',
    map:{water:'#1c2333', park:'#e5e9de', building:'#e8e5de', minor:'#3b3e46', road:'#141619', motorway:'#0d0f12', rail:'#8b8d92'}},
  copper:    {name:'Copper',    bg:'#f9f8f6', pat:'none', patC:'', route:'#d64a3c', rw:4.4, accent:'#8a2b12', text:'#2b1a13', muted:'#79685f', elev:'#2b1a13', elevOp:.1, rule:'#e6e1dc', ink:true, detail:'detailed',
    map:{water:'#e6e2df', park:'#f0eeea', building:'#ece9e5', minor:'#5c5c5c', road:'#8a2b12', motorway:'#8a2b12', rail:'#a3a3a3'}},
  sepia:     {name:'Sepia',     bg:'#f2e7d7', pat:'none', patC:'', route:'#3b6e7b', rw:4.4, accent:'#3b6e7b', text:'#3d2b21', muted:'#735f4f', elev:'#3d2b21', elevOp:.11, rule:'#e0d1bb', ink:true, detail:'detailed',
    map:{water:'#d5c5a9', park:'#e7dbc5', building:'#e8dbc7', minor:'#6e5648', road:'#3e2c22', motorway:'#33241b', rail:'#8f7d6b'}},
  graphite:  {name:'Graphite', bg:'#2b2a2f', pat:'none', patC:'', route:'#ff6a2c', rw:4.4, accent:'#ff6a2c', text:'#f2f1ee', muted:'#a3a2a8', elev:'#f2f1ee', elevOp:0.15, rule:'#3d3c42', ink:true, detail:'detailed',
    map:{water:'#1d1c21', park:'#302f34', building:'#323136', minor:'#8e8d95', road:'#e2e1e6', motorway:'#f4f3f7', rail:'#6a6970'}},
  volt:      {name:'Volt', bg:'#15161c', pat:'none', patC:'', route:'#5df08a', rw:4.4, accent:'#5df08a', text:'#eef0f2', muted:'#8f919c', elev:'#eef0f2', elevOp:0.15, rule:'#2a2b33', ink:true, detail:'detailed',
    map:{water:'#0b0c11', park:'#1a1d22', building:'#1b1c22', minor:'#5b5c68', road:'#a9a9b5', motorway:'#c6c6d1', rail:'#4a4b56'}},
  alpine:    {name:'Alpine', bg:'#f1f2ec', pat:'none', patC:'', route:'#d7262b', rw:4.4, accent:'#d7262b', text:'#1a2a22', muted:'#5f6e66', elev:'#1a2a22', elevOp:0.1, rule:'#d9ddd2', ink:true, detail:'detailed',
    map:{water:'#4f86b8', park:'#a3c193', building:'#e3e5dc', minor:'#6b7d72', road:'#20382c', motorway:'#142a1f', rail:'#8c9a90'}},
  riso:      {name:'Riso', bg:'#f5eee2', pat:'none', patC:'', route:'#e8457c', rw:4.4, accent:'#e8457c', text:'#213a8f', muted:'#5163a6', elev:'#213a8f', elevOp:0.1, rule:'#e3d8c8', ink:true, detail:'detailed',
    map:{water:'#f3b4c3', park:'#cbd5ee', building:'#ece3d6', minor:'#8095d1', road:'#2c4fa8', motorway:'#22409a', rail:'#a7b3da'}},
  // Earlier map-first themes
  trail:     {name:'Trail',     bg:'#e5e9d9', pat:'contours', patC:'#c9cfb5', route:'#c4461b', rw:3.6, accent:'#2f3b26', text:'#2b3522', muted:'#68725d', elev:'#2f3b26', elevOp:.13, rule:'#c2c9ad',
    map:{water:'#b4d0d3', park:'#cad9ad', building:'#dbe0cc', minor:'#d2d7c0', road:'#c4caaf', motorway:'#cdb48c', rail:'#bfc5aa'}},
  tangerine: {name:'Tangerine', bg:'#f7efe4', pat:'none', patC:'', route:'#e2522a', rw:3.4, accent:'#1f6f8b', text:'#2a1e17', muted:'#7a6658', elev:'#2a1e17', elevOp:.1, rule:'#e3d5c3',
    map:{water:'#9fd0de', park:'#cfe0a8', building:'#efe1cf', minor:'#ffffff', road:'#ffffff', motorway:'#f6c46a', rail:'#d9c8b4', casing:'#cbae89'}},
  blueprint: {name:'Blueprint', bg:'#173556', pat:'grid',     patC:'#24496f', route:'#ffffff', rw:3,   accent:'#ffcf5c', text:'#eef3f9', muted:'#9cb2cb', elev:'#ffffff', elevOp:.15, rule:'#2f5884',
    map:{water:'#112846', park:'#1b3e5c', building:'#1d3c5f', minor:'#294c73', road:'#3a618e', motorway:'#5079a9', rail:'#3a618e'}},
  lagoon:    {name:'Lagoon',    bg:'#0f3b3d', pat:'none', patC:'', route:'#ffb000', rw:3.4, accent:'#ffb000', text:'#f3ead7', muted:'#9ebab3', elev:'#f3ead7', elevOp:.14, rule:'#23585a',
    map:{water:'#1c6c7b', park:'#1b5143', building:'#134649', minor:'#285e5d', road:'#8f9c7c', motorway:'#d8c58f', rail:'#285e5d'}},
  neon:      {name:'Neon',      bg:'#140f26', pat:'none', patC:'', route:'#2ef2d0', glow:true, rw:3.2, accent:'#ff4fa3', text:'#f5f0ff', muted:'#9b90c4', elev:'#f5f0ff', elevOp:.14, rule:'#2b2350',
    map:{water:'#1b2552', park:'#172d2b', building:'#1c1737', minor:'#33265f', road:'#56399d', motorway:'#ff4fa3', rail:'#33265f'}},
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
