// Alerts panel and About panel (shown over the right-hand column).

import { h, clear } from '../dom.js';
import { t, pick, fmtDate, fmtNumber } from '../i18n.js';
import { icon } from '../icons.js';
import { state, set } from '../state.js';
import { TYPE_CODES } from '../classify.js';

export function createOverlay({ meta, zones }, { onViewZone }) {
  const el = h('aside', { class: 'overlay panel', hidden: true });
  let alerts = [];
  const hab = meta.layers.find((l) => l.id === 'bloom');
  const zoneName = (i) => pick(zones.features[i].properties, 'name');

  const close = () => set({ overlay: null });
  const head = (title, id) => h('div', { class: 'panel-head' },
    h('h2', { class: 'panel-title', id, tabindex: '-1' }, title),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('nav.close'), onClick: close }, icon('close')));

  function alertsView() {
    const color = (lvl) => hab.classes.find((c) => c.id === lvl)?.color ?? '#888';
    const cards = alerts.map((a) => h('article', { class: 'alert-card', style: { '--c': color(a.level) } },
      h('div', { class: 'alert-top' }, h('span', { class: 'pill' }, t(`alerts.level.${a.level}`)), zoneName(a.zone)),
      h('p', null, t('alerts.msg', {
        level: t(`alerts.level.${a.level}`).toLowerCase(), date: fmtDate(meta.dates[a.firstIdx]),
        peak: `${fmtNumber(a.peak)} %`, peakDate: fmtDate(meta.dates[a.peakIdx]),
      })),
      h('p', { class: 'muted' }, t('alerts.action')),
      h('button', { class: 'btn', type: 'button', onClick: () => onViewZone(a.zone, a.firstIdx) }, t('alerts.view'))));
    const quiet = zones.features.map((_, i) => i).filter((i) => !alerts.some((a) => a.zone === i)).map(zoneName);
    return [
      head(t('alerts.title'), 'overlay-title'),
      h('div', { class: 'panel-body' },
        alerts.length ? cards : h('p', { class: 'empty' }, t('alerts.none')),
        alerts.length && quiet.length ? h('p', { class: 'hint' }, t('alerts.quiet', { zones: quiet.join(', ') })) : null,
        h('p', { class: 'footnote' }, t('alerts.sample'))),
    ];
  }

  function aboutView() {
    return [
      head(t('about.title'), 'overlay-title'),
      h('div', { class: 'panel-body about' },
        h('p', null, t('about.lead')),
        h('h3', null, t('about.real.title')), h('p', { class: 'muted' }, t('about.real.body')),
        h('h3', null, t('about.sample.title')), h('p', { class: 'muted' }, t('about.sample.body')),
        h('h3', null, t('about.types.title')),
        h('dl', null, TYPE_CODES.map((c) => [h('dt', null, `${c}: ${t(`type.${c}`)}`), h('dd', null, t(`type.${c}.info`))])),
        h('h3', null, t('about.sources.title')),
        h('dl', null,
          h('dt', null, pick(hab, 'label')), h('dd', null, t('about.src.bloom')),
          h('dt', null, `${pick(meta.layers.find((l) => l.id === 'chla'), 'label')}, SST, ${pick(meta.layers.find((l) => l.id === 'sediments'), 'label')}`), h('dd', null, t('about.src.satellite')),
          h('dt', null, `${pick(meta.layers.find((l) => l.id === 'salinity'), 'label')}, ${pick(meta.layers.find((l) => l.id === 'wqi'), 'label')}`), h('dd', null, t('about.src.insitu')),
          h('dt', null, pick(meta.layers.find((l) => l.id === 'interdictions'), 'label')), h('dd', null, t('about.src.closures'))),
        h('h3', null, t('about.credits.title')), h('p', { class: 'muted' }, t('about.credits.body'))),
    ];
  }

  function update() {
    const open = state.overlay === 'alerts' || state.overlay === 'about';
    el.hidden = !open;
    document.body.classList.toggle('has-overlay', open);
    if (!open) return;
    clear(el);
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'overlay-title');
    el.append(...(state.overlay === 'alerts' ? alertsView() : aboutView()));
  }

  return {
    el, update,
    setAlerts(list) { alerts = list; if (state.overlay === 'alerts') update(); },
    focus() { el.querySelector('#overlay-title')?.focus(); },
  };
}
