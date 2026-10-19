// Builds a MapLibre style from the poster's resolved colours.
// The map is drawn in quiet tints between the background and the text colour, so the
// colour guardrails carry over automatically and the route and lettering always sit on top.
// No labels: posters look cleaner without street names. Schema: OpenMapTiles.
import { C } from '../core/color.js';
import { MAP_SOURCE, MAP_STRENGTHS } from '../core/config.js';

export function buildMapStyle(T, {detail='streets', strength='balanced'} = {}){
  const I = (MAP_STRENGTHS.find(s=>s.id===strength) || MAP_STRENGTHS[1]).v;
  const tone = t => C.mix(T.bg, T.text, Math.min(.55, t*I));
  const full = detail==='detailed', streets = detail!=='minimal';
  const width = (stops) => ['interpolate',['exponential',1.6],['zoom'], ...stops.flat()];
  const cls = list => ['match',['get','class'],list,true,false];
  const road = (id, classes, color, stops, extra={}) => ({
    id, type:'line', source:'omt', 'source-layer':'transportation',
    filter:['all', cls(classes), ['!=',['get','brunnel'],'tunnel']],
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':color, 'line-width':width(stops), ...extra},
  });

  const layers = [
    {id:'background', type:'background', paint:{'background-color':T.bg}},
    {id:'greenery', type:'fill', source:'omt', 'source-layer':'landcover', filter:cls(['wood','forest','grass']), paint:{'fill-color':tone(.04)}},
    {id:'park', type:'fill', source:'omt', 'source-layer':'park', paint:{'fill-color':tone(.04)}},
    {id:'water', type:'fill', source:'omt', 'source-layer':'water', paint:{'fill-color':tone(.11)}},
    {id:'waterway', type:'line', source:'omt', 'source-layer':'waterway', layout:{'line-cap':'round'},
      paint:{'line-color':tone(.11), 'line-width':width([[10,.4],[14,1.4],[17,4]])}},
  ];
  if(full) layers.push({id:'building', type:'fill', source:'omt', 'source-layer':'building', minzoom:13, paint:{'fill-color':tone(.06)}});
  if(full) layers.push(road('path', ['path','track'], tone(.12), [[13,.3],[16,1],[18,2]], {'line-dasharray':[2,1.5]}));
  if(full) layers.push(road('service', ['service'], tone(.13), [[13,.3],[16,1.2],[18,3]]));
  if(streets) layers.push(road('minor', ['minor'], tone(.15), [[11,.3],[14,1],[17,4]]));
  if(streets) layers.push(road('tertiary', ['tertiary'], tone(.18), [[10,.3],[13,1],[17,5]]));
  layers.push(road('major', ['primary','secondary'], tone(streets ? .22 : .18), [[8,.3],[12,1.1],[16,5],[18,9]]));
  layers.push(road('motorway', ['motorway','trunk'], tone(streets ? .27 : .22), [[6,.4],[10,1],[14,3.5],[18,10]]));
  if(full) layers.push(road('rail', ['rail'], tone(.16), [[11,.4],[16,1.4]], {'line-dasharray':[3,2]}));

  return {
    version: 8,
    name: 'route-print',
    sources: { omt: { type:'vector', url: MAP_SOURCE.url } },
    layers,
  };
}
