// Print file export: renders the current poster at 300 dpi in the browser (map + SVG design) and saves it
// as a JPEG, ready to upload to Gelato. This is the same pipeline the print server will run later.
//
// How it works
// - Map: a hidden MapLibre map draws the same style at the poster's render size (1000·k units wide) with a
//   pixel ratio that reaches the target resolution. Big prints exceed what one WebGL canvas can hold, so the
//   map is drawn in tiles (same zoom, shifted centres) and stitched onto one canvas.
// - Design: the poster SVG is rasterised at full size on top. Fonts are embedded into the SVG as data URLs,
//   because an SVG drawn as an image can't load web fonts itself.
// Desktop Chrome is recommended: a 70×100 file is ~8,300 × 11,800 px, beyond Safari's canvas limits.
import { deg, latFromMercY } from '../core/geo.js';

const DPI = 300;
const cmToPx = cm => Math.round(cm / 2.54 * DPI);

// Map centre for a point given in poster units (x, y), using the poster's projection.
function lngLatAt(view, x, y){
  const mx = (x - view.ox) / view.sc, my = (y - view.oy) / view.sc;
  return [deg(mx), latFromMercY(my)];
}

function maxTilePx(){
  try{
    const gl = document.createElement('canvas').getContext('webgl');
    const v = gl.getParameter(gl.MAX_VIEWPORT_DIMS), r = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    return Math.min(4096, v[0], v[1], r); // 4096 keeps GPU memory per tile modest
  }catch(e){ return 2048; }
}

const idle = (map, ms=90000) => new Promise((ok, fail) => {
  const t = setTimeout(() => fail(new Error('The map took too long to load. Check your connection and try again.')), ms);
  map.once('idle', () => { clearTimeout(t); ok(); });
});

// Draws the map onto ctx (tw × th px). p = renderPoster() result, style = buildMapStyle().
async function drawMap(ctx, p, style, tw, th, progress){
  const k = (style.metadata && style.metadata.renderScale) || 1;
  const cssW = p.W * k, cssH = p.H * k;          // map size in CSS px, as in the preview
  const pr = tw / cssW;                          // pixel ratio that reaches print resolution
  const lim = maxTilePx();
  const cols = Math.ceil(cssW * pr / lim), rows = Math.ceil(cssH * pr / lim);
  const zoom = Math.log2(p.view.sc * 2 * Math.PI / 512) + Math.log2(k);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-30000px;top:0;pointer-events:none';
  document.body.appendChild(host);
  let map = null;
  try{
    const cut = (n, total) => Array.from({length:n+1}, (_, i) => Math.round(i * total / n));
    const xs = cut(cols, cssW), ys = cut(rows, cssH);
    let i = 0;
    for(let r = 0; r < rows; r++) for(let c = 0; c < cols; c++){
      const x0 = xs[c], x1 = xs[c+1], y0 = ys[r], y1 = ys[r+1];
      host.style.width = (x1-x0)+'px'; host.style.height = (y1-y0)+'px';
      const center = lngLatAt(p.view, (x0+x1)/2/k, (y0+y1)/2/k);
      progress(`Drawing the map ${++i} of ${cols*rows}…`);
      if(!map){
        map = new window.maplibregl.Map({ container: host, style, center, zoom, pixelRatio: pr,
          interactive: false, attributionControl: false, fadeDuration: 0, preserveDrawingBuffer: true,
          maxZoom: 24, renderWorldCopies: false, maxCanvasSize: [16384, 16384] });
      } else { map.resize(); map.jumpTo({center, zoom}); }
      await idle(map);
      const cv = map.getCanvas();
      ctx.drawImage(cv, 0, 0, cv.width, cv.height, x0/cssW*tw, y0/cssH*th, (x1-x0)/cssW*tw, (y1-y0)/cssH*th);
    }
  } finally { if(map) map.remove(); host.remove(); }
}

// Embeds the Google Fonts the poster uses (latin + latin-ext only) as data URLs.
async function fontCss(svg){
  const link = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  if(!link) return '';
  const css = await (await fetch(link.href)).text();
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  const used = blocks.filter(([, subset, face]) => {
    const fam = (face.match(/font-family:\s*'([^']+)'/) || [])[1];
    return (subset === 'latin' || subset === 'latin-ext') && fam && svg.includes(fam);
  });
  const toData = async url => {
    const b = await (await fetch(url)).blob();
    return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
  };
  const out = await Promise.all(used.map(async ([, , face]) => {
    const url = (face.match(/url\(([^)]+)\)/) || [])[1];
    return url ? face.replace(url, await toData(url)) : '';
  }));
  return out.join('\n');
}

async function drawDesign(ctx, svg, tw, th){
  let css = '';
  try{ css = await fontCss(svg); }catch(e){ console.warn('Fonts could not be embedded; using fallbacks.', e); }
  const full = svg.replace(/^<svg /, `<svg width="${tw}" height="${th}" `)
                  .replace(/^(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`);
  const url = URL.createObjectURL(new Blob([full], {type:'image/svg+xml'}));
  try{
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.drawImage(img, 0, 0, tw, th);
  } finally { URL.revokeObjectURL(url); }
}

// Main entry. Returns {blob, name, tw, th}.
export async function exportPrintFile({p, style, mapOn, name, progress = () => {}}){
  const tw = cmToPx(p.cw), th = cmToPx(p.ch);
  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');
  if(!ctx) throw new Error('This browser can’t create a canvas this large. Try desktop Chrome.');
  ctx.fillStyle = p.T.bg; ctx.fillRect(0, 0, tw, th);
  if(mapOn && p.view){
    if(!window.maplibregl) throw new Error('The map engine didn’t load.');
    await drawMap(ctx, p, style, tw, th, progress);
  }
  progress('Adding text and route…');
  await drawDesign(ctx, p.svg, tw, th);
  progress('Saving the file…');
  const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', .95));
  canvas.width = canvas.height = 0; // free memory
  if(!blob) throw new Error('The browser couldn’t save a file this large. Try desktop Chrome.');
  return { blob, name, tw, th };
}
