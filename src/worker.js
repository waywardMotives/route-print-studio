// Server side of Route Print Studio. Cloudflare serves everything in ./public directly; only /api/* reaches
// this file (see `run_worker_first` in wrangler.jsonc).
//
//   GET  /api/context         -> {country}   the visitor's country, used to show the right price tier
//   POST /api/designs         -> {id}        saves a design (settings + route) so an order can refer to it
//   GET  /api/designs/<id>    -> the design  reopened by the configurator with ?design=<id>
//
// Designs live in the KV namespace bound as DESIGNS, gzip-compressed, under the key "d:<id>".
// An ID is 12 random characters, so it can't be guessed; anyone who has it can open the design.

const MAX_BODY = 6 * 1024 * 1024;   // largest design we accept (a 10-hour ride at 1 point/second is ~2 MB)
const MAX_POINTS = 250000;
const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/i/l: IDs get read out and retyped
const ID_RE = /^[a-z2-9]{12}$/;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

function newId(){
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => ID_CHARS[b % ID_CHARS.length]).join('');
}

async function gzip(text){
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return await new Response(stream).arrayBuffer();
}
async function gunzip(buf){
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

// A design is {v, s:{...settings}, pts:[[lat,lon,ele,t],...], file}. The configurator validates every
// setting again when it opens one; here we only reject things that are clearly not a design.
function checkDesign(d){
  if(!d || typeof d !== 'object' || Array.isArray(d)) return 'Not a design.';
  if(!d.s || typeof d.s !== 'object' || Array.isArray(d.s)) return 'The design has no settings.';
  if(!Array.isArray(d.pts) || d.pts.length < 2) return 'The design has no route.';
  if(d.pts.length > MAX_POINTS) return 'The route has too many points.';
  for(const p of d.pts){
    if(!Array.isArray(p) || p.length < 2 || p.length > 4 || typeof p[0] !== 'number' || typeof p[1] !== 'number') return 'The route is malformed.';
  }
  return null;
}

async function saveDesign(request, env){
  // Only our own pages may save designs.
  const origin = request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return json({ error: 'Not allowed from this site.' }, 403);
  if(Number(request.headers.get('content-length')) > MAX_BODY) return json({ error: 'That route file is too large to save.' }, 413);
  const text = await request.text();
  if(text.length > MAX_BODY) return json({ error: 'That route file is too large to save.' }, 413);
  let design;
  try{ design = JSON.parse(text); }catch(e){ return json({ error: 'The design could not be read.' }, 400); }
  const problem = checkDesign(design);
  if(problem) return json({ error: problem }, 400);

  const id = newId();
  const stored = JSON.stringify({ v: 1, s: design.s, pts: design.pts, file: typeof design.file === 'string' ? design.file.slice(0, 200) : '',
    created: new Date().toISOString() });
  await env.DESIGNS.put('d:' + id, await gzip(stored), { metadata: { created: Date.now(), points: design.pts.length } });
  return json({ id }, 201);
}

async function loadDesign(id, env){
  if(!ID_RE.test(id)) return json({ error: 'No such design.' }, 404);
  const buf = await env.DESIGNS.get('d:' + id, 'arrayBuffer');
  if(!buf) return json({ error: 'No such design.' }, 404);
  return new Response(await gunzip(buf), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=300' } });
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    try{
      if(path === '/api/context' && request.method === 'GET')
        return json({ country: (request.cf && request.cf.country) || null });
      if(path === '/api/designs' && request.method === 'POST') return await saveDesign(request, env);
      const m = path.match(/^\/api\/designs\/([^/]+)$/);
      if(m && request.method === 'GET') return await loadDesign(m[1], env);
      if(path.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
    }catch(e){
      console.error(e);
      return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
