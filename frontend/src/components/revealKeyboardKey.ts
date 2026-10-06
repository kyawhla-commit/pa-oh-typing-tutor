/** Follow hints horizontally inside the keyboard only; never move the page. */
export function revealKeyboardKey(viewport: HTMLElement) {
  if (!viewport.clientWidth || viewport.scrollWidth <= viewport.clientWidth) return;
  const key = viewport.querySelector<HTMLElement>('[data-next-key="true"]:not([data-key-modifier="true"])');
  if (!key) return;
  const area = viewport.getBoundingClientRect(), target = key.getBoundingClientRect();
  const left = area.left + viewport.clientLeft + 8;
  const right = area.left + viewport.clientLeft + viewport.clientWidth - 8;
  const delta = target.left < left ? target.left - left : target.right > right ? target.right - right : 0;
  if (delta) viewport.scrollLeft = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, viewport.scrollLeft + delta));
}
