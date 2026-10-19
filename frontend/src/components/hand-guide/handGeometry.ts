export interface KeyPosition { x: number; y: number; width: number; height: number }
export interface KeyboardGeometry {
  width: number;
  height: number;
  keys: Record<string, KeyPosition>;
}

/** Coordinates stay local to the keyboard, including when an ancestor is CSS-scaled. */
export function measureKeyboard(element: HTMLElement): KeyboardGeometry | null {
  const bounds = element.getBoundingClientRect();
  const width = element.clientWidth || bounds.width;
  const height = element.clientHeight || bounds.height;
  if (!width || !height || !bounds.width || !bounds.height) return null;
  const scaleX = width / bounds.width;
  const scaleY = height / bounds.height;
  const keys: Record<string, KeyPosition> = {};
  element.querySelectorAll<HTMLElement>("[data-key-code]").forEach(key => {
    const box = key.getBoundingClientRect();
    keys[key.dataset.keyCode!] = {
      x: (box.left - bounds.left + box.width / 2) * scaleX,
      y: (box.top - bounds.top + box.height / 2) * scaleY,
      width: box.width * scaleX, height: box.height * scaleY,
    };
  });
  return keys.KeyA && keys.KeyF && keys.KeyJ && keys.Semicolon && keys.Space ? { width, height, keys } : null;
}
