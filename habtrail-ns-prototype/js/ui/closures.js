// Species x date closure table for the selected zone (right-hand panel, "Shellfish closures" layer).

import { h, clear } from '../dom.js';
import { t, pick, fmtDate } from '../i18n.js';
import { icon } from '../icons.js';
import { state } from '../state.js';

/** 0 closed -> 0 bars; otherwise 1-4 bars by share of species closed */
export const severityLevel = (closed, total) => (!total || !closed ? 0 : Math.min(4, Math.ceil((closed / total) * 4)));

export function createClosures({ meta, zones }) {
  const el = h('aside', { class: 'closures panel', hidden: true });
  const speciesById = Object.fromEntries(meta.species.map((s) => [s.id, s]));

  function update(view) {
    if (!view || view.kind !== 'table') { el.hidden = true; return; }
    el.hidden = false;
    clear(el);
    el.setAttribute('aria-label', t('closures.title'));
    const head = h('div', { class: 'panel-head' }, h('h2', { class: 'panel-title' }, t('closures.title')));

    if (state.zoneId == null) {
      el.append(head, h('div', { class: 'panel-body' }, h('p', { class: 'empty' }, t('closures.pick')), h('p', { class: 'footnote' }, t('closures.note'))));
      return;
    }

    const code = zones.features[state.zoneId].properties.code;
    const list = meta.zone_species[code] || [];
    if (!list.length) {
      el.append(head, h('div', { class: 'panel-body' }, h('p', { class: 'empty' }, t('closures.none'))));
      return;
    }

    const days = view.closureDays.map((d) => d.zones[code] || {});
    const sevRow = h('tr', null,
      h('td', null, t('closures.severity')),
      days.map((d) => {
        const closed = list.filter((s) => d[s]).length;
        const lvl = severityLevel(closed, list.length);
        return h('td', { 'aria-label': t('closures.count', { closed, total: list.length }) },
          h('span', { class: 'sev' }, [1, 2, 3, 4].map((n) => h('i', { class: n <= lvl ? 'on' : '' }))));
      }));
    sevRow.querySelectorAll('td').forEach((td, i) => i > 0 && td.classList.toggle('today', i - 1 === 0));

    const rows = list.map((sid) => h('tr', null,
      h('td', null, pick(speciesById[sid], 'name')),
      days.map((d, di) => {
        const closed = !!d[sid];
        const td = h('td', { class: `${closed ? 'no' : 'ok'}${di === 0 ? ' today' : ''}`, 'aria-label': closed ? t('closures.closed') : t('closures.open') },
          icon(closed ? 'cross' : 'check'));
        return td;
      })));

    const table = h('table', { class: 'tbl' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, t('closures.species')),
        meta.dates.map((d, i) => h('th', { scope: 'col', class: i === 0 ? 'today' : '' }, fmtDate(d))))),
      h('tbody', null, sevRow, rows));

    el.append(head, h('div', { class: 'panel-body' },
      h('p', { class: 'hint' }, t('closures.count', { closed: list.filter((s) => days[state.dateIdx][s]).length, total: list.length })),
      table,
      h('p', { class: 'footnote' }, t('closures.note'))));
  }

  return { el, update };
}
