// HABTRAIL Halifax Harbour prototype: controller.
// Flow: state change -> load the files for the active layer -> build one "view" -> push it to the map and panels.

import { h, announce } from './dom.js';
import { state, set, on } from './state.js';
import { t, setLang, getLang, pick, fmtDate, fmtValue } from './i18n.js';
import { loadStatic, loadLayerDay, loadLayerDays } from './data.js';
import { classIndex, summarize, mean, TYPE_CODES, typeName } from './classify.js';
import { computeAlerts } from './alerts.js';
import { createMap } from './map.js';
import { createTopbar } from './ui/topbar.js';
import { createLegend } from './ui/legend.js';
import { createZoneCard } from './ui/zonecard.js';
import { createClosures, severityLevel } from './ui/closures.js';
import { createOverlay } from './ui/overlay.js';
import { createTrend } from './ui/trend.js';
import { createTooltip } from './ui/tooltip.js';

const NO_DATA = '#8b95a5';

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { layer: p.get('layer'), date: p.get('date'), zone: p.get('zone'), lang: p.get('lang'), basemap: p.get('basemap') };
}

function showFatal(message) {
  const toast = h('div', { class: 'toast', role: 'alert' }, message,
    h('button', { class: 'btn', type: 'button', onClick: () => location.reload() }, t('error.reload')));
  document.body.append(toast);
}

async function boot() {
  const q = readHash();
  const browserIsFrench = (navigator.language || '').toLowerCase().startsWith('fr');
  const langFromHash = (hashLang) => (hashLang ? (hashLang === 'fr' ? 'fr' : 'en') : browserIsFrench ? 'fr' : 'en');
  setLang(langFromHash(q.lang));

  let stat;
  try { stat = await loadStatic(); } catch (err) { console.error(err); showFatal(t('error.load')); return; }
  const { meta, grid, zones } = stat;
  document.getElementById('map').setAttribute('aria-label', t('map.label'));

  // ----- initial state from the URL -----
  if (q.layer && meta.layers.some((l) => l.id === q.layer)) state.layerId = q.layer;
  const di = meta.dates.indexOf(q.date);
  if (di >= 0) state.dateIdx = di;
  const zi = zones.features.findIndex((f) => f.properties.code === q.zone);
  if (zi >= 0) state.zoneId = zi;
  if (q.basemap === 'plain') state.basemap = 'plain';

  const layerOf = (id) => meta.layers.find((l) => l.id === id);
  const nPx = grid.n;
  const allIdx = Array.from({ length: nPx }, (_, i) => i);
  const pxByZone = zones.features.map((_, z) => allIdx.filter((i) => grid.zone[i] === z));

  // ----- UI components -----
  const tooltip = createTooltip();
  const trend = createTrend();
  const topbar = createTopbar({ meta, onLang: toggleLang });
  const legend = createLegend();
  const zonecard = createZoneCard({ zones }, {
    onZone: selectZone, onBack: clearZone,
    onSelectToggle: () => set({ selecting: !state.selecting }),
  });
  const closures = createClosures({ meta, zones });
  const overlay = createOverlay({ meta, zones }, {
    onViewZone: (zone, dateIdx) => { set({ overlay: null, layerId: 'habtrail', dateIdx }); selectZone(zone); },
  });
  document.getElementById('ui').append(
    topbar.el, h('div', { class: 'dock' }, zonecard.el, legend.el), closures.el, overlay.el, trend.el, tooltip.el);

  // ----- map -----
  let data = null;
  const mapApi = createMap({ meta, grid, zones }, {
    onZone: selectZone,
    onPixel(i, ev) {
      if (i == null || !data || data.kind !== 'pixels') { tooltip.hide(); return; }
      const L = data.layer;
      const code = data.day.t[i];
      tooltip.show(`${pick(L, 'tooltip')}: ${fmtValue(L, data.day.v[i])}`, `${TYPE_CODES[code]}, ${typeName(code)}`, ev.clientX, ev.clientY);
    },
    onArea(indexes, rect) {
      if (!data || data.kind !== 'pixels') return;
      const values = data.days.map((d) => mean(indexes.map((i) => d.v[i]).filter((v) => v != null)));
      trend.show({ layer: data.layer, dates: meta.dates, values: values.map((v) => v ?? 0), n: indexes.length, rect });
      set({ selecting: false });
    },
  });

  window.__habtrail = { map: mapApi.map, state };   // debugging and tests only

  // ----- view building -----
  function zoneColorFromFraction(f) { return f === 0 ? '#34d058' : f <= 0.34 ? '#facc15' : f <= 0.67 ? '#f59e0b' : '#ef4444'; }

  function buildView() {
    const { layer, kind } = data;
    const zid = state.zoneId;
    const view = { kind, layer, zoneStats: [] };
    const mapPixels = new Array(nPx);
    const mapZones = new Array(zones.features.length);

    if (kind === 'pixels') {
      const v = data.day.v, tt = data.day.t;
      const cls = v.map((x) => classIndex(layer, x));
      const scope = zid == null ? allIdx : pxByZone[zid];
      view.classCounts = new Array(layer.classes.length).fill(0);
      view.typeCounts = [0, 0, 0, 0];
      view.noData = 0;
      const vals = [];
      for (const i of scope) {
        view.typeCounts[tt[i]]++;
        if (!state.types[tt[i]]) continue;
        if (cls[i] < 0) view.noData++; else view.classCounts[cls[i]]++;
        if (v[i] != null) vals.push(v[i]);
      }
      view.sel = { n: vals.length, min: Math.min(...vals), max: Math.max(...vals), mean: mean(vals) };
      view.zoneStats = pxByZone.map((idx) => {
        const s = summarize(idx.map((i) => v[i]), layer.summary);
        const c = classIndex(layer, s);
        return { color: c >= 0 ? layer.classes[c].color : NO_DATA, text: fmtValue(layer, s) };
      });
      for (let i = 0; i < nPx; i++) {
        const c = cls[i];
        mapPixels[i] = { c: c >= 0 ? layer.classes[c].color : NO_DATA, t: tt[i], show: zid != null && grid.zone[i] === zid && state.types[tt[i]] ? 1 : 0 };
      }
    } else {
      view.closureDays = data.days;
      const today = data.days[state.dateIdx].zones;
      view.zoneStats = zones.features.map((f) => {
        const list = meta.zone_species[f.properties.code] || [];
        const closed = list.filter((s) => today[f.properties.code]?.[s]).length;
        return { color: list.length ? zoneColorFromFraction(closed / list.length) : NO_DATA, closed, total: list.length,
          text: list.length ? t('closures.count', { closed, total: list.length }) : '–' };
      });
      for (let i = 0; i < nPx; i++) mapPixels[i] = { c: NO_DATA, t: 0, show: 0 };
    }

    view.zoneStats.forEach((z, i) => {
      const sel = zid === i;
      mapZones[i] = {
        fill: z.color,
        fillOpacity: sel ? (kind === 'pixels' ? 0 : 0.38) : zid == null ? 0.5 : 0.14,
        stroke: sel ? '#ffffff' : 'rgba(255,255,255,0.6)',
        strokeWidth: sel ? 2.5 : 1.2,
      };
    });
    view.map = { pixels: mapPixels, zones: mapZones, zoneId: zid };
    return view;
  }

  function render() {
    if (!data) return;
    const view = buildView();
    mapApi.setView(view.map);
    legend.update(view);
    zonecard.update(view);
    closures.update(view);
  }

  let req = 0;
  async function refresh() {
    const mine = ++req;
    const layer = layerOf(state.layerId);
    try {
      let next;
      if (layer.type === 'pixels') {
        const [day, days] = await Promise.all([loadLayerDay(layer.id, meta.dates[state.dateIdx]), loadLayerDays(layer.id, meta.dates)]);
        next = { kind: 'pixels', layer, day, days };
      } else {
        const days = await Promise.all(meta.dates.map((d) => loadLayerDay(layer.id, d)));
        next = { kind: 'table', layer, days };
      }
      if (mine !== req) return;
      data = next;
      render();
      announce(`${pick(layer, 'label')}, ${fmtDate(meta.dates[state.dateIdx], { weekday: 'long', month: 'long', day: 'numeric' })}`);
    } catch (err) {
      console.error(err);
      showFatal(t('error.load'));
    }
  }

  // ----- actions -----
  function selectZone(id) {
    set({ zoneId: id, selecting: false });
    trend.hide();
    mapApi.flyToZone(id);
  }
  function clearZone() {
    set({ zoneId: null, selecting: false });
    trend.hide();
    mapApi.flyToAll();
  }
  function toggleLang() {
    setLang(getLang() === 'en' ? 'fr' : 'en');
    document.getElementById('map').setAttribute('aria-label', t('map.label'));
    topbar.build();
    overlay.update();
    trend.hide();
    render();
    syncHash();
  }

  function syncHash() {
    const p = new URLSearchParams();
    p.set('layer', state.layerId);
    p.set('date', meta.dates[state.dateIdx]);
    if (state.zoneId != null) p.set('zone', zones.features[state.zoneId].properties.code);
    if (getLang() === 'fr') p.set('lang', 'fr');
    if (state.basemap === 'plain') p.set('basemap', 'plain');
    history.replaceState(null, '', `#${p}`);
  }

  // follow edits to the URL hash (back/forward, pasted links)
  function applyHash() {
    const w = readHash();
    const patch = {};
    if (w.layer && layerOf(w.layer) && w.layer !== state.layerId) patch.layerId = w.layer;
    const d = meta.dates.indexOf(w.date);
    if (d >= 0 && d !== state.dateIdx) patch.dateIdx = d;
    const base = w.basemap === 'plain' ? 'plain' : 'satellite';
    if (base !== state.basemap) patch.basemap = base;
    if (Object.keys(patch).length) set(patch);
    const z = zones.features.findIndex((f) => f.properties.code === w.zone);
    if (z !== (state.zoneId ?? -1)) { if (z >= 0) selectZone(z); else clearZone(); }
    if (langFromHash(w.lang) !== getLang()) toggleLang();
  }
  window.addEventListener('hashchange', applyHash);

  on((patch) => {
    if ('basemap' in patch) mapApi.setBasemap(state.basemap);
    if ('selecting' in patch) mapApi.setSelecting(state.selecting);
    topbar.sync();
    if ('overlay' in patch) { overlay.update(); if (state.overlay === 'alerts' || state.overlay === 'about') overlay.focus(); }
    if ('layerId' in patch) {
      trend.hide();
      if (layerOf(state.layerId).type !== 'pixels') set({ selecting: false });
    }
    if ('layerId' in patch || 'dateIdx' in patch) refresh();
    else if ('zoneId' in patch || 'types' in patch || 'selecting' in patch) render();
    syncHash();
  });

  document.addEventListener('click', () => { if (state.overlay === 'layers') set({ overlay: null }); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.overlay) set({ overlay: null });
    else if (state.selecting) set({ selecting: false });
    else if (trend.isOpen()) trend.hide();
    else if (state.zoneId != null) clearZone();
  });

  // ----- go -----
  topbar.build();
  await mapApi.ready;
  mapApi.setBasemap(state.basemap);
  if (state.zoneId != null) mapApi.flyToZone(state.zoneId); else mapApi.map.fitBounds(meta.map.bounds, { padding: window.innerWidth < 760 ? { top: 150, bottom: 260, left: 20, right: 20 } : { top: 110, bottom: 90, left: 380, right: 290 }, duration: 0 });
  await refresh();
  syncHash();

  // alerts come from the HABtrail layer across all forecast dates
  const hab = layerOf('habtrail');
  if (hab) {
    loadLayerDays('habtrail', meta.dates).then((days) => {
      const alerts = computeAlerts(hab, days, grid.zone, zones.features.length);
      topbar.setAlertCount(alerts.length);
      overlay.setAlerts(alerts);
    }).catch((err) => console.error('alerts unavailable', err));
  }
}

boot();
