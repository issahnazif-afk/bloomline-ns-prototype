// Forecast-based alerts, worked out in the browser from the bloom-risk layer for all forecast days.
// A zone alerts when any of its pixels reaches the "high" class on any forecast day.

import { classIndex } from './classify.js';

export const ALERT_LEVELS = ['very_high', 'high'];

/**
 * @param layer     the bloom layer definition from meta.json (needs classes with ids "very_high" and "high")
 * @param days      array (one per forecast date) of { v: number[] } aligned with the grid
 * @param zoneOfPx  grid.zone
 * @param nZones    number of zones
 * @returns alerts sorted by severity, then by first affected date
 */
export function computeAlerts(layer, days, zoneOfPx, nZones) {
  const idxOf = Object.fromEntries(layer.classes.map((c, i) => [c.id, i]));
  if (idxOf.high == null || idxOf.very_high == null) return [];
  const highMin = layer.classes[idxOf.high].min;

  const alerts = [];
  for (let z = 0; z < nZones; z++) {
    let firstIdx = -1, peak = -Infinity, peakIdx = -1;
    days.forEach((day, di) => {
      let dayMax = -Infinity;
      for (let i = 0; i < day.v.length; i++) {
        if (zoneOfPx[i] !== z) continue;
        const v = day.v[i];
        if (v != null && v > dayMax) dayMax = v;
      }
      if (dayMax >= highMin && firstIdx < 0) firstIdx = di;
      if (dayMax > peak) { peak = dayMax; peakIdx = di; }
    });
    if (firstIdx < 0) continue;
    const level = layer.classes[classIndex(layer, peak)].id;
    alerts.push({ zone: z, level, firstIdx, peak, peakIdx });
  }
  alerts.sort((a, b) => ALERT_LEVELS.indexOf(a.level) - ALERT_LEVELS.indexOf(b.level) || a.firstIdx - b.firstIdx || b.peak - a.peak);
  return alerts;
}
