// Shop: the price of the chosen print, saving a design, and handing it to the Shopify cart.
//
// Flow when the customer presses "Add to cart":
//   1. the design (settings + route) is saved on our server and gets an ID;
//   2. the browser goes to the shop's cart with the matching product variant and the design ID attached
//      to that cart line, so the order tells us exactly which design to print.
import { SHOP, EU_COUNTRIES, PRICES, VARIANTS, ORIENTS } from '../core/config.js';

const euro = n => '€' + (Number.isInteger(n) ? n : n.toFixed(2));

export function countryName(code){
  try{ return new Intl.DisplayNames(['en'], {type:'region'}).of(code) || code; }catch(e){ return code; }
}

// Price and delivery text for the current choices. country = ISO code from /api/context, or null if unknown.
export function priceFor(S, country){
  const tier = country === 'DE' ? 'de' : 'eu';
  const amount = PRICES[tier][S.format][S.size];
  const delivers = !country || EU_COUNTRIES.includes(country);
  const free = amount >= SHOP.freeShippingFrom;
  return {
    tier, amount, delivers, label: euro(amount),
    delivery: free ? 'Free delivery' : `+ ${euro(SHOP.shippingFee)} delivery, free from ${euro(SHOP.freeShippingFrom)}`,
    where: !country ? 'Price for delivery within the EU, confirmed at checkout.'
      : delivers ? `Price for delivery to ${countryName(country)}.`
      : 'We deliver within the EU only for now. This is the price for an EU address.',
  };
}

export function variantFor(S){
  const v = VARIANTS[S.format] && VARIANTS[S.format][S.size];
  return typeof v === 'string' ? v : v && v[S.frame];
}

// Route points as compact rows: [lat, lon, elevation, time].
export const packPoints = pts => pts.map(p => [p.lat, p.lon, p.ele ?? null, p.t ?? null]);
export const unpackPoints = rows => rows.map(r => ({lat:r[0], lon:r[1], ele:r[2] ?? null, t:r[3] ?? null}));

export async function saveDesign({S, pts, file}){
  const res = await fetch('/api/designs', { method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ v:1, s:S, pts: packPoints(pts), file }) });
  const data = await res.json().catch(() => ({}));
  if(!res.ok || !data.id) throw new Error(data.error || 'We couldn’t save your design. Check your connection and try again.');
  return data.id;
}

export async function fetchDesign(id){
  const res = await fetch('/api/designs/' + encodeURIComponent(id));
  if(!res.ok) throw new Error(res.status === 404 ? 'We couldn’t find that design. The link may be incomplete.' : 'We couldn’t open that design. Please try again.');
  return await res.json();
}

// Link that reopens a saved design. With print=true it also shows the internal print-file tool.
export function designUrl(id, {print = false} = {}){
  return `${location.origin}/?design=${id}${print ? '&print' : ''}`;
}

// The Shopify cart link for this design. Details the customer chose are attached to the cart line:
// the readable ones show in the cart and the order; the ones starting with "_" are for us (most themes
// hide them from the customer, the order page in the Shopify admin shows them).
export function cartUrl(S, id){
  const name = (list, v) => (list.find(x => x.id === v) || {}).name || v;
  const props = {
    'Design': S.title || 'Route print',
    'Orientation': name(ORIENTS, S.orient),
    'Border': S.border === 'none' ? 'Edge to edge' : 'White border',
    '_Design ID': id,
    '_Print file': designUrl(id, {print:true}),
  };
  const q = new URLSearchParams({ id: variantFor(S), quantity: '1' });
  for(const [k, v] of Object.entries(props)) q.append(`properties[${k}]`, v);
  return `https://${SHOP.domain}/cart/add?${q}`;
}
