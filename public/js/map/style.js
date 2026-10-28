// Builds a MapLibre style from the poster's resolved colours.
// Each map layer (land, water, parks, buildings, roads by class, rail) gets its own colour from
// the theme's map palette (T.map, resolved and guarded in core/theme.js). "Map strength" controls
// how far those colours are applied over the land colour. Light themes with white roads get a
// thin casing underneath so the streets read like a printed city map.
// No labels: posters look cleaner without street names. Schema: OpenMapTiles.
import { C } from '../core/color.js';
import { MAP_SOURCE, MAP_STRENGTHS, MAP_DETAILS } from '../core/config.js';

export function buildMapStyle(T, {detail='streets', strength='balanced'} = {}){
  const st = MAP_STRENGTHS.find(s=>s.id===strength) || MAP_STRENGTHS[1];
  const M = T.map, land = T.bg;
  // Ink themes: full colour at Balanced, heavier roads at Bold, slightly heavier roads overall.
  const ink = !!T.inkMap;
  const p = ink ? {subtle:.7, balanced:1, bold:1}[st.id] ?? 1 : st.p;
  const wm = ink ? (st.id==='bold' ? 1.35 : 1.15) : 1;
  const col = k => C.mix(land, M[k] || M.road, p);
  const full = detail==='detailed', streets = detail!=='minimal';
  // Render scale k (see MAP_DETAILS): zoom stops shift by log2(k) and widths scale by k, so after the
  // preview shrinks the map by 1/k every line has exactly its normal width.
  const k = (MAP_DETAILS.find(d=>d.id===detail) || {}).k || 1, dz = Math.log2(k);
  const width = (stops, f=1) => ['interpolate',['exponential',1.6],['zoom'], ...stops.flatMap(([z,w])=>[z+dz,w*f*k])];
  const cls = list => ['match',['get','class'],list,true,false];
  const road = (id, classes, color, stops, extra={}) => ({
    id, type:'line', source:'omt', 'source-layer':'transportation',
    filter:['all', cls(classes), ['!=',['get','brunnel'],'tunnel']],
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':color, 'line-width':width(stops, wm), ...extra},
  });
  // Road classes: [id, classes, palette key, width stops, shown?]
  const roads = [
    ['service', ['service','track'], 'minor', [[13,.3],[16,1.2],[18,3]], full],
    ['minor', ['minor'], 'minor', [[11,.3],[14,1],[17,4]], streets],
    ['tertiary', ['tertiary'], 'road', [[10,.3],[13,1],[17,5]], streets],
    ['major', ['primary','secondary'], 'road', [[8,.35],[12,1.2],[16,5.5],[18,10]], true],
    ['motorway', ['motorway','trunk'], 'motorway', [[6,.45],[10,1.1],[14,4],[18,11]], true],
  ].filter(r=>r[4]);

  const layers = [
    {id:'background', type:'background', paint:{'background-color':land}},
    {id:'greenery', type:'fill', source:'omt', 'source-layer':'landcover', filter:cls(['wood','forest','grass']), paint:{'fill-color':col('park'), 'fill-opacity':.7}},
    {id:'park', type:'fill', source:'omt', 'source-layer':'park', paint:{'fill-color':col('park')}},
    {id:'water', type:'fill', source:'omt', 'source-layer':'water', paint:{'fill-color':col('water')}},
    {id:'waterway', type:'line', source:'omt', 'source-layer':'waterway', layout:{'line-cap':'round'},
      paint:{'line-color':col('water'), 'line-width':width([[10,.5],[14,1.6],[17,4]])}},
  ];
  if(full) layers.push({id:'building', type:'fill', source:'omt', 'source-layer':'building', minzoom:13, paint:{'fill-color':col('building')}});
  if(full) layers.push(road('path', ['path'], col('minor'), [[13,.3],[16,1],[18,2]], {'line-dasharray':[2,1.5]}));
  if(M.casing){ // outlines first, so every road's fill sits on top of all casings
    // Outlines stay near full strength at every map strength so light streets always read.
    const cas = C.mix(land, M.casing, Math.max(st.p, .95));
    for(const [id,classes,,stops] of roads) layers.push(road(id+'-casing', classes, cas, stops.map(([z,w])=>[z,w*2+.6])));
  }
  for(const [id,classes,key,stops] of roads) layers.push(road(id, classes, col(key), stops));
  if(full || (ink && streets)) layers.push(road('rail', ['rail'], col('rail'), [[11,.4],[16,1.4]], {'line-dasharray':[3,2]}));

  return {
    version: 8,
    name: 'route-print',
    sources: { omt: { type:'vector', url: MAP_SOURCE.url } },
    metadata: { renderScale: k },
    layers,
  };
}
