// Logo, data-status card, date tabs, and the layer / alerts / about / language buttons.

import { h, clear, isNarrow } from '../dom.js';
import { t, getLang, pick, fmtDate, fmtDateTime } from '../i18n.js';
import { icon } from '../icons.js';
import { state, set } from '../state.js';

export function createTopbar({ meta, onLang }) {
  const root = h('header', { class: 'topbar' });
  let alertCount = 0;
  let refs = {};

  function groupedStatus() {
    // group layers that share an update time, so the card stays short
    const groups = new Map();
    for (const L of meta.layers) {
      if (!groups.has(L.updated)) groups.set(L.updated, []);
      groups.get(L.updated).push(pick(L, 'label'));
    }
    return [...groups].map(([time, names]) => {
      const label = groups.size === 1 ? t('status.allLayers') : names.join(', ');
      return t('status.updated', { layers: label, time: fmtDateTime(time) });
    });
  }

  function build() {
    clear(root);
    const dayLabel = (i) => (i === 0 ? t('dates.today') : t('dates.day', { n: i }));

    const status = h('details', { class: 'status panel' },
      h('summary', null, h('span', { class: 'dot' }), t('sample.badge'), icon('chevron', 'chev')),
      h('div', { class: 'status-body' },
        h('p', null, t('sample.note')),
        ...groupedStatus().map((line) => h('p', null, line))));
    status.open = !isNarrow();

    const tabs = meta.dates.map((d, i) => h('button', {
      class: 'date-tab', role: 'tab', type: 'button', 'data-i': i,
      'aria-label': `${dayLabel(i)}, ${fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}`,
      onClick: () => set({ dateIdx: i }),
      onKeydown: (e) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (state.dateIdx + step + meta.dates.length) % meta.dates.length;
        set({ dateIdx: next });
        refs.tabs[next].focus();
      },
    }, fmtDate(d), h('small', null, dayLabel(i))));
    const dates = h('div', { class: 'dates', role: 'tablist', 'aria-label': t('dates.label') }, tabs);

    const mkBtn = (name, label, onClick, extra = {}) => h('button', {
      class: 'round-btn', type: 'button', title: label, 'aria-label': label, onClick, ...extra,
    }, icon(name));

    const layersBtn = mkBtn('layers', t('nav.layers'), (e) => { e.stopPropagation(); set({ overlay: state.overlay === 'layers' ? null : 'layers' }); },
      { 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    const badge = h('span', { class: 'badge', hidden: true });
    const alertsBtn = mkBtn('bell', t('nav.alerts'), (e) => { e.stopPropagation(); set({ overlay: state.overlay === 'alerts' ? null : 'alerts' }); }, { 'aria-expanded': 'false' });
    alertsBtn.append(badge);
    const aboutBtn = mkBtn('info', t('nav.about'), (e) => { e.stopPropagation(); set({ overlay: state.overlay === 'about' ? null : 'about' }); }, { 'aria-expanded': 'false' });
    const langBtn = h('button', { class: 'round-btn lang-btn', type: 'button', title: t('nav.language'), 'aria-label': t('nav.language'), onClick: onLang },
      icon('globe'), getLang() === 'en' ? 'EN' : 'FR');

    // layer menu
    const items = meta.layers.map((L) => {
      const it = h('button', { class: 'menu-item', role: 'menuitemradio', type: 'button', 'data-id': L.id, onClick: () => set({ layerId: L.id, overlay: null }) },
        h('span', null, pick(L, 'label')), icon('check'));
      return it;
    });
    const baseBtns = ['satellite', 'plain'].map((m) => h('button', { type: 'button', 'data-m': m, onClick: () => set({ basemap: m }) }, t(`basemap.${m}`)));
    const menu = h('div', { class: 'menu panel', role: 'menu', 'aria-label': t('nav.layers'), hidden: true },
      items,
      h('hr', { class: 'menu-sep' }),
      h('div', { class: 'menu-label' }, t('basemap.title')),
      h('div', { class: 'seg' }, baseBtns));
    menu.addEventListener('click', (e) => e.stopPropagation());

    root.append(
      h('div', { class: 'left-stack' },
        h('a', { class: 'brand', href: './', 'aria-label': `Bloomline, ${t('brand.tag')}` }, h('span', { class: 'brand-h' }, 'Bloom'), 'line'),
        status),
      dates,
      h('div', { class: 'actions' }, layersBtn, alertsBtn, aboutBtn, langBtn, menu));

    refs = { tabs, items, baseBtns, menu, layersBtn, alertsBtn, aboutBtn, badge };
    sync();
  }

  function sync() {
    if (!refs.tabs) return;
    refs.tabs.forEach((tab, i) => {
      const on = i === state.dateIdx;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    refs.items.forEach((it) => it.setAttribute('aria-checked', String(it.dataset.id === state.layerId)));
    refs.baseBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === state.basemap)));
    refs.menu.hidden = state.overlay !== 'layers';
    refs.layersBtn.setAttribute('aria-expanded', String(state.overlay === 'layers'));
    refs.alertsBtn.setAttribute('aria-expanded', String(state.overlay === 'alerts'));
    refs.aboutBtn.setAttribute('aria-expanded', String(state.overlay === 'about'));
    refs.badge.hidden = alertCount === 0;
    refs.badge.textContent = String(alertCount);
  }

  return {
    el: root,
    build,
    sync,
    setAlertCount(n) { alertCount = n; sync(); },
  };
}
