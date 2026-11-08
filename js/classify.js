// Value -> class, class ranges for the legend, and summary statistics.

import { fmtNumber, t } from './i18n.js';

/** Classes are listed from highest severity to lowest. min is inclusive, max is exclusive, null = unbounded. */
export function classIndex(layer, v) {
  if (v == null || Number.isNaN(v)) return -1;
  const cs = layer.classes;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if ((c.min == null || v >= c.min) && (c.max == null || v < c.max)) return i;
  }
  return -1;
}

/** "≥ 90 %", "70 – 90 %", "< 25 %" */
export function rangeLabel(layer, c) {
  const u = layer.unit ? ` ${layer.unit}` : '';
  const f = (n) => fmtNumber(n, Number.isInteger(n) ? 0 : 1);
  if (c.min != null && c.max != null) return `${f(c.min)} – ${f(c.max)}${u}`;
  if (c.min != null) return `≥ ${f(c.min)}${u}`;
  return `< ${f(c.max)}${u}`;
}

export function quantile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const pos = (sortedAsc.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

export function summarize(values, how) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  if (how === 'p90') return quantile(v, 0.9);
  if (how === 'p10') return quantile(v, 0.1);
  return v.reduce((s, x) => s + x, 0) / v.length;
}

export const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

export const TYPE_CODES = ['OBS', 'MOD', 'INT', 'KRI'];
export const typeName = (code) => t(`type.${TYPE_CODES[code]}`);
