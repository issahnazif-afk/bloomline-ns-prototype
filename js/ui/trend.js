// Trend card for a rectangle of selected pixels: line over the forecast dates and a dashed average.

import { h, clear } from '../dom.js';
import { t, pick, fmtDate, fmtNumber, fmtValue } from '../i18n.js';
import { icon } from '../icons.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  kids.forEach((k) => e.append(k));
  return e;
};

function chart(layer, dates, values) {
  const W = 380, H = 190, L = 44, R = 44, T = 34, B = 40;
  const lo0 = Math.min(...values), hi0 = Math.max(...values);
  const pad = (hi0 - lo0) * 0.3 || Math.max(Math.abs(hi0) * 0.1, 1);
  const lo = lo0 - pad, hi = hi0 + pad;
  const x = (i) => L + (i * (W - L - R)) / Math.max(dates.length - 1, 1);
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': values.map((v, i) => `${fmtDate(dates[i])}: ${fmtValue(layer, v)}`).join(', ') });

  svg.append(s('line', { x1: L, x2: W - R, y1: y(avg), y2: y(avg), stroke: '#f6d365', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
  const rising = values[values.length - 1] >= values[0];
  // put the average label on the side of the line away from the data line's end
  const avgLabel = s('text', { x: L - 30, y: rising ? y(avg) - 7 : y(avg) + 15, 'text-anchor': 'start', fill: '#f6d365', 'font-size': 11 });
  avgLabel.textContent = t('trend.avg', { value: fmtValue(layer, avg) });
  svg.append(avgLabel);

  svg.append(s('polyline', { points: values.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  values.forEach((v, i) => {
    svg.append(s('circle', { cx: x(i), cy: y(v), r: 4.5, fill: '#fff', stroke: '#0f1a28', 'stroke-width': 2 }));
    const val = s('text', { x: x(i), y: y(v) - 10, 'text-anchor': i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle', fill: '#eaf0f8', 'font-size': 11, 'font-weight': 600 });
    val.textContent = fmtValue(layer, v);
    svg.append(val);
    const d = s('text', { x: x(i), y: H - 14, 'text-anchor': 'middle', fill: '#a4b5ca', 'font-size': 11 });
    d.textContent = fmtDate(dates[i]);
    svg.append(d);
  });
  return svg;
}

export function createTrend() {
  const el = h('div', { class: 'trend panel', hidden: true, role: 'dialog' });

  function hide() { el.hidden = true; clear(el); }

  /** rect: screen rectangle of the selection; used only to position the card */
  function show({ layer, dates, values, n, rect }) {
    clear(el);
    el.hidden = false;
    el.setAttribute('aria-label', t('trend.title', { layer: pick(layer, 'label') }));
    el.append(h('div', { class: 'panel-head' },
      h('h2', { class: 'panel-title' }, t('trend.title', { layer: pick(layer, 'label') })),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('nav.close'), onClick: hide }, icon('close'))));
    if (!n) {
      el.append(h('div', { class: 'panel-body' }, h('p', { class: 'empty' }, t('trend.empty'))));
    } else {
      el.append(h('div', { class: 'panel-body' }, h('p', { class: 'hint' }, t('trend.pixels', { n: fmtNumber(n) })), chart(layer, dates, values)));
    }
    // place above the selection if there is room, else below; keep inside the viewport
    const w = el.offsetWidth, hgt = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.x + rect.w / 2 - w / 2;
    let top = rect.y - hgt - 10;
    if (top < 70) top = rect.y + rect.h + 10;
    left = Math.max(12, Math.min(left, vw - w - 12));
    top = Math.max(70, Math.min(top, vh - hgt - 12));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  return { el, show, hide, isOpen: () => !el.hidden };
}
