export type XY = { readonly x: number; readonly y: number };

export const EPS = 0.0001;

export function distanceBetweenPoints(a: XY, b: XY): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function dotProduct(p: XY, q: XY): number {
  return p.x * q.x + p.y * q.y;
}

export function pointProjectOntoLine(
  p: XY,
  { a, b }: { a: XY; b: XY },
): { point: XY; t: number } {
  const direction = pointNormalize(pointSubtract(b, a));

  const length = dotProduct(pointSubtract(p, a), direction);

  return {
    point: pointAdd(a, pointScale(direction, length)),
    t: length / distanceBetweenPoints(a, b),
  };
}

export function distancePointToLineSegment(
  p: XY,
  { a, b }: { a: XY; b: XY },
): number {
  if (distanceBetweenPoints(a, b) < EPS) {
    return distanceBetweenPoints(p, a);
  }

  const projection = pointProjectOntoLine(p, { a, b });
  if (projection.t >= 0 && projection.t <= 1) {
    return distanceBetweenPoints(p, projection.point);
  }

  if (projection.t < 0) {
    return distanceBetweenPoints(p, a);
  } else {
    return distanceBetweenPoints(p, b);
  }
}
export function pointAdd(a: XY, b: XY): XY {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function pointSubtract(a: XY, b: XY): XY {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function pointScale(p: XY, k: number): XY {
  return { x: p.x * k, y: p.y * k };
}

export function pointNormalize(p: XY): XY {
  return pointScale(p, 1 / Math.sqrt(p.x ** 2 + p.y ** 2));
}
