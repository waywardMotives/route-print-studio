// Colour maths and the guardrails that keep customer colour choices readable and printable.

export const C = {
  rgb(h){ h = h.replace('#',''); if(h.length===3) h = h.split('').map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); },
  hex(a){ return '#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join(''); },
  lum(h){ const [r,g,b] = C.rgb(h).map(v=>{ v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; },
  contrast(a,b){ const x=C.lum(a), y=C.lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); },
  mix(a,b,t){ const A=C.rgb(a), B=C.rgb(b); return C.hex(A.map((v,i)=>v+(B[i]-v)*t)); },
  toHsl(h){ const [r,g,b] = C.rgb(h).map(v=>v/255); const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2; let hh=0, s=0;
    if(mx!==mn){ const d=mx-mn; s = l>.5 ? d/(2-mx-mn) : d/(mx+mn);
      hh = mx===r ? ((g-b)/d + (g<b?6:0)) : mx===g ? (b-r)/d+2 : (r-g)/d+4; hh /= 6; }
    return [hh,s,l]; },
  fromHsl(h,s,l){ if(!s) return C.hex([l*255,l*255,l*255]);
    const q = l<.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    const f = t=>{ t=(t+1)%1; return t<1/6 ? p+(q-p)*6*t : t<1/2 ? q : t<2/3 ? p+(q-p)*(2/3-t)*6 : p; };
    return C.hex([f(h+1/3)*255,f(h)*255,f(h-1/3)*255]); },
};

// Text ink: a near-black or near-white, lightly tinted with the background hue.
export function inksFor(bg){
  const [h,s] = C.toHsl(bg);
  const dark = C.fromHsl(h,Math.min(s,.3),.1), light = C.fromHsl(h,Math.min(s,.22),.95);
  const useDark = C.contrast(dark,bg) >= C.contrast(light,bg);
  return {text: useDark ? dark : light, lightBg: useDark};
}

// Background: keep light grounds pastel and dark grounds deep, and push mid-tones away
// from the middle until text clears 7.5:1.
export function guardBg(hex){
  let [h,s,l] = C.toHsl(hex); const s0 = s, l0 = l;
  for(let i=0;i<50;i++){ const c = C.fromHsl(h,Math.min(s,l>=.5?.45:.6),l), ink = inksFor(c).text; if(C.contrast(ink,c) >= 7.5) break; l += l>=.5 ? .02 : -.02; l = Math.max(0,Math.min(1,l)); }
  s = Math.min(s, l>=.5 ? .45 : .6);
  return {hex: C.fromHsl(h,s,l), adjusted: s0-s>.05 || Math.abs(l-l0)>.03};
}

// Accent: soften neon screen colours (they can't be printed), then darken or lighten
// until the route clears 3:1 against the background.
export function guardAccent(hex,bg){
  let [h,s,l] = C.toHsl(hex); const s0 = s, l0 = l; s = Math.min(s,.85);
  const lightBg = inksFor(bg).lightBg;
  for(let i=0;i<50 && C.contrast(C.fromHsl(h,s,l),bg) < 3;i++){ l += lightBg ? -.02 : .02; l = Math.max(0,Math.min(1,l)); }
  return {hex: C.fromHsl(h,s,l), softened: s0-s>.05, shifted: Math.abs(l-l0)>.02, dir: lightBg ? 'Darkened' : 'Lightened'};
}
