export type XY = { readonly x: number; readonly y: number };

export function distance(a: XY, b: XY): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
