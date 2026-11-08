// One small store. Modules call set() and subscribe with on().

export const state = {
  layerId: 'bloom',
  dateIdx: 0,
  zoneId: null,                 // index into grid.zones, or null for the all-zones view
  types: { 0: true, 1: true, 2: true, 3: true },   // OBS, MOD, INT, KRI visibility
  selecting: false,
  overlay: null,                // null | 'layers' | 'alerts' | 'about'
  basemap: 'satellite',         // 'satellite' | 'plain'
};

const listeners = new Set();

export function set(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(patch);
}

export function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
