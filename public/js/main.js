// Configurator UI: holds the customer's choices, redraws the poster and keeps the map in sync.
import { THEMES, ACCENT_PRESETS, HEAD_FONTS, DETAIL_FONTS, LAYOUTS, SIZES, FORMATS, FRAMES, SPORTS, MAP_DETAILS, MAP_STRENGTHS, MAP_LAYERS, ORIENTS } from './core/config.js';
import { C } from './core/color.js';
import { parseActivity } from './core/parse.js';
import { buildTrack, sampleTrack, fmtDur, fmtKm, esc } from './core/geo.js';
import { renderPoster } from './core/poster.js';
import { buildMapStyle } from './map/style.js';
import { MapPreview } from './map/preview.js';
import { exportPrintFile } from './export/printfile.js';
import { placeFor } from './map/geocode.js';
import { priceFor, saveDesign, fetchDesign, cartUrl, unpackPoints } from './shop/cart.js';

const $ = id => document.getElementById(id);

// Customer choices. `track` holds the prepared route.
const S = {
  theme:'midnight', layout:'classic', orient:'portrait', size:'50x70', format:'framed', frame:'black', border:'white',
  sport:'run', title:'', name:'', place:'', date:'', time:'', showElev:true,
  headFont:'montserrat', detailFont:'plex', lineW:1, accent:null, units:'metric',
  accentOn:{route:true, unit:true, elev:true},
  showName:true, showPlace:true, showDate:true, showGain:true,
  map:true, mapDetail:'streets', mapStrength:'balanced', mapColors:{},
};
let track = null, fileName = '';
// The customer's own route points, as they are saved with an order (null while the sample route is shown).
let rawPts = null;
// Visitor's country (ISO code) for the price tier; null until /api/context answers, or if it can't tell.
let country = null;

// A saved design has to reopen exactly as the customer saw it. So uploaded points are rounded once, on
// upload, to the precision we store (about 1 cm, 0.1 m of elevation, 1 ms): the preview and the saved copy
// are then built from the very same numbers.
const roundPoints = pts => pts.filter(p => isFinite(p.lat) && isFinite(p.lon)).map(p => ({
  lat: +p.lat.toFixed(7), lon: +p.lon.toFixed(7),
  ele: p.ele == null || !isFinite(p.ele) ? null : +p.ele.toFixed(1),
  t: p.t == null || !isFinite(p.t) ? null : Math.round(p.t) }));

// ---------- text measuring (browser) ----------
const meas = document.createElement('canvas').getContext('2d');
const measure = (str,size,fam,wt) => { meas.font = `${wt} ${size}px ${fam}`; return meas.measureText(str).width; };

function loadFonts(){
  if(!document.fonts || !document.fonts.load) return;
  const h = HEAD_FONTS.find(x=>x.id===S.headFont), d = DETAIL_FONTS.find(x=>x.id===S.detailFont);
  const fam = s => s.split(',')[0];
  const reqs = [`${h.heavy} 40px ${fam(h.f)}`,`${h.bold} 40px ${fam(h.f)}`,`${d.wl} 20px ${fam(d.label)}`,`${d.wv} 20px ${fam(d.stat)}`,`400 20px ${fam(d.stat)}`,`400 20px ${fam(d.label)}`];
  Promise.all(reqs.map(r=>document.fonts.load(r).catch(()=>null))).then(()=>draw());
}

// ---------- track ----------
function useTrack(res, fname){
  const t = buildTrack(res.pts);
  if(!t) throw new Error('nopoints');
  track = t; fileName = fname || '';
  const st = t.stats;
  S.title = res.name || (fname ? fname.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim() : 'My race');
  S.date = st.start ? new Date(st.start).toISOString().slice(0,10) : '';
  S.time = st.dur ? fmtDur(st.dur) : '';
  if(res.sport) S.sport = res.sport;
  else if(st.dur && st.distKm){ const kmh = st.distKm/(st.dur/3600); S.sport = kmh>22 ? 'ride' : kmh<6.5 ? 'hike' : 'run'; }
  $('i-title').value = S.title; $('i-date').value = S.date; $('i-time').value = S.time; $('i-sport').value = S.sport;
  $('i-elev').disabled = !t.profile;
  if(fname) autofill(res, t);
}
// Pre-fills athlete name and location for an uploaded file, without touching anything the customer typed:
// only fields that are empty or still show the sample values are filled.
const SAMPLE = {name:'Laura Berg', place:'Riverside'};
function autofill(res, t){
  const free = k => !S[k] || S[k] === SAMPLE[k];
  if(free('name')){ S.name = res.athlete || ''; $('i-name').value = S.name; }
  if(free('place')){
    S.place = ''; $('i-place').value = '';
    const p0 = t.pts[0], forTrack = t;
    placeFor(p0.lat, p0.lon).then(place => {
      if(!place || track !== forTrack || S.place) return; // customer typed something or uploaded another file
      S.place = place; $('i-place').value = place; draw();
    });
  }
}
function setStatus(html){ $('status').innerHTML = html; }
// Message under the Add to cart button ('' hides it).
function buyNote(msg){ $('buyStatus').textContent = msg; $('buyStatus').hidden = !msg; }
// Summary of the uploaded file, in the chosen units.
function refreshStatus(){
  if(!fileName || !track) return;
  const d = S.units==='imperial' ? fmtKm(track.stats.distKm*.621371)+' mi' : fmtKm(track.stats.distKm)+' km';
  setStatus(`<span>${esc(fileName)} · ${track.pts.length.toLocaleString('en-GB')} points · ${d}${track.profile?'':' · no elevation data'}</span><button type="button" class="linkbtn" id="useSample">Back to sample</button>`);
}
async function loadFile(file){
  try{
    const res = parseActivity(await file.arrayBuffer());
    res.pts = roundPoints(res.pts);
    useTrack(res, file.name);
    rawPts = res.pts;
    refreshStatus(); buyNote('');
    draw();
  }catch(e){
    const msg = e.message==='nopoints'
      ? 'That file has no GPS points. Indoor or treadmill activities can’t be drawn. Try an outdoor activity.'
      : 'We couldn’t read that file. Export the activity as GPX, TCX or FIT and upload it again.';
    setStatus(`<span class="err" role="alert">${msg}</span><button type="button" class="linkbtn" id="useSample">Use sample route</button>`);
  }
}
function loadSample(){
  useTrack({pts:sampleTrack(), name:'Riverside City Marathon', sport:'run'}, '');
  rawPts = null;
  S.name = SAMPLE.name; S.place = SAMPLE.place;
  $('i-name').value = S.name; $('i-place').value = S.place;
  setStatus('<span>Showing a sample marathon route. Upload your own file to replace it.</span>');
}

// ---------- saved designs ----------
// Copies a saved design's settings into S, accepting only values the configurator itself could have produced.
// (A design link can come from anywhere, so nothing in it is trusted: unknown options fall back to the
// defaults, colours must be plain hex, text is cut to the field lengths.)
const HEX = /^#[0-9a-f]{6}$/i;
const TEXT_MAX = {title:60, name:40, place:40, date:10, time:9};
function restoreState(saved){
  const ids = list => list.map(o => o.id);
  const pick = (k, allowed) => { S[k] = allowed.includes(saved[k]) ? saved[k] : (DEFAULTS[k] ?? S[k]); };
  for(const [k, max] of Object.entries(TEXT_MAX)) S[k] = typeof saved[k] === 'string' ? saved[k].slice(0, max) : '';
  for(const k of ['showElev','showName','showPlace','showDate','showGain','map']) if(typeof saved[k] === 'boolean') S[k] = saved[k];
  pick('theme', Object.keys(THEMES)); pick('layout', ids(LAYOUTS)); pick('orient', ids(ORIENTS)); pick('size', ids(SIZES));
  pick('format', ids(FORMATS)); pick('frame', ids(FRAMES)); pick('border', ['white','none']); pick('sport', ids(SPORTS));
  pick('headFont', ids(HEAD_FONTS)); pick('detailFont', ids(DETAIL_FONTS)); pick('units', ['metric','imperial']);
  pick('mapDetail', ids(MAP_DETAILS)); pick('mapStrength', ids(MAP_STRENGTHS));
  S.lineW = typeof saved.lineW === 'number' && isFinite(saved.lineW) ? Math.min(2.5, Math.max(.5, saved.lineW)) : 1;
  S.accent = typeof saved.accent === 'string' && HEX.test(saved.accent) ? saved.accent : null;
  S.accentOn = {route:true, unit:true, elev:true};
  if(saved.accentOn && typeof saved.accentOn === 'object')
    for(const k of Object.keys(S.accentOn)) if(typeof saved.accentOn[k] === 'boolean') S.accentOn[k] = saved.accentOn[k];
  S.mapColors = {};
  if(saved.mapColors && typeof saved.mapColors === 'object')
    for(const l of MAP_LAYERS){ const c = saved.mapColors[l.id]; if(typeof c === 'string' && HEX.test(c)) S.mapColors[l.id] = c; }
}
// Makes the form controls show what S holds (the chips and swatches are handled by draw()).
const SHOW_TOGGLES = [['s-name','showName','i-name'],['s-place','showPlace','i-place'],['s-date','showDate','i-date'],['s-gain','showGain',null]];
function syncInputs(){
  $('i-title').value = S.title; $('i-name').value = S.name; $('i-place').value = S.place;
  $('i-date').value = S.date; $('i-time').value = S.time; $('i-sport').value = S.sport;
  $('i-elev').checked = S.showElev; $('i-elev').disabled = !(track && track.profile);
  for(const [id, key, input] of SHOW_TOGGLES){ $(id).checked = S[key]; if(input) $(input).disabled = !S[key]; }
  const lw = Math.round(S.lineW*100); $('i-line').value = lw; $('o-line').textContent = lw+'%';
  document.querySelectorAll('[data-accent]').forEach(cb => { cb.checked = !!S.accentOn[cb.dataset.accent]; });
}
// Opens a design saved earlier (the address ends in ?design=<id>): same route, same settings.
async function openDesign(id){
  setStatus('<span>Opening your design…</span>');
  try{
    const d = await fetchDesign(id);
    const num = v => typeof v === 'number' && isFinite(v);
    const pts = unpackPoints(Array.isArray(d.pts) ? d.pts.filter(Array.isArray) : [])
      .filter(p => num(p.lat) && num(p.lon))
      .map(p => ({lat:p.lat, lon:p.lon, ele: num(p.ele) ? p.ele : null, t: num(p.t) ? p.t : null}));
    const t = buildTrack(pts);
    if(!t) throw new Error('That design has no route we can draw.');
    track = t; rawPts = pts;
    fileName = typeof d.file === 'string' && d.file ? d.file.slice(0, 200) : 'Saved design';
    restoreState(d.s && typeof d.s === 'object' ? d.s : {});
    syncInputs(); refreshStatus(); loadFonts(); draw();
  }catch(e){
    setStatus(`<span class="err" role="alert">${esc(e.message || 'We couldn’t open that design.')}</span><span>Showing the sample route instead.</span>`);
  }
}

// ---------- UI ----------
function chipGroup(el,items,key,label,after){
  el.innerHTML = items.map(it=>`<button type="button" class="chip" data-v="${it.id}">${it.dot?`<span class="dot" style="background:${it.dot}"></span>`:''}${label?label(it):it.name}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('button'); if(!b||b.disabled) return; S[key] = b.dataset.v; if(after) after(b.dataset.v); draw(); };
}
function buildUI(){
  $('themes').innerHTML = Object.entries(THEMES).map(([id,T])=>{
    let pat = '';
    if(T.pat==='grid') pat = `<path d="M10 0V80M20 0V80M30 0V80M40 0V80M50 0V80M0 10H60M0 20H60M0 30H60M0 40H60M0 50H60M0 60H60M0 70H60" stroke="${T.patC}" stroke-width="1"/>`;
    if(T.pat==='dots') pat = `<g fill="${T.patC}">${Array.from({length:30},(_,i)=>`<circle cx="${6+(i%6)*10}" cy="${8+Math.floor(i/6)*14}" r="1.2"/>`).join('')}</g>`;
    if(T.pat==='contours') pat = `<g fill="none" stroke="${T.patC}" stroke-width="1"><path d="M-5 20C15 8 35 30 65 14"/><path d="M-5 34C20 22 40 44 65 28"/><path d="M-5 62C20 50 40 72 65 56"/></g>`;
    const M = T.map;
    const mapArt = M ? `<path d="M0 58C14 50 26 64 40 56S56 50 60 52V68H0Z" fill="${M.water}"/><rect x="38" y="6" width="16" height="12" rx="2" fill="${M.park}"/>`+
      (M.casing?`<path d="M0 30H60M22 0V80M0 12L60 44" stroke="${M.casing}" stroke-width="3.4"/>`:'')+`<path d="M0 30H60M22 0V80" stroke="${M.road}" stroke-width="2"/><path d="M0 12L60 44" stroke="${M.motorway}" stroke-width="2"/>` : pat;
    return `<button type="button" class="sw" data-v="${id}"><svg viewBox="0 0 60 80" aria-hidden="true"><rect width="60" height="80" fill="${T.bg}"/>${mapArt}<path d="M14 52C10 38 22 30 28 22S44 14 46 28 38 44 44 52 30 62 14 52Z" fill="none" stroke="${T.route}" stroke-width="2.4" stroke-linejoin="round"/><rect x="10" y="66" width="26" height="4" fill="${T.text}"/><rect x="10" y="72" width="16" height="2" fill="${T.muted}"/><circle cx="14" cy="52" r="2.6" fill="${T.accent}"/></svg>${T.name}</button>`;
  }).join('');
  $('themes').onclick = e => { const b = e.target.closest('button'); if(!b) return; S.theme = b.dataset.v; S.accent = null; S.mapColors = {}; if(THEMES[S.theme].detail) S.mapDetail = THEMES[S.theme].detail; draw(); };

  const colorRow = (el,list,key,inputId) => {
    el.innerHTML = `<button type="button" class="chip chip-theme" data-v=""><svg class="tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Theme</button>` +
      list.map(c=>`<button type="button" class="dot-sw" data-v="${c.hex}" style="--c:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join('') +
      `<label class="dot-sw custom" title="Custom colour"><input type="color" id="${inputId}" aria-label="Custom colour" value="#7a8899"></label>`;
    el.addEventListener('click',e=>{ const b = e.target.closest('button'); if(!b) return; S[key] = b.dataset.v || null; draw(); });
    $(inputId).addEventListener('input',e=>{ S[key] = e.target.value; draw(); });
  };
  colorRow($('accents'),ACCENT_PRESETS,'accent','c-accent');

  chipGroup($('mapOn'),[{id:'on',name:'Street map'},{id:'off',name:'Plain'}],'mapOnId',null,v=>{ S.map = v==='on'; });
  $('mapLayers').innerHTML = MAP_LAYERS.map(l=>`<label class="layer-sw" title="Change ${l.name.toLowerCase()} colour"><span class="swatch"></span>${l.name}<input type="color" id="ml-${l.id}" data-layer="${l.id}" aria-label="${l.name} colour"></label>`).join('') +
    `<button type="button" class="linkbtn" id="mlReset" hidden>Reset to theme colours</button>`;
  $('mapLayers').addEventListener('input',e=>{ const k = e.target.dataset && e.target.dataset.layer; if(!k) return; S.mapColors = {...S.mapColors, [k]: e.target.value}; draw(); });
  $('mlReset').addEventListener('click',()=>{ S.mapColors = {}; draw(); });
  // Accent targets: which elements use the accent colour.
  document.querySelectorAll('[data-accent]').forEach(cb=>cb.addEventListener('change',()=>{ S.accentOn = {...S.accentOn, [cb.dataset.accent]: cb.checked}; draw(); }));
  chipGroup($('units'),[{id:'metric',name:'Kilometres'},{id:'imperial',name:'Miles'}],'units',null,()=>refreshStatus());
  chipGroup($('mapDetail'),MAP_DETAILS,'mapDetail');
  chipGroup($('mapStrength'),MAP_STRENGTHS,'mapStrength');
  chipGroup($('layouts'),LAYOUTS,'layout');
  chipGroup($('orients'),ORIENTS,'orient');
  chipGroup($('sizes'),SIZES,'size',it=>it.name+(/^a/.test(it.id)?'':' cm'));
  chipGroup($('formats'),FORMATS,'format');
  chipGroup($('frames'),FRAMES.map(f=>({...f,dot:f.c})),'frame');
  chipGroup($('borders'),[{id:'white',name:'White border'},{id:'none',name:'Edge to edge'}],'border');
  chipGroup($('headFonts'),HEAD_FONTS,'headFont',it=>`<span style='font-family:${it.f};font-weight:${it.bold}'>${it.name}</span>`,loadFonts);
  chipGroup($('detailFonts'),DETAIL_FONTS,'detailFont',it=>`<span style='font-family:${it.stat};font-weight:${it.wv}'>${it.name}</span>`,loadFonts);

  $('i-sport').innerHTML = SPORTS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  const bind = (id,key,ev='input') => $(id).addEventListener(ev,e=>{ S[key] = e.target.value; draw(); });
  bind('i-title','title'); bind('i-name','name'); bind('i-place','place'); bind('i-date','date'); bind('i-time','time'); bind('i-sport','sport','change');
  $('i-elev').addEventListener('change',e=>{ S.showElev = e.target.checked; draw(); });
  for(const [id,key,input] of SHOW_TOGGLES)
    $(id).addEventListener('change',e=>{ S[key] = e.target.checked; if(input) $(input).disabled = !e.target.checked; draw(); });
  $('i-line').addEventListener('input',e=>{ S.lineW = e.target.value/100; $('o-line').textContent = e.target.value+'%'; draw(); });

  // Theme accordion: one row when collapsed (always including the selected theme), all when expanded.
  $('themesToggle').addEventListener('click',()=>{ const open = $('themesToggle').getAttribute('aria-expanded')!=='true'; $('themesToggle').setAttribute('aria-expanded', String(open)); layoutThemes(); });
  new ResizeObserver(()=>layoutThemes()).observe($('themes'));
  // Tabs: one configuration step visible at a time; arrow keys move between tabs.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const showTab = (t, focus) => {
    for(const x of tabs){ const on = x===t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; }
    if(focus) t.focus();
    t.scrollIntoView({block:'nearest', inline:'nearest'});
    try{ localStorage.setItem('rps-tab', t.id); }catch(e){}
  };
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>showTab(t));
    t.addEventListener('keydown',e=>{ const d = e.key==='ArrowRight' ? 1 : e.key==='ArrowLeft' ? -1 : 0; if(d){ e.preventDefault(); showTab(tabs[(i+d+tabs.length)%tabs.length], true); } });
  });
  document.querySelectorAll('.btn-next[data-next]').forEach(b=>b.addEventListener('click',()=>{ showTab($(b.dataset.next)); document.querySelector('.tabs').scrollIntoView({block:'nearest'}); }));
  try{ const saved = localStorage.getItem('rps-tab'); if(saved && $(saved)) showTab($(saved)); }catch(e){}
  $('file').addEventListener('change',e=>{ if(e.target.files[0]) loadFile(e.target.files[0]); e.target.value=''; });
  const drop = $('drop');
  ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over');}));
  ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over');}));
  drop.addEventListener('drop',e=>{ const f = e.dataTransfer.files[0]; if(f) loadFile(f); });
  $('status').addEventListener('click',e=>{ if(e.target.id==='useSample'){ loadSample(); draw(); } });

  // Add to cart: save the design, then hand over to the shop's cart with the design attached.
  $('addToCart').addEventListener('click', async () => {
    if(!rawPts){ buyNote('This is still the sample route. Upload your own race file in step 1 to order it.'); return; }
    const btn = $('addToCart');
    btn.disabled = true; buyNote('Saving your design…');
    try{
      const id = await saveDesign({S, pts: rawPts, file: fileName});
      buyNote('Taking you to the cart…');
      location.assign(cartUrl(S, id));
    }catch(e){ buyNote(e.message || 'We couldn’t save your design. Please try again.'); btn.disabled = false; }
  });
  // Coming back from the cart with the browser's Back button: make the button usable again.
  window.addEventListener('pageshow', () => { $('addToCart').disabled = false; buyNote(''); });
}

// Shows one row of theme cards when collapsed. The selected theme always stays visible.
function layoutThemes(){
  const grid = $('themes'), open = $('themesToggle').getAttribute('aria-expanded')==='true';
  const items = [...grid.children];
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 5;
  const sel = items.findIndex(b=>b.dataset.v===S.theme);
  items.forEach((b,i)=>{ b.hidden = !open && (i >= cols || (sel >= cols && i === cols-1)) && i !== sel; });
  grid.classList.toggle('collapsed', !open);
  $('themesToggle').textContent = open ? 'Show fewer' : `Show all ${items.length} themes`;
}

// ---------- render ----------
let mapView = null, svgHost = null;
// Product options must be ones we still sell. A saved or URL-supplied design that names a removed option
// (e.g. Canvas, a square size, Square or Gallery tile, or a retired theme) falls back to the default.
const DEFAULTS = {theme:'midnight', layout:'classic', orient:'portrait', size:'50x70', format:'framed', frame:'black', border:'white'};
const OPTIONS = {theme:Object.keys(THEMES), layout:LAYOUTS, orient:ORIENTS, size:SIZES, format:FORMATS, frame:FRAMES,
  border:[{id:'white'},{id:'none'}]};
function normalize(){
  for(const [k, list] of Object.entries(OPTIONS)){
    const ids = list.map(o => typeof o === 'string' ? o : o.id);
    if(!ids.includes(S[k])) S[k] = DEFAULTS[k];
  }
}

function draw(){
  normalize();
  if(!track) return;
  const p = renderPoster(S, track, measure);
  svgHost.innerHTML = p.svg;

  // Map layer: only rebuild the style when its inputs change; camera follows the route every time.
  const mapShown = S.map && mapView.update(p, buildMapStyle(p.T,{detail:S.mapDetail,strength:S.mapStrength}),
    [p.T.bg,JSON.stringify(p.T.map),S.mapDetail,S.mapStrength].join('|'));
  if(!S.map) mapView.hide();
  $('credit').hidden = !mapShown;
  $('mapOpts').hidden = !S.map;
  // Without the map only the Background colour applies.
  $('colorsLabel').textContent = S.map ? 'Map colours' : 'Background colour';
  document.querySelectorAll('#mapLayers .layer-sw').forEach(el=>{ el.hidden = !S.map && el.querySelector('input').dataset.layer!=='land'; });
  $('unitLabel').textContent = S.units==='imperial' ? 'Miles' : 'Km';

  const fr = $('frame');
  fr.className = 'frame ' + S.format;
  const F = FRAMES.find(f=>f.id===S.frame);
  fr.style.setProperty('--fc',F.c);
  // Paper proportions; the white border is printed, so the mat shows it at true scale (padding % = share of width).
  const pad = S.format==='framed' ? .032 : 0;
  fr.style.setProperty('--ar', (1/((1-2*pad)*p.ch/p.cw + 2*pad)).toFixed(4));
  fr.style.setProperty('--bd', (p.border/p.cw*100).toFixed(3)+'%');
  $('frameWrap').hidden = S.format!=='framed';
  const px = c => Math.round(c/2.54*300).toLocaleString('en-GB');
  const fmt = FORMATS.find(f=>f.id===S.format).name + (S.format==='framed' ? ` (${F.name.toLowerCase()})` : '');
  const bd = p.border ? `White border ${p.border.toLocaleString('en-GB')} cm` : 'Edge to edge';
  $('specs').innerHTML = `<span>${p.cw} × ${p.ch} cm</span><span>${fmt}</span>${bd?`<span>${bd}</span>`:''}<span>Print file ${px(p.cw+.8)} × ${px(p.ch+.8)} px at 300 dpi (incl. 4 mm bleed)</span>`;

  const price = priceFor(S, country);
  $('priceMain').textContent = price.label; $('priceDelivery').textContent = price.delivery; $('priceWhere').textContent = price.where;

  const mark = (sel,v) => document.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
  mark('#themes .sw',S.theme); layoutThemes(); mark('#layouts .chip',S.layout); mark('#orients .chip',S.orient);
  mark('#headFonts .chip',S.headFont); mark('#detailFonts .chip',S.detailFont);
  mark('#mapOn .chip',S.map?'on':'off'); mark('#mapDetail .chip',S.mapDetail); mark('#mapStrength .chip',S.mapStrength);
  mark('#sizes .chip',S.size); mark('#formats .chip',S.format); mark('#frames .chip',S.frame); mark('#borders .chip',S.border); mark('#units .chip',S.units);
  for(const [row,key,list,hint] of [['accents','accent',ACCENT_PRESETS,'accentHint']]){
    const v = S[key] || '';
    document.querySelectorAll(`#${row} button`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
    const custom = document.querySelector(`#${row} .custom`), isCustom = !!v && !list.some(c=>c.hex===v);
    custom.classList.toggle('on',isCustom); custom.style.setProperty('--c',isCustom ? v : '');
    const note = p.T.notes[key]; $(hint).textContent = note; $(hint).hidden = !note;
  }
  // Map colour swatches show the colours actually used (after guardrails).
  for(const l of MAP_LAYERS){
    const c = p.T.map[l.id], inp = $('ml-'+l.id);
    inp.closest('.layer-sw').querySelector('.swatch').style.background = c;
    if(document.activeElement !== inp) inp.value = c;
  }
  $('mlReset').hidden = !Object.keys(S.mapColors).length;
  const mh = [p.T.notes.bg, p.T.notes.map].filter(Boolean).join(' ');
  $('mapHint').textContent = mh; $('mapHint').hidden = !mh;
  // Dim accent swatches that would nearly vanish on the current background (still clickable; they get corrected).
  document.querySelectorAll('#accents .dot-sw[data-v]').forEach(b=>{
    const weak = C.contrast(b.dataset.v,p.T.bg) < 2;
    b.style.opacity = weak ? .3 : ''; b.title = b.getAttribute('aria-label') + (weak ? ' (too close to this background)' : '');
  });
}

// ---------- start ----------
// ---------- internal: print file export (open the site with ?print) ----------
if(/[?&#]print\b/.test(location.search + location.hash)){
  $('exportWrap').hidden = false;
  $('exportBtn').addEventListener('click', async () => {
    const btn = $('exportBtn'), st = $('exportStatus');
    btn.disabled = true;
    try{
      const p = renderPoster(S, track, measure);
      const slug = s => (s||'').toLowerCase().normalize('NFKD').replace(/[^\w]+/g,'-').replace(/^-|-$/g,'');
      const name = [slug(S.title)||'route', S.size, S.orient, S.theme].join('_') + '.jpg';
      const out = await exportPrintFile({ p, mapOn: S.map, name,
        style: buildMapStyle(p.T,{detail:S.mapDetail,strength:S.mapStrength}), progress: m => { st.textContent = m; } });
      const a = document.createElement('a'); a.href = URL.createObjectURL(out.blob); a.download = out.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 60000);
      st.textContent = `Saved ${out.name}: ${out.tw.toLocaleString('en-GB')} × ${out.th.toLocaleString('en-GB')} px, ${(out.blob.size/1048576).toFixed(1)} MB.`;
    }catch(e){ console.error(e); st.textContent = 'Couldn’t create the file: ' + (e.message || e); }
    finally{ btn.disabled = false; }
  });
}

const posterEl = $('poster');
svgHost = document.createElement('div'); svgHost.className = 'svg-layer'; posterEl.appendChild(svgHost);
mapView = new MapPreview(posterEl);
buildUI(); loadSample(); draw(); loadFonts();
const designId = new URLSearchParams(location.search).get('design');
if(designId) openDesign(designId);
fetch('/api/context').then(r => r.ok ? r.json() : {}).then(d => { if(typeof d.country === 'string'){ country = d.country; draw(); } }).catch(() => {});
if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

// Exposed for debugging and automated checks.
window.__studio = { S, get track(){ return track; }, get rawPts(){ return rawPts; }, get country(){ return country; },
  set country(c){ country = c; draw(); }, draw, get map(){ return mapView.map; } };
