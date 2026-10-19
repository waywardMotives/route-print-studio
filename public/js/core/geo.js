// Route maths (distance, elevation, simplification, Web Mercator) and formatting helpers.

const R = 6371008.8;
export const rad = d => d*Math.PI/180;
export const deg = r => r*180/Math.PI;

export function hav(a,b){
  const dLa = rad(b.lat-a.lat), dLo = rad(b.lon-a.lon);
  const s = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(s)));
}

export function computeStats(pts){
  const cum = [0]; let dist = 0;
  for(let i=1;i<pts.length;i++){ dist += hav(pts[i-1],pts[i]); cum.push(dist); }
  const withEle = pts.filter(p=>p.ele!=null && isFinite(p.ele)).length;
  let smooth = null, gain = null, maxEle = null;
  if(withEle > pts.length*0.5){
    let last = pts.find(p=>p.ele!=null && isFinite(p.ele)).ele;
    const raw = pts.map(p=>{ if(p.ele!=null && isFinite(p.ele)) last = p.ele; return last; });
    const w = 5; smooth = raw.map((_,i)=>{ let s=0,c=0; for(let j=Math.max(0,i-w);j<=Math.min(raw.length-1,i+w);j++){s+=raw[j];c++;} return s/c; });
    gain = 0; let ref = smooth[0];
    for(const v of smooth){ if(v-ref>=2){gain+=v-ref;ref=v;} else if(ref-v>=2) ref=v; }
    maxEle = smooth.reduce((a,b)=>Math.max(a,b),-Infinity);
  }
  const ts = pts.filter(p=>p.t!=null && isFinite(p.t));
  const dur = ts.length>1 ? (ts[ts.length-1].t - ts[0].t)/1000 : null;
  let profile = null;
  if(smooth && dist>0){
    const N = 260, d = [], e = []; let j = 0;
    for(let i=0;i<N;i++){
      const target = dist*i/(N-1);
      while(j<cum.length-2 && cum[j+1]<target) j++;
      const span = cum[j+1]-cum[j], f = span>0 ? (target-cum[j])/span : 0;
      d.push(target); e.push(smooth[j] + (smooth[j+1]-smooth[j])*Math.max(0,Math.min(1,f)));
    }
    profile = {d,e,total:dist};
  }
  return {dist,distKm:dist/1000,gain,maxEle,dur,start:ts.length?ts[0].t:null,profile};
}

// Ramer–Douglas–Peucker line simplification (iterative).
export function rdp(p,eps){
  const n = p.length; if(n<3) return p;
  const keep = new Uint8Array(n); keep[0] = keep[n-1] = 1; const st = [[0,n-1]];
  while(st.length){
    const [a,b] = st.pop(); const ax=p[a][0],ay=p[a][1],bx=p[b][0],by=p[b][1];
    const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy); let md=0, mi=-1;
    for(let i=a+1;i<b;i++){
      const d = L>1e-9 ? Math.abs(dy*p[i][0]-dx*p[i][1]+bx*ay-by*ax)/L : Math.hypot(p[i][0]-ax,p[i][1]-ay);
      if(d>md){md=d;mi=i;}
    }
    if(md>eps && mi>0){ keep[mi]=1; st.push([a,mi],[mi,b]); }
  }
  return p.filter((_,i)=>keep[i]);
}

// Web Mercator in radians: x = lon, y = -ln(tan(pi/4 + lat/2)) (y grows southwards, like screen y).
export const mercY = lat => -Math.log(Math.tan(Math.PI/4 + rad(lat)/2));
export const latFromMercY = y => deg(2*Math.atan(Math.exp(-y)) - Math.PI/2);

// Prepares a parsed activity for rendering. Returns null if there are fewer than two usable points.
export function buildTrack(pts){
  pts = pts.filter(p=>isFinite(p.lat)&&isFinite(p.lon)&&Math.abs(p.lat)<85);
  if(pts.length<2) return null;
  const stats = computeStats(pts);
  const stride = Math.max(1,Math.floor(pts.length/8000)), dec = [];
  for(let i=0;i<pts.length;i+=stride) dec.push(pts[i]);
  if(dec[dec.length-1]!==pts[pts.length-1]) dec.push(pts[pts.length-1]);
  return {pts, stats, profile: stats.profile, mx: dec.map(p=>rad(p.lon)), my: dec.map(p=>mercY(p.lat))};
}

// A synthetic marathon loop used as the example route.
export function sampleTrack(){
  const N = 1800, raw = [];
  for(let i=0;i<=N;i++){
    const t = i/N*Math.PI*2;
    const r = 1 + .32*Math.sin(2*t+.3) + .18*Math.sin(3*t+1.1) + .07*Math.sin(9*t) + .025*Math.sin(23*t+.7);
    raw.push([r*Math.cos(t)*(1+.22*Math.sin(t)), r*Math.sin(t)*.78, t]);
  }
  let L = 0; for(let i=1;i<raw.length;i++) L += Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]);
  const sc = 42195/L, lat0 = 50.11, lon0 = 8.68, t0 = Date.parse('2026-04-12T07:30:00Z');
  let cum = 0;
  return raw.map((p,i)=>{
    if(i) cum += Math.hypot(p[0]-raw[i-1][0],p[1]-raw[i-1][1])*sc;
    const lat = lat0 + p[1]*sc/111320, lon = lon0 + p[0]*sc/(111320*Math.cos(rad(lat0)));
    const ele = 96 + 13*Math.sin(3*p[2]+.4) + 6*Math.sin(7*p[2]) + 2.5*Math.sin(17*p[2]);
    return {lat,lon,ele,t:t0 + cum*.2965*1000*(1+.025*Math.sin(cum/4000))};
  });
}

// ---------- formatting ----------
export function fmtDur(s){ s = Math.round(s); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60;
  return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0'); }
export function parseTime(str){ if(!str) return null; const p = str.trim().split(':').map(Number); if(p.some(isNaN)||!p.length||p.length>3) return null;
  return p.reduce((a,v)=>a*60+v,0) || null; }
export const fmtKm = km => km>=100 ? km.toFixed(1) : km.toFixed(2);
export function fmtDate(iso){ if(!iso) return ''; const d = new Date(iso+'T12:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }
export const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
