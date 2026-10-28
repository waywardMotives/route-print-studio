// Live map behind the poster preview. (Rendered at the poster size times the map detail render scale k.)
//
// The map is always rendered at the poster's own coordinate size (1000 units wide = 1000 CSS px)
// and then scaled down with a CSS transform to fit the preview. That keeps the map's zoom level
// tied to the poster rather than to the visitor's screen, so the preview matches the print exactly.
// The print server renders the same style at the same 1000-px size with a higher pixel ratio.
import { latFromMercY, deg } from '../core/geo.js';

export function cameraFor(view, W, H){
  // MapLibre world size is 512 * 2^zoom px for 2π radians of longitude.
  const zoom = Math.log2(view.sc * 2*Math.PI / 512);
  const mx = (W/2 - view.ox)/view.sc, my = (H/2 - view.oy)/view.sc;
  return { center: [deg(mx), latFromMercY(my)], zoom };
}

export class MapPreview {
  constructor(host){
    this.host = host;
    this.el = document.createElement('div');
    this.el.className = 'map-layer';
    this.el.setAttribute('aria-hidden','true');
    host.prepend(this.el);
    this.map = null; this.styleKey = ''; this.size = '';
    this.ok = typeof window.maplibregl !== 'undefined';
    if(this.ok && window.maplibregl.supported && !window.maplibregl.supported()) this.ok = false;
    new ResizeObserver(()=>this.fit()).observe(host);
  }
  fit(){
    if(!this.W) return;
    const s = this.host.clientWidth / (this.W * this.k);
    this.el.style.transform = `scale(${s})`;
    if(this.map){
      const pr = Math.min(3, Math.max(.75/this.k, (window.devicePixelRatio||1) * s)); // canvas pixels stay the same at any render scale
      if(Math.abs(this.map.getPixelRatio() - pr) > .05) this.map.setPixelRatio(pr);
    }
  }
  hide(){ this.el.hidden = true; }
  // p = renderPoster() result; style = buildMapStyle(); key identifies the style inputs.
  update(p, style, key){
    if(!this.ok || !p.view){ this.hide(); return false; }
    this.el.hidden = false;
    // Render scale k (style.metadata.renderScale): draw k× larger, shrink by 1/k. Same picture, more street data.
    const k = (style.metadata && style.metadata.renderScale) || 1;
    const size = `${p.W}x${p.H}@${k}`;
    if(size !== this.size){
      this.size = size; this.W = p.W; this.k = k;
      this.el.style.width = p.W*k+'px'; this.el.style.height = p.H*k+'px';
      if(this.map) this.map.resize();
    }
    const cam = cameraFor(p.view, p.W, p.H); cam.zoom += Math.log2(k);
    if(!this.map){
      this.map = new window.maplibregl.Map({
        container: this.el, style, center: cam.center, zoom: cam.zoom,
        interactive: false, attributionControl: false, fadeDuration: 0,
        maxZoom: 22, minZoom: 0, renderWorldCopies: false,
      });
      this.map.on('error', e => { if(!this.loggedError){ this.loggedError = true; console.warn('Map:', e && e.error && e.error.message); } });
      this.styleKey = key;
    } else {
      if(key !== this.styleKey){ this.map.setStyle(style, {diff:true}); this.styleKey = key; }
      this.map.jumpTo({center: cam.center, zoom: cam.zoom});
    }
    this.fit();
    return true;
  }
}
