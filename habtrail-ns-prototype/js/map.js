// MapLibre wrapper. Draws: fallback land + satellite imagery, zone polygons, and the 300 m pixel dots.
// Zone labels are HTML markers (so no glyph server is needed). Pixel values arrive through setView().

import { h, isNarrow, prefersReducedMotion } from './dom.js';
import { dataUrl } from './data.js';

const ESRI_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const PIXEL_RADIUS_M = 115;  // drawn radius; pixels are 300 m wide, so dots leave a small gap like the original
// radius in screen px = metres / (metres per px); at lat 44.6, 111,460 / 2^zoom
const k = PIXEL_RADIUS_M / 111460;
const radiusExpr = (extra = 0) => ['interpolate', ['exponential', 2], ['zoom'], 8, k * 2 ** 8 + extra, 16, k * 2 ** 16 + extra];

function ringBounds(geom) {
  const rings = geom.type === 'MultiPolygon' ? geom.coordinates.flat() : geom.coordinates;
  let w = 180, s = 90, e = -180, n = -90;
  for (const ring of rings) for (const [x, y] of ring) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [[w, s], [e, n]];
}

export function createMap({ meta, grid, zones }, cb) {
  const pixelFC = {
    type: 'FeatureCollection',
    features: grid.lon.map((lo, i) => ({
      type: 'Feature', id: i,
      properties: { i, z: grid.zone[i], show: 0, c: '#888888', t: 0 },
      geometry: { type: 'Point', coordinates: [lo, grid.lat[i]] },
    })),
  };
  const zoneFC = structuredClone(zones);
  const zoneBounds = zoneFC.features.map((f) => ringBounds(f.geometry));

  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        land: { type: 'geojson', data: dataUrl('data/land_halifax.geojson') },
        esri: {
          type: 'raster', tiles: [ESRI_TILES], tileSize: 256, maxzoom: 18,
          attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
        },
        zones: { type: 'geojson', data: zoneFC },
        pixels: { type: 'geojson', data: pixelFC },
      },
      layers: [
        { id: 'water', type: 'background', paint: { 'background-color': '#0a2748' } },
        { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#4f6338' } },
        { id: 'imagery', type: 'raster', source: 'esri', paint: { 'raster-brightness-max': 0.92 } },
        { id: 'zone-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] } },
        { id: 'zone-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'stroke'], 'line-width': ['get', 'strokeWidth'] } },
        {
          id: 'pixels', type: 'circle', source: 'pixels', filter: ['==', ['get', 'show'], 1],
          paint: {
            'circle-color': ['get', 'c'], 'circle-radius': radiusExpr(),
            'circle-opacity': 0.95, 'circle-stroke-width': 0.6, 'circle-stroke-color': 'rgba(0,0,0,0.35)',
          },
        },
        {
          id: 'pixel-hover', type: 'circle', source: 'pixels', filter: ['==', ['get', 'i'], -1],
          paint: { 'circle-color': 'rgba(255,255,255,0)', 'circle-radius': radiusExpr(2), 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        },
      ],
    },
    center: meta.map.center,
    zoom: meta.map.zoom,
    minZoom: 8.5,
    maxZoom: 17,
    maxBounds: [[-64.3, 44.1], [-62.9, 45.1]],
    attributionControl: false,
    boxZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.touchZoomRotate.disableRotation();

  // resolve once the style (not every imagery tile) is ready, so a slow tile server never blocks the app
  const ready = new Promise((res) => map.once('style.load', res));

  const canvasEl = map.getCanvasContainer();
  canvasEl.setAttribute('role', 'application');

  // ----- zone label pills (also keyboard-reachable buttons) -----
  const pills = zoneFC.features.map((f) => {
    const el = h('button', { class: 'zone-pill', type: 'button', onClick: () => cb.onZone(f.properties.id) }, f.properties.code);
    new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(f.properties.label).addTo(map);
    return el;
  });

  // ----- pointer: hover tooltip + click -----
  let hoverId = -1;
  const setHover = (id) => {
    if (id === hoverId) return;
    hoverId = id;
    map.setFilter('pixel-hover', ['==', ['get', 'i'], id]);
  };
  map.on('mousemove', 'pixels', (e) => {
    if (selecting) return;
    const f = e.features && e.features[0];
    if (!f) return;
    setHover(f.properties.i);
    cb.onPixel(f.properties.i, e.originalEvent);
  });
  map.on('mouseleave', 'pixels', () => { setHover(-1); cb.onPixel(null); });
  map.on('click', (e) => {
    // the browser fires a click after a drag-select ends; it must not select the zone underneath
    if (selecting || performance.now() - lastAreaAt < 400) return;
    const px = map.queryRenderedFeatures(e.point, { layers: ['pixels'] });
    if (px.length) { setHover(px[0].properties.i); cb.onPixel(px[0].properties.i, e.originalEvent, true); return; }
    const zn = map.queryRenderedFeatures(e.point, { layers: ['zone-fill'] });
    if (zn.length) cb.onZone(zn[0].properties.id);
  });
  map.on('movestart', () => cb.onPixel(null));

  // ----- rectangle selection -----
  let selecting = false;
  let lastAreaAt = -1e9;
  let rectEl = null, startPt = null;
  const local = (ev) => { const r = canvasEl.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  canvasEl.addEventListener('pointerdown', (ev) => {
    if (!selecting || ev.button !== 0) return;
    ev.preventDefault();
    canvasEl.setPointerCapture(ev.pointerId);
    startPt = local(ev);
    rectEl = h('div', { class: 'select-rect' });
    canvasEl.append(rectEl);
  });
  canvasEl.addEventListener('pointermove', (ev) => {
    if (!selecting || !startPt) return;
    const [x, y] = local(ev);
    Object.assign(rectEl.style, {
      left: `${Math.min(x, startPt[0])}px`, top: `${Math.min(y, startPt[1])}px`,
      width: `${Math.abs(x - startPt[0])}px`, height: `${Math.abs(y - startPt[1])}px`,
    });
  });
  const finish = (ev) => {
    if (!selecting || !startPt) return;
    const [x, y] = local(ev);
    const box = [[Math.min(x, startPt[0]), Math.min(y, startPt[1])], [Math.max(x, startPt[0]), Math.max(y, startPt[1])]];
    startPt = null;
    rectEl?.remove(); rectEl = null;
    if (Math.abs(box[1][0] - box[0][0]) < 6 && Math.abs(box[1][1] - box[0][1]) < 6) { lastAreaAt = performance.now(); return; }   // a click, not a drag
    lastAreaAt = performance.now();
    const feats = map.queryRenderedFeatures(box, { layers: ['pixels'] });
    const indexes = [...new Set(feats.map((f) => f.properties.i))];
    const r = canvasEl.getBoundingClientRect();
    cb.onArea(indexes, { x: r.left + box[0][0], y: r.top + box[0][1], w: box[1][0] - box[0][0], h: box[1][1] - box[0][1] });
  };
  canvasEl.addEventListener('pointerup', finish);
  canvasEl.addEventListener('pointercancel', () => { startPt = null; rectEl?.remove(); rectEl = null; });

  // ----- public API -----
  const padding = () => (isNarrow()
    ? { top: 150, bottom: 260, left: 20, right: 20 }
    : { top: 110, bottom: 90, left: 380, right: 290 });
  const camera = (extra) => ({ padding: padding(), duration: prefersReducedMotion() ? 0 : 900, essential: true, ...extra });

  return {
    map,
    ready,

    /** v: { pixels: [{c, t, show}], zones: [{fill, fillOpacity, stroke, strokeWidth}], zoneId } */
    setView(v) {
      pixelFC.features.forEach((f, i) => Object.assign(f.properties, v.pixels[i]));
      map.getSource('pixels').setData(pixelFC);
      zoneFC.features.forEach((f, i) => Object.assign(f.properties, v.zones[i]));
      map.getSource('zones').setData(zoneFC);
      pills.forEach((el, i) => el.classList.toggle('is-selected', i === v.zoneId));
    },
    flyToZone(id) { map.fitBounds(zoneBounds[id], camera({ maxZoom: 14.2 })); },
    flyToAll() { map.fitBounds(meta.map.bounds, camera({})); },
    setBasemap(mode) { map.setLayoutProperty('imagery', 'visibility', mode === 'plain' ? 'none' : 'visible'); },
    setSelecting(on) {
      selecting = on;
      document.getElementById('map').classList.toggle('is-selecting', on);
      if (on) { map.dragPan.disable(); map.doubleClickZoom.disable(); setHover(-1); cb.onPixel(null); }
      else { map.dragPan.enable(); map.doubleClickZoom.enable(); startPt = null; rectEl?.remove(); rectEl = null; }
    },
    zoneBounds,
  };
}
