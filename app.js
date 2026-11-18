(() => {
'use strict';

// ---------- constants ----------
const STORE_KEY = 'idsketch.v1';
let BG = '#0a0a0a';         // --bg: the canvas colour of the current theme
let ACCENT = '#fcee93';     // selection colour on the canvas
let INK = '255,255,255';    // rgb of the grid
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const LINE_H = 1.25;
const STROKES = ['#d3d3d3', '#ff8383', '#3a994c', '#56a2e8', '#b76100'];
const BGS = ['transparent', '#5b2c2c', '#043b0c', '#154163', '#362500'];
const SHAPES = ['rectangle', 'diamond', 'ellipse'];

// ---------- themes ----------
// Drawings always store the base palette (STROKES/BGS). A theme only changes how those five slots are shown,
// so a drawing works in every theme and the palette of the MCP server stays valid. Own colours are shown as they are.
// bg = canvas, panel = rails, text = text on the rails, accent = active state, sel = selection on the canvas
// (when the accent does not stand out there), strokes = ink, red, green, blue, orange.
const THEMES = [
  { id: 'frames', name: 'Frames', bg: '#0a0a0a', panel: '#19191b', text: '#ededed', accent: '#fcee93', grid: '#ffffff', strokes: STROKES },
  { id: 'flame', name: 'Flame', bg: '#252422', panel: '#403d39', text: '#fffcf2', accent: '#eb5e28', strokes: ['#ccc5b9', '#eb5e28', '#9aa67c', '#7fa8b8', '#e9b44c'] },
  { id: 'taxi', name: 'Taxi', bg: '#202020', panel: '#333533', text: '#d6d6d6', accent: '#ffd100', hover: '#ffee32', strokes: ['#d6d6d6', '#ff6b5a', '#7bd389', '#6cb4ee', '#ffd100'] },
  { id: 'marine', name: 'Marine', bg: '#003049', panel: '#0f405a', text: '#fdf0d5', accent: '#669bbc', strokes: ['#fdf0d5', '#e5383b', '#7fb685', '#669bbc', '#f4a259'] },
  { id: 'signaal', name: 'Signaal', bg: '#f5dd41', panel: '#212121', text: '#f6f1d8', accent: '#fac402', sel: '#212121', strokes: ['#212121', '#b3261e', '#1f6f43', '#1d4e89', '#646464'] },
  { id: 'olijf', name: 'Olijf', bg: '#fefae0', panel: '#283618', text: '#fefae0', accent: '#dda15e', sel: '#bc6c25', strokes: ['#283618', '#a63d2f', '#606c38', '#3a6b7e', '#bc6c25'] },
  { id: 'oxblood', name: 'Oxblood', bg: '#d6d5c9', panel: '#0a100d', text: '#d6d5c9', accent: '#d9534f', sel: '#a22c29', strokes: ['#0a100d', '#a22c29', '#55683f', '#3f5f73', '#b0661f'] },
  { id: 'tuin', name: 'Tuin', bg: '#fefee3', panel: '#1b4a31', text: '#fefee3', accent: '#ffc9b9', sel: '#2c6e49', strokes: ['#1f3d2b', '#d1603d', '#2c6e49', '#3d7ea6', '#d68c45'] },
];
// Colour palettes for the swatches in the style panel. Unlike the theme slots these colours are stored as they are.
const PALETTES = [
  { id: 'flame', name: 'Flame', colors: ['#fffcf2', '#ccc5b9', '#403d39', '#252422', '#eb5e28'] },
  { id: 'oxblood', name: 'Oxblood', colors: ['#0a100d', '#b9baa3', '#d6d5c9', '#a22c29', '#73201c'] },
  { id: 'taxi', name: 'Taxi', colors: ['#d6d6d6', '#ffee32', '#ffd100', '#202020', '#333533'] },
  { id: 'signaal', name: 'Signaal', colors: ['#f5dd41', '#fac402', '#646464', '#474747', '#212121'] },
  { id: 'olijf', name: 'Olijf', colors: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'] },
  { id: 'marine', name: 'Marine', colors: ['#780000', '#c1121f', '#fdf0d5', '#003049', '#669bbc'] },
  { id: 'tuin', name: 'Tuin', colors: ['#2c6e49', '#4c956c', '#fefee3', '#ffc9b9', '#d68c45'] },
];
const THEME_VARS = ['bg', 'panel', 'panel-2', 'field', 'field-hover', 'border', 'border-strong', 'text', 'text-muted', 'text-dim', 'accent', 'accent-hover', 'accent-fg', 'on-bg'];
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const y = hex2rgb(b); return '#' + hex2rgb(a).map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const isDark = h => { const [r, g, b] = hex2rgb(h); return r * 0.299 + g * 0.587 + b * 0.114 < 140; };
let theme = THEMES[0];
let colorMap = new Map();
const tc = c => colorMap.get(c) || c;   // a stored colour as the current theme shows it
const LINEAR = ['line', 'arrow'];

const svg = (inner, extra = '') =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;

const ICON = {
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>'),
  hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
  selection: svg('<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>'),
  rectangle: svg('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
  diamond: svg('<path d="M12 3l9 9-9 9-9-9z"/>'),
  ellipse: svg('<circle cx="12" cy="12" r="8.5"/>'),
  arrow: svg('<path d="M4 12h16M14 6l6 6-6 6"/>'),
  line: svg('<path d="M4 12h16"/>'),
  draw: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  text: svg('<path d="M5 20l7-16 7 16M8 14h8"/>'),
  eraser: svg('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21M22 21H7M5 11l9 9"/>'),
  hachure: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M5 13l8-8M6 19L19 6M11 20l9-9"/>'),
  cross: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M5 13l8-8M6 19L19 6M11 20l9-9M11 5l8 8M5 6l13 13M4 11l9 9"/>'),
  solid: svg('<rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor"/>'),
  w1: svg('<path d="M5 12h14"/>', 'stroke-width="1.5"'),
  w2: svg('<path d="M5 12h14"/>', 'stroke-width="3"'),
  w4: svg('<path d="M5 12h14"/>', 'stroke-width="5"'),
  sSolid: svg('<path d="M5 12h14"/>', 'stroke-width="2"'),
  sDashed: svg('<path d="M5 12h14"/>', 'stroke-width="2" stroke-dasharray="4 3.5"'),
  sDotted: svg('<path d="M5 12h14"/>', 'stroke-width="2" stroke-dasharray="0.5 3.5"'),
  r0: svg('<path d="M4 15c5-9 9-4 16-7"/>'),
  r1: svg('<path d="M4 15c3-7 5 1 8-3s4-6 8-4"/>'),
  r2: svg('<path d="M4 16c2-9 4 2 6-4s2 3 4-2 3 2 6-3M5 13c4-5 5 4 9-2"/>'),
  sharp: svg('<path d="M5 19V5h14" /><path d="M19 9v10H9" stroke-dasharray="2 3"/>'),
  round: svg('<path d="M5 19v-8a6 6 0 0 1 6-6h8" /><path d="M19 9v10H9" stroke-dasharray="2 3"/>'),
  toBack: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  backward: svg('<path d="M12 5v14M7 14l5 5 5-5"/>'),
  forward: svg('<path d="M12 19V5M7 10l5-5 5 5"/>'),
  toFront: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  alLeft: svg('<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>'),
  alHCenter: svg('<path d="M12 3v18"/><rect x="6" y="6" width="12" height="4" rx="1"/><rect x="8.5" y="14" width="7" height="4" rx="1"/>'),
  alRight: svg('<path d="M20 3v18"/><rect x="5" y="6" width="12" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>'),
  alTop: svg('<path d="M3 4h18"/><rect x="6" y="7" width="4" height="12" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>'),
  alVCenter: svg('<path d="M3 12h18"/><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="8.5" width="4" height="7" rx="1"/>'),
  alBottom: svg('<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>'),
  distH: svg('<path d="M4 3v18M20 3v18"/><rect x="9" y="7" width="6" height="10" rx="1"/>'),
  distV: svg('<path d="M3 4h18M3 20h18"/><rect x="7" y="9" width="10" height="6" rx="1"/>'),
  grid: svg('<path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>'),
  group: svg('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="7" y="7" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>'),
  ungroup: svg('<rect x="4" y="4" width="8" height="8" rx="1"/><rect x="12" y="12" width="8" height="8" rx="1"/><path d="M16 4h4v4M8 20H4v-4" stroke-dasharray="2 2.5"/>'),
  bUnion: svg('<path d="M4 4h10v6h6v10H10v-6H4z" fill="currentColor" fill-opacity=".3"/>'),
  bSubtract: svg('<path d="M4 4h10v6h-4v4H4z" fill="currentColor" fill-opacity=".3"/><path d="M14 10h6v10H10v-6" stroke-dasharray="2 2.5"/>'),
  bIntersect: svg('<path d="M10 10h4v4h-4z" fill="currentColor" fill-opacity=".45"/><path d="M10 4H4v10h6M14 20h6V10h-6M14 4v6M10 20v-6" stroke-dasharray="2 2.5"/>'),
  bExclude: svg('<path d="M4 4h10v6h6v10H10v-6H4zM10 10v4h4v-4z" fill="currentColor" fill-opacity=".3" fill-rule="evenodd"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 20"/>'),
  arPack: svg('<rect x="3" y="3" width="10" height="8" rx="1"/><rect x="15" y="3" width="6" height="8" rx="1"/><rect x="3" y="13" width="6" height="8" rx="1"/><rect x="11" y="13" width="10" height="8" rx="1"/>'),
  arRow: svg('<rect x="2" y="7" width="5" height="10" rx="1"/><rect x="9" y="7" width="7" height="10" rx="1"/><rect x="18" y="7" width="4" height="10" rx="1"/>'),
  arCol: svg('<rect x="7" y="2" width="10" height="5" rx="1"/><rect x="7" y="9" width="10" height="7" rx="1"/><rect x="7" y="18" width="10" height="4" rx="1"/>'),
  arGrid: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M4 4l16 16M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.3 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.7 0 3.200-.5 4.500-1.200M9.900 9.900a3 3 0 0 0 4.200 4.200"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5zM3 12.500l9 5 9-5M3 17l9 5 9-5"/>'),
  moveIn: svg('<path d="M4 12h11M11 7l5 5-5 5M20 4v16"/>'),
  flip: svg('<path d="M12 3v18" stroke-dasharray="2 3"/><path d="M8 7l-5 5 5 5zM16 7l5 5-5 5z"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M5 12h14M12 5v14"/>'),
  prev: svg('<path d="M15 6l-6 6 6 6"/>'),
  next: svg('<path d="M9 6l6 6-6 6"/>'),
  pencilSm: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>', 'style="width:14px;height:14px"'),
  trashSm: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 'style="width:14px;height:14px"'),
};

const HEAD_ICON = {
  none: '<path d="M4 12h16"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  triangle: '<path d="M4 12h9"/><path d="M20 12l-7-5v10z" fill="currentColor"/>',
  dot: '<path d="M4 12h10"/><circle cx="17" cy="12" r="3" fill="currentColor"/>',
  bar: '<path d="M4 12h15M19 6v12"/>',
};
const headIcon = (kind, start) => svg(start ? `<g transform="translate(24 0) scale(-1 1)">${HEAD_ICON[kind]}</g>` : HEAD_ICON[kind]);
const TOOLS = [
  { id: 'hand', title: 'Hand (verschuiven)', key: 'H' },
  { id: 'selection', title: 'Selectie', key: 'V', num: '1' },
  { id: 'rectangle', title: 'Rechthoek', key: 'R', num: '2' },
  { id: 'diamond', title: 'Ruit', key: 'D', num: '3' },
  { id: 'ellipse', title: 'Ellips', key: 'O', num: '4' },
  { id: 'arrow', title: 'Pijl', key: 'A', num: '5' },
  { id: 'line', title: 'Lijn', key: 'L', num: '6' },
  { id: 'draw', title: 'Potlood', key: 'P', num: '7' },
  { id: 'text', title: 'Tekst', key: 'T', num: '8' },
  { id: 'image', title: 'Afbeelding invoegen', key: 'I', num: '9' },
  { id: 'eraser', title: 'Gum', key: 'E', num: '0' },
];

// ---------- state ----------
const $ = id => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const rc = rough.canvas(canvas);
const gen = rough.generator();
const editor = $('editor');
const measureCtx = document.createElement('canvas').getContext('2d');

const state = {
  canvases: [],
  activeId: null,
  tool: 'selection',
  locked: false,
  selected: new Set(),
  grid: { show: false, type: 'dots', size: 20, opacity: 30, snap: false },
  snapObjects: false,
  right: { open: true, tab: 'layers' },
  theme: 'frames',
  palettes: [''],            // one row of swatches each: the id of a colour palette, or '' for the colours of the theme
  customPalettes: [],        // palettes the user added: { id, name, colors }
  style: {
    stroke: STROKES[0], bg: 'transparent', fillStyle: 'solid', strokeWidth: 2,
    strokeStyle: 'solid', roughness: 1, edges: 'round', opacity: 100, fontSize: 20,
    headStart: 'none', headEnd: 'arrow',
  },
};
let doc = null;            // active canvas
let drag = null;           // current pointer interaction
let editing = null;        // { el, isNew }
let spaceDown = false;
let clipboard = [];
let pasteCount = 0;
let erasing = new Set();
const histories = new Map();
const drawCache = new Map();

const uid = () => Math.random().toString(36).slice(2, 10);
const seed = () => Math.floor(Math.random() * 2 ** 31);
const els = () => doc.elements;
const view = () => doc.view;
const selectedEls = () => els().filter(e => state.selected.has(e.id));
const isBoxy = el => SHAPES.includes(el.type) || el.type === 'symbol';
const canLabel = el => el.type === 'text' || isBoxy(el);
const hasCone = el => el.type === 'symbol' && (el.kind === 'camera' || el.kind === 'light');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- layers ----------
// Every element carries the id of its layer; the element list is kept sorted by layer (bottom first),
// so drawing order, hit-testing and "to front/back" all stay within a layer.
const newLayer = name => ({ id: uid(), name, visible: true, locked: false });
function normalizeLayers(c) {
  if (!Array.isArray(c.layers) || !c.layers.length) c.layers = [newLayer('Laag 1')];
  if (!c.layers.some(l => l.id === c.activeLayer)) c.activeLayer = c.layers[c.layers.length - 1].id;
  const order = new Map(c.layers.map((l, i) => [l.id, i]));
  let sorted = true, prev = -1;
  for (const e of c.elements) {
    if (!order.has(e.layer)) e.layer = c.activeLayer;
    const i = order.get(e.layer);
    if (i < prev) sorted = false;
    prev = i;
  }
  if (!sorted) c.elements.sort((a, b) => order.get(a.layer) - order.get(b.layer));
}
const layerMap = () => new Map(doc.layers.map(l => [l.id, l]));
const visEls = () => { const m = layerMap(); return els().filter(e => { const l = m.get(e.layer); return !l || l.visible; }); };
// what the pointer can touch: visible and not locked
const liveEls = () => { const m = layerMap(); return els().filter(e => { const l = m.get(e.layer); return !l || (l.visible && !l.locked); }); };
const activeLayer = () => doc.layers.find(l => l.id === doc.activeLayer);
function canDraw() {
  const l = activeLayer();
  if (l.visible && !l.locked) return true;
  toast(`Laag "${l.name}" is ${l.locked ? 'vergrendeld' : 'verborgen'}: kies een andere laag of zet hem weer aan.`);
  return false;
}
// ---------- images ----------
// Elements only carry an imageId; the pixels live in IndexedDB (localStorage is far too small for them).
const CLIP_MARK = 'ID Sketch';
const MAX_IMAGE = 3000;
const images = new Map(); // imageId -> { img, blob }
let idb = null;
let lastPointer = null;
function openDb() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('idsketch', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('images');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
function dbReq(mode, fn) {
  return new Promise(res => {
    if (!idb) return res(null);
    try {
      const rq = fn(idb.transaction('images', mode).objectStore('images'));
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
function decodeImage(blob) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('geen leesbare afbeelding'));
    img.src = URL.createObjectURL(blob);
  });
}
async function registerImage(id, blob) {
  const img = await decodeImage(blob);
  images.set(id, { img, blob });
  render();
  return img;
}
// store a new image (scaled down when it is huge) and return its id and size
async function addImageBlob(blob) {
  let img = await decodeImage(blob);
  const big = Math.max(img.naturalWidth, img.naturalHeight);
  if (big > MAX_IMAGE) {
    const f = MAX_IMAGE / big;
    const off = document.createElement('canvas');
    off.width = Math.round(img.naturalWidth * f); off.height = Math.round(img.naturalHeight * f);
    off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
    blob = await new Promise(r => off.toBlob(r, 'image/webp', 0.92));
  }
  const id = uid() + uid();
  img = await registerImage(id, blob);
  if (idb) await dbReq('readwrite', s => s.put(blob, id));
  return { id, w: img.naturalWidth, h: img.naturalHeight };
}
async function insertImages(blobs, at) {
  if (!blobs.length || !canDraw()) return;
  if (editing) finishEdit();
  const target = doc;
  const added = [];
  for (const b of blobs) {
    try {
      const rec = await addImageBlob(b);
      const el = makeEl('image', 0, 0);
      el.imageId = rec.id;
      // fit a fresh image comfortably in the window, never larger than its real size
      const f = Math.min(1, (innerWidth * 0.5) / view().zoom / rec.w, (innerHeight * 0.6) / view().zoom / rec.h);
      el.w = rec.w * f; el.h = rec.h * f;
      added.push(el);
    } catch (err) { toast('Een afbeelding kon niet worden gelezen.'); }
  }
  if (!added.length || target !== doc) return;
  const p = at || toWorld(innerWidth / 2, innerHeight / 2);
  for (const el of added) { el.x = p.x - el.w / 2; el.y = p.y - el.h / 2; el.layer = doc.activeLayer; }
  doc.elements.push(...added);
  state.selected = new Set(added.map(e => e.id));
  if (added.length > 1) {
    arrangeSelected('pack', true);
    // a whole batch should still fit in the window
    const g = groupBounds(added);
    const fit = Math.min(1, (innerWidth * 0.6) / view().zoom / (g[2] - g[0]), (innerHeight * 0.7) / view().zoom / (g[3] - g[1]));
    if (fit < 1) for (const el of added) scaleUnit({ list: [el], box: g }, fit, g[0], g[1]);
    const b = groupBounds(added);
    const dx = p.x - (b[0] + b[2]) / 2, dy = p.y - (b[1] + b[3]) / 2;
    for (const el of added) { el.x += dx; el.y += dy; }
  }
  if (state.tool !== 'selection') setTool('selection', true);
  commit(); renderPanel(); render();
  if (!idb) toast('Let op: deze browser kan afbeeldingen niet bewaren; na herladen zijn ze weg.');
}
async function bootImages() {
  idb = await openDb();
  if (!idb) return;
  const used = new Set();
  for (const c of state.canvases) for (const e of c.elements) if (e.imageId) used.add(e.imageId);
  const keys = (await dbReq('readonly', s => s.getAllKeys())) || [];
  for (const k of keys) {
    if (!used.has(k)) { dbReq('readwrite', s => s.delete(k)); continue; }
    const blob = await dbReq('readonly', s => s.get(k));
    if (blob) registerImage(k, blob).catch(() => {});
  }
}
const blobToDataUrl = blob => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });

let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

// ---------- persistence ----------
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && Array.isArray(data.canvases) && data.canvases.length) {
      state.canvases = data.canvases;
      state.activeId = data.activeId;
      if (data.style) Object.assign(state.style, data.style);
      if (data.grid) Object.assign(state.grid, data.grid);
      state.snapObjects = !!data.snapObjects;
      if (data.right) Object.assign(state.right, data.right);
      state.bridge = !!data.bridge;
      if (data.theme) state.theme = data.theme;
      if (Array.isArray(data.customPalettes)) state.customPalettes = data.customPalettes;
      const rows = Array.isArray(data.palettes) ? data.palettes : [data.palette || ''];
      state.palettes = [...new Set(rows)].filter(id => paletteIds().includes(id));
      if (!state.palettes.length) state.palettes = [''];
    }
  } catch (e) { /* start fresh */ }
  applyTheme(state.theme);
  if (!state.canvases.length) state.canvases = [newCanvasData('Canvas 1')];
  for (const c of state.canvases) {
    c.elements = c.elements || [];
    c.view = c.view || { scrollX: 0, scrollY: 0, zoom: 1 };
    normalizeLayers(c);
  }
  setActive(state.canvases.find(c => c.id === state.activeId) || state.canvases[0]);
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      canvases: state.canvases, activeId: state.activeId, style: state.style,
      grid: state.grid, snapObjects: state.snapObjects, right: state.right, bridge: !!state.bridge, theme: state.theme, palettes: state.palettes, customPalettes: state.customPalettes,
    }));
  } catch (e) { console.warn('Opslaan mislukt', e); }
}
window.addEventListener('beforeunload', saveNow);

function applyTheme(id) {
  const t = theme = THEMES.find(x => x.id === id) || THEMES[0];
  const base = t === THEMES[0], dark = isDark(t.panel);
  BG = t.bg; ACCENT = t.sel || t.accent; INK = hex2rgb(t.grid || t.strokes[0]).join(',');
  colorMap = new Map();
  if (!base) STROKES.forEach((c, i) => {
    colorMap.set(c, t.strokes[i]);
    if (i) colorMap.set(BGS[i], mix(t.strokes[i], isDark(t.bg) ? t.bg : '#ffffff', 0.7));   // fills: a tint of the line colour
  });
  // the base theme is what style.css says; the others derive their surfaces from four colours
  const vars = base ? {} : {
    bg: t.bg, panel: t.panel, 'panel-2': mix(t.panel, t.text, 0.1),
    field: mix(t.panel, '#000000', dark ? 0.45 : 0.07), 'field-hover': mix(t.panel, '#000000', dark ? 0.3 : 0.12),
    border: mix(t.panel, t.text, 0.1), 'border-strong': mix(t.panel, t.text, 0.2),
    text: t.text, 'text-muted': mix(t.text, t.panel, dark ? 0.4 : 0.28), 'text-dim': mix(t.text, t.panel, dark ? 0.62 : 0.5),
    accent: t.accent, 'accent-hover': t.hover || mix(t.accent, '#ffffff', 0.25), 'accent-fg': isDark(t.accent) ? '#ffffff' : '#16191f',
    'on-bg': mix(t.strokes[0], t.bg, 0.35),
  };
  const root = document.documentElement.style;
  for (const k of THEME_VARS) { if (vars[k]) root.setProperty('--' + k, vars[k]); else root.removeProperty('--' + k); }
  drawCache.clear(); boolCache.clear();
}
function setTheme(id) {
  applyTheme(id);
  state.theme = theme.id;
  save(); renderThemes(); renderLibrary(); renderPanel(); render();
}
function renderThemes() {
  $('themeName').textContent = theme.name;
  $('themeList').innerHTML = THEMES.map(t =>
    `<button data-theme="${t.id}" class="${t === theme ? 'active' : ''}" title="${t.name}" style="background:linear-gradient(90deg, ${t.panel} 36%, ${t.bg} 36%)"></button>`).join('');
  const stripes = list => 'linear-gradient(90deg, ' + list.map((c, i) => `${c} ${i * 100 / list.length}% ${(i + 1) * 100 / list.length}%`).join(', ') + ')';
  const rows = paletteRows();
  $('paletteName').textContent = (rows[0] ? rows[0].name : 'Thema') + (rows.length > 1 ? ' +' + (rows.length - 1) : '');
  $('paletteList').innerHTML = [{ id: '', name: 'Kleuren van het thema', colors: theme.strokes }, ...allPalettes()].map(p =>
    `<button data-palette="${p.id}" class="${state.palettes.includes(p.id) ? 'active' : ''}" title="${esc(p.name)}${isCustom(p) ? ' (rechtsklik om te verwijderen)' : ''}" style="background:${stripes(p.colors)}"></button>`).join('') +
    `<button data-add title="Eigen palet maken">${ICON.plus}</button>`;
  renderBg();
}
// The style panel shows one row of swatches per entry of state.palettes ('' = the colours of the theme).
const allPalettes = () => [...PALETTES, ...state.customPalettes];
const paletteIds = () => ['', ...allPalettes().map(p => p.id)];
const paletteRows = () => state.palettes.map(id => allPalettes().find(p => p.id === id));   // undefined = theme
const isCustom = p => state.customPalettes.includes(p);
function setPalettes(list) {
  const ids = paletteIds();
  state.palettes = [...new Set(list)].filter(id => ids.includes(id));
  if (!state.palettes.length) state.palettes = [''];
  save(); renderThemes(); renderPanel();
}
// the next palette in the given direction that is not on a row yet
function freePalette(from, dir) {
  const ids = paletteIds();
  let i = ids.indexOf(from);
  for (let n = 0; n < ids.length; n++) {
    i = (i + dir + ids.length) % ids.length;
    if (!state.palettes.includes(ids[i])) return ids[i];
  }
  return null;
}
function cycleRow(i, dir) {
  const id = freePalette(state.palettes[i], dir);
  if (id === null) return;
  const list = state.palettes.slice();
  list[i] = id;
  setPalettes(list);
}
function addRow() {
  const id = freePalette(state.palettes[state.palettes.length - 1], 1);
  if (id !== null) setPalettes([...state.palettes, id]);
}
// a chip in the menu puts that palette on the first row
function pickPalette(id) {
  const list = state.palettes.slice(), j = list.indexOf(id);
  if (j > 0) list[j] = list[0];
  list[0] = id;
  setPalettes(list);
}
function removePalette(p) {
  if (!p || !isCustom(p) || !confirm(`Palet "${p.name}" verwijderen? Kleuren die je er al mee tekende blijven staan.`)) return;
  state.customPalettes = state.customPalettes.filter(x => x !== p);
  setPalettes(state.palettes);
}

// ---------- own palette ----------
const parseColors = txt => [...new Set((txt.match(/(?<![0-9a-z])[0-9a-f]{6}(?![0-9a-z])/gi) || []).map(c => '#' + c.toLowerCase()))].slice(0, 12);
function openPalPop() {
  let n = state.customPalettes.length + 1;
  while (allPalettes().some(p => p.name === 'Palet ' + n)) n++;
  $('palName').value = 'Palet ' + n;
  $('palInput').value = '';
  syncPalPop();
  $('palPop').hidden = false;
  $('palInput').focus();
}
function syncPalPop() {
  const colors = parseColors($('palInput').value);
  $('palPreview').innerHTML = colors.length
    ? colors.map(c => `<i style="background:${c}" title="${c}"></i>`).join('')
    : '<span>De kleuren verschijnen hier</span>';
  $('palAdd').disabled = colors.length < 2;
}
function addPalette() {
  const colors = parseColors($('palInput').value);
  if (colors.length < 2) return;
  const p = { id: 'c' + uid(), name: $('palName').value.trim() || 'Palet', colors };
  state.customPalettes.push(p);
  $('palPop').hidden = true;
  setPalettes([...state.palettes, p.id]);   // a new palette gets its own row right away
}
$('palInput').addEventListener('input', syncPalPop);
$('palAdd').addEventListener('click', addPalette);
$('palCancel').addEventListener('click', () => { $('palPop').hidden = true; });
$('palPop').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') $('palPop').hidden = true;
  if (e.key === 'Enter') addPalette();
});
window.addEventListener('pointerdown', e => {
  if (!e.target.closest('#palPop')) $('palPop').hidden = true;
}, true);

// ---------- canvas colour ----------
// A canvas can have its own background colour (doc.bg); without one it follows the theme.
const canvasBg = () => (doc && doc.bg) || BG;
const gridInk = () => doc && doc.bg ? (isDark(doc.bg) ? '255,255,255' : '0,0,0') : INK;
function setCanvasBg(v, keepPop) {
  if (v) doc.bg = v; else delete doc.bg;
  save(); render();
  if (keepPop) $('bgBtn').firstChild.style.background = canvasBg(); else renderBg();
}
function renderBg() {
  if (!doc) return;
  const cur = doc.bg || '', pals = paletteRows().filter(Boolean);
  $('bgBtn').innerHTML = `<i style="background:${canvasBg()}"></i>`;
  $('docName').style.color = cur ? (isDark(cur) ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.6)') : '';
  const list = pals.length ? [...new Set(pals.flatMap(p => p.colors))] : [...new Set(THEMES.map(t => t.bg))].filter(c => c !== BG);
  $('bgPop').innerHTML = `<h3>Canvaskleur</h3><div class="row">` +
    `<button data-bg="" class="std ${cur ? '' : 'active'}" title="De kleur van het thema"><i style="background:${BG}"></i>Standaard</button>` +
    list.map(c => `<button data-bg="${c}" class="swatch ${cur === c ? 'active' : ''}" style="background:${c}" title="${c}"></button>`).join('') +
    `<input type="color" value="${canvasBg()}" title="Eigen kleur"></div>`;
}
$('bgBtn').addEventListener('click', () => { $('bgPop').hidden = !$('bgPop').hidden; });
$('bgPop').addEventListener('click', e => {
  const b = e.target.closest('[data-bg]');
  if (b) setCanvasBg(b.dataset.bg);
});
$('bgPop').addEventListener('input', e => { if (e.target.type === 'color') setCanvasBg(e.target.value, true); });
$('bgPop').addEventListener('change', e => { if (e.target.type === 'color') setCanvasBg(e.target.value); });
window.addEventListener('pointerdown', e => {
  if (!e.target.closest('#bgPop') && !e.target.closest('#bgBtn')) $('bgPop').hidden = true;
}, true);
$('themeList').addEventListener('click', e => {
  const b = e.target.closest('[data-theme]');
  if (b) setTheme(b.dataset.theme);
});
$('paletteList').addEventListener('click', e => {
  if (e.target.closest('[data-add]')) { openPalPop(); return; }
  const b = e.target.closest('[data-palette]');
  if (b) pickPalette(b.dataset.palette);
});
$('paletteList').addEventListener('contextmenu', e => {
  const b = e.target.closest('[data-palette]');
  const p = b && state.customPalettes.find(x => x.id === b.dataset.palette);
  if (p) { e.preventDefault(); removePalette(p); }
});

function newCanvasData(name) {
  const c = { id: uid(), name, elements: [], view: { scrollX: 0, scrollY: 0, zoom: 1 } };
  normalizeLayers(c);
  return c;
}
function setActive(c) {
  if (editing) finishEdit();
  doc = c;
  state.activeId = c.id;
  state.selected.clear();
  if (!histories.has(c.id)) histories.set(c.id, { undo: [], redo: [], current: JSON.stringify(c.elements) });
  $('docName').textContent = c.name;
  renderSidebar(); renderPanel(); renderBg(); updateChrome(); render(); save();
}

// ---------- history ----------
function commit() {
  const h = histories.get(doc.id);
  normalizeLayers(doc);
  const json = JSON.stringify(doc.elements);
  if (json !== h.current) {
    h.undo.push(h.current);
    if (h.undo.length > 200) h.undo.shift();
    h.redo = [];
    h.current = json;
  }
  save(); updateChrome();
}
function undo() { stepHistory('undo', 'redo'); }
function redo() { stepHistory('redo', 'undo'); }
function stepHistory(from, to) {
  if (editing) finishEdit();
  const h = histories.get(doc.id);
  if (!h[from].length) return;
  h[to].push(h.current);
  h.current = h[from].pop();
  doc.elements = JSON.parse(h.current);
  normalizeLayers(doc);
  const ids = new Set(liveEls().map(e => e.id));
  for (const id of [...state.selected]) if (!ids.has(id)) state.selected.delete(id);
  save(); renderPanel(); updateChrome(); render();
}

// ---------- geometry ----------
const toWorld = (cx, cy) => ({ x: cx / view().zoom - view().scrollX, y: cy / view().zoom - view().scrollY });
const toScreen = (x, y) => ({ x: (x + view().scrollX) * view().zoom, y: (y + view().scrollY) * view().zoom });
const hasPoints = el => el.type === 'line' || el.type === 'arrow' || el.type === 'draw';
// A line or arrow with three points is curved: start, the point the curve passes through, end.
const isCurved = el => LINEAR.includes(el.type) && el.points.length === 3;
const curveCtrl = p => [2 * p[1][0] - (p[0][0] + p[2][0]) / 2, 2 * p[1][1] - (p[0][1] + p[2][1]) / 2];
function curvePoly(p, n = 20) {
  const [a, , b] = p, c = curveCtrl(p), out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}
const HEADS = [['none', 'Geen'], ['arrow', 'Pijl'], ['triangle', 'Driehoek'], ['dot', 'Bol'], ['bar', 'Streep']];
const headOf = (el, end) => el[end ? 'headEnd' : 'headStart'] || (end && el.type === 'arrow' ? 'arrow' : 'none');

function bounds(el) {
  if (hasPoints(el)) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of isCurved(el) ? curvePoly(el.points) : el.points) {
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < y1) y1 = p[1]; if (p[1] > y2) y2 = p[1];
    }
    return [el.x + x1, el.y + y1, el.x + x2, el.y + y2];
  }
  return [el.x, el.y, el.x + el.w, el.y + el.h];
}
function rot(x, y, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
function center(el) {
  const b = bounds(el);
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}
// axis-aligned box around the (possibly rotated) element
function aabb(el) {
  const b = bounds(el);
  if (!el.angle) return b;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const pts = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(p => rot(p[0], p[1], cx, cy, el.angle));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function groupBounds(list) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const el of list) {
    const b = aabb(el);
    x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]);
  }
  return [x1, y1, x2, y2];
}
function measure(text, fontSize) {
  measureCtx.font = `${fontSize}px ${FONT}`;
  const lines = String(text).split('\n');
  let w = 0;
  for (const l of lines) w = Math.max(w, measureCtx.measureText(l).width);
  return { w, h: lines.length * fontSize * LINE_H };
}
function fitText(el) {
  const m = measure(el.text, el.fontSize);
  el.w = m.w; el.h = m.h;
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function hit(el, x, y, thr, idx) {
  const g = idx && boolOf(idx, el);
  return g ? hitBool(g, x, y, thr) : hitRaw(el, x, y, thr);
}
function hitRaw(el, x, y, thr, forceFilled) {
  const [x1, y1, x2, y2] = bounds(el);
  if (el.angle) [x, y] = rot(x, y, (x1 + x2) / 2, (y1 + y2) / 2, -el.angle);
  if (x < x1 - thr || x > x2 + thr || y < y1 - thr || y > y2 + thr) return false;
  if (el.type === 'text' || el.type === 'symbol' || el.type === 'image') return true;
  if (hasPoints(el)) {
    const t = thr + el.strokeWidth / 2;
    const p = isCurved(el) ? curvePoly(el.points) : el.points;
    if (p.length === 1) return Math.hypot(x - el.x - p[0][0], y - el.y - p[0][1]) <= t;
    for (let i = 1; i < p.length; i++) {
      if (distSeg(x, y, el.x + p[i - 1][0], el.y + p[i - 1][1], el.x + p[i][0], el.y + p[i][1]) <= t) return true;
    }
    return false;
  }
  const filled = forceFilled || el.bg !== 'transparent';
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const hw = Math.max((x2 - x1) / 2, 1), hh = Math.max((y2 - y1) / 2, 1);
  if (el.text) {
    const m = measure(el.text, el.fontSize);
    if (Math.abs(x - cx) <= m.w / 2 + 4 && Math.abs(y - cy) <= m.h / 2 + 4) return true;
  }
  if (el.type === 'rectangle') {
    if (filled) return true;
    return x < x1 + thr || x > x2 - thr || y < y1 + thr || y > y2 - thr;
  }
  if (el.type === 'diamond') {
    const d = Math.abs(x - cx) / hw + Math.abs(y - cy) / hh;
    if (filled) return d <= 1 + thr / Math.min(hw, hh);
    return Math.abs(d - 1) * Math.min(hw, hh) <= thr * 1.4;
  }
  const d = Math.hypot((x - cx) / hw, (y - cy) / hh);
  if (filled) return d <= 1 + thr / Math.min(hw, hh);
  return Math.abs(d - 1) * Math.min(hw, hh) <= thr;
}
function elementAt(x, y) {
  const thr = 8 / view().zoom;
  const list = liveEls();
  const idx = boolIndex(list);
  for (let i = list.length - 1; i >= 0; i--) if (hit(list[i], x, y, thr, idx)) return list[i];
  return null;
}

// ---------- shape combinations (non-destructive booleans) ----------
// Members keep their own geometry; they share a boolId and the lowest one in the stack is the base:
// it supplies the style, and for 'subtract' it is the shape the others are cut out of.
const BOOL_OPS = [
  { op: 'union', icon: 'bUnion', label: 'Verenigen', key: 'Ctrl Alt U', t: 'Verenigen: alle vormen worden één vorm' },
  { op: 'subtract', icon: 'bSubtract', label: 'Aftrekken', key: 'Ctrl Alt S', t: 'Aftrekken: de onderste vorm min de vormen erboven' },
  { op: 'intersect', icon: 'bIntersect', label: 'Doorsnede', key: 'Ctrl Alt I', t: 'Doorsnede: alleen waar alle vormen overlappen' },
  { op: 'exclude', icon: 'bExclude', label: 'Uitsluiten', key: 'Ctrl Alt X', t: 'Uitsluiten: alles behalve de overlap' },
];
const boolCache = new Map();
const r3 = v => Math.round(v * 1000) / 1000;
const ptKey = p => r3(p[0]) + ',' + r3(p[1]);

function boolIndex(list) {
  const map = new Map();
  for (const e of list) {
    if (!e.bool || !e.boolId || !SHAPES.includes(e.type) || e.w < 0.5 || e.h < 0.5) continue;
    if (!map.has(e.boolId)) map.set(e.boolId, { id: e.boolId, members: [] });
    map.get(e.boolId).members.push(e);
  }
  for (const [id, g] of map) {
    if (g.members.length < 2) map.delete(id);
    else { g.base = g.members[0]; g.op = g.base.bool; }
  }
  return map;
}
function boolOf(idx, el) {
  const g = el.boolId && idx.get(el.boolId);
  return g && g.members.includes(el) ? g : null;
}
// outline of a shape as a polygon, relative to (ox, oy); `kinds` records which points are sharp corners
// ('v') and which lie on a curve ('c'), so the combined outline can be drawn with lines and curves again
function shapeRing(el, ox, oy, kinds) {
  const { w, h } = el;
  let pts = [];
  const mark = (p, k) => { p.k = k; pts.push(p); };
  if (el.type === 'ellipse') {
    const n = Math.max(32, Math.min(96, Math.ceil((w + h) / 6)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      mark([w / 2 + Math.cos(a) * w / 2, h / 2 + Math.sin(a) * h / 2], 'c');
    }
  } else {
    const rect = el.type === 'rectangle';
    const base = rect ? [[0, 0], [w, 0], [w, h], [0, h]] : [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
    const r = el.edges === 'round' ? (rect ? Math.min(32, Math.min(w, h) * 0.25) : Math.min(24, Math.min(w, h) * 0.2)) : 0;
    const n = base.length;
    for (let i = 0; i < n; i++) {
      const p = base[i];
      if (!r) { mark([p[0], p[1]], 'v'); continue; }
      const a = base[(i + n - 1) % n], b = base[(i + 1) % n];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
      const s = [p[0] + (a[0] - p[0]) * ra / la, p[1] + (a[1] - p[1]) * ra / la];
      const e = [p[0] + (b[0] - p[0]) * rb / lb, p[1] + (b[1] - p[1]) * rb / lb];
      const K = 12;
      for (let j = 0; j <= K; j++) {
        const t = j / K, u = 1 - t;
        mark([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]], j && j < K ? 'c' : 'e');
      }
    }
  }
  const cx = el.x + w / 2, cy = el.y + h / 2;
  const out = [];
  for (const p of pts) {
    let q = [el.x + p[0], el.y + p[1]];
    if (el.angle) q = rot(q[0], q[1], cx, cy, el.angle);
    q = [q[0] - ox, q[1] - oy];
    const last = out[out.length - 1];
    if (last && Math.hypot(last[0] - q[0], last[1] - q[1]) < 1e-6) continue;
    out.push(q);
    if (kinds && p.k !== 'e') kinds.set(ptKey(q), p.k);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
  return out;
}
function ringPath(path, ring) {
  ring.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
  path.closePath();
}
// pick evenly spaced points along a dense curve; rough.js wobbles every point, so fewer is smoother
function thinCurve(pts) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = d[d.length - 1];
  const n = Math.max(3, Math.round(total / 30) + 1);
  if (pts.length <= n) return pts;
  const out = [pts[0]];
  let j = 1;
  for (let k = 1; k < n - 1; k++) {
    const target = (total * k) / (n - 1);
    while (j < pts.length - 2 && d[j] < target) j++;
    if (out[out.length - 1] !== pts[j]) out.push(pts[j]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// turn one ring of the combined outline back into hand-drawn lines and curves
function ringDrawables(ring, kinds, o) {
  const n = ring.length;
  if (n < 3) return [];
  const kind = p => kinds.get(ptKey(p));
  const cs = [], brk = [];
  for (let i = 0; i < n; i++) {
    const ka = kind(ring[i]), kb = kind(ring[(i + 1) % n]);
    cs[i] = (ka === 'c' || kb === 'c') && ka !== 'v' && kb !== 'v';
  }
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n], q = ring[i], r = ring[(i + 1) % n];
    let t = Math.atan2(r[1] - q[1], r[0] - q[0]) - Math.atan2(q[1] - p[1], q[0] - p[0]);
    t = Math.abs(((t + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    brk[i] = cs[i] !== cs[(i + n - 1) % n] || t > (cs[i] ? 0.42 : 0.02);
  }
  const start = brk.indexOf(true);
  if (start < 0) return [cs[0] ? gen.curve(thinCurve([...ring, ring[0]]), o) : gen.polygon(ring, o)];
  const out = [];
  let i = start;
  do {
    const run = [ring[i]];
    const curved = cs[i];
    let j = i;
    do { j = (j + 1) % n; run.push(ring[j]); } while (j !== start && !brk[j]);
    const a = run[0], b = run[run.length - 1];
    out.push(curved && run.length > 2 ? gen.curve(thinCurve(run), o) : gen.line(a[0], a[1], b[0], b[1], o));
    i = j;
  } while (i !== start);
  return out;
}
function boolGeo(g) {
  const b = g.base;
  const sig = g.op + '|' + g.members.map(m => [m.type, r3(m.x - b.x), r3(m.y - b.y), r3(m.w), r3(m.h), r3(m.angle || 0), m.edges].join(',')).join(';') +
    '|' + [b.stroke, b.bg, b.fillStyle, b.strokeWidth, b.strokeStyle, b.roughness, b.seed].join(',');
  const cached = boolCache.get(g.id);
  if (cached && cached.sig === sig) return cached;
  const geo = { sig, rings: [], outline: [], fill: null, path: new Path2D(), memberPaths: [], empty: true, error: false };
  try {
    const kinds = new Map();
    const memberRings = g.members.map(m => shapeRing(m, b.x, b.y, kinds));
    geo.memberPaths = memberRings.map(r => { const p = new Path2D(); ringPath(p, r); return p; });
    const polys = memberRings.map(r => [[...r, r[0]]]);
    const pc = window.polygonClipping;
    const mp = g.op === 'subtract' ? pc.difference(polys[0], ...polys.slice(1))
      : g.op === 'intersect' ? pc.intersection(...polys)
      : g.op === 'exclude' ? pc.xor(...polys)
      : pc.union(...polys);
    for (const poly of mp) for (const ring of poly) {
      const r = ring.slice(0, -1);
      if (r.length >= 3) geo.rings.push(r);
    }
    geo.empty = !geo.rings.length;
    if (!geo.empty) {
      const o = roughOpts(b);
      const so = Object.assign({}, o);
      delete so.fill; delete so.fillStyle;
      for (const r of geo.rings) { ringPath(geo.path, r); geo.outline.push(...ringDrawables(r, kinds, so)); }
      if (o.fill && o.fillStyle !== 'solid') {
        const d = geo.rings.map(r => 'M' + r.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L') + ' Z').join(' ');
        const f = gen.path(d, Object.assign({}, o, { stroke: 'none' }));
        f.sets = f.sets.filter(s => s.type !== 'path');
        geo.fill = f;
      }
    }
  } catch (err) {
    console.warn('Vormcombinatie kon niet worden berekend', err);
    geo.error = true;
  }
  boolCache.set(g.id, geo);
  if (boolCache.size > 300) boolCache.delete(boolCache.keys().next().value);
  return geo;
}
function drawBool(c, r, g, ghost) {
  const geo = boolGeo(g), b = g.base;
  if (geo.error) { for (const m of g.members) drawEl(c, r, m); return; }
  c.save();
  c.globalAlpha = (b.opacity / 100) * (g.members.some(m => erasing.has(m.id)) ? 0.25 : 1);
  c.translate(b.x, b.y);
  if (geo.empty) {
    // nothing is left of the shapes: show faint outlines on screen so the combination can still be found and fixed
    if (ghost) {
      c.globalAlpha *= 0.45; c.strokeStyle = tc(b.stroke); c.lineWidth = 1; c.setLineDash([4, 4]);
      for (const p of geo.memberPaths) c.stroke(p);
    }
  } else {
    if (b.bg !== 'transparent') {
      if (geo.fill) r.draw(geo.fill);
      else { c.fillStyle = tc(b.bg); c.fill(geo.path, 'evenodd'); }
    }
    for (const d of geo.outline) r.draw(d);
  }
  c.restore();
  for (const m of g.members) if (m.text) drawEl(c, r, m, true);
}
function drawList(c, r, list, ghost) {
  const idx = boolIndex(list);
  const done = new Set();
  for (const el of list) {
    const g = boolOf(idx, el);
    if (!g) drawEl(c, r, el);
    else if (!done.has(g.id)) { done.add(g.id); drawBool(c, r, g, ghost); }
  }
}
function hitBool(g, x, y, thr) {
  const geo = boolGeo(g), b = g.base;
  if (geo.error || geo.empty) return g.members.some(m => hitRaw(m, x, y, thr));
  for (const m of g.members) {
    if (!m.text) continue;
    const [cx, cy] = center(m);
    const [lx, ly] = m.angle ? rot(x, y, cx, cy, -m.angle) : [x, y];
    const mm = measure(m.text, m.fontSize);
    if (Math.abs(lx - cx) <= mm.w / 2 + 4 && Math.abs(ly - cy) <= mm.h / 2 + 4) return true;
  }
  const px = x - b.x, py = y - b.y;
  const t = thr + b.strokeWidth / 2;
  let inside = false;
  for (const ring of geo.rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p = ring[i], q = ring[j];
      if (distSeg(px, py, p[0], p[1], q[0], q[1]) <= t) return true;
      if ((p[1] > py) !== (q[1] > py) && px < ((q[0] - p[0]) * (py - p[1])) / (q[1] - p[1]) + p[0]) inside = !inside;
    }
  }
  return inside && b.bg !== 'transparent';
}
// the single shape inside a combination that sits under the pointer
function memberAt(x, y) {
  const thr = 6 / view().zoom;
  const list = liveEls();
  const idx = boolIndex(list);
  for (let i = list.length - 1; i >= 0; i--) if (boolOf(idx, list[i]) && hitRaw(list[i], x, y, thr, true)) return list[i];
  return null;
}
const boolPeers = el => els().filter(e => e.boolId === el.boolId);
// a selection that sits inside one combination without covering all of it
function isDeepSel() {
  const sel = selectedEls();
  if (!sel.length || !sel[0].boolId || !sel.every(e => e.boolId === sel[0].boolId)) return false;
  return sel.length < boolPeers(sel[0]).length;
}
// what the combine buttons act on: an existing combination (change its mode) or loose shapes (make one)
function boolTarget(sel) {
  if (!sel.length) return null;
  if (sel[0].boolId && sel.every(e => e.boolId === sel[0].boolId)) {
    const peers = boolPeers(sel[0]);
    if (peers.length > 1) return { existing: true, list: peers, op: peers[0].bool };
  }
  if (sel.length > 1 && sel.every(e => SHAPES.includes(e.type))) return { existing: false, list: sel, op: null };
  return null;
}
function applyBool(op) {
  const t = boolTarget(selectedEls());
  if (!t) return;
  if (t.existing) for (const e of t.list) e.bool = op;
  else {
    const id = uid();
    for (const e of t.list) { e.bool = op; e.boolId = id; e.groupId = id; }
    // keep the members next to each other in the stack, at the height of the top one
    const set = new Set(t.list), list = els();
    const top = list.indexOf(t.list[t.list.length - 1]);
    const at = list.slice(0, top).filter(e => !set.has(e)).length;
    const rest = list.filter(e => !set.has(e));
    rest.splice(at, 0, ...t.list);
    doc.elements = rest;
  }
  state.selected = new Set(t.list.map(e => e.id));
  commit(); renderPanel(); render();
}

// ---------- drawing ----------
function polyPath(pts, r) {
  const n = pts.length;
  if (!r) return 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L') + ' Z';
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
    const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
    const s = [p[0] + (a[0] - p[0]) * ra / la, p[1] + (a[1] - p[1]) * ra / la];
    const e = [p[0] + (b[0] - p[0]) * rb / lb, p[1] + (b[1] - p[1]) * rb / lb];
    d += (i ? ' L' : 'M') + s[0] + ' ' + s[1] + ' Q' + p[0] + ' ' + p[1] + ' ' + e[0] + ' ' + e[1];
  }
  return d + ' Z';
}
function roughOpts(el) {
  const o = {
    seed: el.seed, roughness: el.roughness, stroke: tc(el.stroke),
    strokeWidth: el.strokeStyle === 'solid' ? el.strokeWidth : el.strokeWidth + 0.5,
    preserveVertices: el.roughness < 2,
  };
  if (el.strokeStyle === 'dashed') o.strokeLineDash = [8, 8 + el.strokeWidth];
  if (el.strokeStyle === 'dotted') o.strokeLineDash = [1.5, 6 + el.strokeWidth];
  if (el.strokeStyle !== 'solid') o.disableMultiStroke = true;
  if (isBoxy(el) && el.bg !== 'transparent') {
    o.fill = tc(el.bg); o.fillStyle = el.fillStyle;
    o.fillWeight = el.strokeWidth / 2; o.hachureGap = el.strokeWidth * 4;
  }
  return o;
}
function drawables(el) {
  const sig = [el.type, el.w, el.h, el.stroke, el.bg, el.fillStyle, el.strokeWidth, el.strokeStyle,
    el.roughness, el.edges, el.seed, el.headStart, el.headEnd, el.points ? el.points.join(';') : ''].join('|');
  const c = drawCache.get(el.id);
  if (c && c.sig === sig) return c.list;
  const o = roughOpts(el);
  let list = [];
  const { w, h } = el;
  if (el.type === 'rectangle') {
    const r = el.edges === 'round' ? Math.min(32, Math.min(w, h) * 0.25) : 0;
    list = [gen.path(polyPath([[0, 0], [w, 0], [w, h], [0, h]], r), o)];
  } else if (el.type === 'diamond') {
    const r = el.edges === 'round' ? Math.min(24, Math.min(w, h) * 0.2) : 0;
    list = [gen.path(polyPath([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]], r), o)];
  } else if (el.type === 'ellipse') {
    list = [gen.ellipse(w / 2, h / 2, w, h, o)];
  } else if (LINEAR.includes(el.type)) {
    const [a, b] = [el.points[0], el.points[el.points.length - 1]];
    let ca = b, cb = a;                                  // where each end "comes from": sets the direction of its head
    if (isCurved(el)) {
      const c = curveCtrl(el.points);
      list = [gen.path(`M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, o)];
      if (Math.hypot(c[0] - a[0], c[1] - a[1]) > 1) ca = c;
      if (Math.hypot(c[0] - b[0], c[1] - b[1]) > 1) cb = c;
    } else list = [gen.line(a[0], a[1], b[0], b[1], o)];
    if (el.type === 'arrow') {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const size = Math.min(14 + el.strokeWidth * 4, len / 2);
      const ho = Object.assign({}, o, { strokeLineDash: undefined, strokeWidth: el.strokeWidth });
      const full = Object.assign({}, ho, { fill: o.stroke, fillStyle: 'solid' });
      for (const [tip, from, kind] of [[a, ca, headOf(el, false)], [b, cb, headOf(el, true)]]) {
        const back = Math.atan2(from[1] - tip[1], from[0] - tip[0]);
        const at = (t, r) => [tip[0] + Math.cos(t) * r, tip[1] + Math.sin(t) * r];
        if (kind === 'arrow') for (const sgn of [-1, 1]) list.push(gen.line(tip[0], tip[1], ...at(back + sgn * 0.44, size), ho));
        else if (kind === 'triangle') list.push(gen.polygon([tip, at(back + 0.4, size), at(back - 0.4, size)], full));
        else if (kind === 'dot') list.push(gen.circle(tip[0], tip[1], Math.min(size * 0.6, 6 + el.strokeWidth * 3), full));
        else if (kind === 'bar') list.push(gen.line(...at(back + Math.PI / 2, size * 0.5), ...at(back - Math.PI / 2, size * 0.5), ho));
      }
    }
  }
  drawCache.set(el.id, { sig, list });
  return list;
}
// ---------- library symbols ----------
// A symbol is drawn from its kind and its box, so a sofa gets more seats when it is made wider instead of
// being stretched. Everything faces "up" (towards the rotate handle) at angle 0.
function symbolDrawables(el) {
  const sig = ['sym', el.kind, el.w, el.h, el.stroke, el.bg, el.fillStyle, el.strokeWidth, el.strokeStyle, el.roughness, el.seed].join('|');
  const cached = drawCache.get(el.id);
  if (cached && cached.sig === sig) return cached.list;
  const o = roughOpts(el);
  const line = Object.assign({}, o);
  delete line.fill; delete line.fillStyle;
  const { w, h } = el;
  const list = [];
  const R = (x, y, ww, hh, r, opt = o) => list.push(gen.path(polyPath([[x, y], [x + ww, y], [x + ww, y + hh], [x, y + hh]], r), opt));
  const E = (cx, cy, ww, hh, opt = o) => list.push(gen.ellipse(cx, cy, ww, hh, opt));
  const L = (x1, y1, x2, y2) => list.push(gen.line(x1, y1, x2, y2, line));
  const P = (pts, opt = o) => list.push(gen.polygon(pts, opt));
  switch (el.kind) {
    case 'camera':
      P([[w * 0.3, h * 0.32], [w * 0.16, 0], [w * 0.84, 0], [w * 0.7, h * 0.32]]);
      R(0, h * 0.3, w, h * 0.7, 5);
      break;
    case 'light':
      P([[w * 0.14, h * 0.34], [w * 0.86, h * 0.34], [w * 0.62, h], [w * 0.38, h]]);
      R(0, 0, w, h * 0.34, 2);
      break;
    case 'person': {
      const hd = Math.min(w * 0.46, h * 0.8), cy = h * 0.5;
      E(w / 2, h * 0.56, w, h * 0.74);
      P([[w / 2 - hd * 0.16, cy - hd * 0.44], [w / 2, cy - hd * 0.74], [w / 2 + hd * 0.16, cy - hd * 0.44]], line);
      E(w / 2, cy, hd, hd);
      break;
    }
    case 'mark':
      E(w / 2, h / 2, w, h);
      L(w * 0.26, h * 0.26, w * 0.74, h * 0.74); L(w * 0.74, h * 0.26, w * 0.26, h * 0.74);
      break;
    case 'chair':
      R(w * 0.08, 0, w * 0.84, h * 0.8, 6);
      R(0, h * 0.74, w, h * 0.26, 5);
      break;
    case 'sofa': {
      const a = Math.min(20, w * 0.16), b = Math.min(22, h * 0.3);
      R(0, 0, w, h, 10);
      L(a, 0, a, h); L(w - a, 0, w - a, h); L(a, h - b, w - a, h - b);
      const n = Math.max(1, Math.round((w - 2 * a) / 72));
      for (let i = 1; i < n; i++) { const x = a + (i * (w - 2 * a)) / n; L(x, 0, x, h - b); }
      break;
    }
    case 'bed': {
      R(0, 0, w, h, 6);
      const n = w > 110 ? 2 : 1, gap = Math.min(10, w * 0.08);
      const pw = (w - gap * (n + 1)) / n, ph = Math.min(34, h * 0.18);
      for (let i = 0; i < n; i++) R(gap + i * (pw + gap), gap, pw, ph, 5, line);
      L(0, gap * 2 + ph, w, gap * 2 + ph);
      break;
    }
    case 'cabinet':
      R(0, 0, w, h, 0);
      L(0, 0, w, h); L(w, 0, 0, h);
      break;
    case 'door':
      list.push(gen.arc(0, h, w * 2, h * 2, -Math.PI / 2, 0, false, line));
      R(0, 0, Math.min(5, w * 0.1), h, 0);
      break;
    case 'window':
      R(0, 0, w, h, 0);
      L(0, h / 2, w, h / 2);
      break;
    case 'plant':
      E(w / 2, h / 2, w, h);
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * Math.PI * 2 + 0.3;
        L(w / 2, h / 2, w / 2 + Math.cos(t) * w * 0.4, h / 2 + Math.sin(t) * h * 0.4);
      }
      break;
    case 'rug':
      R(0, 0, w, h, 2);
      if (w > 28 && h > 28) R(8, 8, w - 16, h - 16, 0, line);
      break;
    default:
      R(0, 0, w, h, 0);
  }
  drawCache.set(el.id, { sig, list });
  return list;
}
// the view cone of a camera or the beam of a light, in the symbol's own (unrotated) space
function drawCone(c, el) {
  const half = (el.fov / 2) * Math.PI / 180;
  const ax = el.w / 2, ay = 0;
  const alpha = c.globalAlpha;
  c.beginPath();
  c.moveTo(ax, ay);
  c.arc(ax, ay, el.range, -Math.PI / 2 - half, -Math.PI / 2 + half);
  c.closePath();
  c.fillStyle = tc(el.stroke); c.globalAlpha = alpha * 0.12; c.fill();
  c.strokeStyle = tc(el.stroke); c.globalAlpha = alpha * 0.75; c.lineWidth = 1.2; c.setLineDash([7, 5]); c.stroke();
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - el.range);
  c.globalAlpha = alpha * 0.3; c.stroke();
  c.setLineDash([]); c.globalAlpha = alpha;
}
// corners of the cone in world space, for export bounds
function conePoints(el) {
  const half = (el.fov / 2) * Math.PI / 180;
  const ax = el.x + el.w / 2, ay = el.y;
  const [cx, cy] = center(el);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = -half + (i / 8) * half * 2;
    pts.push(rot(ax + Math.sin(t) * el.range, ay - Math.cos(t) * el.range, cx, cy, el.angle || 0));
  }
  return pts;
}
function visualBounds(list) {
  // a combination is as large as its outcome, not as the shapes it is made of (a cutter can stick out far)
  const idx = boolIndex(list), seen = new Set(), loose = [], boxes = [];
  for (const el of list) {
    const g = boolOf(idx, el);
    if (!g) { loose.push(el); continue; }
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    const geo = boolGeo(g);
    if (geo.error || geo.empty) { loose.push(...g.members); continue; }
    for (const ring of geo.rings) for (const p of ring) boxes.push([g.base.x + p[0], g.base.y + p[1]]);
  }
  let [x1, y1, x2, y2] = groupBounds(loose);
  for (const p of boxes) { x1 = Math.min(x1, p[0]); y1 = Math.min(y1, p[1]); x2 = Math.max(x2, p[0]); y2 = Math.max(y2, p[1]); }
  for (const el of list) if (hasCone(el)) for (const p of conePoints(el)) {
    x1 = Math.min(x1, p[0]); y1 = Math.min(y1, p[1]); x2 = Math.max(x2, p[0]); y2 = Math.max(y2, p[1]);
  }
  // labels can stick out of their object (next to a camera, or wider than a small shape)
  for (const el of list) if (el.text && isBoxy(el)) {
    const m = measure(el.text, el.fontSize);
    const [lx, ly] = labelCenter(el, m);
    const r = el.type === 'symbol' ? Math.max(m.w, m.h) / 2 : Math.hypot(m.w, m.h) / 2;
    const hw = el.type === 'symbol' ? m.w / 2 : r, hh = el.type === 'symbol' ? m.h / 2 : r;
    x1 = Math.min(x1, lx - hw); y1 = Math.min(y1, ly - hh); x2 = Math.max(x2, lx + hw); y2 = Math.max(y2, ly + hh);
  }
  return [x1, y1, x2, y2];
}
// where the label of a boxy element sits: in the middle, or behind a camera/person so it stays readable
function labelCenter(el, m) {
  const [cx, cy] = center(el);
  if (el.type !== 'symbol' || !['camera', 'light', 'person', 'mark'].includes(el.kind)) return [cx, cy];
  const a = el.angle || 0;
  const d = el.h / 2 + 6 + (Math.abs(Math.cos(a)) * m.h + Math.abs(Math.sin(a)) * m.w) / 2;
  return [cx - Math.sin(a) * d, cy + Math.cos(a) * d];
}

function drawTextLines(c, text, fontSize, color, x, y, align) {
  c.font = `${fontSize}px ${FONT}`;
  c.fillStyle = color;
  c.textBaseline = 'middle';
  c.textAlign = align;
  const lh = fontSize * LINE_H;
  text.split('\n').forEach((line, i) => c.fillText(line, x, y + (i + 0.5) * lh));
}
function drawEl(c, r, el, labelOnly) {
  c.save();
  c.globalAlpha = (el.opacity / 100) * (erasing.has(el.id) ? 0.25 : 1);
  const isEditing = editing && editing.el.id === el.id;
  if (el.angle) {
    const [cx, cy] = center(el);
    c.translate(cx, cy); c.rotate(el.angle); c.translate(-cx, -cy);
  }
  if (el.type === 'text') {
    if (!isEditing) drawTextLines(c, el.text, el.fontSize, tc(el.stroke), el.x, el.y, 'left');
  } else if (el.type === 'draw') {
    const p = el.points;
    c.strokeStyle = c.fillStyle = tc(el.stroke);
    c.lineWidth = el.strokeWidth * 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.translate(el.x, el.y);
    c.beginPath();
    if (p.length < 3) {
      c.arc(p[0][0], p[0][1], c.lineWidth / 2, 0, Math.PI * 2);
      c.fill();
      if (p.length === 2) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); c.stroke(); }
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length - 1; i++) {
        c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      }
      c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      c.stroke();
    }
  } else if (el.type === 'image') {
    const rec = images.get(el.imageId);
    if (rec) {
      c.imageSmoothingQuality = 'high';
      c.drawImage(rec.img, el.x, el.y, el.w, el.h);
    } else {
      // still loading, or the pixels are missing (e.g. opened in another browser)
      c.strokeStyle = `rgba(${gridInk()},0.4)`; c.lineWidth = 1; c.setLineDash([6, 5]);
      c.strokeRect(el.x, el.y, el.w, el.h);
      c.beginPath(); c.moveTo(el.x, el.y); c.lineTo(el.x + el.w, el.y + el.h); c.moveTo(el.x + el.w, el.y); c.lineTo(el.x, el.y + el.h); c.stroke();
    }
  } else if (el.type === 'symbol') {
    c.translate(el.x, el.y);
    if (hasCone(el)) drawCone(c, el);
    if (el.flip) { c.translate(el.w, 0); c.scale(-1, 1); }
    for (const d of symbolDrawables(el)) r.draw(d);
    if (el.text && !isEditing) {
      // labels of symbols stay horizontal, whatever way the symbol is turned
      const alpha = c.globalAlpha;
      c.restore(); c.save();
      c.globalAlpha = alpha;
      const m = measure(el.text, el.fontSize);
      const [lx, ly] = labelCenter(el, m);
      drawTextLines(c, el.text, el.fontSize, tc(el.textColor || el.stroke), lx, ly - m.h / 2, 'center');
    }
  } else {
    if (SHAPES.includes(el.type) && (el.w < 0.5 || el.h < 0.5)) { c.restore(); return; }
    c.translate(el.x, el.y);
    if (!labelOnly) for (const d of drawables(el)) r.draw(d);
    if (el.text && !isEditing) {
      const m = measure(el.text, el.fontSize);
      drawTextLines(c, el.text, el.fontSize, tc(el.textColor || el.stroke), el.w / 2, el.h / 2 - m.h / 2, 'center');
    }
  }
  c.restore();
}

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; paint(); });
}
function paint() {
  const dpr = window.devicePixelRatio || 1;
  const { zoom, scrollX, scrollY } = view();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = canvasBg();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paintGrid(dpr);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * zoom * scrollX, dpr * zoom * scrollY);
  drawList(ctx, rc, visEls(), true);
  if (guides.length) {
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1 / zoom; ctx.setLineDash([]);
    ctx.beginPath();
    for (const g of guides) { ctx.moveTo(g.x1, g.y1); ctx.lineTo(g.x2, g.y2); }
    ctx.stroke();
  }

  // selection overlay
  const sel = selectedEls();
  const px = 1 / zoom;
  if (sel.length && !editing) {
    ctx.strokeStyle = ACCENT; ctx.lineWidth = px; ctx.setLineDash([]);
    const pad = 4 * px;
    if (sel.length === 1 && LINEAR.includes(sel[0].type)) {
      for (const p of endpointHandles(sel[0])) drawHandle(p.x, p.y, true);
      const m = midHandle(sel[0]);
      drawHandle(m.x, m.y, true, isCurved(sel[0]));
    } else {
      const idx = boolIndex(els());
      for (const el of sel) {
        const g = boolOf(idx, el);
        if (g) {
          // a shape inside a combination: show its own outline, also where it is cut away
          const geo = boolGeo(g);
          const path = geo.memberPaths[g.members.indexOf(el)];
          if (path) {
            ctx.save();
            ctx.translate(g.base.x, g.base.y);
            ctx.setLineDash([3 * px, 3 * px]);
            ctx.stroke(path);
            ctx.restore();
            continue;
          }
        }
        const b = bounds(el);
        ctx.save();
        if (el.angle) {
          const [cx, cy] = center(el);
          ctx.translate(cx, cy); ctx.rotate(el.angle); ctx.translate(-cx, -cy);
        }
        ctx.strokeRect(b[0] - pad, b[1] - pad, b[2] - b[0] + pad * 2, b[3] - b[1] + pad * 2);
        ctx.restore();
      }
      if (sel.length > 1) {
        const g = groupBounds(sel);
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.strokeRect(g[0] - pad * 2, g[1] - pad * 2, g[2] - g[0] + pad * 4, g[3] - g[1] + pad * 4);
        ctx.setLineDash([]);
      }
      for (const hd of resizeHandles(sel)) {
        drawHandle(hd.x, hd.y, hd.id === 'rot' || hd.id === 'fov');
        if (hd.id === 'fov') {
          ctx.font = `${12 * px}px ${FONT}`; ctx.fillStyle = ACCENT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(sel[0].fov + '°', hd.x + 10 * px, hd.y);
        }
      }
    }
  }
  if (drag && drag.type === 'box') {
    const b = drag;
    ctx.fillStyle = ctx.strokeStyle = ACCENT; ctx.lineWidth = px;
    const x = Math.min(b.start.x, b.cur.x), y = Math.min(b.start.y, b.cur.y);
    const w = Math.abs(b.cur.x - b.start.x), h = Math.abs(b.cur.y - b.start.y);
    ctx.globalAlpha = 0.1; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1; ctx.strokeRect(x, y, w, h);
  }
}
function drawHandle(x, y, roundHandle, filled) {
  const s = 8 / view().zoom;
  ctx.fillStyle = filled ? ACCENT : canvasBg(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1 / view().zoom;
  ctx.beginPath();
  if (roundHandle) ctx.arc(x, y, s / 2 + 1 / view().zoom, 0, Math.PI * 2);
  else ctx.rect(x - s / 2, y - s / 2, s, s);
  ctx.fill(); ctx.stroke();
}
function selectionBox(sel) {
  const g = groupBounds(sel);
  const pad = (sel.length > 1 ? 8 : 4) / view().zoom;
  return [g[0] - pad, g[1] - pad, g[2] + pad, g[3] + pad];
}
function resizeHandles(sel) {
  if (!sel.length || (sel.length === 1 && LINEAR.includes(sel[0].type))) return [];
  const f = selFrame(sel);
  const x1 = f.box[0] - f.pad, y1 = f.box[1] - f.pad, x2 = f.box[2] + f.pad, y2 = f.box[3] + f.pad;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const list = [
    { id: 'nw', x: x1, y: y1 }, { id: 'ne', x: x2, y: y1 }, { id: 'se', x: x2, y: y2 }, { id: 'sw', x: x1, y: y2 },
    { id: 'rot', x: mx, y: y1 - 24 / view().zoom },
  ];
  if (!sel.some(e => e.type === 'text')) {
    const min = 28 / view().zoom;
    if (x2 - x1 > min) list.push({ id: 'n', x: mx, y: y1 }, { id: 's', x: mx, y: y2 });
    if (y2 - y1 > min) list.push({ id: 'e', x: x2, y: my }, { id: 'w', x: x1, y: my });
  }
  if (sel.length === 1 && hasCone(sel[0])) {
    // handle on the edge of the view cone: drag it to set the field of view and the reach
    const el = sel[0], half = (el.fov / 2) * Math.PI / 180;
    list.push({ id: 'fov', x: el.x + el.w / 2 + Math.sin(half) * el.range, y: el.y - Math.cos(half) * el.range });
  }
  if (!f.angle) return list;
  return list.map(h => { const [x, y] = rot(h.x, h.y, f.cx, f.cy, f.angle); return { id: h.id, x, y }; });
}
// the box the handles sit on: a single shape/text keeps its own rotation, anything else is axis-aligned
function selFrame(sel) {
  const single = sel.length === 1 && !hasPoints(sel[0]);
  const box = single ? bounds(sel[0]) : groupBounds(sel);
  return {
    box, angle: single ? sel[0].angle || 0 : 0,
    cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2,
    pad: (sel.length > 1 ? 8 : 4) / view().zoom,
  };
}

// ---------- grid & snapping ----------
let guides = [];
function paintGrid(dpr) {
  const g = state.grid;
  if (!g.show || g.opacity <= 0) return;
  const { zoom, scrollX, scrollY } = view();
  let ws = Math.max(2, g.size);
  const minPx = g.type === 'dots' ? 12 : 8;
  while (ws * zoom < minPx) ws *= 2;
  const a = g.opacity / 100;
  const i0 = Math.ceil(-scrollX / ws), j0 = Math.ceil(-scrollY / ws);
  const W = canvas.width, H = canvas.height;
  const sx = i => (i * ws + scrollX) * zoom * dpr, sy = j => (j * ws + scrollY) * zoom * dpr;
  if (g.type === 'dots') {
    const r = Math.max(1, Math.round(1.5 * dpr));
    ctx.fillStyle = `rgba(${gridInk()},${a})`;
    for (let i = i0; sx(i) <= W; i++) for (let j = j0; sy(j) <= H; j++) ctx.fillRect(Math.round(sx(i) - r / 2), Math.round(sy(j) - r / 2), r, r);
    return;
  }
  ctx.lineWidth = 1;
  for (const major of [false, true]) {
    ctx.strokeStyle = `rgba(${gridInk()},${major ? a : a * 0.4})`;
    ctx.beginPath();
    for (let i = i0; sx(i) <= W; i++) if ((i % 5 === 0) === major) { const x = Math.round(sx(i)) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let j = j0; sy(j) <= H; j++) if ((j % 5 === 0) === major) { const y = Math.round(sy(j)) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
}
const gridSnap = v => Math.round(v / state.grid.size) * state.grid.size;
// boxes of the other on-screen elements, used as snap targets
function snapTargets(excludeIds) {
  if (!state.snapObjects) return [];
  const z = view().zoom;
  const vx1 = -view().scrollX, vy1 = -view().scrollY, vx2 = vx1 + innerWidth / z, vy2 = vy1 + innerHeight / z;
  return visEls().filter(e => !excludeIds.has(e.id)).map(aabb)
    .filter(b => b[2] >= vx1 && b[0] <= vx2 && b[3] >= vy1 && b[1] <= vy2);
}
function snapAxis(vals, targets, axis) {
  const thr = 6 / view().zoom;
  let best = null;
  for (const b of targets) {
    const ts = [b[axis], (b[axis] + b[axis + 2]) / 2, b[axis + 2]];
    for (const v of vals) for (const t of ts) {
      const d = t - v;
      if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t, b };
    }
  }
  return best;
}
function snapPoint(p, e, targets) {
  guides = [];
  if (e.ctrlKey || e.metaKey) return p;
  let { x, y } = p;
  const sx = targets && targets.length ? snapAxis([x], targets, 0) : null;
  const sy = targets && targets.length ? snapAxis([y], targets, 1) : null;
  if (sx) x = sx.t; else if (state.grid.snap) x = gridSnap(x);
  if (sy) y = sy.t; else if (state.grid.snap) y = gridSnap(y);
  if (sx) guides.push({ x1: x, y1: Math.min(sx.b[1], y), x2: x, y2: Math.max(sx.b[3], y) });
  if (sy) guides.push({ x1: Math.min(sy.b[0], x), y1: y, x2: Math.max(sy.b[2], x), y2: y });
  return { x, y };
}
function snapMove(box, dx, dy, e, targets) {
  guides = [];
  if (e.ctrlKey || e.metaKey) return [dx, dy];
  const b = [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy];
  const sx = targets.length ? snapAxis([b[0], (b[0] + b[2]) / 2, b[2]], targets, 0) : null;
  const sy = targets.length ? snapAxis([b[1], (b[1] + b[3]) / 2, b[3]], targets, 1) : null;
  if (sx) dx += sx.d; else if (state.grid.snap) dx = gridSnap(box[0] + dx) - box[0];
  if (sy) dy += sy.d; else if (state.grid.snap) dy = gridSnap(box[1] + dy) - box[1];
  if (sx) guides.push({ x1: sx.t, y1: Math.min(sx.b[1], box[1] + dy), x2: sx.t, y2: Math.max(sx.b[3], box[3] + dy) });
  if (sy) guides.push({ x1: Math.min(sy.b[0], box[0] + dx), y1: sy.t, x2: Math.max(sy.b[2], box[2] + dx), y2: sy.t });
  return [dx, dy];
}

// ---------- align & distribute ----------
function selUnits() {
  const map = new Map();
  for (const el of selectedEls()) {
    const k = el.groupId || el.id;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(el);
  }
  return [...map.values()].map(list => ({ list, box: groupBounds(list) }));
}
function alignSelected(mode) {
  const units = selUnits();
  if (units.length < 2) return;
  const g = groupBounds(selectedEls());
  for (const u of units) {
    const b = u.box;
    let dx = 0, dy = 0;
    if (mode === 'left') dx = g[0] - b[0];
    else if (mode === 'right') dx = g[2] - b[2];
    else if (mode === 'hcenter') dx = (g[0] + g[2] - b[0] - b[2]) / 2;
    else if (mode === 'top') dy = g[1] - b[1];
    else if (mode === 'bottom') dy = g[3] - b[3];
    else if (mode === 'vcenter') dy = (g[1] + g[3] - b[1] - b[3]) / 2;
    for (const el of u.list) { el.x += dx; el.y += dy; }
  }
  commit(); render();
}
function distributeSelected(axis) {
  const units = selUnits();
  if (units.length < 3) return;
  units.sort((a, b) => (a.box[axis] + a.box[axis + 2]) - (b.box[axis] + b.box[axis + 2]));
  const size = u => u.box[axis + 2] - u.box[axis];
  const span = units[units.length - 1].box[axis + 2] - units[0].box[axis];
  const gap = (span - units.reduce((s, u) => s + size(u), 0)) / (units.length - 1);
  let pos = units[0].box[axis];
  for (const u of units) {
    const d = pos - u.box[axis];
    for (const el of u.list) { if (axis) el.y += d; else el.x += d; }
    pos += size(u) + gap;
  }
  commit(); render();
}
function endpointHandles(el) {
  const last = el.points.length - 1;
  return [
    { i: 0, x: el.x + el.points[0][0], y: el.y + el.points[0][1] },
    { i: last, x: el.x + el.points[last][0], y: el.y + el.points[last][1] },
  ];
}
// the handle in the middle of a line or arrow: drag it to bend the line
function midHandle(el) {
  const p = el.points, a = p[0], b = p[p.length - 1];
  const m = p.length === 3 ? p[1] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { x: el.x + m[0], y: el.y + m[1] };
}
function handleAt(p) {
  const sel = selectedEls();
  if (!sel.length) return null;
  const t = 7 / view().zoom;
  if (sel.length === 1 && LINEAR.includes(sel[0].type)) {
    for (const h of endpointHandles(sel[0])) if (Math.abs(p.x - h.x) <= t && Math.abs(p.y - h.y) <= t) return { endpoint: h.i };
    const m = midHandle(sel[0]);
    if (Math.abs(p.x - m.x) <= t && Math.abs(p.y - m.y) <= t) return { mid: true };
    return null;
  }
  for (const h of resizeHandles(sel)) if (Math.abs(p.x - h.x) <= t && Math.abs(p.y - h.y) <= t) return { resize: h.id };
  return null;
}

// ---------- element creation ----------
function makeEl(type, x, y) {
  const s = state.style;
  const el = {
    id: uid(), type, x, y, w: 0, h: 0, seed: seed(), text: '', layer: doc.activeLayer,
    stroke: s.stroke, bg: s.bg, fillStyle: s.fillStyle, strokeWidth: s.strokeWidth,
    strokeStyle: s.strokeStyle, roughness: s.roughness, edges: s.edges, opacity: s.opacity, fontSize: s.fontSize,
  };
  if (hasPoints({ type })) el.points = [[0, 0]];
  if (type === 'arrow') { el.headStart = s.headStart || 'none'; el.headEnd = s.headEnd || 'arrow'; }
  return el;
}
function cloneEls(list, dx, dy) {
  const groupMap = new Map();
  return list.map(e => {
    const c = JSON.parse(JSON.stringify(e));
    c.id = uid(); c.seed = seed(); c.x += dx; c.y += dy;
    for (const k of ['groupId', 'boolId']) {
      if (!c[k]) continue;
      if (!groupMap.has(c[k])) groupMap.set(c[k], uid());
      c[k] = groupMap.get(c[k]);
    }
    return c;
  });
}

// ---------- groups ----------
const groupMembers = el => (el.groupId ? els().filter(e => e.groupId === el.groupId) : [el]);
function expandGroups() {
  const groups = new Set(selectedEls().map(e => e.groupId).filter(Boolean));
  if (groups.size) for (const el of els()) if (groups.has(el.groupId)) state.selected.add(el.id);
}
function canGroup(sel) {
  return sel.length > 1 && !(sel[0].groupId && sel.every(e => e.groupId === sel[0].groupId));
}
function groupSelected() {
  const sel = selectedEls();
  if (!canGroup(sel)) return;
  const id = uid();
  for (const el of sel) el.groupId = id;
  commit(); renderPanel(); render();
}
const ungroupLabel = sel => (sel.some(e => e.groupId && e.boolId === e.groupId) ? 'Combinatie opheffen' : 'Groep opheffen');
function ungroupSelected() {
  const sel = selectedEls().filter(e => e.groupId);
  if (!sel.length) return;
  for (const el of sel) {
    // a combination inside a bigger group falls back to its own grouping; on its own it is released
    if (el.boolId && el.groupId !== el.boolId) el.groupId = el.boolId;
    else { delete el.groupId; delete el.boolId; delete el.bool; }
  }
  commit(); renderPanel(); render();
}

// ---------- text editing ----------
function startEdit(el, isNew) {
  if (editing) finishEdit();
  editing = { el, isNew };
  state.selected.clear();
  editor.value = el.text || '';
  editor.hidden = false;
  layoutEditor();
  editor.focus();
  if (!isNew) editor.select();
  renderPanel(); render();
}
function layoutEditor() {
  if (!editing) return;
  const { el } = editing;
  const z = view().zoom;
  const m = measure(editor.value || ' ', el.fontSize);
  const w = m.w + el.fontSize;
  let wx, wy;
  if (el.type === 'text') { wx = el.x; wy = el.y; editor.style.textAlign = 'left'; }
  else {
    const [lx, ly] = labelCenter(el, m);
    wx = lx - w / 2; wy = ly - m.h / 2; editor.style.textAlign = 'center';
  }
  const s = toScreen(wx, wy);
  editor.style.left = s.x + 'px';
  editor.style.top = s.y + 'px';
  editor.style.width = w * z + 'px';
  editor.style.height = m.h * z + 'px';
  editor.style.fontSize = el.fontSize * z + 'px';
  editor.style.transformOrigin = el.type === 'text' ? `${m.w * z / 2}px ${m.h * z / 2}px` : 'center';
  editor.style.transform = el.angle && el.type !== 'symbol' ? `rotate(${el.angle}rad)` : 'none';
  const textColor = tc(el.type === 'text' ? el.stroke : el.textColor || el.stroke);
  editor.style.color = textColor;
  editor.style.caretColor = textColor;
}
function finishEdit() {
  if (!editing) return;
  const { el, isNew } = editing;
  editing = null;
  editor.hidden = true;
  const text = editor.value.replace(/\s+$/, '');
  if (el.type === 'text') {
    if (!text) doc.elements = els().filter(e => e.id !== el.id);
    else { el.text = text; fitText(el); state.selected = new Set([el.id]); }
  } else {
    el.text = text;
    state.selected = new Set([el.id]);
  }
  if (isNew && !state.locked) setTool('selection', true);
  commit(); renderPanel(); render();
}
editor.addEventListener('input', layoutEditor);
editor.addEventListener('blur', finishEdit);
editor.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); finishEdit(); }
});

// ---------- pointer interaction ----------
function pointerPos(e) { return toWorld(e.clientX, e.clientY); }

canvas.addEventListener('pointerdown', e => {
  if (editing) finishEdit();
  $('sidebar').hidden = true;
  canvas.setPointerCapture(e.pointerId);
  const p = pointerPos(e);
  const tool = state.tool;

  if (e.button === 1 || (e.button === 0 && (tool === 'hand' || spaceDown))) {
    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view().scrollX, oy: view().scrollY };
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (e.button !== 0) return;

  if (tool === 'selection') {
    const h = handleAt(p);
    if (h && h.endpoint !== undefined) {
      const el = selectedEls()[0];
      drag = { type: 'endpoint', el, i: h.endpoint, other: h.endpoint === 0 ? el.points.length - 1 : 0, targets: snapTargets(state.selected),
        from: el.points[h.endpoint].slice(), mid0: isCurved(el) ? el.points[1].slice() : null };
      return;
    }
    if (h && h.mid) { drag = { type: 'mid', el: selectedEls()[0] }; return; }
    if (h) {
      const sel = selectedEls();
      const frame = selFrame(sel);
      const orig = sel.map(el => JSON.parse(JSON.stringify(el)));
      if (h.resize === 'fov') { drag = { type: 'fov', el: sel[0] }; return; }
      if (h.resize === 'rot') {
        drag = { type: 'rotate', cx: frame.cx, cy: frame.cy, start: Math.atan2(p.y - frame.cy, p.x - frame.cx), orig };
        canvas.style.cursor = 'grabbing';
        return;
      }
      drag = {
        type: 'resize', handle: h.resize, box: frame.box, frame, orig, targets: snapTargets(state.selected),
        uniform: sel.some(el => el.type === 'text' || el.type === 'image') || (sel.length > 1 && sel.some(el => el.angle)),
      };
      return;
    }
    const inSelBox = () => {
      const b = selectionBox(selectedEls());
      return p.x >= b[0] && p.x <= b[2] && p.y >= b[1] && p.y <= b[3];
    };
    let target = null;
    // Ctrl+click picks one shape out of a combination; once picked it can be dragged by its box
    const member = (e.ctrlKey || e.metaKey) && !e.shiftKey ? memberAt(p.x, p.y) : null;
    if (member) { state.selected = new Set([member.id]); target = 'selection'; }
    else if (isDeepSel() && inSelBox()) target = 'selection';
    else target = elementAt(p.x, p.y);
    if (!target && state.selected.size && inSelBox()) target = 'selection';
    if (target) {
      if (target !== 'selection') {
        const ids = groupMembers(target).map(m => m.id);
        if (e.shiftKey) {
          const on = state.selected.has(target.id);
          for (const id of ids) on ? state.selected.delete(id) : state.selected.add(id);
        } else if (!ids.every(id => state.selected.has(id))) state.selected = new Set(ids);
      }
      if (e.altKey && state.selected.size) {
        const copies = cloneEls(selectedEls(), 0, 0);
        doc.elements.push(...copies);
        state.selected = new Set(copies.map(c => c.id));
      }
      drag = {
        type: 'move', start: p, moved: false, orig: selectedEls().map(el => ({ el, x: el.x, y: el.y })),
        box: groupBounds(selectedEls()), targets: snapTargets(state.selected),
      };
    } else {
      if (!e.shiftKey) state.selected.clear();
      drag = { type: 'box', start: p, cur: p, base: new Set(state.selected) };
    }
    renderPanel(); render();
    return;
  }
  if (tool === 'eraser') {
    drag = { type: 'erase' };
    eraseAt(p);
    return;
  }
  if (tool === 'text') {
    const target = elementAt(p.x, p.y);
    if (target && target.type === 'text') { startEdit(target, false); return; }
    if (!canDraw()) return;
    const el = makeEl('text', p.x, p.y - state.style.fontSize * LINE_H / 2);
    doc.elements.push(el);
    e.preventDefault();
    startEdit(el, true);
    return;
  }
  if (!canDraw()) return;
  state.selected.clear();
  const targets = tool === 'draw' ? [] : snapTargets(new Set());
  const sp = tool === 'draw' ? p : snapPoint(p, e, targets);
  guides = [];
  const el = makeEl(tool, sp.x, sp.y);
  doc.elements.push(el);
  drag = { type: tool === 'draw' ? 'draw' : 'create', el, start: sp, targets };
  renderPanel(); render();
});

canvas.addEventListener('pointerleave', () => { lastPointer = null; });
canvas.addEventListener('pointermove', e => {
  const p = pointerPos(e);
  lastPointer = { x: e.clientX, y: e.clientY };
  if (!drag) { updateCursor(p); return; }
  const d = drag;
  if (d.type === 'pan') {
    view().scrollX = d.ox + (e.clientX - d.sx) / view().zoom;
    view().scrollY = d.oy + (e.clientY - d.sy) / view().zoom;
  } else if (d.type === 'move') {
    let dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (Math.hypot(dx, dy) * view().zoom > 2) d.moved = true;
    if (d.moved) {
      [dx, dy] = snapMove(d.box, dx, dy, e, d.targets);
      for (const o of d.orig) { o.el.x = o.x + dx; o.el.y = o.y + dy; }
    }
  } else if (d.type === 'box') {
    d.cur = p;
    const x1 = Math.min(d.start.x, p.x), y1 = Math.min(d.start.y, p.y), x2 = Math.max(d.start.x, p.x), y2 = Math.max(d.start.y, p.y);
    state.selected = new Set(d.base);
    for (const el of liveEls()) {
      const b = aabb(el);
      if (b[0] >= x1 && b[1] >= y1 && b[2] <= x2 && b[3] <= y2) state.selected.add(el.id);
    }
    expandGroups();
    renderPanel();
  } else if (d.type === 'create') {
    const el = d.el;
    const sp = snapPoint(p, e, d.targets);
    let dx = sp.x - d.start.x, dy = sp.y - d.start.y;
    if (LINEAR.includes(el.type)) {
      if (e.shiftKey) [dx, dy] = snapAngle(dx, dy);
      el.points = [[0, 0], [dx, dy]];
    } else {
      if (e.shiftKey) {
        const s = Math.max(Math.abs(dx), Math.abs(dy));
        dx = (dx < 0 ? -1 : 1) * s; dy = (dy < 0 ? -1 : 1) * s;
      }
      el.x = Math.min(d.start.x, d.start.x + dx); el.y = Math.min(d.start.y, d.start.y + dy);
      el.w = Math.abs(dx); el.h = Math.abs(dy);
    }
  } else if (d.type === 'draw') {
    const el = d.el;
    const last = el.points[el.points.length - 1];
    const nx = p.x - el.x, ny = p.y - el.y;
    if (Math.hypot(nx - last[0], ny - last[1]) * view().zoom >= 1.5) el.points.push([nx, ny]);
  } else if (d.type === 'endpoint') {
    const el = d.el;
    const sp = snapPoint(p, e, d.targets);
    let nx = sp.x - el.x, ny = sp.y - el.y;
    if (e.shiftKey) {
      const o = el.points[d.other];
      const [sx, sy] = snapAngle(nx - o[0], ny - o[1]);
      nx = o[0] + sx; ny = o[1] + sy;
    }
    el.points[d.i] = [nx, ny];
    if (d.mid0) {
      // the bend turns and scales along with the dragged end, so the curve keeps its shape
      const o = el.points[d.other];
      const l0 = Math.hypot(d.from[0] - o[0], d.from[1] - o[1]);
      if (l0 > 0.01) {
        const k = Math.hypot(nx - o[0], ny - o[1]) / l0;
        const r = Math.atan2(ny - o[1], nx - o[0]) - Math.atan2(d.from[1] - o[1], d.from[0] - o[0]);
        const mx = d.mid0[0] - o[0], my = d.mid0[1] - o[1];
        el.points[1] = [o[0] + (mx * Math.cos(r) - my * Math.sin(r)) * k, o[1] + (mx * Math.sin(r) + my * Math.cos(r)) * k];
      }
    }
    d.moved = true;
  } else if (d.type === 'mid') {
    const el = d.el, a = el.points[0], b = el.points[el.points.length - 1];
    const m = [p.x - el.x, p.y - el.y];
    // close to the middle of the straight line: straight again
    const straight = Math.hypot(m[0] - (a[0] + b[0]) / 2, m[1] - (a[1] + b[1]) / 2) * view().zoom < 6;
    el.points = straight ? [a, b] : [a, m, b];
    d.moved = true;
  } else if (d.type === 'resize') {
    applyResize(d, d.frame.angle ? p : snapPoint(p, e, d.targets), e.shiftKey);
    d.moved = true;
  } else if (d.type === 'rotate') {
    let delta = Math.atan2(p.y - d.cy, p.x - d.cx) - d.start;
    if (e.shiftKey) {
      const step = Math.PI / 12;
      const base = d.orig.length === 1 ? d.orig[0].angle || 0 : 0;
      delta = Math.round((base + delta) / step) * step - base;
    }
    const live = new Map(els().map(x => [x.id, x]));
    for (const o of d.orig) {
      const el = live.get(o.id);
      if (!el) continue;
      if (hasPoints(o)) {
        // lines and pencil strokes have no angle of their own: rotate their points
        [el.x, el.y] = rot(o.x, o.y, d.cx, d.cy, delta);
        el.points = o.points.map(pt => rot(pt[0], pt[1], 0, 0, delta));
      } else {
        const b = bounds(o);
        const [ncx, ncy] = rot((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, d.cx, d.cy, delta);
        el.x = ncx - (b[2] - b[0]) / 2; el.y = ncy - (b[3] - b[1]) / 2;
        let a = ((o.angle || 0) + delta) % (Math.PI * 2);
        if (Math.abs(a) < 1e-6) a = 0;
        el.angle = a;
      }
    }
    d.moved = true;
  } else if (d.type === 'fov') {
    const el = d.el;
    const [cx, cy] = center(el);
    const [lx, ly] = rot(p.x, p.y, cx, cy, -(el.angle || 0));
    const dx = lx - (el.x + el.w / 2), dy = el.y - ly;
    const step = e.shiftKey ? 15 : 1;
    el.range = Math.round(clamp(Math.hypot(dx, dy), 40, 3000));
    el.fov = clamp(Math.round((2 * Math.atan2(Math.abs(dx), dy) * 180) / Math.PI / step) * step, 5, 170);
  } else if (d.type === 'erase') {
    eraseAt(p);
  }
  render();
});

function endPointer(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  guides = [];
  if (d.type === 'pan') { save(); updateCursor(pointerPos(e)); return; }
  if (d.type === 'create') {
    const el = d.el;
    const b = bounds(el);
    const size = Math.max(b[2] - b[0], b[3] - b[1]) * view().zoom;
    if (size < 3) doc.elements = els().filter(x => x !== el);
    else {
      if (LINEAR.includes(el.type)) normalizeLinear(el);
      state.selected = new Set([el.id]);
      if (!state.locked) setTool('selection', true);
    }
  } else if (d.type === 'endpoint') {
    normalizeLinear(d.el);
  } else if (d.type === 'erase') {
    if (erasing.size) doc.elements = els().filter(el => !erasing.has(el.id));
    erasing = new Set();
  }
  commit(); renderPanel(); render();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function snapAngle(dx, dy) {
  const len = Math.hypot(dx, dy);
  const step = Math.PI / 12;
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return [Math.cos(a) * len, Math.sin(a) * len];
}
function normalizeLinear(el) {
  const [ox, oy] = el.points[0];
  if (!ox && !oy) return;
  el.x += ox; el.y += oy;
  el.points = el.points.map(p => [p[0] - ox, p[1] - oy]);
}
function eraseAt(p) {
  const thr = 8 / view().zoom;
  const live = liveEls();
  const idx = boolIndex(live);
  // the eraser leaves images alone, so notes drawn on top of one can be rubbed out
  for (const el of live) if (el.type !== 'image' && !erasing.has(el.id) && hit(el, p.x, p.y, thr, idx)) erasing.add(el.id);
  render();
}
function applyResize(d, p, shift) {
  const f = d.frame;
  // a rotated shape is resized in its own unrotated space, then put back around the fixed corner
  if (f.angle) { const [lx, ly] = rot(p.x, p.y, f.cx, f.cy, -f.angle); p = { x: lx, y: ly }; }
  const [x1, y1, x2, y2] = d.box;
  const hId = d.handle;
  const W = x2 - x1, H = y2 - y1;
  let sx = 1, sy = 1;
  if (hId.includes('e')) sx = W ? (p.x - x1) / W : 1;
  if (hId.includes('w')) sx = W ? (x2 - p.x) / W : 1;
  if (hId.includes('s')) sy = H ? (p.y - y1) / H : 1;
  if (hId.includes('n')) sy = H ? (y2 - p.y) / H : 1;
  let ax = hId.includes('w') ? x2 : x1;
  let ay = hId.includes('n') ? y2 : y1;
  if (d.uniform || shift) {
    let s;
    if (hId.length === 2) s = Math.max(Math.abs(sx), Math.abs(sy));
    else if (hId === 'e' || hId === 'w') { s = Math.abs(sx); ay = (y1 + y2) / 2; }
    else { s = Math.abs(sy); ax = (x1 + x2) / 2; }
    sx = sy = Math.max(s, 0.02);
  }
  const live = new Map(els().map(e => [e.id, e]));
  for (const o of d.orig) {
    const el = live.get(o.id);
    if (!el) continue;
    if (hasPoints(o)) {
      el.x = ax + (o.x - ax) * sx; el.y = ay + (o.y - ay) * sy;
      el.points = o.points.map(pt => [pt[0] * sx, pt[1] * sy]);
    } else if (o.type === 'text') {
      el.fontSize = Math.max(4, o.fontSize * Math.abs(sy));
      fitText(el);
      el.x = ax + (o.x - ax) * sx; el.y = ay + (o.y - ay) * sy;
    } else {
      let nx = ax + (o.x - ax) * sx, ny = ay + (o.y - ay) * sy, nw = o.w * sx, nh = o.h * sy;
      if (nw < 0) { nx += nw; nw = -nw; }
      if (nh < 0) { ny += nh; nh = -nh; }
      el.x = nx; el.y = ny; el.w = nw; el.h = nh;
    }
  }
  if (f.angle) {
    const el = live.get(d.orig[0].id);
    if (el) {
      const [lx, ly] = center(el);
      const [wx, wy] = rot(lx, ly, f.cx, f.cy, f.angle);
      el.x += wx - lx; el.y += wy - ly;
    }
  }
}
function updateCursor(p) {
  let c = 'default';
  const t = state.tool;
  if (t === 'hand' || spaceDown) c = 'grab';
  else if (t === 'text') c = 'text';
  else if (t !== 'selection') c = 'crosshair';
  else {
    const h = handleAt(p);
    if (h && (h.endpoint !== undefined || h.mid)) c = 'pointer';
    else if (h) c = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }[h.resize] || 'grab';
    else if (elementAt(p.x, p.y)) c = 'move';
  }
  canvas.style.cursor = c;
}

canvas.addEventListener('dblclick', e => {
  if (state.tool !== 'selection') return;
  const p = pointerPos(e);
  const target = elementAt(p.x, p.y);
  // double-click goes into a combination: select the single shape under the pointer. A cut-away shape
  // has no visible surface, so it also counts when its combination is the current selection.
  const inner = memberAt(p.x, p.y);
  const innerSelected = inner && boolPeers(inner).some(x => state.selected.has(x.id));
  if ((target && boolOf(boolIndex(els()), target)) || innerSelected) {
    const m = (innerSelected || (inner && target && inner.boolId === target.boolId)) ? inner : target;
    state.selected = new Set([m.id]);
    renderPanel(); render();
    return;
  }
  if (target && canLabel(target)) { startEdit(target, false); return; }
  if (target || !canDraw()) return;
  const el = makeEl('text', p.x, p.y - state.style.fontSize * LINE_H / 2);
  doc.elements.push(el);
  startEdit(el, true);
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  closeCtx();
  if (editing) finishEdit();
  const v = view();
  if (e.ctrlKey || e.metaKey) {
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    // trackpad pinch sends many small deltas: follow it directly; a mouse wheel notch is eased
    if (Math.abs(dy) < 40) zoomTo(v.zoom * Math.exp(-dy * 0.01), e.clientX, e.clientY);
    else smoothZoom(Math.exp(-Math.max(-150, Math.min(150, dy)) * 0.0015), e.clientX, e.clientY);
  } else {
    const dx = e.shiftKey ? e.deltaY : e.deltaX, dy = e.shiftKey ? 0 : e.deltaY;
    v.scrollX -= dx / v.zoom; v.scrollY -= dy / v.zoom;
    save(); render();
  }
}, { passive: false });

let zoomAnim = null;
function smoothZoom(factor, cx = innerWidth / 2, cy = innerHeight / 2) {
  const from = zoomAnim ? zoomAnim.target : view().zoom;
  const target = Math.max(0.1, Math.min(30, from * factor));
  const running = !!zoomAnim;
  zoomAnim = { target, cx, cy, doc };
  if (!running) requestAnimationFrame(stepZoom);
}
function stepZoom() {
  const a = zoomAnim;
  if (!a) return;
  if (a.doc !== doc) { zoomAnim = null; return; }
  const diff = Math.log(a.target / view().zoom);
  if (Math.abs(diff) < 0.003) { zoomAnim = null; zoomTo(a.target, a.cx, a.cy); return; }
  zoomTo(view().zoom * Math.exp(diff * 0.22), a.cx, a.cy);
  requestAnimationFrame(stepZoom);
}
function zoomTo(z, cx = innerWidth / 2, cy = innerHeight / 2) {
  const v = view();
  z = Math.max(0.1, Math.min(30, z));
  const w = toWorld(cx, cy);
  v.zoom = z;
  v.scrollX = cx / z - w.x; v.scrollY = cy / z - w.y;
  save(); updateChrome(); render();
}

// ---------- actions ----------
function setTool(t, keepSelection) {
  if (t === 'image') { $('imgInput').click(); return; }
  if (editing) finishEdit();
  state.tool = t;
  if (!keepSelection && t !== 'selection' && t !== 'hand') state.selected.clear();
  renderToolbar(); renderPanel(); render();
  canvas.style.cursor = t === 'hand' ? 'grab' : t === 'text' ? 'text' : t === 'selection' ? 'default' : 'crosshair';
}
function deleteSelected() {
  if (!state.selected.size) return;
  doc.elements = els().filter(e => !state.selected.has(e.id));
  state.selected.clear();
  commit(); renderPanel(); render();
}
function duplicateSelected() {
  const sel = selectedEls();
  if (!sel.length) return;
  const copies = cloneEls(sel, 12, 12);
  doc.elements.push(...copies);
  state.selected = new Set(copies.map(c => c.id));
  commit(); renderPanel(); render();
}
function copySelected() {
  clipboard = JSON.parse(JSON.stringify(selectedEls()));
  pasteCount = 0;
  // mark the system clipboard, so an image copied earlier elsewhere is not pasted instead of this
  try { if (clipboard.length && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CLIP_MARK).catch(() => {}); } catch (e) { /* not allowed here */ }
}
// paste from the menu: an image on the system clipboard wins, unless the last copy was made in here
async function pasteAny(at) {
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const blobs = [];
      let marked = false;
      for (const it of await navigator.clipboard.read()) {
        if (it.types.includes('text/plain') && (await (await it.getType('text/plain')).text()) === CLIP_MARK) marked = true;
        const type = it.types.find(t => t.startsWith('image/'));
        if (type) blobs.push(await it.getType(type));
      }
      if (blobs.length && !marked) { insertImages(blobs, at); return; }
    }
  } catch (e) { /* no permission or nothing readable: fall back to our own clipboard */ }
  paste(at);
}
let pasteFallback = 0;
window.addEventListener('paste', e => {
  if (e.target.matches && e.target.matches('input, textarea')) return;
  clearTimeout(pasteFallback);
  e.preventDefault();
  const cd = e.clipboardData;
  const files = cd ? [...cd.files].filter(f => f.type.startsWith('image/')) : [];
  if (files.length && cd.getData('text/plain') !== CLIP_MARK) {
    insertImages(files, lastPointer ? toWorld(lastPointer.x, lastPointer.y) : null);
  } else paste();
});
for (const type of ['copy', 'cut']) window.addEventListener(type, e => {
  if ((e.target.matches && e.target.matches('input, textarea')) || !state.selected.size) return;
  e.preventDefault();
  e.clipboardData.setData('text/plain', CLIP_MARK);
});

// ---------- arrange (collections of images) ----------
// scale a unit (one element or one group) by f and put the top-left of its box at (nx, ny)
function scaleUnit(u, f, nx, ny) {
  const [bx, by] = u.box;
  for (const el of u.list) {
    if (hasPoints(el)) {
      el.x = nx + (el.x - bx) * f; el.y = ny + (el.y - by) * f;
      el.points = el.points.map(p => [p[0] * f, p[1] * f]);
      continue;
    }
    const [cx, cy] = center(el);
    if (el.type === 'text') { el.fontSize = Math.max(4, el.fontSize * f); fitText(el); }
    else { el.w *= f; el.h *= f; if (hasCone(el)) el.range *= f; }
    el.x = nx + (cx - bx) * f - el.w / 2; el.y = ny + (cy - by) * f - el.h / 2;
  }
}
function arrangeSelected(mode, silent) {
  const W_ = u => u.box[2] - u.box[0], H_ = u => u.box[3] - u.box[1];
  const units = selUnits().filter(u => W_(u) > 0.5 && H_(u) > 0.5);
  if (units.length < 2) return;
  const g = groupBounds(selectedEls());
  const gap = 12, n = units.length;
  const area = units.reduce((s, u) => s + W_(u) * H_(u), 0);
  const avgH = units.reduce((s, u) => s + H_(u), 0) / n, avgW = units.reduce((s, u) => s + W_(u), 0) / n;
  const cy = u => (u.box[1] + u.box[3]) / 2, cx = u => (u.box[0] + u.box[2]) / 2;
  // keep the reading order the user already has: top to bottom, then left to right
  const reading = (a, b) => Math.round(cy(a) / (avgH * 0.7)) - Math.round(cy(b) / (avgH * 0.7)) || cx(a) - cx(b);
  if (mode === 'row') {
    units.sort((a, b) => cx(a) - cx(b));
    let x = g[0];
    for (const u of units) { const f = avgH / H_(u), w = W_(u) * f; scaleUnit(u, f, x, g[1]); x += w + gap; }
  } else if (mode === 'column') {
    units.sort((a, b) => cy(a) - cy(b));
    let y = g[1];
    for (const u of units) { const f = avgW / W_(u), h = H_(u) * f; scaleUnit(u, f, g[0], y); y += h + gap; }
  } else if (mode === 'grid') {
    units.sort(reading);
    const cols = Math.ceil(Math.sqrt(n)), s = Math.sqrt(area / n);
    units.forEach((u, i) => {
      const f = Math.min(s / W_(u), s / H_(u));
      const w = W_(u) * f, h = H_(u) * f;
      scaleUnit(u, f, g[0] + (i % cols) * (s + gap) + (s - w) / 2, g[1] + Math.floor(i / cols) * (s + gap) + (s - h) / 2);
    });
  } else {
    // pack: rows of equal height that all end up exactly as wide as each other
    units.sort(reading);
    const asp = u => W_(u) / H_(u);
    const ht = Math.sqrt(area / units.reduce((s, u) => s + asp(u), 0));
    const total = Math.max(Math.sqrt(area * 1.6), ...units.map(u => asp(u) * ht));
    let y = g[1], row = [];
    const flush = last => {
      if (!row.length) return;
      const sum = row.reduce((s, u) => s + asp(u), 0), gaps = gap * (row.length - 1);
      const h = last && sum * ht + gaps < total * 0.75 ? ht : (total - gaps) / sum;
      let x = g[0];
      for (const u of row) { const w = asp(u) * h; scaleUnit(u, h / H_(u), x, y); x += w + gap; }
      y += h + gap; row = [];
    };
    for (const u of units) {
      row.push(u);
      if (row.reduce((s, r) => s + asp(r) * ht, 0) + gap * (row.length - 1) >= total) flush(false);
    }
    flush(true);
  }
  if (!silent) { commit(); renderPanel(); render(); }
}
function paste(at) {
  if (!clipboard.length) return;
  pasteCount++;
  let dx = 16 * pasteCount, dy = dx;
  if (at) {
    const b = groupBounds(clipboard);
    dx = at.x - (b[0] + b[2]) / 2; dy = at.y - (b[1] + b[3]) / 2;
  }
  const copies = cloneEls(clipboard, dx, dy);
  doc.elements.push(...copies);
  state.selected = new Set(copies.map(c => c.id));
  if (state.tool !== 'selection') setTool('selection', true);
  commit(); renderPanel(); render();
}
function reorder(mode) {
  const list = els();
  const isSel = e => state.selected.has(e.id);
  if (mode === 'front') doc.elements = list.filter(e => !isSel(e)).concat(list.filter(isSel));
  else if (mode === 'back') doc.elements = list.filter(isSel).concat(list.filter(e => !isSel(e)));
  else if (mode === 'forward') {
    for (let i = list.length - 2; i >= 0; i--) if (isSel(list[i]) && !isSel(list[i + 1])) [list[i], list[i + 1]] = [list[i + 1], list[i]];
  } else {
    for (let i = 1; i < list.length; i++) if (isSel(list[i]) && !isSel(list[i - 1])) [list[i], list[i - 1]] = [list[i - 1], list[i]];
  }
  commit(); render();
}
function flipSelected() {
  for (const el of selectedEls()) if (el.type === 'symbol') el.flip = !el.flip;
  commit(); render();
}
function setProp(key, val, final = true) {
  const coneKey = key === 'fov' || key === 'range';
  if (!coneKey) state.style[key] = val;
  const targets = editing ? [editing.el] : selectedEls();
  for (const el of targets) {
    if (key === 'textColor' && !isBoxy(el)) continue;
    if (coneKey && !hasCone(el)) continue;
    if ((key === 'headStart' || key === 'headEnd') && el.type !== 'arrow') continue;
    el[key] = val;
    if (key === 'fontSize' && el.type === 'text') fitText(el);
  }
  if (editing) layoutEditor();
  if (final) { if (targets.length && !editing) commit(); else save(); renderPanel(); }
  render();
}

// ---------- UI: toolbar ----------
function renderToolbar() {
  const tb = $('toolbar');
  let html = `<button data-lock class="${state.locked ? 'active' : ''}" title="Gekozen tool actief houden na tekenen (Q)">${state.locked ? ICON.lock : ICON.unlock}</button><div class="sep"></div>`;
  for (const t of TOOLS) {
    html += `<button data-tool="${t.id}" class="${state.tool === t.id ? 'active' : ''}" title="${t.title} — ${t.key}${t.num ? ' of ' + t.num : ''}">${ICON[t.id]}<span class="key">${t.num || t.key}</span></button>`;
  }
  tb.innerHTML = html;
}
$('toolbar').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tool) setTool(b.dataset.tool);
  else { state.locked = !state.locked; renderToolbar(); }
});

// ---------- UI: properties panel ----------
let registry = [];
function renderPanel() {
  const panel = $('panel');
  renderLayers();
  const sel = editing ? [editing.el] : selectedEls();
  const drawingTool = !['selection', 'hand', 'eraser'].includes(state.tool);
  if (!sel.length && !drawingTool) { panel.hidden = true; return; }
  panel.hidden = false;
  const types = new Set(sel.length ? sel.map(e => e.type) : [state.tool]);
  const any = list => list.some(t => types.has(t));
  // a shape that carries a label: its text can have its own colour (falls back to the outline colour)
  const labelEl = sel.find(e => isBoxy(e) && (e.text || editing));
  const coneEl = sel.find(hasCone);
  const cur = k => {
    if (k === 'textColor') return labelEl.textColor || labelEl.stroke;
    if (k === 'fov' || k === 'range') return coneEl[k];
    if (k === 'headStart' || k === 'headEnd') {
      const a = sel.find(e => e.type === 'arrow');
      return a ? headOf(a, k === 'headEnd') : state.style[k] || (k === 'headEnd' ? 'arrow' : 'none');
    }
    return sel.length ? sel[0][k] : state.style[k];
  };
  const hasShape = any([...SHAPES, 'symbol']), hasLinear = any(LINEAR), hasDraw = types.has('draw');
  const hasText = types.has('text') || sel.some(e => isBoxy(e) && e.text) || (editing && true);
  registry = [];
  const reg = o => registry.push(o) - 1;
  const row = (title, inner) => `<h3>${title}</h3><div class="row">${inner}</div>`;
  const opts = (k, list) => list.map(o =>
    `<button data-i="${reg({ k, v: o.v })}" class="${cur(k) === o.v ? 'active' : ''}" title="${o.t}">${o.icon || o.label}</button>`).join('');
  const swatch = (k, c) =>
    `<button data-i="${reg({ k, v: c })}" class="swatch ${c === 'transparent' ? 'none' : ''} ${cur(k) === c ? 'active' : ''}" style="${c === 'transparent' ? '' : 'background:' + tc(c)}" title="${c === 'transparent' ? 'Transparant' : tc(c)}"></button>`;
  // One row of swatches per palette, each with its own button to step to the next palette (the wheel works too).
  // Below them: no fill, an own colour, and one row less or more.
  const mini = (fn, icon, t, off) => `<button class="mini" data-i="${reg({ act: fn })}" title="${t}" ${off ? 'disabled' : ''}>${ICON[icon]}</button>`;
  const pals = paletteRows(), full = pals.length >= paletteIds().length;
  const swatches = (title, k, fill) => `<h3>${title}</h3>` + pals.map((p, i) =>
    `<div class="row pal" data-palrow="${i}">` + (p ? p.colors : fill ? BGS.slice(1) : STROKES).map(c => swatch(k, c)).join('') +
    mini(() => cycleRow(i, 1), 'next', `${esc(p ? p.name : 'Thema')}: wissel naar het volgende palet`, full) + `</div>`).join('') +
    `<div class="row pal">` + (fill ? swatch(k, 'transparent') : '') +
    `<input type="color" data-color="${k}" value="${/^#[0-9a-f]{6}$/i.test(cur(k)) ? tc(cur(k)) : BG}" title="Eigen kleur">` +
    (pals.length > 1 ? mini(() => setPalettes(state.palettes.slice(0, -1)), 'minus', 'Laatste paletrij weghalen') : '') +
    mini(addRow, 'plus', 'Rij toevoegen met het volgende palet', full) + `</div>`;

  const onlyImages = sel.length > 0 && sel.every(e => e.type === 'image');
  let html = onlyImages ? '' : swatches('Lijn', 'stroke');
  if (hasShape) {
    html += swatches('Achtergrond', 'bg', true);
    if (cur('bg') !== 'transparent') html += row('Invulling', opts('fillStyle', [
      { v: 'hachure', icon: ICON.hachure, t: 'Arcering' }, { v: 'cross-hatch', icon: ICON.cross, t: 'Kruisarcering' }, { v: 'solid', icon: ICON.solid, t: 'Effen' }]));
  }
  if (hasShape || hasLinear || hasDraw) html += row('Lijnbreedte', opts('strokeWidth', [
    { v: 1, icon: ICON.w1, t: 'Dun' }, { v: 2, icon: ICON.w2, t: 'Vet' }, { v: 4, icon: ICON.w4, t: 'Extra vet' }]));
  if (hasShape || hasLinear) {
    html += row('Lijnstijl', opts('strokeStyle', [
      { v: 'solid', icon: ICON.sSolid, t: 'Doorgetrokken' }, { v: 'dashed', icon: ICON.sDashed, t: 'Gestreept' }, { v: 'dotted', icon: ICON.sDotted, t: 'Gestippeld' }]));
    html += row('Slordigheid', opts('roughness', [
      { v: 0, icon: ICON.r0, t: 'Architect' }, { v: 1, icon: ICON.r1, t: 'Kunstenaar' }, { v: 2, icon: ICON.r2, t: 'Cartoonist' }]));
  }
  if (types.has('arrow')) {
    const heads = start => HEADS.map(([v, t]) => ({ v, t, icon: headIcon(v, start) }));
    html += row('Pijlpunt begin', opts('headStart', heads(true)));
    html += row('Pijlpunt einde', opts('headEnd', heads(false)));
  }
  if (any(['rectangle', 'diamond'])) html += row('Randen', opts('edges', [
    { v: 'sharp', icon: ICON.sharp, t: 'Scherp' }, { v: 'round', icon: ICON.round, t: 'Rond' }]));
  if (hasText) html += row('Lettergrootte', opts('fontSize', [
    { v: 16, label: 'S', t: 'Klein' }, { v: 20, label: 'M', t: 'Normaal' }, { v: 28, label: 'L', t: 'Groot' }, { v: 36, label: 'XL', t: 'Extra groot' }]));
  if (labelEl) html += swatches('Tekstkleur', 'textColor');
  if (coneEl && !editing) {
    const what = coneEl.kind === 'camera' ? 'Kijkhoek' : 'Lichtbundel';
    html += `<h3>${what} <span class="val">${cur('fov')}°</span></h3><input type="range" min="5" max="170" step="5" value="${cur('fov')}" data-range="fov"><div class="scale"><span>smal</span><span>breed</span></div>`;
    html += `<h3>Bereik</h3><input type="range" min="40" max="900" step="10" value="${Math.min(900, cur('range'))}" data-range="range"><div class="scale"><span>kort</span><span>ver</span></div>`;
  }
  html += `<h3>Doorzichtigheid</h3><input type="range" min="0" max="100" step="10" value="${cur('opacity')}" data-range="opacity"><div class="scale"><span>0</span><span>100</span></div>`;
  if (sel.length && !editing) {
    const nUnits = new Set(sel.map(e => e.groupId || e.id)).size;
    if (nUnits > 1) {
      const al = (mode, icon, t) => `<button data-i="${reg({ act: () => alignSelected(mode) })}" title="${t}">${ICON[icon]}</button>`;
      html += row('Uitlijnen',
        al('left', 'alLeft', 'Links uitlijnen (Ctrl Shift ←)') + al('hcenter', 'alHCenter', 'Horizontaal centreren') + al('right', 'alRight', 'Rechts uitlijnen (Ctrl Shift →)') +
        al('top', 'alTop', 'Boven uitlijnen (Ctrl Shift ↑)') + al('vcenter', 'alVCenter', 'Verticaal centreren') + al('bottom', 'alBottom', 'Onder uitlijnen (Ctrl Shift ↓)') +
        (nUnits > 2
          ? `<button data-i="${reg({ act: () => distributeSelected(0) })}" title="Horizontaal verdelen">${ICON.distH}</button>` +
            `<button data-i="${reg({ act: () => distributeSelected(1) })}" title="Verticaal verdelen">${ICON.distV}</button>`
          : ''));
      const ar = (mode, icon, t) => `<button data-i="${reg({ act: () => arrangeSelected(mode) })}" title="${t}">${ICON[icon]}</button>`;
      html += row('Rangschikken',
        ar('pack', 'arPack', 'Netjes inpakken: rijen van gelijke hoogte (Ctrl P)') + ar('row', 'arRow', 'Op een rij, even hoog') +
        ar('column', 'arCol', 'Onder elkaar, even breed') + ar('grid', 'arGrid', 'In een raster met gelijke vakken'));
    }
    const bt = boolTarget(sel);
    if (bt) html += row('Combineren', BOOL_OPS.map(b =>
      `<button data-i="${reg({ act: () => applyBool(b.op) })}" class="${bt.op === b.op ? 'active' : ''}" title="${b.t} (${b.key})">${ICON[b.icon]}</button>`).join(''));
    html += row('Lagen',
      `<button data-i="${reg({ act: () => reorder('back') })}" title="Naar achtergrond">${ICON.toBack}</button>` +
      `<button data-i="${reg({ act: () => reorder('backward') })}" title="Naar achteren">${ICON.backward}</button>` +
      `<button data-i="${reg({ act: () => reorder('forward') })}" title="Naar voren">${ICON.forward}</button>` +
      `<button data-i="${reg({ act: () => reorder('front') })}" title="Naar voorgrond">${ICON.toFront}</button>`);
    html += row('Acties',
      (canGroup(sel) ? `<button data-i="${reg({ act: groupSelected })}" title="Groeperen (Ctrl G)">${ICON.group}</button>` : '') +
      (sel.some(e => e.groupId) ? `<button data-i="${reg({ act: ungroupSelected })}" title="${ungroupLabel(sel)} (Ctrl Shift G)">${ICON.ungroup}</button>` : '') +
      (sel.some(e => e.type === 'symbol' && e.kind === 'door') ? `<button data-i="${reg({ act: flipSelected })}" title="Spiegelen (deur naar de andere kant)">${ICON.flip}</button>` : '') +
      `<button data-i="${reg({ act: duplicateSelected })}" title="Dupliceren (Ctrl D)">${ICON.copy}</button>` +
      `<button data-i="${reg({ act: deleteSelected })}" title="Verwijderen (Delete)">${ICON.trash}</button>`);
  }
  panel.innerHTML = html;
}
// keep focus in the text editor while clicking panel buttons
$('panel').addEventListener('pointerdown', e => { if (editing && !e.target.matches('input')) e.preventDefault(); });
$('panel').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  const r = registry[+b.dataset.i];
  if (r.act) r.act(); else setProp(r.k, r.v);
});
let palWheel = 0;
$('panel').addEventListener('wheel', e => {
  const line = e.target.closest('[data-palrow]');
  if (!line) return;
  e.preventDefault();
  if (Date.now() - palWheel < 180) return;   // a touchpad fires a burst of events for one swipe
  palWheel = Date.now();
  cycleRow(+line.dataset.palrow, e.deltaY > 0 ? 1 : -1);
}, { passive: false });
$('panel').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.range) setProp(t.dataset.range, +t.value, false);
  else if (t.dataset.color) setProp(t.dataset.color, t.value, false);
});
$('panel').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.range) setProp(t.dataset.range, +t.value);
  else if (t.dataset.color) setProp(t.dataset.color, t.value);
});

// ---------- UI: context menu ----------
let ctxActions = [];
function closeCtx() { $('ctxMenu').hidden = true; }
function selectAll() {
  if (state.tool !== 'selection') setTool('selection');
  state.selected = new Set(liveEls().map(x => x.id));
  renderPanel(); render();
}
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (editing) finishEdit();
  drag = null;
  const p = pointerPos(e);
  const target = elementAt(p.x, p.y);
  if (target) {
    if (!state.selected.has(target.id)) state.selected = new Set(groupMembers(target).map(m => m.id));
    if (state.tool !== 'selection') setTool('selection', true);
  } else if (state.selected.size) {
    const b = selectionBox(selectedEls());
    if (!(p.x >= b[0] && p.x <= b[2] && p.y >= b[1] && p.y <= b[3])) state.selected.clear();
  }
  renderPanel(); render();

  const sel = selectedEls();
  const items = [];
  const add = (label, key, act, opts = {}) => items.push({ label, key, act, ...opts });
  if (sel.length) {
    add('Knippen', 'Ctrl X', () => { copySelected(); deleteSelected(); });
    add('Kopiëren', 'Ctrl C', copySelected);
  }
  add('Plakken', 'Ctrl V', () => pasteAny(p));
  if (!sel.length) add('Afbeelding invoegen…', 'I', () => $('imgInput').click());
  if (new Set(sel.map(x => x.groupId || x.id)).size > 1) add('Netjes inpakken', 'Ctrl P', () => arrangeSelected('pack'));
  if (sel.length) {
    add('Dupliceren', 'Ctrl D', duplicateSelected);
    if (canGroup(sel) || sel.some(x => x.groupId)) items.push('sep');
    if (canGroup(sel)) add('Groeperen', 'Ctrl G', groupSelected);
    if (sel.some(x => x.groupId)) add(ungroupLabel(sel), 'Ctrl Shift G', ungroupSelected);
    const bt = boolTarget(sel);
    if (bt) {
      items.push('sep');
      for (const b of BOOL_OPS) add((bt.op === b.op ? '✓ ' : '') + b.label, b.key, () => applyBool(b.op));
    }
    if (sel.length === 1 && canLabel(sel[0])) {
      items.push('sep');
      add(sel[0].text ? 'Tekst bewerken' : 'Tekst toevoegen', 'Enter', () => startEdit(sel[0], false));
    }
    items.push('sep');
    add('Naar voorgrond', '', () => reorder('front'));
    add('Naar voren', '', () => reorder('forward'));
    add('Naar achteren', '', () => reorder('backward'));
    add('Naar achtergrond', '', () => reorder('back'));
    const others = doc.layers.filter(l => !sel.every(x => x.layer === l.id));
    if (doc.layers.length > 1 && others.length) {
      items.push('sep');
      for (const l of [...others].reverse().slice(0, 6)) add('Naar laag: ' + esc(l.name), '', () => moveSelToLayer(l));
    }
    items.push('sep');
    add('Verwijderen', 'Delete', deleteSelected, { danger: true });
  } else {
    add('Alles selecteren', 'Ctrl A', selectAll, { disabled: !els().length });
    items.push('sep');
    const chk = on => (on ? '✓ ' : '');
    add(chk(state.grid.show) + 'Raster tonen', "Ctrl '", () => setGrid('show', !state.grid.show));
    add(chk(state.grid.snap) + 'Snap aan raster', '', () => setGrid('snap', !state.grid.snap));
    add(chk(state.snapObjects) + 'Snap aan objecten', 'Alt S', toggleSnapObjects);
    items.push('sep');
    add('Zoom herstellen', 'Ctrl 0', () => zoomTo(1));
  }
  ctxActions = items;
  const menu = $('ctxMenu');
  menu.innerHTML = items.map((it, i) => it === 'sep' ? '<hr>' :
    `<button data-i="${i}" class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''}><span>${it.label}</span><kbd>${it.key}</kbd></button>`).join('');
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(4, Math.min(e.clientX, innerWidth - r.width - 4)) + 'px';
  menu.style.top = Math.max(4, Math.min(e.clientY, innerHeight - r.height - 4)) + 'px';
});
$('ctxMenu').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (!b || b.disabled) return;
  closeCtx();
  ctxActions[+b.dataset.i].act();
});
$('ctxMenu').addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('pointerdown', e => { if (!e.target.closest('#ctxMenu')) closeCtx(); }, true);
window.addEventListener('blur', closeCtx);

// ---------- UI: grid & snap popover ----------
function setGrid(k, v) { state.grid[k] = v; save(); renderGridPop(); render(); }
function toggleSnapObjects() { state.snapObjects = !state.snapObjects; save(); renderGridPop(); }
function syncGridBtn() {
  $('gridBtn').classList.toggle('active', state.grid.show || state.grid.snap || state.snapObjects);
}
function renderGridPop() {
  const g = state.grid;
  $('gridPop').innerHTML =
    `<label><input type="checkbox" data-g="show" ${g.show ? 'checked' : ''}><span>Raster tonen</span><kbd>Ctrl '</kbd></label>` +
    `<div class="seg"><button data-type="dots" class="${g.type === 'dots' ? 'active' : ''}">Punten</button><button data-type="lines" class="${g.type === 'lines' ? 'active' : ''}">Lijnen</button></div>` +
    `<label class="col"><span>Rastergrootte</span><input type="number" min="5" max="400" step="5" value="${g.size}" data-g="size"></label>` +
    `<label class="col"><span>Doorzichtigheid raster</span><input type="range" min="5" max="100" step="5" value="${g.opacity}" data-g="opacity"></label>` +
    `<hr>` +
    `<label><input type="checkbox" data-g="snap" ${g.snap ? 'checked' : ''}><span>Snap aan raster</span></label>` +
    `<label><input type="checkbox" data-s="1" ${state.snapObjects ? 'checked' : ''}><span>Snap aan objecten</span><kbd>Alt S</kbd></label>` +
    `<p>Houd Ctrl ingedrukt om tijdelijk niet te snappen.</p>`;
  syncGridBtn();
}
$('gridBtn').innerHTML = ICON.grid;
$('zoomOut').innerHTML = ICON.minus; $('zoomIn').innerHTML = ICON.plus;
$('undoBtn').innerHTML = ICON.undo; $('redoBtn').innerHTML = ICON.redo;
$('gridBtn').addEventListener('click', () => { $('gridPop').hidden = !$('gridPop').hidden; $('sidebar').hidden = true; });
$('gridPop').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.s) state.snapObjects = t.checked;
  else if (t.type === 'checkbox') state.grid[t.dataset.g] = t.checked;
  else if (t.dataset.g === 'size') { const v = +t.value; if (v >= 5 && v <= 400) state.grid.size = v; }
  else if (t.dataset.g === 'opacity') state.grid.opacity = +t.value;
  save(); syncGridBtn(); render();
});
$('gridPop').addEventListener('keydown', e => e.stopPropagation());
$('gridPop').addEventListener('click', e => {
  const b = e.target.closest('button[data-type]');
  if (b) setGrid('type', b.dataset.type);
});
window.addEventListener('pointerdown', e => {
  if (!e.target.closest('#gridPop') && !e.target.closest('#gridBtn')) $('gridPop').hidden = true;
}, true);

// ---------- UI: sidebar / canvases ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderSidebar() {
  $('canvasList').innerHTML = state.canvases.map(c =>
    `<li data-id="${c.id}" class="${c.id === state.activeId ? 'active' : ''}"><span class="name">${esc(c.name)}</span>` +
    `<button data-rename title="Naam wijzigen">${ICON.pencilSm}</button><button data-del title="Verwijderen">${ICON.trashSm}</button></li>`).join('');
}
function renameCanvas(li, c) {
  const input = document.createElement('input');
  input.value = c.name;
  li.querySelector('.name').replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    if (ok && input.value.trim()) c.name = input.value.trim();
    if (c.id === state.activeId) $('docName').textContent = c.name;
    save(); renderSidebar();
  };
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', e => e.stopPropagation());
}
$('canvasList').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  const c = state.canvases.find(x => x.id === li.dataset.id);
  if (e.target.closest('[data-rename]')) { renameCanvas(li, c); return; }
  if (e.target.closest('[data-del]')) {
    if (!confirm(`Canvas "${c.name}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    state.canvases = state.canvases.filter(x => x !== c);
    histories.delete(c.id);
    if (!state.canvases.length) state.canvases = [newCanvasData('Canvas 1')];
    setActive(c.id === state.activeId ? state.canvases[0] : doc);
    return;
  }
  if (e.target.tagName === 'INPUT') return;
  setActive(c);
});
$('canvasList').addEventListener('dblclick', e => {
  const li = e.target.closest('li');
  if (li && !li.querySelector('input')) renameCanvas(li, state.canvases.find(x => x.id === li.dataset.id));
});
function addCanvas(name, elements, layers) {
  let n = state.canvases.length + 1;
  while (!name && state.canvases.some(c => c.name === 'Canvas ' + n)) n++;
  const c = newCanvasData(name || 'Canvas ' + n);
  if (elements) {
    c.elements = elements;
    if (Array.isArray(layers) && layers.length && layers.every(l => l && l.id)) {
      c.layers = layers.map(l => ({ id: String(l.id), name: String(l.name || 'Laag'), visible: l.visible !== false, locked: !!l.locked }));
      c.activeLayer = null;
    }
    normalizeLayers(c);
  }
  state.canvases.push(c);
  setActive(c);
  return c;
}
$('menuBtn').innerHTML = ICON.menu;
$('menuBtn').addEventListener('click', () => { $('sidebar').hidden = !$('sidebar').hidden; });
$('newCanvas').addEventListener('click', () => addCanvas());
$('clearCanvas').addEventListener('click', () => {
  if (!els().length || !confirm('Alles op dit canvas wissen?')) return;
  doc.elements = []; state.selected.clear();
  commit(); renderPanel(); render();
});

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileBase = () => doc.name.replace(/[\\/:*?"<>|]+/g, '_') || 'canvas';
$('exportPng').addEventListener('click', () => {
  const list = state.selected.size ? selectedEls() : visEls();
  if (!list.length) { alert('Er staat nog niets zichtbaars op dit canvas.'); return; }
  renderPng(list, 2).toBlob(b => download(b, fileBase() + '.png'));
});
// draw a list of elements on a fresh canvas; maxSize caps the longest side in pixels
function renderPng(list, scale, maxSize) {
  const [x1, y1, x2, y2] = visualBounds(list);
  const pad = 24;
  const bw = x2 - x1 + pad * 2, bh = y2 - y1 + pad * 2;
  if (maxSize) scale = Math.min(scale, maxSize / Math.max(bw, bh));
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.ceil(bw * scale));
  off.height = Math.max(1, Math.ceil(bh * scale));
  const c = off.getContext('2d');
  c.fillStyle = canvasBg(); c.fillRect(0, 0, off.width, off.height);
  c.setTransform(scale, 0, 0, scale, (pad - x1) * scale, (pad - y1) * scale);
  drawList(c, rough.canvas(off), list, false);
  return off;
}
$('importImg').addEventListener('click', () => $('imgInput').click());
$('imgInput').addEventListener('change', e => {
  const files = [...e.target.files].filter(f => f.type.startsWith('image/'));
  e.target.value = '';
  $('sidebar').hidden = true;
  insertImages(files);
});
$('saveJson').addEventListener('click', async () => {
  const data = { type: 'id-sketch', version: 1, name: doc.name, layers: doc.layers, elements: els() };
  // images travel inside the file, so it can be opened on another computer
  const used = [...new Set(els().map(e => e.imageId).filter(id => id && images.has(id)))];
  if (used.length) {
    data.images = {};
    for (const id of used) data.images[id] = await blobToDataUrl(images.get(id).blob);
  }
  download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), fileBase() + '.idsketch.json');
});
$('openJson').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.type !== 'id-sketch' || !Array.isArray(data.elements)) throw new Error('onbekend formaat');
    for (const [id, url] of Object.entries(data.images || {})) {
      if (images.has(id) || typeof url !== 'string' || !url.startsWith('data:image/')) continue;
      const blob = await (await fetch(url)).blob();
      await registerImage(id, blob);
      if (idb) await dbReq('readwrite', s => s.put(blob, id));
    }
    addCanvas(data.name || file.name.replace(/\..*$/, ''), data.elements, data.layers);
  } catch (err) { alert('Dit bestand kon niet worden geopend: ' + err.message); }
});

// ---------- UI: right panel (layers & library) ----------
function renderRight() {
  const r = state.right;
  $('rightbar').hidden = !r.open;
  $('rightBtn').classList.toggle('active', r.open);
  for (const b of $('rightTabs').children) b.classList.toggle('active', b.dataset.tab === r.tab);
  $('layersPane').hidden = r.tab !== 'layers';
  $('libPane').hidden = r.tab !== 'lib';
  renderLayers();
}
function renderLayers() {
  if (!doc || !state.right.open || state.right.tab !== 'layers') return;
  if ($('layerList').querySelector('input')) return; // a layer is being renamed
  const sel = selectedEls();
  const selLayers = new Set(sel.map(e => e.layer));
  const counts = new Map();
  for (const e of els()) counts.set(e.layer, (counts.get(e.layer) || 0) + 1);
  const n = doc.layers.length;
  $('layerList').innerHTML = doc.layers.map((l, i) => {
    const canMove = sel.length && !(selLayers.size === 1 && selLayers.has(l.id));
    return `<li data-id="${l.id}" class="${l.id === doc.activeLayer ? 'active' : ''} ${l.visible ? '' : 'off'}">` +
      `<button data-act="vis" title="${l.visible ? 'Laag verbergen' : 'Laag tonen'}">${l.visible ? ICON.eye : ICON.eyeOff}</button>` +
      `<button data-act="lock" class="${l.locked ? 'on' : ''}" title="${l.locked ? 'Laag ontgrendelen' : 'Laag vergrendelen'}">${l.locked ? ICON.lock : ICON.unlock}</button>` +
      `<span class="name">${esc(l.name)}</span>` +
      (selLayers.has(l.id) ? '<i class="dot" title="Bevat de selectie"></i>' : '') +
      `<span class="count">${counts.get(l.id) || 0}</span>` +
      `<span class="tools">` +
      (canMove ? `<button data-act="move" title="Selectie naar deze laag">${ICON.moveIn}</button>` : '') +
      `<button data-act="up" title="Laag omhoog" ${i === n - 1 ? 'disabled' : ''}>${ICON.forward}</button>` +
      `<button data-act="down" title="Laag omlaag" ${i === 0 ? 'disabled' : ''}>${ICON.backward}</button>` +
      `<button data-act="rename" title="Naam wijzigen">${ICON.pencilSm}</button>` +
      `<button data-act="del" title="Laag verwijderen" ${n === 1 ? 'disabled' : ''}>${ICON.trashSm}</button>` +
      `</span></li>`;
  }).reverse().join('');
}
function dropHiddenSelection() {
  const live = new Set(liveEls().map(e => e.id));
  for (const id of [...state.selected]) if (!live.has(id)) state.selected.delete(id);
}
function moveSelToLayer(l) {
  expandGroups();
  for (const el of selectedEls()) el.layer = l.id;
  commit(); dropHiddenSelection(); renderPanel(); render();
}
function renameLayer(li, l) {
  const input = document.createElement('input');
  input.value = l.name;
  li.querySelector('.name').replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    if (ok && input.value.trim()) l.name = input.value.trim();
    input.remove();
    save(); renderLayers();
  };
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', e => e.stopPropagation());
}
$('layerList').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li || e.target.tagName === 'INPUT') return;
  const l = doc.layers.find(x => x.id === li.dataset.id);
  const b = e.target.closest('button');
  const act = b && !b.disabled ? b.dataset.act : b ? 'none' : 'pick';
  const i = doc.layers.indexOf(l);
  if (act === 'pick') doc.activeLayer = l.id;
  else if (act === 'vis') l.visible = !l.visible;
  else if (act === 'lock') l.locked = !l.locked;
  else if (act === 'move') { moveSelToLayer(l); return; }
  else if (act === 'rename') { renameLayer(li, l); return; }
  else if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i + 1 : i - 1;
    [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
    commit();
  } else if (act === 'del') {
    const count = els().filter(x => x.layer === l.id).length;
    if (count && !confirm(`Laag "${l.name}" met ${count} object${count === 1 ? '' : 'en'} verwijderen?`)) return;
    doc.elements = els().filter(x => x.layer !== l.id);
    doc.layers.splice(i, 1);
    commit();
  } else return;
  dropHiddenSelection();
  save(); renderPanel(); render();
});
$('layerList').addEventListener('dblclick', e => {
  const li = e.target.closest('li');
  if (li && e.target.classList.contains('name')) renameLayer(li, doc.layers.find(x => x.id === li.dataset.id));
});
$('newLayer').addEventListener('click', () => {
  let n = doc.layers.length + 1;
  while (doc.layers.some(l => l.name === 'Laag ' + n)) n++;
  const l = newLayer('Laag ' + n);
  doc.layers.splice(doc.layers.indexOf(activeLayer()) + 1, 0, l);
  doc.activeLayer = l.id;
  commit(); renderLayers();
});
$('rightBtn').innerHTML = ICON.layers;
$('rightBtn').addEventListener('click', () => { state.right.open = !state.right.open; save(); renderRight(); });
$('rightTabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) { state.right.tab = b.dataset.tab; save(); renderRight(); }
});
$('rightbar').addEventListener('keydown', e => e.stopPropagation());

// library: ready-made objects for floor plans and shot set-ups
const LIB = [
  { group: 'Opname', items: [
    { id: 'camera', name: 'Camera', props: { kind: 'camera', w: 36, h: 46, fov: 60, range: 220, stroke: '#56a2e8' } },
    { id: 'light', name: 'Lamp', props: { kind: 'light', w: 46, h: 28, fov: 70, range: 170, stroke: '#b76100' } },
    { id: 'person', name: 'Persoon', props: { kind: 'person', w: 58, h: 38 } },
    { id: 'mark', name: 'Markering', props: { kind: 'mark', w: 28, h: 28 } },
  ] },
  { group: 'Meubels', items: [
    { id: 'chair', name: 'Stoel', props: { kind: 'chair', w: 46, h: 46 } },
    { id: 'sofa', name: 'Sofa', props: { kind: 'sofa', w: 190, h: 84 } },
    { id: 'table', name: 'Tafel', type: 'rectangle', props: { w: 150, h: 84 } },
    { id: 'roundtable', name: 'Ronde tafel', type: 'ellipse', props: { w: 100, h: 100 } },
    { id: 'bed', name: 'Bed', props: { kind: 'bed', w: 140, h: 200 } },
    { id: 'cabinet', name: 'Kast', props: { kind: 'cabinet', w: 130, h: 46 } },
  ] },
  { group: 'Ruimte', items: [
    { id: 'wall', name: 'Muur', type: 'rectangle', props: { w: 260, h: 12, edges: 'sharp', fillStyle: 'solid', wall: true } },
    { id: 'door', name: 'Deur', props: { kind: 'door', w: 80, h: 80 } },
    { id: 'window', name: 'Raam', props: { kind: 'window', w: 120, h: 12 } },
  ] },
  { group: 'Decor', items: [
    { id: 'plant', name: 'Plant', props: { kind: 'plant', w: 52, h: 52 } },
    { id: 'rug', name: 'Tapijt', props: { kind: 'rug', w: 200, h: 130 } },
  ] },
];
const libItem = id => LIB.flatMap(g => g.items).find(i => i.id === id);
function libElement(item) {
  const el = makeEl(item.type || 'symbol', 0, 0);
  Object.assign(el, item.props);
  if (el.wall) { delete el.wall; el.bg = el.stroke; }
  return el;
}
function insertTemplate(item, at) {
  if (!canDraw()) return;
  if (editing) finishEdit();
  const el = libElement(item);
  const p = at || toWorld(innerWidth / 2, innerHeight / 2);
  el.x = p.x - el.w / 2; el.y = p.y - el.h / 2;
  if (state.grid.snap) { el.x = gridSnap(el.x); el.y = gridSnap(el.y); }
  // clicking the same object twice should not stack them exactly on top of each other
  while (els().some(x => Math.abs(x.x - el.x) < 1 && Math.abs(x.y - el.y) < 1)) { el.x += 20; el.y += 20; }
  if (el.kind === 'camera') el.text = 'Cam ' + (els().filter(x => x.kind === 'camera').length + 1);
  doc.elements.push(el);
  state.selected = new Set([el.id]);
  if (state.tool !== 'selection') setTool('selection', true);
  commit(); renderPanel(); render();
}
function libPreview(item) {
  const W = 60, H = 40, s = 2;
  const off = document.createElement('canvas');
  off.width = W * s; off.height = H * s;
  const c = off.getContext('2d');
  const el = libElement(item);
  // the thumbnail sits on a rail, not on the canvas: use the text colour of the rail there
  if (!item.props.stroke) el.stroke = theme === THEMES[0] ? '#d3d3d3' : theme.text;
  // thumbnails ignore the current style settings: always a plain outline (a wall stays solid)
  el.bg = item.props.wall ? el.stroke : 'transparent';
  el.fillStyle = 'solid'; el.strokeStyle = 'solid'; el.opacity = 100;
  el.roughness = 0; el.text = '';
  if (hasCone(el)) { el.range = el.h * 0.9; }
  const [x1, y1, x2, y2] = visualBounds([el]);
  const scale = Math.min((W - 10) / (x2 - x1), (H - 10) / Math.max(1, y2 - y1), 0.8);
  el.strokeWidth = 1.3 / scale;
  c.setTransform(s * scale, 0, 0, s * scale, s * (W / 2 - ((x1 + x2) / 2) * scale), s * (H / 2 - ((y1 + y2) / 2) * scale));
  drawEl(c, rough.canvas(off), el);
  drawCache.delete(el.id);
  return off.toDataURL();
}
function renderLibrary() {
  $('libPane').innerHTML = LIB.map(g =>
    `<h3>${g.group}</h3><div class="libgrid">` + g.items.map(it =>
      `<button draggable="true" data-lib="${it.id}" title="${it.name}: klik om in het midden te plaatsen, of sleep naar het canvas"><img src="${libPreview(it)}" alt="" draggable="false"><span>${it.name}</span></button>`).join('') +
    `</div>`).join('') +
    `<p>Klik om te plaatsen of sleep naar het canvas. Draai met het ronde handvat; bij een camera versleep je het bolletje aan de kijkhoek.</p>`;
}
let dragLib = null;
$('libPane').addEventListener('click', e => {
  const b = e.target.closest('button[data-lib]');
  if (b) insertTemplate(libItem(b.dataset.lib));
});
$('libPane').addEventListener('dragstart', e => {
  const b = e.target.closest('button[data-lib]');
  if (!b) return;
  dragLib = b.dataset.lib;
  e.dataTransfer.setData('text/plain', b.dataset.lib);
  e.dataTransfer.effectAllowed = 'copy';
});
$('libPane').addEventListener('dragend', () => { dragLib = null; });
const dragsFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
// never let the browser navigate away to a dropped file
window.addEventListener('dragover', e => { if (dragsFiles(e)) e.preventDefault(); });
window.addEventListener('drop', e => { if (dragsFiles(e)) e.preventDefault(); });
canvas.addEventListener('dragover', e => { if (dragLib || dragsFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
canvas.addEventListener('drop', e => {
  if (dragsFiles(e)) {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (files.length) insertImages(files, toWorld(e.clientX, e.clientY));
    return;
  }
  if (!dragLib) return;
  e.preventDefault();
  const item = libItem(dragLib);
  dragLib = null;
  if (item) insertTemplate(item, toWorld(e.clientX, e.clientY));
});

// ---------- link with Claude (MCP bridge) ----------
// mcp/server.js runs next to Claude and opens a small bridge on this computer. When the link is switched
// on, this tab listens there for drawing commands and sends the results back.
const BRIDGE_URL = 'http://127.0.0.1:47821';
const BRIDGE_STYLE = ['stroke', 'bg', 'fillStyle', 'strokeWidth', 'strokeStyle', 'roughness', 'edges', 'opacity', 'fontSize', 'textColor'];
let bridgeES = null, bridgeTimer = 0, bridgeUp = false;
const num = (v, name) => { if (typeof v !== 'number' || !isFinite(v)) throw new Error(`${name} moet een getal zijn`); return v; };
const deg = el => Math.round(((el.angle || 0) * 180) / Math.PI);
function bridgeLayer(name) {
  if (!name) return doc.activeLayer;
  let l = doc.layers.find(x => x.name.toLowerCase() === String(name).toLowerCase());
  if (!l) { l = newLayer(String(name)); doc.layers.push(l); }
  return l.id;
}
function bridgeAim(el, s) {
  if (s.look_at) {
    const [cx, cy] = center(el);
    el.angle = Math.atan2(num(s.look_at.x, 'look_at.x') - cx, -(num(s.look_at.y, 'look_at.y') - cy));
  } else if (s.angle !== undefined) el.angle = (num(s.angle, 'angle') * Math.PI) / 180;
  if (el.angle !== undefined && Math.abs(el.angle) < 1e-9) el.angle = 0;
}
function bridgePlace(el, s) {
  if (s.cx !== undefined) el.x = num(s.cx, 'cx') - el.w / 2; else if (s.x !== undefined) el.x = num(s.x, 'x');
  if (s.cy !== undefined) el.y = num(s.cy, 'cy') - el.h / 2; else if (s.y !== undefined) el.y = num(s.y, 'y');
}
function bridgeStyle(el, s) {
  for (const k of BRIDGE_STYLE) if (s[k] !== undefined) el[k] = s[k];
  if (hasCone(el)) {
    if (s.fov !== undefined) el.fov = clamp(Math.round(num(s.fov, 'fov')), 5, 170);
    if (s.range !== undefined) el.range = clamp(Math.round(num(s.range, 'range')), 40, 3000);
  }
  if (s.flip !== undefined && el.type === 'symbol') el.flip = !!s.flip;
}
function bridgeMake(s, base) {
  s = Object.assign({}, base, s);
  const t = s.type;
  const item = libItem(t);
  let el;
  if (t === 'wall' && s.x1 !== undefined) {
    // a wall between two points: a filled bar turned to the right angle
    const dx = num(s.x2, 'x2') - num(s.x1, 'x1'), dy = num(s.y2, 'y2') - num(s.y1, 'y1');
    el = libElement(item);
    el.w = Math.hypot(dx, dy); el.h = s.thickness || 8;
    el.x = (s.x1 + s.x2) / 2 - el.w / 2; el.y = (s.y1 + s.y2) / 2 - el.h / 2;
    el.angle = Math.atan2(dy, dx);
    bridgeStyle(el, s);
    if (s.stroke && s.bg === undefined) el.bg = el.stroke;
    return el;
  }
  if (LINEAR.includes(t)) {
    el = makeEl(t, num(s.x1, 'x1'), num(s.y1, 'y1'));
    el.points = [[0, 0], [num(s.x2, 'x2') - s.x1, num(s.y2, 'y2') - s.y1]];
    bridgeStyle(el, s);
    return el;
  }
  if (t === 'text') {
    el = makeEl('text', 0, 0);
    el.text = String(s.label !== undefined ? s.label : s.text || '');
    if (!el.text.trim()) throw new Error('een tekst-element heeft een label nodig');
    bridgeStyle(el, s);
    fitText(el);
    bridgePlace(el, s); bridgeAim(el, s);
    return el;
  }
  if (item) el = libElement(item);
  else if (SHAPES.includes(t)) el = makeEl(t, 0, 0);
  else throw new Error('onbekend type: ' + t);
  if (s.w !== undefined) el.w = Math.max(1, num(s.w, 'w'));
  if (s.h !== undefined) el.h = Math.max(1, num(s.h, 'h'));
  if (!el.w || !el.h) throw new Error(`${t} heeft w en h nodig`);
  bridgeStyle(el, s);
  if (t === 'wall' && s.stroke && s.bg === undefined) el.bg = el.stroke;
  bridgePlace(el, s); bridgeAim(el, s);
  const label = s.label !== undefined ? s.label : s.text;
  if (label !== undefined) el.text = String(label);
  else if (el.kind === 'camera') el.autoLabel = true;
  return el;
}
function bridgeBrief(el, layers) {
  const r1 = v => Math.round(v * 10) / 10;
  const o = { id: el.id, type: el.type === 'symbol' ? el.kind : el.type, layer: (layers.get(el.layer) || {}).name };
  if (LINEAR.includes(el.type)) {
    const b = el.points[el.points.length - 1];
    Object.assign(o, { x1: r1(el.x), y1: r1(el.y), x2: r1(el.x + b[0]), y2: r1(el.y + b[1]) });
  } else {
    const b = bounds(el);
    Object.assign(o, { x: r1(b[0]), y: r1(b[1]), w: r1(b[2] - b[0]), h: r1(b[3] - b[1]) });
  }
  if (el.angle) o.angle = deg(el);
  if (el.text) o.label = el.text;
  if (el.type !== 'image') { o.stroke = el.stroke; if (isBoxy(el) && el.bg !== 'transparent') o.bg = el.bg; }
  if (hasCone(el)) { o.fov = el.fov; o.range = el.range; }
  if (el.groupId) o.group = el.groupId;
  if (el.boolId) o.combined = el.bool;
  return o;
}
function zoomToFit() {
  const list = visEls();
  if (!list.length) return;
  const [x1, y1, x2, y2] = visualBounds(list);
  // leave room for the side panels
  const padL = innerWidth > 900 ? 260 : 20, padR = state.right.open && innerWidth > 900 ? 280 : 20, padY = 80;
  const z = clamp(Math.min((innerWidth - padL - padR) / Math.max(1, x2 - x1), (innerHeight - padY * 2) / Math.max(1, y2 - y1)), 0.1, 2);
  const v = view();
  v.zoom = z;
  v.scrollX = (padL + (innerWidth - padL - padR) / 2) / z - (x1 + x2) / 2;
  v.scrollY = innerHeight / 2 / z - (y1 + y2) / 2;
  save(); updateChrome(); render();
}
function bridgeRefresh() { dropHiddenSelection(); commit(); renderPanel(); render(); }
function bridgeExec(tool, a) {
  if (editing) finishEdit();
  drag = null;
  if (tool === 'get_canvas') {
    const layers = layerMap();
    const list = els();
    const out = {
      canvases: state.canvases.map(c => ({ name: c.name, active: c === doc, elements: c.elements.length })),
      canvas: doc.name,
      layers: [...doc.layers].reverse().map(l => ({ name: l.name, active: l.id === doc.activeLayer, visible: l.visible, locked: l.locked })),
      bounds: list.length ? visualBounds(list).map(Math.round) : null,
      note: 'px, y down; layers listed top first; angle in degrees clockwise, 0 = facing up',
    };
    if (a.include_elements !== false) out.elements = list.map(e => bridgeBrief(e, layers));
    return out;
  }
  if (tool === 'add_elements') {
    if (!Array.isArray(a.elements) || !a.elements.length) throw new Error('elements ontbreekt');
    const groups = new Map();
    const made = a.elements.map((s, i) => {
      let el;
      try { el = bridgeMake(s, a.style); } catch (err) { throw new Error(`element ${i} (${s && s.type}): ${err.message}`); }
      if (s.group) { if (!groups.has(s.group)) groups.set(s.group, uid()); el.groupId = groups.get(s.group); }
      return el;
    });
    // shapes of one group with "combine" become one shape combination; the first one is the base
    const combos = new Map();
    a.elements.forEach((s, i) => {
      if (!s.combine) return;
      if (!BOOL_OPS.some(b => b.op === s.combine)) throw new Error(`element ${i}: combine moet union, subtract, intersect of exclude zijn`);
      if (!s.group) throw new Error(`element ${i}: combine heeft een group nodig`);
      if (!combos.has(s.group)) combos.set(s.group, s.combine);
    });
    for (const [name, op] of combos) {
      const members = made.filter((el, i) => a.elements[i].group === name);
      const bad = members.find(el => !SHAPES.includes(el.type));
      if (bad) throw new Error(`groep "${name}": alleen rectangle, ellipse en diamond kunnen gecombineerd worden`);
      if (members.length < 2) throw new Error(`groep "${name}": een combinatie heeft minstens twee vormen nodig`);
      for (const el of members) { el.bool = op; el.boolId = el.groupId; }
    }
    // only now that every element is valid: create missing layers and place the elements
    made.forEach((el, i) => { el.layer = bridgeLayer(a.elements[i].layer || a.layer); });
    let cams = els().filter(x => x.kind === 'camera').length;
    for (const el of made) if (el.autoLabel) { delete el.autoLabel; el.text = 'Cam ' + (++cams); }
    doc.elements.push(...made);
    state.selected = new Set(made.map(e => e.id));
    if (state.tool !== 'selection') setTool('selection', true);
    bridgeRefresh();
    if (a.fit_view !== false) zoomToFit();
    return { added: made.length, ids: made.map(e => e.id), bounds: visualBounds(made).map(Math.round) };
  }
  if (tool === 'update_elements') {
    if (!Array.isArray(a.updates)) throw new Error('updates ontbreekt');
    const byId = new Map(els().map(e => [e.id, e]));
    const missing = [];
    for (const s of a.updates) {
      const el = byId.get(s.id);
      if (!el) { missing.push(s.id); continue; }
      if (LINEAR.includes(el.type)) {
        const b = el.points[el.points.length - 1];
        const p = { x1: el.x, y1: el.y, x2: el.x + b[0], y2: el.y + b[1] };
        for (const k of Object.keys(p)) if (s[k] !== undefined) p[k] = num(s[k], k);
        if (Object.keys(p).some(k => s[k] !== undefined)) { el.x = p.x1; el.y = p.y1; el.points = [[0, 0], [p.x2 - p.x1, p.y2 - p.y1]]; }
        bridgeStyle(el, s);
      } else if (el.type === 'draw') {
        bridgeStyle(el, s);
        if (s.x !== undefined) el.x += num(s.x, 'x') - bounds(el)[0];
        if (s.y !== undefined) el.y += num(s.y, 'y') - bounds(el)[1];
      } else {
        bridgeStyle(el, s);
        const label = s.label !== undefined ? s.label : s.text;
        if (label !== undefined && canLabel(el)) el.text = String(label);
        if (el.type === 'text') fitText(el);
        else {
          if (s.w !== undefined) el.w = Math.max(1, num(s.w, 'w'));
          if (s.h !== undefined) el.h = Math.max(1, num(s.h, 'h'));
        }
        bridgePlace(el, s); bridgeAim(el, s);
      }
      if (s.layer) el.layer = bridgeLayer(s.layer);
    }
    bridgeRefresh();
    return { updated: a.updates.length - missing.length, not_found: missing };
  }
  if (tool === 'delete_elements') {
    const before = els().length;
    if (a.all) doc.elements = [];
    else {
      const ids = new Set(a.ids || []);
      const l = a.layer && doc.layers.find(x => x.name.toLowerCase() === String(a.layer).toLowerCase());
      doc.elements = els().filter(e => !ids.has(e.id) && !(l && e.layer === l.id));
    }
    const live = new Set(els().map(e => e.id));
    for (const id of [...state.selected]) if (!live.has(id)) state.selected.delete(id);
    bridgeRefresh();
    return { deleted: before - els().length };
  }
  if (tool === 'set_canvas') {
    const name = String(a.name || '').trim();
    if (!name) throw new Error('name ontbreekt');
    const found = state.canvases.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (found) setActive(found); else addCanvas(name);
    return { canvas: doc.name, created: !found, elements: els().length };
  }
  if (tool === 'set_layer') {
    const id = bridgeLayer(a.name);
    const l = doc.layers.find(x => x.id === id);
    if (a.rename) l.name = String(a.rename);
    if (a.visible !== undefined) l.visible = !!a.visible;
    if (a.locked !== undefined) l.locked = !!a.locked;
    if (a.active) doc.activeLayer = l.id;
    bridgeRefresh(); save();
    return { layers: [...doc.layers].reverse().map(x => ({ name: x.name, active: x.id === doc.activeLayer, visible: x.visible, locked: x.locked })) };
  }
  if (tool === 'export_png') {
    const list = visEls();
    if (!list.length) throw new Error('het canvas is leeg');
    const off = renderPng(list, 2, clamp(a.max_size || 1400, 200, 2400));
    return { image: off.toDataURL('image/png').split(',')[1], width: off.width, height: off.height, canvas: doc.name, bounds: visualBounds(list).map(Math.round) };
  }
  throw new Error('onbekende opdracht: ' + tool);
}
function setBridgeUp(up) {
  if (up && !bridgeUp) toast('Verbonden met Claude.');
  bridgeUp = up;
  renderBridge();
}
function renderBridge() {
  const b = $('bridgeBtn');
  b.textContent = 'Koppeling met Claude: ' + (!state.bridge ? 'uit' : bridgeUp ? 'verbonden' : 'wacht op Claude…');
  b.classList.toggle('primary', !!state.bridge);
  $('bridgeDot').hidden = !(state.bridge && bridgeUp);
}
function bridgeConnect() {
  clearTimeout(bridgeTimer);
  if (!state.bridge || bridgeES) return;
  let es;
  try { es = new EventSource(BRIDGE_URL + '/events'); } catch (e) { return; }
  bridgeES = es;
  es.onopen = () => setBridgeUp(true);
  es.onmessage = async ev => {
    let cmd, out;
    try { cmd = JSON.parse(ev.data); } catch (e) { return; }
    try { out = { id: cmd.id, ok: true, result: await bridgeExec(cmd.tool, cmd.args || {}) }; }
    catch (err) { out = { id: cmd.id, ok: false, error: String(err.message || err) }; }
    fetch(BRIDGE_URL + '/result', { method: 'POST', body: JSON.stringify(out) }).catch(() => {});
  };
  es.onerror = () => {
    es.close();
    if (bridgeES === es) bridgeES = null;
    setBridgeUp(false);
    bridgeTimer = setTimeout(bridgeConnect, 4000); // the server only runs while Claude is open: keep trying
  };
}
$('bridgeBtn').addEventListener('click', () => {
  state.bridge = !state.bridge;
  if (!state.bridge && bridgeES) { bridgeES.close(); bridgeES = null; bridgeUp = false; }
  save(); renderBridge(); bridgeConnect();
});

// ---------- UI: bottom bar ----------
function updateChrome() {
  if (!doc) return;
  const h = histories.get(doc.id);
  $('zoomReset').textContent = Math.round(view().zoom * 100) + '%';
  $('undoBtn').disabled = !h.undo.length;
  $('redoBtn').disabled = !h.redo.length;
}
$('zoomIn').addEventListener('click', () => smoothZoom(1.2));
$('zoomOut').addEventListener('click', () => smoothZoom(1 / 1.2));
$('zoomReset').addEventListener('click', () => { zoomAnim = null; smoothZoom(1 / view().zoom); });
$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);

// ---------- keyboard ----------
window.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input, textarea')) return;
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (mod) {
    const boolKey = e.altKey && { KeyU: 'union', KeyS: 'subtract', KeyI: 'intersect', KeyX: 'exclude' }[e.code];
    if (boolKey) { e.preventDefault(); applyBool(boolKey); return; }
    if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'a') { e.preventDefault(); selectAll(); }
    else if (k === 'd') { e.preventDefault(); duplicateSelected(); }
    else if (k === 'g') { e.preventDefault(); e.shiftKey ? ungroupSelected() : groupSelected(); }
    else if (k === "'") { e.preventDefault(); setGrid('show', !state.grid.show); }
    else if (e.shiftKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      alignSelected({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' }[e.key]);
    }
    else if (k === 'c') copySelected();
    else if (k === 'x') { copySelected(); deleteSelected(); }
    else if (k === 'p') { e.preventDefault(); arrangeSelected('pack'); }
    // Ctrl+V is handled by the paste event, which also sees images on the system clipboard;
    // if the browser sends no paste event, fall back to our own clipboard
    else if (k === 'v') { clearTimeout(pasteFallback); pasteFallback = setTimeout(() => paste(), 150); }
    else if (k === '=' || k === '+') { e.preventDefault(); zoomTo(view().zoom * 1.1); }
    else if (k === '-') { e.preventDefault(); zoomTo(view().zoom / 1.1); }
    else if (k === '0') { e.preventDefault(); zoomTo(1); }
    return;
  }
  if (e.key === ' ') { if (!spaceDown) { spaceDown = true; canvas.style.cursor = 'grab'; } e.preventDefault(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
  if (e.key === 'Escape') { closeCtx(); $('sidebar').hidden = true; state.selected.clear(); setTool('selection'); return; }
  if (e.key === 'Enter' && state.selected.size === 1) {
    const el = selectedEls()[0];
    if (canLabel(el)) { e.preventDefault(); startEdit(el, false); }
    return;
  }
  if (e.key.startsWith('Arrow') && state.selected.size) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    for (const el of selectedEls()) { el.x += dx; el.y += dy; }
    commit(); render();
    return;
  }
  if (e.altKey) { if (k === 's') { e.preventDefault(); toggleSnapObjects(); } return; }
  if (k === 'q') { state.locked = !state.locked; renderToolbar(); return; }
  const tool = TOOLS.find(t => t.key.toLowerCase() === k || t.num === k);
  if (tool) setTool(tool.id);
});
window.addEventListener('keyup', e => {
  if (e.key === ' ' && spaceDown) { spaceDown = false; if (!drag) updateCursor({ x: Infinity, y: Infinity }); }
});

// ---------- boot ----------
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  layoutEditor();
  paint();
}
window.addEventListener('resize', resize);
renderToolbar();
load();
bootImages();
renderBridge();
bridgeConnect();
renderLibrary();
renderThemes();
renderRight();
renderGridPop();
resize();

// small hook for debugging in the console
window.idSketch = { state, get doc() { return doc; }, render };
})();
