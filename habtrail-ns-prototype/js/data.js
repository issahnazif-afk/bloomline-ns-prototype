// Data loading. All files are static JSON served next to the page (see docs/DATA_CONTRACT.md).
// Paths are resolved against the page so the app works at any URL, including GitHub Pages project sites.

const url = (p) => new URL(p, document.baseURI).href;

async function getJSON(path) {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${path}`);
  return res.json();
}

export async function loadStatic() {
  const [meta, grid, zones] = await Promise.all([
    getJSON('data/meta.json'),
    getJSON('data/grid.json'),
    getJSON('data/zones.geojson'),
  ]);
  if (meta.schema !== 1) throw new Error(`Unsupported data schema: ${meta.schema}`);
  return { meta, grid, zones };
}

export const dataUrl = (p) => url(p);

const cache = new Map();

function cached(key, path) {
  if (!cache.has(key)) {
    cache.set(key, getJSON(path).catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

export const loadLayerDay = (layerId, date) => cached(`${layerId}/${date}`, `data/layers/${layerId}/${date}.json`);
export const loadLayerDays = (layerId, dates) => Promise.all(dates.map((d) => loadLayerDay(layerId, d)));
