// Colour maths for the code-drawn art. Colours are '#rgb' or '#rrggbb' strings while drawing on a canvas,
// and plain numbers (0xrrggbb) once Phaser tints something with them.
type RGB = [number, number, number];

function rgb(color: string): RGB {
  const h = color.slice(1);
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const two = (v: number) => byte(v).toString(16).padStart(2, '0');

// A colour part of the way from a to b (t = 0 is a, t = 1 is b).
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a),
    [br, bg, bb] = rgb(b);
  return `#${two(ar + (br - ar) * t)}${two(ag + (bg - ag) * t)}${two(ab + (bb - ab) * t)}`;
}

// The same colour with an opacity, for canvas fills.
export function rgba(color: string, alpha: number): string {
  const [r, g, b] = rgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

// '#rgb' or '#rrggbb' to the number Phaser wants.
export function hex(color: string): number {
  const [r, g, b] = rgb(color);
  return (r << 16) | (g << 8) | b;
}
