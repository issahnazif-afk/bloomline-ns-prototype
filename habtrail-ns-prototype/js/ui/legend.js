// Legend for the active pixel layer, with per-class pixel counts and the pixel-source filter
// (OBS / MOD / INT / KRI). The filter lets scientific users judge where values come from.

import { h, clear, isNarrow } from '../dom.js';
import { t, pick, fmtNumber } from '../i18n.js';
import { rangeLabel, TYPE_CODES } from '../classify.js';
import { state, set } from '../state.js';

let sourceOpen = null;   // remembered between redraws; null = decide from screen size

function sourceDetails(typeRows) {
  const d = h('details', { class: 'types' }, h('summary', { class: 'types-title' }, t('legend.source')), typeRows);
  d.open = sourceOpen ?? !isNarrow();
  d.addEventListener('toggle', () => { sourceOpen = d.open; });
  return d;
}

export function createLegend() {
  const el = h('aside', { class: 'legend panel', hidden: true });

  function update(view) {
    if (!view || view.kind !== 'pixels') { el.hidden = true; return; }
    el.hidden = false;
    clear(el);
    const L = view.layer;
    el.setAttribute('aria-label', pick(L, 'legend_title'));

    const rows = L.classes.map((c, i) => h('li', { class: 'legend-row' },
      h('span', { class: 'swatch', style: { background: c.color } }),
      h('span', { class: 'name' }, pick(c, 'label'), h('span', { class: 'range' }, rangeLabel(L, c))),
      h('span', { class: 'count' }, fmtNumber(view.classCounts[i]))));
    if (view.noData > 0) {
      rows.push(h('li', { class: 'legend-row' },
        h('span', { class: 'swatch', style: { background: '#8b95a5' } }),
        h('span', { class: 'name' }, t('legend.noData')),
        h('span', { class: 'count' }, fmtNumber(view.noData))));
    }

    const typeRows = TYPE_CODES.map((code, ti) => {
      const input = h('input', {
        type: 'checkbox', 'aria-label': `${code}, ${t(`type.${code}`)}`,
        onChange: (e) => set({ types: { ...state.types, [ti]: e.target.checked } }),
      });
      input.checked = !!state.types[ti];
      return h('label', { class: 'type-row', title: t(`type.${code}.info`) },
        input,
        h('span', { class: 'label' }, code, h('span', null, t(`type.${code}`))),
        h('span', { class: 'count' }, fmtNumber(view.typeCounts[ti])));
    });

    el.append(
      h('h2', { class: 'legend-title' }, pick(L, 'legend_title')),
      h('div', { class: 'panel-body' },
        h('ul', { class: 'legend-rows' }, rows),
        h('hr', { class: 'legend-sep' }),
        sourceDetails(typeRows),
        pick(L, 'footnote') ? h('p', { class: 'footnote' }, pick(L, 'footnote')) : null));
  }

  return { el, update };
}
