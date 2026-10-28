// Poster renderer: builds the print as an SVG string (route, text, stats, elevation).
// No DOM access, so the print server can run the same code; text measuring is passed in as
// `measure(text, sizePx, fontFamily, weight) -> width`.
//
// Coordinates: the poster is 1000 units wide; height follows the paper ratio. Layout values
// are written in the Figma file's units ("Layouts and themes", where the short side is 500)
// and converted with `f`, so each layout below reads like its Figma frame.
// `view` in the result tells the map layer how geography maps onto poster units.
import { SIZES, HEAD_FONTS, DETAIL_FONTS, MAP_SOURCE } from './config.js';
import { resolveTheme } from './theme.js';
import { rdp, fmtDur, parseTime, fmtKm, fmtDate, esc } from './geo.js';

export function posterSize(S){
  const sz = SIZES.find(z=>z.id===S.size); let cw = sz.w, ch = sz.h;
  if(S.orient==='landscape' && cw!==ch) [cw,ch] = [ch,cw];
  const W = 1000, H = Math.round(W*ch/cw);
  return {W,H,cw,ch};
}

const LH = 1.22; // Figma "auto" line height

export function renderPoster(S, track, measure){
  const hf = HEAD_FONTS.find(x=>x.id===S.headFont) || HEAD_FONTS[0];
  const df = DETAIL_FONTS.find(x=>x.id===S.detailFont) || DETAIL_FONTS[0];
  const FD = hf.f, WH = hf.heavy, WB = hf.bold, HS = hf.scale || 1;
  const FB = df.label, FM = df.stat, WL = df.wl, WV = df.wv;
  const {W,H,cw,ch} = posterSize(S);
  const f = Math.min(W,H)/500, k = f/2, T = resolveTheme(S), mapOn = !!S.map;
  let view = null;
  const under = [], over = [];

  // ---------- text ----------
  const halo = size => mapOn ? ` stroke="${T.bg}" stroke-opacity=".9" stroke-width="${Math.max(2*k,Math.min(size*.2,9*k)).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"` : '';
  const tw = (str,size,fam,wt,ls) => measure(str,size,fam,wt) + (ls||0)*size*Math.max(0,str.length-1);
  function fitLines(str,maxW,maxS,minS,maxL,fam,wt,ls){
    const words = (str||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length) return {size:maxS,lines:[]};
    const wrap = s => { const lines=[]; let cur='', ok=true;
      for(const w of words){ const t = cur?cur+' '+w:w;
        if(tw(t,s,fam,wt,ls)<=maxW) cur=t; else { if(cur) lines.push(cur); cur=w; if(tw(w,s,fam,wt,ls)>maxW) ok=false; } }
      if(cur) lines.push(cur); return {lines,ok}; };
    const step = Math.max(.5, maxS/80);
    for(let s=maxS;s>=minS;s-=step){ const r = wrap(s); if(r.ok && r.lines.length<=maxL) return {size:s,lines:r.lines}; }
    let s = minS; const lines = wrap(s).lines.slice(0,maxL);
    while(lines.length && tw(lines[lines.length-1],s,fam,wt,ls)>maxW && s>6*k) s -= step;
    return {size:s,lines};
  }
  // A block of text. size/min are Figma units; ls is %, lh a multiple of the font size.
  function text(str, o){
    if(!str) return null;
    const s = (o.upper===false ? str : str.toUpperCase()), ls = (o.ls||0)/100, lh = o.lh || LH;
    return { measure(width){
      const fit = fitLines(s, width, o.size*f, (o.min ?? o.size*.6)*f, o.lines || 1, o.font, o.weight, ls);
      const h = fit.lines.length*fit.size*lh;
      const w = Math.max(0, ...fit.lines.map(l=>tw(l,fit.size,o.font,o.weight,ls)));
      return { h, w, draw(x,y,wd){
        const anchor = o.align==='center' ? 'middle' : o.align==='end' ? 'end' : null;
        const ax = o.align==='center' ? x+wd/2 : o.align==='end' ? x+wd : x;
        fit.lines.forEach((l,i)=>{
          const base = y + i*fit.size*lh + fit.size*lh/2 + fit.size*.36;
          over.push(`<text x="${ax.toFixed(1)}" y="${base.toFixed(1)}" font-family='${o.font}' font-size="${fit.size.toFixed(1)}" font-weight="${o.weight}" fill="${o.color}"${anchor?` text-anchor="${anchor}"`:''}${ls?` style="letter-spacing:${ls}em"`:''}${halo(fit.size)}>${esc(l)}</text>`);
        });
      }};
    }};
  }
  const title = (size, weight, ls, lh, lines, min) => text(S.title, {size:size*HS, min:(min||size*.55)*HS, font:FD, weight, ls, lh, lines, color:T.text});
  const subtitleStr = [S.showName&&S.name, S.showPlace&&S.place, S.showDate&&fmtDate(S.date)].filter(Boolean).join('  ·  ');
  const subtitle = (size, lines=1, align) => text(subtitleStr, {size, min:size*.75, font:FB, weight:WL, ls:16, lines, color:T.muted, align});

  // ---------- generic blocks ----------
  const fixed = (h, draw) => ({ measure(){ return {h, w:0, draw: draw || (()=>{})}; } });
  const rule = () => fixed(.6*f, (x,y,w)=>over.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(.6*f).toFixed(2)}" fill="${T.rule}"/>`));
  const pad = (top, block) => block && { measure(w){ const m = block.measure(w); return {h:m.h+top*f, w:m.w, draw(x,y,wd){ m.draw(x,y+top*f,wd); }}; } };
  // Vertical stack (auto layout). `flex` marks the one block that takes the remaining height.
  function vstack(items, gap, align){
    items = items.filter(Boolean);
    return { measure(width, availH){
      const ms = items.map(it => it.flex ? null : it.measure(width));
      const fixedH = ms.reduce((a,m)=>a+(m?m.h:0),0) + gap*f*Math.max(0,items.length-1);
      const flexH = Math.max(0,(availH ?? fixedH) - fixedH);
      const h = items.some(it=>it.flex) ? (availH ?? fixedH) : fixedH;
      return { h, w:width, draw(x,y,wd){
        let yy = y;
        items.forEach((it,i)=>{
          if(it.flex){ it.flex(x,yy,wd,flexH); yy += flexH; }
          else { const m = ms[i]; const xx = align==='center' ? x+(wd-m.w)/2 : x; m.draw(align==='center'&&m.w?xx:x, yy, align==='center'&&m.w?m.w:wd); yy += m.h; }
          yy += gap*f;
        });
      }};
    }};
  }
  const flexRoute = (inset={}) => ({ flex(x,y,w,h){
    const t=(inset.t||0)*f, b=(inset.b||0)*f, l=(inset.l||0)*f, r=(inset.r||0)*f;
    under.push(routeSvg({x:x+l, y:y+t, w:w-l-r, h:h-t-b}));
  }});

  // ---------- stats ----------
  function statList(){
    const st = track.stats, km = st.distKm, sec = parseTime(S.time), o = [];
    if(S.sport==='swim' && km<10) o.push({k:'Distance',v:Math.round(km*1000).toLocaleString('en-GB'),u:'m'});
    else o.push({k:'Distance',v:fmtKm(km),u:'km'});
    if(S.time) o.push({k:'Time',v:S.time,u:''});
    if(sec && km>0){
      if(S.sport==='run') o.push({k:'Pace',v:fmtDur(sec/km),u:'/km'});
      else if(S.sport==='ride') o.push({k:'Speed',v:(km/(sec/3600)).toFixed(1),u:'km/h'});
      else if(S.sport==='swim') o.push({k:'Pace',v:fmtDur(sec/(km*10)),u:'/100m'});
    }
    if(S.showGain && st.gain!=null && S.sport!=='swim') o.push({k:'Elevation',v:'+'+Math.round(st.gain),u:'m'});
    if(S.sport==='hike' && st.maxEle!=null) o.push({k:'Highest',v:String(Math.round(st.maxEle)),u:'m'});
    return o.slice(0,4);
  }
  const stats = statList();
  const statW = (st,vs,us) => tw(st.v,vs,FM,WV) + (st.u ? vs*.6 + tw(st.u,us,FM,WV) : 0);
  function drawStat(st,x,y,vs,us){
    const ls = 6*f;
    over.push(`<text x="${x.toFixed(1)}" y="${(y+ls*LH/2+ls*.36).toFixed(1)}" font-family='${FB}' font-size="${ls.toFixed(1)}" font-weight="${WL}" fill="${T.muted}" style="letter-spacing:.14em"${halo(ls)}>${esc(st.k.toUpperCase())}</text>`);
    const vy = y + ls*LH + 4*f;
    over.push(`<text x="${x.toFixed(1)}" y="${(vy+vs*LH/2+vs*.36).toFixed(1)}" font-family='${FM}' font-size="${vs.toFixed(1)}" font-weight="${WV}" fill="${T.text}"${halo(vs)}>${esc(st.v)}`+
      (st.u?`<tspan font-size="${us.toFixed(1)}" fill="${T.muted}" dx="${(vs*.6).toFixed(1)}">${esc(st.u)}</tspan>`:'')+`</text>`);
  }
  const statH = vs => 6*f*LH + 4*f + vs*LH;
  // Equal-width columns in a row; shrinks the figures until the widest fits its column.
  function statsRow(list, vsz, usz, gap=8){
    if(!list.length) return null;
    return { measure(width){
      const colW = (width - gap*f*(list.length-1))/list.length;
      let vs = vsz*f, us = usz*f;
      while(vs > 9*k && list.some(st=>statW(st,vs,us) > colW-2*k)){ vs *= .96; us *= .96; }
      return { h:statH(vs), w:width, draw(x,y){ list.forEach((st,i)=>drawStat(st, x+i*(colW+gap*f), y, vs, us)); } };
    }};
  }
  // Stacked stats (Classic landscape column): pairs separated by a larger gap.
  function statsColumn(list, vsz, usz){
    if(!list.length) return null;
    return { measure(width){
      let vs = vsz*f, us = usz*f;
      while(vs > 9*k && list.some(st=>statW(st,vs,us) > width)){ vs *= .96; us *= .96; }
      const gaps = list.map((_,i)=> i===0 ? 0 : (i%2===0 ? 15 : 8)*f);
      const h = list.length*statH(vs) + gaps.reduce((a,b)=>a+b,0);
      return { h, w:width, draw(x,y){ let yy=y; list.forEach((st,i)=>{ yy += gaps[i]; drawStat(st,x,yy,vs,us); yy += statH(vs); }); } };
    }};
  }
  // One line of key figures, e.g. "42.15 KM · 3:23:49 · 4:50 /KM".
  function statsLine(n, size, align){
    const s = stats.slice(0,n).map(x=>x.v+(x.u?' '+x.u:'')).join('  ·  ');
    return text(s, {size, min:size*.7, font:FM, weight:WV, ls:6, color:T.muted, align});
  }
  // The big distance figure with its unit in the accent colour (Statement).
  function distanceRow(nsz, usz){
    const d = stats[0];
    return { measure(width){
      let n = nsz*f*HS, u = usz*f*HS;
      const wd = () => tw(d.v,n,FD,WH,-.01) + 8*f + tw(d.u.toUpperCase(),u,FD,WB,-.01);
      while(n > 20*k && wd() > width){ n *= .97; u *= .97; }
      const h = n*.85;
      return { h, w:wd(), draw(x,y){
        over.push(`<text x="${x.toFixed(1)}" y="${(y+h/2+n*.36).toFixed(1)}" font-family='${FD}' font-size="${n.toFixed(1)}" font-weight="${WH}" fill="${T.text}" style="letter-spacing:-.01em"${halo(n*.5)}>${esc(d.v)}<tspan font-size="${u.toFixed(1)}" font-weight="${WB}" fill="${T.accent}" dx="${(8*f).toFixed(1)}">${esc(d.u.toUpperCase())}</tspan></text>`);
      }};
    }};
  }
  // Elevation label + chart.
  function elevation(chartH, gap=4.5){
    if(!(S.showElev && track.profile)) return null;
    const pr = track.profile, mn = Math.min(...pr.e), mx = Math.max(...pr.e);
    const label = text(`Elevation · ${Math.round(mn)}–${Math.round(mx)} m`, {size:5.5, font:FM, weight:400, ls:12, color:T.muted});
    return { measure(width){
      const lm = label.measure(width);
      return { h: lm.h + gap*f + chartH*f, w:width, draw(x,y,wd){ lm.draw(x,y,wd); elevChart({x, y:y+lm.h+gap*f, w:wd, h:chartH*f}); } };
    }};
  }

  // ---------- drawing primitives ----------
  function background(){
    if(mapOn) return ''; // the map layer underneath provides the background
    let s = `<rect width="${W}" height="${H}" fill="${T.bg}"/>`;
    if(T.pat==='grid'){
      const g = 40*k, G = g*5;
      s += `<defs><pattern id="pg" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M${g} 0H0V${g}" fill="none" stroke="${T.patC}" stroke-width="${.9*k}"/></pattern>`+
           `<pattern id="pG" width="${G}" height="${G}" patternUnits="userSpaceOnUse"><rect width="${G}" height="${G}" fill="url(#pg)"/><path d="M${G} 0H0V${G}" fill="none" stroke="${T.patC}" stroke-width="${2.2*k}"/></pattern></defs>`+
           `<rect width="${W}" height="${H}" fill="url(#pG)"/>`;
    } else if(T.pat==='dots'){
      const g = 22*k;
      s += `<defs><pattern id="pd" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><circle cx="${g/2}" cy="${g/2}" r="${1.5*k}" fill="${T.patC}"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#pd)"/>`;
    } else if(T.pat==='contours'){
      s += `<path d="${contourPath(W,H)}" fill="none" stroke="${T.patC}" stroke-width="${1.3*k}" stroke-linecap="round"/>`;
    }
    return s;
  }
  function routeSvg(box){
    const n = track.mx.length; if(n<2 || box.w<=0 || box.h<=0) return '';
    let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
    for(let i=0;i<n;i++){ const x=track.mx[i], y=track.my[i]; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; }
    const sw = (maxx-minx)||1e-9, sh = (maxy-miny)||1e-9, sc = Math.min(box.w/sw, box.h/sh);
    const ox = box.x+(box.w-sw*sc)/2-minx*sc, oy = box.y+(box.h-sh*sc)/2-miny*sc;
    view = {sc, ox, oy, box}; // poster units per Mercator radian + offset, used to align the map
    const p = rdp(track.mx.map((x,i)=>[x*sc+ox, track.my[i]*sc+oy]), .35*k);
    const dd = 'M'+p.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L');
    const w = T.rw*k*(S.lineW||1); let s = '';
    if(mapOn) s += `<path d="${dd}" fill="none" stroke="${T.bg}" stroke-opacity=".85" stroke-width="${w+5*k}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(T.glow) s += `<defs><filter id="gl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${7*k}"/></filter></defs><path d="${dd}" fill="none" stroke="${T.route}" stroke-opacity=".45" stroke-width="${w*3}" stroke-linejoin="round" stroke-linecap="round" filter="url(#gl)"/>`;
    s += `<path d="${dd}" fill="none" stroke="${T.route}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const a = p[0], b = p[p.length-1], r = 7*k;
    if(Math.hypot(a[0]-b[0],a[1]-b[1]) > 16*k)
      s += `<circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="${r}" fill="${T.bg}" stroke="${T.accent}" stroke-width="${3*k}"/>`;
    s += `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${r}" fill="${T.accent}" stroke="${T.bg}" stroke-width="${2.5*k}"/>`;
    return s;
  }
  function elevChart(box){
    const pr = track.profile;
    const mn = Math.min(...pr.e), mx = Math.max(...pr.e), range = Math.max(mx-mn,25), base = mn-range*.15, top = base+range*1.15;
    const X = dd => box.x + dd/pr.total*box.w, Y = e => box.y + box.h - (e-base)/(top-base)*box.h;
    const line = pr.d.map((dd,i)=>X(dd).toFixed(1)+' '+Y(pr.e[i]).toFixed(1)).join('L');
    const bot = (box.y+box.h).toFixed(1);
    if(mapOn) over.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${T.bg}" fill-opacity=".7"/>`);
    over.push(`<path d="M${box.x.toFixed(1)} ${bot}L${line}L${(box.x+box.w).toFixed(1)} ${bot}Z" fill="${T.elev}" fill-opacity="${T.elevOp}"/>`);
    over.push(`<path d="M${line}" fill="none" stroke="${T.elev}" stroke-opacity=".75" stroke-width="${1.4*k}" stroke-linejoin="round"/>`);
    over.push(`<line x1="${box.x}" x2="${box.x+box.w}" y1="${bot}" y2="${bot}" stroke="${T.rule}" stroke-width="${1*k}"/>`);
  }
  const place = (block, x, y, w, h) => block.measure(w, h).draw(x, y, w);

  // ---------- layouts (Figma: "Layout components") ----------
  const land = W > H*1.05;
  const m = (S.layout==='tile' ? 42.5 : 37.5)*f;

  if(S.layout==='classic' && !land){
    // Classic / Portrait
    place(vstack([
      vstack([title(32, WH, 1, .94, 2), subtitle(9.5)], 11),
      rule(), flexRoute(), elevation(52), statsRow(stats, 22, 9.2),
    ], 22), m, m, W-2*m, H-2*m);
  }
  else if(S.layout==='classic'){
    // Classic / Landscape: title + subtitle, then [stats column | route], elevation along the bottom
    const row = { flex(x,y,w,h){
      const col = statsColumn(stats, 19, 8);
      if(col){ col.measure(105*f).draw(x, y, 105*f); }
      const off = col ? (105+20)*f : 0;
      under.push(routeSvg({x:x+off, y, w:w-off, h}));
    }};
    place(vstack([
      vstack([title(30, WH, 1, .94, 2), subtitle(9.5)], 8),
      row, elevation(24),
    ], 20), m, m, W-2*m, H-2*m);
  }
  else if(S.layout==='foundation'){
    // Foundation: map-led top area and an information band anchored to the bottom edge.
    // The band has generous room above the title and fades into the map with a gradient
    // (solid behind the text, transparent at its top edge). No rule line.
    const titleGroup = (ts, ss) => vstack([title(ts, WH, 1, 1, 1), subtitle(ss)], 6);
    let content, padTop;
    if(land){
      const event = titleGroup(18, 6.5);
      const sr = statsRow(stats, 16, 7);
      const bandRow = { measure(width){
        const ew = 278*f, sw = width - ew - 20*f;
        const em = event.measure(ew), sm = sr ? sr.measure(sw) : {h:0, draw(){}};
        const h = Math.max(em.h, sm.h);
        return { h, w:width, draw(x,y){ em.draw(x, y+(h-em.h)/2, ew); sm.draw(x+ew+20*f, y+(h-sm.h)/2, sw); } };
      }};
      content = vstack([bandRow, elevation(12, 4)], 11); padTop = 35;
    } else {
      content = vstack([titleGroup(21, 7.5), statsRow(stats, 19, 8), elevation(14, 4)], 8); padTop = 26;
    }
    const cm = content.measure(W-2*m);
    const contentTop = H - 18*f - cm.h, bandTop = contentTop - padTop*f;
    const solidFrom = contentTop - 6*f;
    over.push(`<defs><linearGradient id="bandfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.bg}" stop-opacity="0"/><stop offset=".55" stop-color="${T.bg}" stop-opacity=".82"/><stop offset="1" stop-color="${T.bg}" stop-opacity="1"/></linearGradient></defs>`+
      `<rect x="0" y="${bandTop.toFixed(1)}" width="${W}" height="${(solidFrom-bandTop).toFixed(1)}" fill="url(#bandfade)"/>`+
      `<rect x="0" y="${(solidFrom-.5).toFixed(1)}" width="${W}" height="${(H-solidFrom+.5).toFixed(1)}" fill="${T.bg}"/>`);
    if(land) under.push(routeSvg({x:m, y:27*f, w:W-2*m, h:bandTop-27*f}));
    else under.push(routeSvg({x:m, y:m, w:W-2*m, h:bandTop-m}));
    cm.draw(m, contentTop, W-2*m);
  }
  else if(S.layout==='statement' && !land){
    // Statement / Portrait
    place(vstack([
      flexRoute(),
      vstack([
        distanceRow(74, 24),
        vstack([title(20, WB, 2, .94, 2), subtitle(8.5, 2)], 7),
        pad(8, statsRow(stats.slice(1), 17, 7.1)),
        pad(10, elevation(26)),
      ], 12),
    ], 25), m, m, W-2*m, H-2*m);
  }
  else if(S.layout==='statement'){
    // Statement / Landscape: route left, text column (206) right; figures at top, stats + elevation at bottom
    const colW = 206*f, x0 = W-m-colW;
    under.push(routeSvg({x:m, y:m, w:x0-25*f-m, h:H-2*m}));
    const top = vstack([distanceRow(60, 20), vstack([title(18, WB, 2, .94, 3), subtitle(8.5, 2)], 7)], 12).measure(colW);
    const bottom = vstack([pad(8, statsRow(stats.slice(1), 17, 7.1)), pad(10, elevation(26))], 12).measure(colW);
    top.draw(x0, m, colW);
    bottom.draw(x0, H-m-bottom.h, colW);
  }
  else if(S.layout==='minimal'){
    // Minimal: route, then subtitle and a row of [title | key figures]
    const line = statsLine(3, 7.5);
    const t = title(20, WB, 4, LH, 2, 13);
    const bottomRow = { measure(width){
      const lm = line ? line.measure(width*.45) : {w:0,h:0,draw(){}};
      const tm = t.measure(width - lm.w - 14*f);
      return { h:Math.max(tm.h, lm.h), w:width, draw(x,y,wd){ tm.draw(x,y,wd-lm.w-14*f); lm.draw(x+wd-lm.w, y, lm.w); } };
    }};
    place(vstack([flexRoute(), vstack([subtitle(6.5), bottomRow], 5)], 20), m, m, W-2*m, H-2*m);
  }
  else {
    // Gallery tile: route, then centred subtitle, title and key figures
    place(vstack([
      flexRoute(),
      vstack([subtitle(6.5, 1, 'center'), text(S.title, {size:25*HS, min:13*HS, font:FD, weight:WH, ls:3, lines:1, color:T.text, align:'center'}), statsLine(3, 7.5, 'center')], 6),
    ], 16), m, m, W-2*m, H-2*m);
  }

  // Licence requirement: OpenStreetMap credit on every print that shows the map.
  if(mapOn){
    const s = 7.5*k;
    over.push(`<text x="${(W-m*.5).toFixed(1)}" y="${(H-Math.min(m,18*f)*.35).toFixed(1)}" font-family='${FB}' font-size="${s.toFixed(1)}" font-weight="400" fill="${T.muted}" text-anchor="end"${halo(s)}>${esc(MAP_SOURCE.attribution)}</text>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" style="white-space:pre" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc('Print preview: '+(S.title||'route'))}">${background()}${under.join('')}${over.join('')}</svg>`;
  return {svg,W,H,cw,ch,T,view};
}

const contourCache = {};
function contourPath(W,H){
  const key = W+'x'+H; if(contourCache[key]) return contourCache[key];
  const st = W/60, nx = Math.ceil(W/st)+1, ny = Math.ceil(H/st)+1;
  const f = (x,y)=>Math.sin(x*.0047+.9*Math.sin(y*.0031+.6))+.85*Math.sin(y*.0061+1.4*Math.sin(x*.0023+1.1))+.35*Math.sin((x-y)*.0094+.3);
  const v = new Float32Array(nx*ny);
  for(let j=0;j<ny;j++) for(let i=0;i<nx;i++) v[j*nx+i] = f(i*st,j*st);
  const P = p => p[0].toFixed(1)+' '+p[1].toFixed(1); let d = '';
  for(let L=-2.1;L<=2.1;L+=.2){
    for(let j=0;j<ny-1;j++) for(let i=0;i<nx-1;i++){
      const a=v[j*nx+i]-L, b=v[j*nx+i+1]-L, c=v[(j+1)*nx+i+1]-L, e=v[(j+1)*nx+i]-L, x0=i*st, y0=j*st, p=[];
      if((a>0)!==(b>0)) p.push([x0+st*a/(a-b),y0]);
      if((b>0)!==(c>0)) p.push([x0+st,y0+st*b/(b-c)]);
      if((e>0)!==(c>0)) p.push([x0+st*e/(e-c),y0+st]);
      if((a>0)!==(e>0)) p.push([x0,y0+st*a/(a-e)]);
      if(p.length>=2) d += 'M'+P(p[0])+'L'+P(p[1]);
      if(p.length===4) d += 'M'+P(p[2])+'L'+P(p[3]);
    }
  }
  return contourCache[key] = d;
}
