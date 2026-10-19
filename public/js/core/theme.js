// Turns the chosen theme plus any custom background/accent into the final colour set,
// applying the guardrails. Returns notes the UI shows when a colour was adjusted.
import { THEMES } from './config.js';
import { C, inksFor, guardBg, guardAccent } from './color.js';

export function resolveTheme(S){
  const T = {...THEMES[S.theme]}, notes = {bg:'',accent:''};
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
  T.notes = notes;
  return T;
}
