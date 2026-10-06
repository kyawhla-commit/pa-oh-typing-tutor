/** Scroll only the passage window. scrollIntoView would also move page ancestors. */
export function revealTypingPosition(viewport: HTMLElement, marker: HTMLElement) {
  if (viewport.clientHeight === 0) return;
  const area = viewport.getBoundingClientRect();
  const caret = marker.getBoundingClientRect();
  const top = area.top + viewport.clientTop + 12;
  const bottom = area.top + viewport.clientTop + viewport.clientHeight - 12;
  if (caret.top < top) viewport.scrollTop = Math.max(0, viewport.scrollTop + caret.top - top);
  else if (caret.bottom > bottom) viewport.scrollTop += caret.bottom - bottom;
}
