#!/usr/bin/env node
// MCP server for ID Sketch. No dependencies.
//
// Claude talks to this process over stdio (MCP). This process talks to the ID Sketch tab in your
// browser over a small local bridge on 127.0.0.1: the app listens for commands (server-sent events)
// and posts the results back. Nothing leaves your computer.
'use strict';
const http = require('http');
const readline = require('readline');

const PORT = Number(process.env.IDSKETCH_PORT) || 47821;
const EXTRA_ORIGINS = (process.env.IDSKETCH_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const log = (...a) => process.stderr.write('[id-sketch] ' + a.join(' ') + '\n');

// ---------- bridge to the browser tab ----------
let owner = false;      // this process holds the bridge port
let client = null;      // the SSE response of the connected app tab
let seq = 0;
const pending = new Map();

// only the app itself may connect: local pages, file:// and the published GitHub Pages site
function originOk(o) {
  if (!o || o === 'null' || o.startsWith('file://')) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o)) return true;
  return o === 'https://guzzoai.github.io' || EXTRA_ORIGINS.includes(o);
}
function readBody(req) {
  return new Promise(res => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 64e6) req.destroy(); });
    req.on('end', () => res(s));
    req.on('error', () => res(''));
  });
}
function handle(req, res) {
  const origin = req.headers.origin;
  const cors = { 'Access-Control-Allow-Origin': origin || '*', Vary: 'Origin' };
  const url = (req.url || '').split('?')[0];
  if (url === '/command') {
    // other MCP processes on this machine forward their calls here; browsers cannot send this header
    if (req.method !== 'POST' || req.headers['x-idsketch'] !== '1' || origin) { res.writeHead(403); res.end(); return; }
    readBody(req).then(async body => {
      let out;
      try { const c = JSON.parse(body); out = { ok: true, result: await dispatch(c.tool, c.args) }; }
      catch (e) { out = { ok: false, error: String(e.message || e) }; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  if (!originOk(origin)) { res.writeHead(403); res.end(); return; }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, Object.assign({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }, cors));
    res.end();
    return;
  }
  if (url === '/events' && req.method === 'GET') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }, cors));
    res.write(': connected\n\n');
    if (client && client !== res) { try { client.end(); } catch (e) { /* gone */ } }
    client = res;
    const beat = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* gone */ } }, 20000);
    req.on('close', () => { clearInterval(beat); if (client === res) client = null; });
    return;
  }
  if (url === '/result' && req.method === 'POST') {
    readBody(req).then(body => {
      try {
        const m = JSON.parse(body);
        const p = pending.get(m.id);
        if (p) {
          pending.delete(m.id); clearTimeout(p.timer);
          if (m.ok) p.resolve(m.result); else p.reject(new Error(m.error || 'onbekende fout'));
        }
      } catch (e) { /* ignore malformed */ }
      res.writeHead(204, cors); res.end();
    });
    return;
  }
  res.writeHead(404, cors); res.end();
}
function startBridge() {
  return new Promise(resolve => {
    const srv = http.createServer(handle);
    srv.once('error', () => resolve(false));
    srv.listen(PORT, '127.0.0.1', () => {
      owner = true;
      srv.on('close', () => { owner = false; });
      log('bridge listening on 127.0.0.1:' + PORT);
      resolve(true);
    });
  });
}
const NOT_CONNECTED = 'ID Sketch is not connected. Ask the user to open ID Sketch in their browser, open the menu (top left) and switch on "Koppeling met Claude". Then try again.';
async function waitForClient(ms) {
  const end = Date.now() + ms;
  while (!client && Date.now() < end) await new Promise(r => setTimeout(r, 150));
  return !!client;
}
async function dispatch(tool, args) {
  if (!(await waitForClient(6000))) throw new Error(NOT_CONNECTED);
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('ID Sketch did not answer in time.')); }, 30000);
    pending.set(id, { resolve, reject, timer });
    try { client.write('data: ' + JSON.stringify({ id, tool, args: args || {} }) + '\n\n'); }
    catch (e) { pending.delete(id); clearTimeout(timer); reject(new Error(NOT_CONNECTED)); }
  });
}
function forward(tool, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ tool, args });
    const req = http.request({ host: '127.0.0.1', port: PORT, path: '/command', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-IDSketch': '1' } }, res => {
      let s = '';
      res.on('data', c => { s += c; });
      res.on('end', () => {
        try { const m = JSON.parse(s); if (m.ok) resolve(m.result); else reject(new Error(m.error)); }
        catch (e) { reject(new Error('Port ' + PORT + ' is used by something that is not ID Sketch.')); }
      });
    });
    req.on('error', e => reject(e));
    req.setTimeout(40000, () => req.destroy(new Error('timeout')));
    req.end(body);
  });
}
// the first MCP process owns the bridge; later ones (other Claude sessions) forward through it
async function callApp(tool, args) {
  if (!owner) await startBridge();
  if (owner) return dispatch(tool, args);
  try { return await forward(tool, args); }
  catch (e) {
    if (e.code === 'ECONNREFUSED' && (await startBridge())) return dispatch(tool, args);
    throw e;
  }
}

// ---------- tools ----------
const STYLE = {
  stroke: { type: 'string', description: 'Outline colour, hex like #d3d3d3. App palette: #d3d3d3 light grey, #ff8383 red, #3a994c green, #56a2e8 blue, #b76100 orange.' },
  bg: { type: 'string', description: 'Fill colour (hex) or "transparent". Dark fills that suit the dark canvas: #5b2c2c, #043b0c, #154163, #362500.' },
  fillStyle: { type: 'string', enum: ['solid', 'hachure', 'cross-hatch'] },
  strokeWidth: { type: 'number', description: '1, 2 or 4' },
  strokeStyle: { type: 'string', enum: ['solid', 'dashed', 'dotted'] },
  roughness: { type: 'number', description: '0 = clean straight lines, 1 = hand-drawn, 2 = very sketchy. Use 0 for floor plans and diagrams.' },
  edges: { type: 'string', enum: ['sharp', 'round'], description: 'Corners of rectangles and diamonds.' },
  opacity: { type: 'number', description: '0-100' },
  fontSize: { type: 'number', description: 'Label / text size in px (default 20).' },
  textColor: { type: 'string', description: 'Colour of the label inside a shape (defaults to the outline colour).' },
};
const GEOMETRY = {
  x: { type: 'number', description: 'Left edge (px). Y grows downwards.' },
  y: { type: 'number', description: 'Top edge (px).' },
  cx: { type: 'number', description: 'Centre x; alternative to x. Handy for cameras, persons and furniture.' },
  cy: { type: 'number', description: 'Centre y; alternative to y.' },
  w: { type: 'number' }, h: { type: 'number' },
  x1: { type: 'number', description: 'Start point, for line / arrow / wall.' }, y1: { type: 'number' },
  x2: { type: 'number', description: 'End point (the arrow head is here).' }, y2: { type: 'number' },
  thickness: { type: 'number', description: 'Wall thickness when a wall is given by x1,y1,x2,y2 (default 8).' },
  angle: { type: 'number', description: 'Rotation in degrees, clockwise. At 0 a camera, light, person, chair or sofa faces up (towards smaller y); 90 faces right; 180 faces down.' },
  look_at: { type: 'object', description: 'Point this object at a spot instead of giving an angle, e.g. a camera at a person.', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
  label: { type: 'string', description: 'Text shown in (or next to) the object. For type "text" this is the text itself.' },
  fov: { type: 'number', description: 'Camera field of view / light beam width in degrees (5-170).' },
  range: { type: 'number', description: 'How far the camera cone / light beam reaches, in px.' },
  flip: { type: 'boolean', description: 'Mirror a door so it opens the other way.' },
  layer: { type: 'string', description: 'Layer name; created if it does not exist.' },
  group: { type: 'string', description: 'Elements with the same group value in one call are grouped, so they move as one.' },
  combine: { type: 'string', enum: ['union', 'subtract', 'intersect', 'exclude'], description: 'add_elements only. Merge the rectangles / ellipses / diamonds of one group into a single shape: union joins them, subtract cuts the later ones out of the first, intersect keeps the overlap, exclude keeps everything but the overlap. Set it on the members together with the same group; the first member gives the style. Use it to build custom shapes such as letters, logos and silhouettes.' },
};
const TYPES = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'text', 'wall', 'door', 'window', 'camera', 'light', 'person', 'mark',
  'chair', 'sofa', 'table', 'roundtable', 'bed', 'cabinet', 'plant', 'rug'];
const ELEMENT = {
  type: 'object',
  properties: Object.assign({ type: { type: 'string', enum: TYPES, description: 'rectangle/ellipse/diamond are plain shapes (rooms, boxes in a diagram). line/arrow need x1,y1,x2,y2. The rest are floor-plan objects seen from above; they have a sensible default size when w/h are omitted.' } }, GEOMETRY, STYLE),
  required: ['type'],
};
const TOOLS = [
  {
    name: 'get_canvas',
    description: 'Read the current ID Sketch canvas: the list of canvases, the layers and every element with id, type, position, size, angle, label and colours. Call this first to see what is already there and to get ids for update_elements / delete_elements.',
    inputSchema: { type: 'object', properties: { include_elements: { type: 'boolean', description: 'Default true. False returns only canvases, layers and the overall bounds.' } } },
  },
  {
    name: 'add_elements',
    description: 'Draw on the active canvas: add shapes, lines, arrows, text and floor-plan objects (walls, doors, windows, cameras with a view cone, lights, persons, furniture). Coordinates are px with y downwards; for a floor plan pick a scale such as 1 m = 20 px and say so in a text label. Give many elements in one call. The user can undo the whole call with Ctrl+Z. Returns the new ids.',
    inputSchema: {
      type: 'object',
      properties: {
        elements: { type: 'array', items: ELEMENT, minItems: 1 },
        layer: { type: 'string', description: 'Default layer for elements without their own layer (created if missing). Default: the active layer.' },
        style: { type: 'object', description: 'Style applied to every element in this call unless the element overrides it.', properties: STYLE },
        fit_view: { type: 'boolean', description: 'Zoom the user\'s view so everything is visible afterwards. Default true.' },
      },
      required: ['elements'],
    },
  },
  {
    name: 'update_elements',
    description: 'Change existing elements by id: move, resize, rotate, relabel, restyle, change a camera\'s fov / range / look_at, or move to another layer. Only the fields you give are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        updates: { type: 'array', minItems: 1, items: { type: 'object', properties: Object.assign({ id: { type: 'string' } }, GEOMETRY, STYLE), required: ['id'] } },
      },
      required: ['updates'],
    },
  },
  {
    name: 'delete_elements',
    description: 'Remove elements from the active canvas: by ids, everything on one layer, or everything (all: true). The user can undo with Ctrl+Z. Never clear a canvas that has content you did not make unless the user asked for it; prefer set_canvas to start on a fresh canvas.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, layer: { type: 'string' }, all: { type: 'boolean' } } },
  },
  {
    name: 'set_canvas',
    description: 'Switch to a canvas by name, creating it if it does not exist. Use a new canvas for a new drawing so the user\'s existing work stays untouched.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'set_layer',
    description: 'Create a layer or change it: make it the active layer, show/hide it, lock/unlock it, rename it. Useful split for floor plans: "Muren", "Meubels", "Camera\'s", "Notities".',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, active: { type: 'boolean' }, visible: { type: 'boolean' }, locked: { type: 'boolean' }, rename: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'export_png',
    description: 'Get a picture of the active canvas (all visible layers, including pasted images) so you can check your drawing or look at a reference image the user put on the canvas. Use it after drawing to verify the result.',
    inputSchema: { type: 'object', properties: { max_size: { type: 'number', description: 'Longest side in px, default 1400.' } } },
  },
];
const INSTRUCTIONS = [
  'ID Sketch is the user\'s own sketch tool (dark canvas, hand-drawn style) for wireframes, diagrams, floor plans and camera set-ups for shoots.',
  'These tools draw live on the canvas that is open in the user\'s browser.',
  'Workflow: get_canvas to see what exists; set_canvas with a new name when starting a new drawing; add_elements in a few large calls; export_png to check the result and fix overlaps.',
  'Coordinates are px, y grows downwards. Floor plans: choose a scale (e.g. 1 m = 20 px), draw rooms as rectangles with a label or walls as "wall" elements, add doors/windows on the walls, then furniture, persons and cameras. Add a small text label with the scale.',
  'Cameras: place with cx/cy and aim with look_at (or angle). fov and range set the view cone. A camera gets the label "Cam N" automatically unless you give one.',
  'Use roughness 0 for plans and schematics unless the user wants the sketchy look. Keep text labels short; text is not wrapped automatically.',
].join(' ');

async function runTool(name, args) {
  if (!TOOLS.some(t => t.name === name)) throw new Error('Unknown tool: ' + name);
  const result = await callApp(name, args || {});
  if (name === 'export_png' && result && result.image) {
    return [{ type: 'image', data: result.image, mimeType: 'image/png' },
      { type: 'text', text: JSON.stringify({ canvas: result.canvas, width: result.width, height: result.height, bounds: result.bounds }) }];
  }
  return [{ type: 'text', text: JSON.stringify(result) }];
}

// ---------- MCP over stdio (JSON-RPC, one message per line) ----------
const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
async function onMessage(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification
  try {
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: {
        protocolVersion: (params && params.protocolVersion) || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'id-sketch', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      } });
    } else if (method === 'ping') send({ jsonrpc: '2.0', id, result: {} });
    else if (method === 'tools/list') send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    else if (method === 'tools/call') {
      let content, isError = false;
      try { content = await runTool(params.name, params.arguments); }
      catch (e) { content = [{ type: 'text', text: String(e.message || e) }]; isError = true; }
      send({ jsonrpc: '2.0', id, result: { content, isError } });
    } else send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
  } catch (e) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e.message || e) } });
  }
}
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return; }
  if (Array.isArray(msg)) msg.forEach(onMessage); else onMessage(msg);
});
rl.on('close', () => process.exit(0));
startBridge();
