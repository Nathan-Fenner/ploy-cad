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

export function intersectionBetweenLineAndCircle(
  line: { a: XY; b: XY },
  circle: { c: XY; r: number },
): XY[] {
  // ((a-c) + tv)^2 = r^2
  // ((a-c) + tv) dot ((a-c) + tv) = r^2
  // (a-c) dot ((a-c) + tv) + tv dot ((a-c) + tv) = r^2
  // (a-c) dot (a-c) + t (a-c) dot v + t v dot (a-c) + t^2 v dot v = r^2
  // t^2 [v dot v] + t [2(a-c) dot v] + [(a-c)^2 - r^2] = 0
  const delta = pointSubtract(line.a, circle.c);
  const v = pointSubtract(line.b, line.a);
  const quadraticA = dotProduct(v, v);
  const quadraticB = 2 * dotProduct(delta, v);
  const quadraticC = dotProduct(delta, delta) - circle.r ** 2;

  const discriminant = quadraticB ** 2 - 4 * quadraticA * quadraticC;
  if (Math.abs(discriminant) < EPS) {
    // The line is (approximately) tangent to the circle.
    const t = -quadraticB / (2 * quadraticA);
    return [pointAdd(line.a, pointScale(v, t))];
  }
  if (discriminant < 0) {
    // The line does not intersect the circle.
    return [];
  }
  // The line intersects the circle twice.
  const t1 = (-quadraticB - Math.sqrt(discriminant)) / (2 * quadraticA);
  const t2 = (-quadraticB + Math.sqrt(discriminant)) / (2 * quadraticA);

  const p1 = pointAdd(line.a, pointScale(v, t1));
  const p2 = pointAdd(line.a, pointScale(v, t2));

  return [p1, p2];
}

export function intersectionBetweenTwoCircles(
  c1: { center: XY; radius: number },
  c2: { center: XY; radius: number },
): XY[] {
  if (distanceBetweenPoints(c1.center, c2.center) < EPS) {
    // This is a degenerate case.
    return [];
  }

  const distance = distanceBetweenPoints(c1.center, c2.center);
  if (distance > c1.radius + c2.radius + EPS) {
    // The circles are too far apart to touch.
    return [];
  }
  const forward = pointNormalize(pointSubtract(c2.center, c1.center));
  const right = { x: -forward.y, y: forward.x };

  // Let's use "f" and "r" as the natural coordinates forward and right,
  // with the origin at c1.center. Then we want to solve:
  // * (f^2 + r^2) = c1.r^2
  // * ((f - distance)^2 + r^2) = c2.r^2

  // From the first equation, we have
  // r = +/- sqrt(c1.r^2 - f^2)

  // Substituting this into the second equation, we have
  // * ((f - distance)^2 + c1.r^2 - f^2) = c2.r^2
  // * f^2 + distance^2 - 2f distance + c1.r^2 - f^2 = c2.r^2
  // * distance^2 - 2f distance + c1.r^2 = c2.r^2
  // * f = (c2.r^2 - c1.r^2 - distance^2) / (-2distance)
  const f = (c2.radius ** 2 - c1.radius ** 2) / (-2 * distance) + distance / 2;

  if (Math.abs(f) > c1.radius + EPS) {
    // The circles do not intersect
    return [];
  }
  if (Math.abs(f) > c1.radius - EPS) {
    // The circles intersect at one point only.
    return [pointAdd(c1.center, pointScale(forward, c1.radius * Math.sign(f)))];
  }

  const r = Math.sqrt(c1.radius ** 2 - f ** 2);

  const along = pointAdd(c1.center, pointScale(forward, f));

  return [
    pointAdd(along, pointScale(right, r)),
    pointAdd(along, pointScale(right, -r)),
  ];
}
