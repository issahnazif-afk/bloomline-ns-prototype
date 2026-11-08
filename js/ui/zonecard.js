// Bottom-left card. All-zones view: a clickable zone list. Zone view: stats, class share, select-area tool.

import { h, clear } from '../dom.js';
import { t, pick, fmtNumber, fmtValue } from '../i18n.js';
import { icon } from '../icons.js';
import { state } from '../state.js';

/** number large, unit small, so values like "15.68 mg/m³" fit a third of the card */
function stat(layer, v, label) {
  const [num, unit] = fmtValue(layer, v).split('\u00a0');
  return h('div', { class: 'stat' }, h('b', null, num, unit ? h('small', null, unit) : null), h('span', null, label));
}

export function createZoneCard({ zones }, { onZone, onBack, onSelectToggle }) {
  const el = h('aside', { class: 'zone-card panel' });
  const props = (i) => zones.features[i].properties;

  function overview(view) {
    const items = view.zoneStats.map((z, i) => h('li', null,
      h('button', { type: 'button', onClick: () => onZone(i) },
        h('span', { class: 'swatch', style: { background: z.color } }),
        h('span', null, pick(props(i), 'name')),
        h('span', { class: 'val' }, z.text))));
    return [
      h('div', { class: 'panel-head' }, h('h2', { class: 'panel-title' }, t('zones.title'))),
      h('div', { class: 'panel-body' }, h('p', { class: 'hint' }, t('zones.hint')), h('ul', { class: 'zone-list' }, items)),
    ];
  }

  function detail(view) {
    const p = props(state.zoneId);
    const isPixels = view.kind === 'pixels';
    const head = h('div', { class: 'zone-head' },
      h('div', { style: { flex: '1' } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' } },
          h('span', { class: 'zone-code' }, p.code)),
        h('h2', { class: 'zone-name' }, pick(p, 'name')),
        h('p', { class: 'zone-sub' }, t('zone.pixelsArea', { n: fmtNumber(p.n_pixels), area: fmtNumber(p.area_km2, 1) }))));

    const body = [];
    if (isPixels) {
      const s = view.sel;
      if (!s.n) {
        body.push(h('p', { class: 'hint' }, t('zone.empty')));
      } else {
        const L = view.layer;
        body.push(
          h('div', { class: 'stat-grid' },
            stat(L, s.min, t('zone.lowest')), stat(L, s.mean, t('zone.average')), stat(L, s.max, t('zone.highest'))),
          h('p', { class: 'share-label' }, t('zone.share')),
          h('div', { class: 'share-bar', role: 'img', 'aria-label': L.classes.map((c, i) => `${pick(c, 'label')} ${view.classCounts[i]}`).join(', ') },
            L.classes.map((c, i) => (view.classCounts[i]
              ? h('i', { style: { width: `${(view.classCounts[i] / s.n) * 100}%`, background: c.color } }) : null))));
      }
    } else {
      const z = view.zoneStats[state.zoneId];
      body.push(h('p', { class: 'hint' }, z.text));
    }

    const selectBtn = isPixels ? h('button', { class: 'btn grow', type: 'button', 'aria-pressed': String(state.selecting), onClick: onSelectToggle },
      icon('select'), state.selecting ? t('zone.selectOn') : t('zone.select')) : null;
    const backBtn = h('button', { class: 'btn', type: 'button', onClick: onBack }, icon('back'), t('zone.all'));
    return [head, h('div', { class: 'panel-body' }, body, h('div', { class: 'btn-row' }, selectBtn, backBtn))];
  }

  function update(view) {
    if (!view) return;
    clear(el);
    el.append(...(state.zoneId == null ? overview(view) : detail(view)));
  }

  return { el, update };
}
