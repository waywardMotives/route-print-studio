// Turns the chosen theme plus any custom background/accent into the final colour set,
// applying the guardrails. Returns notes the UI shows when a colour was adjusted.
import { THEMES } from './config.js';
import { C, inksFor, guardBg, guardAccent, guardLayer } from './color.js';

export function resolveTheme(S){
  const T = {...THEMES[S.theme]}, notes = {bg:'',accent:'',map:''};
  if(S.bg){
    const g = guardBg(S.bg); T.bg = g.hex;
    if(g.adjusted) notes.bg = 'Toned slightly so text stays readable and the print looks balanced.';
    const ink = inksFor(T.bg);
    let mt = .42; while(mt > .05 && C.contrast(C.mix(ink.text,T.bg,mt),T.bg) < 4.5) mt -= .04;
    T.text = ink.text; T.muted = C.mix(ink.text,T.bg,mt); T.rule = C.mix(ink.text,T.bg,.8);
    T.patC = C.mix(ink.text,T.bg,.9); T.elev = ink.text;
    if(ink.lightBg) T.glow = false;
    if(C.contrast(T.route,T.bg) < 3) T.route = ink.text;
    if(C.contrast(T.accent,T.bg) < 3) T.accent = guardAccent(T.accent,T.bg).hex;
  }
  if(S.accent){
    const a = guardAccent(S.accent,T.bg);
    T.accent = a.hex; T.route = a.hex; T.elev = a.hex; T.elevOp = .2;
    const bits = [];
    if(a.shifted) bits.push(`${a.dir} so the route stands out on this background`);
    if(a.softened) bits.push('softened slightly because very bright screen colours can’t be printed');
    if(bits.length) notes.accent = bits.join('; ').replace(/^./,c=>c.toUpperCase())+'.';
  }
  resolveMap(T, S, notes);
  T.notes = notes;
  return T;
}

// Builds the per-layer map palette (land = background). Themes ship their own colourful palette;
// a custom background switches to colours derived from it. Customer layer overrides are guarded
// so water and parks stay areas, roads stay quiet, and the route always stays the hero.
function resolveMap(T, S, notes){
  const land = T.bg, base = THEMES[S.theme].map;
  let m;
  T.inkMap = !!(T.ink && base && !S.bg); // ink themes' own palettes may use full contrast
  if(base && !S.bg) m = {...base};
  else {
    const light = inksFor(land).lightBg, ink = T.text;
    m = { water: C.mix(land, light ? '#5b93c9' : '#3f74b0', light ? .3 : .38),
          park: C.mix(land, light ? '#7fae6e' : '#4c8a5a', light ? .24 : .3),
          building: C.mix(land, ink, .05), minor: C.mix(land, ink, .12), road: C.mix(land, ink, .2),
          motorway: C.mix(land, ink, .28), rail: C.mix(land, ink, .14) };
  }
  const o = S.mapColors || {};
  if(o.water) m.water = o.water;
  if(o.park) m.park = o.park;
  if(o.building) m.building = o.building;
  if(o.road){ m.road = o.road; m.motorway = o.road; m.minor = C.mix(land, o.road, .75); delete m.casing; }
  let adjusted = false;
  const g = (k, max, routeMin) => { if(!m[k]) return; const own = !o[k==='minor'||k==='motorway'?'road':k]; const ink = T.inkMap && own; const r = guardLayer(m[k], land, ink ? 21 : max, T.route, ink ? Math.min(routeMin, 1.15) : routeMin, o[k==='minor'||k==='motorway'?'road':k] ? .5 : 1); if(r.adjusted && o[k==='minor'||k==='motorway'?'road':k]) adjusted = true; m[k] = r.hex; };
  g('water', 3.2, 1.6); g('park', 3.2, 1.6); g('building', 1.7, 2);
  g('minor', 2.6, 2); g('road', 2.6, 2); g('motorway', 3, 1.8); g('rail', 2.2, 2);
  if(adjusted) notes.map = 'Some map colours were toned down so the route stays the hero.';
  T.map = m;
}
