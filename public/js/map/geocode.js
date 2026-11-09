// Suggests a location ("City, Country") for a route by reverse geocoding its start point with
// OpenStreetMap's Nominatim service. Used only to pre-fill the Location field; customers can edit it.
//
// Nominatim's usage policy: at most 1 request per second, identify the app (the browser sends our site
// as Referer), show OSM attribution (already on every map print). That suits our current volume; before
// heavy traffic, switch NOMINATIM to a hosted provider (e.g. LocationIQ or Geoapify, same response format).
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
let last = 0;

export async function placeFor(lat, lon, {timeout = 6000} = {}){
  const wait = Math.max(0, last + 1100 - Date.now()); // stay under 1 request per second
  if(wait) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  const url = `${NOMINATIM}?format=jsonv2&zoom=10&addressdetails=1&accept-language=en&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try{
    const res = await fetch(url, {signal: ctl.signal, headers: {'Accept': 'application/json'}});
    if(!res.ok) return null;
    const a = (await res.json()).address || {};
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state;
    return [city, a.country].filter(Boolean).join(', ') || null;
  }catch(e){ return null; }
  finally{ clearTimeout(t); }
}
