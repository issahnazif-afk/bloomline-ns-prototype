// Small hover / tap tooltip for a pixel.

import { h, clear } from '../dom.js';

export function createTooltip() {
  const el = h('div', { class: 'tip', hidden: true, role: 'status' });

  return {
    el,
    hide() { el.hidden = true; },
    show(title, subtitle, x, y) {
      clear(el);
      el.append(h('b', null, title), subtitle ? h('small', null, subtitle) : null);
      el.hidden = false;
      const w = el.offsetWidth, hgt = el.offsetHeight;
      const left = Math.min(x + 14, window.innerWidth - w - 8);
      const top = y - hgt - 14 < 8 ? y + 18 : y - hgt - 14;
      el.style.left = `${Math.max(8, left)}px`;
      el.style.top = `${top}px`;
    },
  };
}
