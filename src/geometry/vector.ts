export type XY = { readonly x: number; readonly y: number };

export const EPS = 0.0001;

export function distanceBetweenPoints(a: XY, b: XY): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function midpointBetweenPoints(a: XY, b: XY): XY {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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

/**
 * If `a` and `b` are non-equidistant to `center`, returns a modified center location that is equidistant to them.
 * It attempts to be on the same side as the provided `center`.
 */
export function adjustedArcCenter({
  a,
  b,
  center,
}: {
  a: XY;
  b: XY;
  center: XY;
}): XY {
  if (distanceBetweenPoints(a, b) < EPS) {
    return center;
  }
  // Usually, these should be the same, but we need to choose
  // an arbitrary behavior if they're not.
  // Will probably need to adjust this in the future.
  const radius = Math.max(
    distanceBetweenPoints(a, center),
    distanceBetweenPoints(b, center),
  );

  // The 'true' center needs to be calculated now, in case the two endpoints were not equidistant from the center.
  const midpoint = midpointBetweenPoints(a, b);
  let perpendicular = {
    x: b.y - midpoint.y,
    y: -b.x + midpoint.x,
  };
  if (dotProduct(perpendicular, pointSubtract(center, midpoint)) < 0) {
    perpendicular.x *= -1;
    perpendicular.y *= -1;
  }
  perpendicular = pointNormalize(perpendicular);

  const t = Math.sqrt(
    Math.max(0, radius ** 2 - distanceBetweenPoints(a, midpoint) ** 2),
  );

  // This point is distance `radius` from both endpoints.
  return pointAdd(midpoint, pointScale(perpendicular, t));
}

/**
 * An arc is drawn through a, b with radius max(dist(a, center), dist(b, center)).
 * The arc is always "small" (less than 180 degrees) but will be either clockwise or
 * counter-clockwise so that the 'center' is on the correct side.
 */
export function distancePointToArc(
  p: XY,
  { a, b, center }: { a: XY; b: XY; center: XY },
): number {
  if (distanceBetweenPoints(a, b) < EPS) {
    return distanceBetweenPoints(a, p);
  }

  // Usually, these should be the same, but we need to choose
  // an arbitrary behavior if they're not.
  // Will probably need to adjust this in the future.
  const radius = Math.max(
    distanceBetweenPoints(a, center),
    distanceBetweenPoints(b, center),
  );

  // This point is distance `radius` from both endpoints.
  const adjustedCenter = adjustedArcCenter({ a, b, center });

  if (distanceBetweenPoints(p, center) < EPS) {
    // This is a degenerate case.
    return radius;
  }

  let angleA = Math.atan2(a.y - adjustedCenter.y, a.x - adjustedCenter.x);
  let angleB = Math.atan2(b.y - adjustedCenter.y, b.x - adjustedCenter.x);
  // Ensure that we have a "small" (maybe negative) arc between A and B.
  if (angleB < angleA) {
    angleB += Math.PI * 2;
  }
  if (angleB - angleA > Math.PI) {
    angleA += Math.PI * 2;
  }

  const angleLow = Math.min(angleA, angleB);
  const angleHigh = Math.max(angleA, angleB);

  let angleP = Math.atan2(p.y - adjustedCenter.y, p.x - adjustedCenter.x);
  if (angleP < angleLow) {
    angleP += Math.PI * 2;
  }
  if (angleP < angleLow) {
    angleP += Math.PI * 2;
  }

  if (angleP >= angleLow - EPS && angleP <= angleHigh + EPS) {
    // Compute the distance to the complete circle.
    return Math.abs(radius - distanceBetweenPoints(p, adjustedCenter));
  }

  // It's closest to one of the two endpoints.
  return Math.min(distanceBetweenPoints(p, a), distanceBetweenPoints(p, b));
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

/**
 * Returns the point that occurs on both of the provided (infinite) lines.
 * If either line is degenerate, returns `null`.
 * If the lines are identical or parallel, returns `null`.
 */
export function intersectionBetweenTwoLines(
  line1: { a: XY; b: XY },
  line2: { a: XY; b: XY },
): XY | null {
  if (distanceBetweenPoints(line1.a, line1.b) < EPS) {
    return null;
  }
  if (distanceBetweenPoints(line2.a, line2.b) < EPS) {
    return null;
  }

  const forward1 = pointSubtract(line1.b, line1.a);
  const forward2 = pointSubtract(line2.b, line2.a);

  const right1 = { x: -forward1.y, y: forward1.x };

  // A point `p` lies on line1 if (p - line1.a) dot right1 == 0.

  if (Math.abs(dotProduct(forward2, right1)) < EPS) {
    return null;
  }

  // We want to find the parameter t such that:
  // (line2.a + t * forward2 - line1.a) dot right1 == 0
  // (t * forward2 + line2.a - line1.a) dot right1 == 0
  // t * (forward2 dot right1) + (line2.a - line1.a) dot right1 == 0

  const t =
    dotProduct(pointSubtract(line1.a, line2.a), right1) /
    dotProduct(forward2, right1);

  if (!isFinite(t)) {
    return null;
  }
  return pointAdd(line2.a, pointScale(forward2, t));
}

export function intersectionBetweenTwoLineSegments(
  line1: { a: XY; b: XY },
  line2: { a: XY; b: XY },
): XY | null {
  const hit = intersectionBetweenTwoLines(line1, line2);
  if (hit === null) {
    return null;
  }
  // if it's very close to an endpoint, return that
  for (const p of [line1.a, line1.b, line2.a, line2.b]) {
    if (distanceBetweenPoints(p, hit) < EPS) {
      return p;
    }
  }

  if (distanceBetweenPoints(line1.a, line1.b) < EPS) {
    // This line is degenerate, so the point cannot be elsewhere.
    return null;
  }

  const delta1 = pointSubtract(hit, line1.a);
  const delta2 = pointSubtract(line1.b, hit);
  const properDelta = pointSubtract(line1.b, line1.a);

  if (dotProduct(delta1, properDelta) < 0) {
    return null;
  }
  if (dotProduct(delta2, properDelta) < 0) {
    return null;
  }

  return hit;
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
