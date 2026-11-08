// Inline SVG icons (24x24, stroke = currentColor). Static strings only, so innerHTML is safe here.

const PATHS = {
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  select: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3.2 3"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  cross: '<path d="M7 7l10 10M17 7 7 17"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};

export function icon(name, extraClass = '') {
  const span = document.createElement('span');
  span.className = `icon-wrap ${extraClass}`.trim();
  span.style.display = 'inline-flex';
  span.innerHTML =
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  return span;
}
