// Poster renderer: builds the print as an SVG string (route, text, stats, elevation).
// The same function is meant to run on the print server later, so it has no DOM access:
// text measuring is passed in as `measure(text, sizePx, fontFamily, weight) -> width`.
//
// Coordinate system: the poster is always 1000 units wide; height follows the paper ratio.
// `view` in the result tells the map layer how geography maps onto those units.
import { SIZES, HEAD_FONTS, DETAIL_FONTS, MAP_SOURCE } from './config.js';
import { resolveTheme } from './theme.js';
import { rdp, fmtDur, parseTime, fmtKm, fmtDate, esc } from './geo.js';

export function posterSize(S){
  const sz = SIZES.find(z=>z.id===S.size); let cw = sz.w, ch = sz.h;
  if(S.orient==='landscape' && cw!==ch) [cw,ch] = [ch,cw];
  const W = 1000, H = Math.round(W*ch/cw);
  return {W,H,cw,ch};
}

export function renderPoster(S, track, measure){
  const h = HEAD_FONTS.find(x=>x.id===S.headFont) || HEAD_FONTS[0];
  const d = DETAIL_FONTS.find(x=>x.id===S.detailFont) || DETAIL_FONTS[0];
  const FD = h.f, WH = h.heavy, WB = h.bold, FB = d.label, FM = d.stat, WL = d.wl, WV = d.wv;
  const {W,H,cw,ch} = posterSize(S);
  const k = Math.min(W,H)/1000, T = resolveTheme(S);
  const mapOn = !!S.map;
  let view = null;

  // A soft outline in the background colour behind text, so lettering stays crisp over map lines.
  const halo = size => mapOn ? ` stroke="${T.bg}" stroke-opacity=".9" stroke-width="${Math.max(2*k,Math.min(size*.2,9*k)).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"` : '';
  const tw = (str,size,fam,wt,ls) => measure(str,size,fam,wt) + (ls||0)*size*Math.max(0,str.length-1);

  function fitLines(str,maxW,maxS,minS,maxL,fam,wt,ls){
    const words = (str||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length) return {size:maxS,lines:[]};
    const wrap = s => { const lines=[]; let cur='', ok=true;
      for(const w of words){ const t = cur?cur+' '+w:w;
        if(tw(t,s,fam,wt,ls)<=maxW) cur=t; else { if(cur) lines.push(cur); cur=w; if(tw(w,s,fam,wt,ls)>maxW) ok=false; } }
      if(cur) lines.push(cur); return {lines,ok}; };
    for(let s=maxS;s>=minS;s-=1){ const r = wrap(s); if(r.ok && r.lines.length<=maxL) return {size:s,lines:r.lines}; }
    let s = minS; const r = wrap(s); const lines = r.lines.slice(0,maxL);
    while(lines.length && tw(lines[lines.length-1],s,fam,wt,ls)>maxW && s>8) s -= 1;
    return {size:s,lines};
  }
  function txt(x,y,s,o){
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family='${o.f}' font-size="${o.s.toFixed(1)}" font-weight="${o.w||400}" fill="${o.c}"${o.a?` text-anchor="${o.a}"`:''}${o.ls?` style="letter-spacing:${o.ls}em"`:''}${halo(o.s)}>${s}</text>`;
  }

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
    const n = track.mx.length; if(n<2) return '';
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

  function elevSvg(box){
    const pr = track.profile; if(!pr) return '';
    const mn = Math.min(...pr.e), mx = Math.max(...pr.e), range = Math.max(mx-mn,25), base = mn-range*.15, top = base+range*1.15;
    const X = dd => box.x + dd/pr.total*box.w, Y = e => box.y + box.h - (e-base)/(top-base)*box.h;
    const line = pr.d.map((dd,i)=>X(dd).toFixed(1)+' '+Y(pr.e[i]).toFixed(1)).join('L');
    const bot = (box.y+box.h).toFixed(1);
    let s = '';
    if(mapOn) s += `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${T.bg}" fill-opacity=".7"/>`;
    s += `<path d="M${box.x.toFixed(1)} ${bot}L${line}L${(box.x+box.w).toFixed(1)} ${bot}Z" fill="${T.elev}" fill-opacity="${T.elevOp}"/>`;
    s += `<path d="M${line}" fill="none" stroke="${T.elev}" stroke-opacity=".75" stroke-width="${1.4*k}" stroke-linejoin="round"/>`;
    s += `<line x1="${box.x}" x2="${box.x+box.w}" y1="${bot}" y2="${bot}" stroke="${T.rule}" stroke-width="${1*k}"/>`;
    s += txt(box.x, box.y-9*k, `ELEVATION · ${Math.round(mn)}–${Math.round(mx)} M`, {f:FM,s:11*k,c:T.muted,ls:.12});
    return s;
  }

  function statsRow(x,y,w,list,vs){
    const cwd = w/list.length; let s = '';
    list.forEach((st,i)=>{
      const cx = x + cwd*i;
      s += txt(cx, y-vs*1.08, st.k.toUpperCase(), {f:FB,s:12*k,w:WL,c:T.muted,ls:.14});
      s += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" font-family='${FM}' font-size="${vs.toFixed(1)}" font-weight="${WV}" fill="${T.text}"${halo(vs)}>${esc(st.v)}`+
           (st.u?`<tspan font-size="${(vs*.42).toFixed(1)}" fill="${T.muted}" dx="${(4*k).toFixed(1)}">${esc(st.u)}</tspan>`:'')+`</text>`;
    });
    return s;
  }
  function fitStatSize(list,colW,max){
    let s = max; for(const st of list){ while(s>14*k && tw(st.v,s,FM,WV)+tw(st.u,s*.42,FM,WV)+6*k > colW-10*k) s -= 1; } return s;
  }

  function statementCol(x,w,bottom,title,sub,stats,showE,ret){
    let s = '', yb = bottom;
    if(showE){ const eh = 52*k; s += elevSvg({x,y:yb-eh,w,h:eh}); yb -= eh + 46*k; }
    const rest = stats.slice(1);
    if(rest.length){ const vs = fitStatSize(rest,w/rest.length,34*k); s += statsRow(x,yb,w,rest,vs); yb -= vs*1.08+12*k+34*k; }
    if(sub){ const sf = fitLines(sub,w,17*k,11*k,2,FB,WL,.15);
      for(let i=sf.lines.length-1;i>=0;i--){ s += txt(x,yb,esc(sf.lines[i]),{f:FB,s:sf.size,w:WL,c:T.muted,ls:.15}); yb -= sf.size*1.5; }
      yb -= 14*k; }
    const t = fitLines(title,w,72*k,32*k,2,FD,WB,.02);
    for(let i=t.lines.length-1;i>=0;i--){ s += txt(x,yb,esc(t.lines[i]),{f:FD,s:t.size,w:WB,c:T.text,ls:.02}); yb -= t.size*.94; }
    yb -= 22*k;
    const dst = stats[0]; let ds = 230*k;
    while(ds>60*k && tw(dst.v,ds,FD,WH)+tw(dst.u.toUpperCase(),ds*.3,FD,WB)+14*k > w) ds -= 2;
    s += `<text x="${x}" y="${yb.toFixed(1)}" font-family='${FD}' font-size="${ds.toFixed(1)}" font-weight="${WH}" fill="${T.text}" style="letter-spacing:-.01em"${halo(ds*.5)}>${esc(dst.v)}<tspan font-size="${(ds*.3).toFixed(1)}" font-weight="${WB}" fill="${T.accent}" dx="${(10*k).toFixed(1)}">${esc(dst.u.toUpperCase())}</tspan></text>`;
    yb -= ds*.82 + 50*k;
    return ret ? {svg:s,y:yb} : s;
  }

  // ---------- layouts ----------
  const m = (S.layout==='tile'?.085:.075)*Math.min(W,H);
  const land = W > H*1.05, showE = S.showElev && !!track.profile;
  const title = (S.title||'').toUpperCase();
  const sub = [S.showName&&S.name, S.showPlace&&S.place, S.showDate&&fmtDate(S.date)].filter(Boolean).join('  ·  ').toUpperCase();
  const stats = statList();
  let s = background();

  if(S.layout==='classic' && !land){
    const t = fitLines(title,W-2*m,124*k,48*k,2,FD,WH,.01);
    let y = m;
    t.lines.forEach((l,i)=>{ y += i? t.size*.94 : t.size*.8; s += txt(m,y,esc(l),{f:FD,s:t.size,w:WH,c:T.text,ls:.01}); });
    if(sub){ const sf = fitLines(sub,W-2*m,19*k,12*k,1,FB,WL,.16); y += 22*k+sf.size; s += txt(m,y,esc(sf.lines[0]||''),{f:FB,s:sf.size,w:WL,c:T.muted,ls:.16}); }
    y += 26*k; s += `<line x1="${m}" x2="${W-m}" y1="${y}" y2="${y}" stroke="${T.rule}" stroke-width="${1.2*k}"/>`;
    const vs = fitStatSize(stats,(W-2*m)/stats.length,44*k);
    const statsBase = H-m; let rb = statsBase - vs*1.08 - 12*k - 46*k;
    let rest = '';
    if(showE){ const eh = 104*k; rest += elevSvg({x:m,y:rb-eh,w:W-2*m,h:eh}); rb -= eh + 56*k; }
    rest += statsRow(m,statsBase,W-2*m,stats,vs);
    s += routeSvg({x:m,y:y+44*k,w:W-2*m,h:rb-(y+44*k)}) + rest;
  }
  else if(S.layout==='classic' || (S.layout==='statement' && land)){
    const x0 = W*.6, cwid = W-m-x0;
    s += routeSvg({x:m,y:m,w:x0-m-50*k,h:H-2*m});
    if(S.layout==='classic'){
      const t = fitLines(title,cwid,96*k,40*k,3,FD,WH,.01);
      let y = m; t.lines.forEach((l,i)=>{ y += i? t.size*.94 : t.size*.8; s += txt(x0,y,esc(l),{f:FD,s:t.size,w:WH,c:T.text,ls:.01}); });
      if(sub){ const sf = fitLines(sub,cwid,17*k,11*k,2,FB,WL,.14); sf.lines.forEach(l=>{ y += sf.size*1.5; s += txt(x0,y+10*k,esc(l),{f:FB,s:sf.size,w:WL,c:T.muted,ls:.14}); }); }
      const half = stats.slice(0,2), rest = stats.slice(2);
      const vs = fitStatSize(stats,cwid/2,38*k);
      let yb = H-m;
      if(rest.length){ s += statsRow(x0,yb,cwid*(rest.length/2),rest,vs); yb -= vs*1.08+12*k+30*k; }
      s += statsRow(x0,yb,cwid*(half.length/2),half,vs); yb -= vs*1.08+12*k+40*k;
      if(showE){ const eh = 84*k; s += elevSvg({x:x0,y:yb-eh,w:cwid,h:eh}); }
    } else s += statementCol(x0,cwid,H-m,title,sub,stats,showE);
  }
  else if(S.layout==='statement'){
    const top = statementCol(m,W-2*m,H-m,title,sub,stats,showE,true);
    s += routeSvg({x:m,y:m,w:W-2*m,h:top.y-m}) + top.svg;
  }
  else if(S.layout==='minimal'){
    const ss = stats.slice(0,3).map(x=>x.v+(x.u?' '+x.u:'')).join('  ·  ').toUpperCase();
    const stw = tw(ss,15*k,FM,WV,.06);
    const t = fitLines(title,Math.max(120*k,W-2*m-stw-40*k),40*k,20*k,1,FD,WB,.04);
    const base = H-m;
    const rb = base - t.size - (sub?34*k:12*k) - 40*k;
    s += routeSvg({x:m,y:m,w:W-2*m,h:rb-m});
    s += txt(m,base,esc(t.lines[0]||''),{f:FD,s:t.size,w:WB,c:T.text,ls:.04});
    s += txt(W-m,base,esc(ss),{f:FM,s:15*k,w:WV,c:T.muted,a:'end',ls:.06});
    if(sub){ const sf = fitLines(sub,W-2*m,13*k,10*k,1,FB,WL,.16); s += txt(m,base-t.size-8*k,esc(sf.lines[0]||''),{f:FB,s:sf.size,w:WL,c:T.muted,ls:.16}); }
  }
  else { // gallery tile
    const ss = stats.slice(0,2).map(x=>x.v+(x.u?' '+x.u:'')).join('  ·  ').toUpperCase();
    const t = fitLines(title,W-2*m,58*k,26*k,1,FD,WH,.03);
    const rb = H-m-17*k-18*k-t.size-48*k;
    s += routeSvg({x:m,y:m,w:W-2*m,h:rb-m});
    s += txt(W/2,H-m,esc(ss),{f:FM,s:17*k,w:WV,c:T.muted,a:'middle',ls:.08});
    s += txt(W/2,H-m-17*k-18*k,esc(t.lines[0]||''),{f:FD,s:t.size,w:WH,c:T.text,a:'middle',ls:.03});
  }

  // Licence requirement: OpenStreetMap credit on every print that shows the map.
  if(mapOn) s += txt(W-m*.5, H-m*.32, esc(MAP_SOURCE.attribution), {f:FB,s:7.5*k,w:400,c:T.muted,a:'end'});

  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc('Print preview: '+(S.title||'route'))}">${s}</svg>`,W,H,cw,ch,T,view};
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
