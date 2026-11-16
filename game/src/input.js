// Keyboard and mouse, read once a frame. Movement keys give a direction vector;
// everything else becomes an action bit the loop consumes with takeActions(), so a
// single press is never read twice. Clicks carry their logical position, mapped
// through a callback the boot code supplies (the renderer owns the scale math).

export const ACTION_CONFIRM = 1;
export const ACTION_DASH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
export const ACTION_CHOICE_1 = 32;
export const ACTION_CHOICE_2 = 64;
export const ACTION_CHOICE_3 = 128;

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
]);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let mouse = { x: 0, y: 0, inside: false };
  let toLogical = (x, y) => ({ x, y });

  function onKeyDown(event) {
    if (event.repeat) return;
    const code = event.code;
    if (MOVE_KEYS.has(code) || code === 'Space') event.preventDefault();
    keys.add(code);
    if (code === 'Space' || code === 'Enter') actions |= ACTION_CONFIRM | ACTION_DASH;
    if (code === 'ShiftLeft' || code === 'ShiftRight') actions |= ACTION_DASH;
    if (code === 'KeyP' || code === 'Escape') actions |= ACTION_PAUSE;
    if (code === 'KeyM') actions |= ACTION_MUTE;
    if (code === 'KeyR') actions |= ACTION_RESTART;
    if (code === 'Digit1' || code === 'Numpad1') actions |= ACTION_CHOICE_1;
    if (code === 'Digit2' || code === 'Numpad2') actions |= ACTION_CHOICE_2;
    if (code === 'Digit3' || code === 'Numpad3') actions |= ACTION_CHOICE_3;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const point = toLogical(event.clientX, event.clientY);
    click = { x: point.x, y: point.y, button: event.button };
    actions |= ACTION_CONFIRM;
    canvas.focus?.();
  }

  function onPointerMove(event) {
    const point = toLogical(event.clientX, event.clientY);
    mouse = { x: point.x, y: point.y, inside: true };
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);

  return {
    /** Map client pixels to logical field coordinates (set by the boot code). */
    setMapper(fn) {
      toLogical = fn;
    },
    /** Normalised movement direction from the held keys, or {x:0,y:0}. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x === 0 || y === 0) return { x, y };
      const inv = 1 / Math.SQRT2;
      return { x: x * inv, y: y * inv };
    },
    /** True while the named physical key is held. */
    held(code) {
      return keys.has(code);
    },
    /** The action bits raised since the last call; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The most recent click (logical position) since the last call, else null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    /** Current mouse position in logical coordinates. */
    mouse() {
      return mouse;
    },
  };
}
