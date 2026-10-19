// Product configuration: themes, fonts, layouts, sizes, formats and map options.
// Everything the customer can choose lives here, so adding or retiring an option is a one-line change.

export const THEMES = {
  midnight:  {name:'Midnight',  bg:'#0e131d', pat:'none',     patC:'',        route:'#f4efe6', glow:true, rw:3.2, accent:'#f2b134', text:'#f4efe6', muted:'#8790a3', elev:'#f4efe6', elevOp:.16, rule:'#2a3242'},
  paper:     {name:'Paper',     bg:'#f4f4f0', pat:'none',     patC:'',        route:'#15171c', rw:2.8, accent:'#d6402f', text:'#15171c', muted:'#6e7179', elev:'#15171c', elevOp:.09, rule:'#d5d5ce'},
  trail:     {name:'Trail',     bg:'#e5e9d9', pat:'contours', patC:'#c9cfb5', route:'#c4461b', rw:3.6, accent:'#2f3b26', text:'#2b3522', muted:'#68725d', elev:'#2f3b26', elevOp:.13, rule:'#c2c9ad'},
  blueprint: {name:'Blueprint', bg:'#173556', pat:'grid',     patC:'#24496f', route:'#ffffff', rw:3,   accent:'#ffcf5c', text:'#eef3f9', muted:'#9cb2cb', elev:'#ffffff', elevOp:.15, rule:'#2f5884'},
  coastal:   {name:'Coastal',   bg:'#dce7ec', pat:'dots',     patC:'#b8cbd5', route:'#0c3b5e', rw:3.2, accent:'#e76f51', text:'#0c3b5e', muted:'#5a7889', elev:'#0c3b5e', elevOp:.11, rule:'#b8cbd5'},
};

export const BG_PRESETS = [
  {name:'Ink',hex:'#0e131d'},{name:'Charcoal',hex:'#1f2124'},{name:'Forest',hex:'#1c2a21'},{name:'Navy',hex:'#173556'},{name:'Burgundy',hex:'#3b1a22'},
  {name:'Paper',hex:'#f4f4f0'},{name:'Sand',hex:'#ece4d6'},{name:'Sage',hex:'#e5e9d9'},{name:'Mist',hex:'#dce7ec'},{name:'Blush',hex:'#f3e3df'}];

export const ACCENT_PRESETS = [
  {name:'Signal red',hex:'#d6402f'},{name:'Ember',hex:'#e76f51'},{name:'Saffron',hex:'#f2b134'},{name:'Moss',hex:'#4f7a3a'},{name:'Teal',hex:'#1f8a8a'},
  {name:'Cobalt',hex:'#2f5fd0'},{name:'Violet',hex:'#6b4fbf'},{name:'Rose',hex:'#d4577b'},{name:'Ink',hex:'#15171c'},{name:'Chalk',hex:'#f4efe6'}];

// heavy = big titles and the distance figure, bold = secondary headings.
export const HEAD_FONTS = [
  {id:'shoulders', name:'Big Shoulders',    f:'"Big Shoulders Display","Arial Narrow",Impact,sans-serif', heavy:800, bold:700},
  {id:'barlowc',   name:'Barlow Condensed', f:'"Barlow Condensed","Arial Narrow",sans-serif',            heavy:800, bold:700},
  {id:'oswald',    name:'Oswald',           f:'Oswald,"Arial Narrow",sans-serif',                         heavy:700, bold:600},
  {id:'archivo',   name:'Archivo',          f:'Archivo,"Helvetica Neue",Arial,sans-serif',                heavy:800, bold:700},
  {id:'playfair',  name:'Playfair',         f:'"Playfair Display",Georgia,serif',                         heavy:800, bold:700},
  {id:'fraunces',  name:'Fraunces',         f:'Fraunces,Georgia,serif',                                   heavy:800, bold:700},
];

// stat = numbers, label = small caps labels and subtitle. wv/wl = their weights.
export const DETAIL_FONTS = [
  {id:'plex',      name:'Plex Mono + Figtree', stat:'"IBM Plex Mono",ui-monospace,monospace',  label:'Figtree,system-ui,sans-serif',             wv:500, wl:600},
  {id:'jetbrains', name:'JetBrains Mono',      stat:'"JetBrains Mono",ui-monospace,monospace', label:'"JetBrains Mono",ui-monospace,monospace',  wv:500, wl:600},
  {id:'dmmono',    name:'DM Mono',             stat:'"DM Mono",ui-monospace,monospace',        label:'"DM Mono",ui-monospace,monospace',         wv:500, wl:500},
  {id:'figtree',   name:'Figtree',             stat:'Figtree,system-ui,sans-serif',            label:'Figtree,system-ui,sans-serif',             wv:600, wl:600},
  {id:'barlow',    name:'Barlow',              stat:'Barlow,system-ui,sans-serif',             label:'Barlow,system-ui,sans-serif',              wv:500, wl:600},
];

export const LAYOUTS = [{id:'classic',name:'Classic'},{id:'statement',name:'Statement'},{id:'minimal',name:'Minimal'},{id:'tile',name:'Gallery tile'}];

export const SIZES = [
  {id:'20x20',name:'20×20',w:20,h:20},{id:'30x30',name:'30×30',w:30,h:30},
  {id:'a4',name:'A4',w:21,h:29.7},{id:'30x40',name:'30×40',w:30,h:40},{id:'a3',name:'A3',w:29.7,h:42},
  {id:'50x70',name:'50×70',w:50,h:70},{id:'70x100',name:'70×100',w:70,h:100}];

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
export const MAP_DETAILS = [{id:'minimal',name:'Minimal'},{id:'streets',name:'Streets'},{id:'detailed',name:'Detailed'}];
export const MAP_STRENGTHS = [{id:'subtle',name:'Subtle',v:.6},{id:'balanced',name:'Balanced',v:1},{id:'bold',name:'Bold',v:1.5}];
