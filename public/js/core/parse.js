// Activity file parsing: GPX, TCX (XML) and Garmin FIT (binary).
// Returns {pts:[{lat,lon,ele,t}], name, sport}. Throws Error('format') for unreadable files.
// Uses the browser's DOMParser; on the server pass one in (e.g. from @xmldom/xmldom).

const tagAll = (el,n) => el.getElementsByTagNameNS('*',n);
const firstText = (el,n) => { const t = tagAll(el,n)[0]; return t ? t.textContent.trim() : null; };

export function sportFrom(str){
  if(!str) return null; const s = str.toLowerCase();
  if(/run/.test(s)) return 'run'; if(/bik|cycl|ride/.test(s)) return 'ride';
  if(/swim/.test(s)) return 'swim'; if(/hik|walk|trek/.test(s)) return 'hike';
  if(/tri|multi/.test(s)) return 'tri'; return null;
}

export function parseGPX(text, Parser = globalThis.DOMParser){
  const doc = new Parser().parseFromString(text,'application/xml');
  let nodes = tagAll(doc,'trkpt'); if(!nodes.length) nodes = tagAll(doc,'rtept');
  const pts = [];
  for(const n of Array.from(nodes)){
    const lat = parseFloat(n.getAttribute('lat')), lon = parseFloat(n.getAttribute('lon'));
    if(!isFinite(lat)||!isFinite(lon)) continue;
    const e = firstText(n,'ele'), t = firstText(n,'time');
    pts.push({lat,lon,ele:e!=null&&e!==''?parseFloat(e):null,t:t?Date.parse(t):null});
  }
  const trk = tagAll(doc,'trk')[0];
  const name = (trk && firstText(trk,'name')) || firstText(doc,'name');
  return {pts,name,sport:trk?sportFrom(firstText(trk,'type')):null};
}

export function parseTCX(text, Parser = globalThis.DOMParser){
  const doc = new Parser().parseFromString(text,'application/xml');
  const pts = [];
  for(const n of Array.from(tagAll(doc,'Trackpoint'))){
    const la = firstText(n,'LatitudeDegrees'), lo = firstText(n,'LongitudeDegrees');
    if(la==null||lo==null) continue;
    const e = firstText(n,'AltitudeMeters'), t = firstText(n,'Time');
    pts.push({lat:+la,lon:+lo,ele:e!=null?+e:null,t:t?Date.parse(t):null});
  }
  const act = tagAll(doc,'Activity')[0];
  return {pts,name:null,sport:act?sportFrom(act.getAttribute('Sport')):null};
}

export function parseFIT(buf){
  const dv = new DataView(buf), len = buf.byteLength;
  const hs = dv.getUint8(0), size = dv.getUint32(4,true);
  let pos = hs; const end = Math.min(hs+size,len);
  const defs = {}, pts = []; let lastTs = null, sport = null;
  const SEMI = 180/2147483648, FIT_EPOCH = 631065600;
  const SPORTMAP = {1:'run',2:'ride',5:'swim',11:'hike',17:'hike',18:'tri'};
  function readRec(def){
    const r = {};
    for(const f of def.fields){
      if(pos+f.size>len){pos=len;return r;}
      const bt = f.type & 0x1f; let v = null;
      switch(bt){
        case 0: case 2: case 10: case 13: if(f.size===1) v = dv.getUint8(pos); break;
        case 1: if(f.size===1) v = dv.getInt8(pos); break;
        case 3: if(f.size===2) v = dv.getInt16(pos,def.le); break;
        case 4: case 11: if(f.size===2) v = dv.getUint16(pos,def.le); break;
        case 5: if(f.size===4) v = dv.getInt32(pos,def.le); break;
        case 6: case 12: if(f.size===4) v = dv.getUint32(pos,def.le); break;
        case 8: if(f.size===4) v = dv.getFloat32(pos,def.le); break;
      }
      r[f.num] = v; pos += f.size;
    }
    pos += def.devSize; return r;
  }
  function handle(g,r){
    if(g===20){
      const la = r[0], lo = r[1];
      if(la==null||lo==null||la===0x7fffffff||lo===0x7fffffff) return;
      let ele = null;
      if(r[78]!=null && r[78]!==0xffffffff) ele = r[78]/5-500;
      else if(r[2]!=null && r[2]!==0xffff) ele = r[2]/5-500;
      const ts = r[253]!=null && r[253]!==0xffffffff ? (r[253]+FIT_EPOCH)*1000 : null;
      pts.push({lat:la*SEMI,lon:lo*SEMI,ele,t:ts});
    } else if(g===18 && r[5]!=null && !sport){ sport = SPORTMAP[r[5]] || null; }
  }
  while(pos<end){
    const h = dv.getUint8(pos++);
    if(h & 0x80){ // compressed timestamp header
      const def = defs[(h>>5)&3]; if(!def) throw new Error('format');
      const r = readRec(def), off = h & 0x1f;
      if(lastTs!=null){ let ts = (lastTs & ~0x1f) + off; if(off < (lastTs & 0x1f)) ts += 0x20; lastTs = ts; r[253] = ts; }
      handle(def.g,r);
    } else if(h & 0x40){ // definition message
      const local = h & 0x0f, dev = h & 0x20;
      pos++; const le = dv.getUint8(pos++)===0;
      const g = dv.getUint16(pos,le); pos += 2;
      const n = dv.getUint8(pos++), fields = [];
      for(let i=0;i<n;i++){ fields.push({num:dv.getUint8(pos),size:dv.getUint8(pos+1),type:dv.getUint8(pos+2)}); pos += 3; }
      let devSize = 0;
      if(dev){ const nd = dv.getUint8(pos++); for(let i=0;i<nd;i++){ devSize += dv.getUint8(pos+1); pos += 3; } }
      defs[local] = {g,le,fields,devSize};
    } else { // data message
      const def = defs[h & 0x0f]; if(!def) throw new Error('format');
      const r = readRec(def);
      if(r[253]!=null && r[253]!==0xffffffff) lastTs = r[253];
      handle(def.g,r);
    }
  }
  return {pts,name:null,sport};
}

// Detects the format from the bytes and parses it.
export function parseActivity(buf, Parser){
  const u8 = new Uint8Array(buf);
  if(u8.length>12 && String.fromCharCode(u8[8],u8[9],u8[10],u8[11])==='.FIT') return parseFIT(buf);
  const text = new TextDecoder().decode(u8);
  if(/<gpx[\s>]/i.test(text)) return parseGPX(text, Parser);
  if(/<TrainingCenterDatabase/i.test(text)) return parseTCX(text, Parser);
  throw new Error('format');
}
