/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EPS,
  distanceBetweenPoints,
  intersectionBetweenLineAndCircle,
  intersectionBetweenTwoCircles,
  intersectionBetweenTwoLines,
  midpointBetweenPoints,
  pointAdd,
  pointNormalize,
  pointScale,
  pointSubtract,
} from "../geometry/vector";
import { PointID, SketchState, XY, getSketchElement } from "../state/AppState";
import { FactDatabase } from "./database";

type GeomFact =
  | GeomFactFixed
  | GeomFactOnLine
  | GeomFactEquidistant
  | GeomFactOnCircle
  | GeomFactVertical
  | GeomFactHorizontal
  | GeomFactDistance
  | GeomFactPointLineDistance
  | GeomFactCollinear;
type GeomFactFixed = {
  INDEX_IGNORE: "position"; // Ensures that there cannot be multiple facts for the same point.

  geom: "fixed";
  point: PointID;
  position: XY;
};
type GeomFactOnLine = {
  geom: "line";
  point: PointID;
  a: XY;
  b: XY;
};
type GeomFactEquidistant = {
  geom: "equidistant";
  center: PointID;
  point1: PointID;
  point2: PointID;
};
type GeomFactOnCircle = {
  geom: "circle";
  point: PointID;
  center: XY;
  radius: number;
};
type GeomFactVertical = {
  geom: "vertical";
  point1: PointID;
  point2: PointID;
};
type GeomFactHorizontal = {
  geom: "horizontal";
  point1: PointID;
  point2: PointID;
};
type GeomFactDistance = {
  geom: "distance";
  INDEX_IGNORE: "distance";

  point1: PointID;
  point2: PointID;
  distance: number;
};

type GeomFactPointLineDistance = {
  geom: "point-line-distance";
  INDEX_IGNORE: "distance";
  point: PointID;
  line1: PointID;
  line2: PointID;
  distance: number;
};

type GeomFactCollinear = {
  geom: "collinear";
  points: readonly PointID[];
};

export function applyConstraint(sketch: SketchState): {
  updated: SketchState;
  fixedPositions: ReadonlyMap<PointID, XY>;
} {
  const database = new FactDatabase<GeomFact>({
    determinesIDs: (f) => {
      if (f.geom === "fixed") {
        return [f.point];
      }
      return [];
    },
  });

  const originalLocations = new Map<PointID, XY>();

  /**
   * If the distance between two points is constrained, return it.
   * Otherwise, return null.
   */
  const getKnownDistance = (a: PointID, b: PointID): number | null => {
    if (a === b) {
      return 0;
    }
    const fixedA = database.getFacts({ geom: "fixed", point: a });
    const fixedB = database.getFacts({ geom: "fixed", point: b });
    if (fixedA.length > 0 && fixedB.length > 0) {
      return distanceBetweenPoints(fixedA[0].position, fixedB[0].position);
    }
    const d12 = database.getFacts({ geom: "distance", point1: a, point2: b });
    if (d12.length > 0) {
      return d12[0].distance;
    }
    const d21 = database.getFacts({ geom: "distance", point1: b, point2: a });
    if (d21.length > 0) {
      return d21[0].distance;
    }
    return null;
  };

  // Fill the database using the sketch constraints.
  for (const element of sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      originalLocations.set(element.id, element.position);
    }
    if (element.sketchElement === "SketchElementArc") {
      database.addFact({
        geom: "equidistant",
        center: element.center,
        point1: element.endpointA,
        point2: element.endpointB,
      });
    }
    if (element.sketchElement === "SketchElementConstraintFixed") {
      database.addFact({
        geom: "fixed",
        INDEX_IGNORE: "position",
        point: element.point,
        position: element.position,
      });
    }
    if (element.sketchElement === "SketchElementConstraintAxisAligned") {
      database.addFact({
        geom: element.axis,
        point1: element.pointA,
        point2: element.pointB,
      });
      database.addFact({
        geom: element.axis,
        point1: element.pointB,
        point2: element.pointA,
      });
    }
    if (
      element.sketchElement === "SketchElementConstraintPointPointDistance" &&
      !element.measureOnly
    ) {
      for (const [pa, pb] of [
        [element.pointA, element.pointB],
        [element.pointB, element.pointA],
      ]) {
        database.addFact({
          geom: "distance",
          INDEX_IGNORE: "distance",
          point1: pa,
          point2: pb,
          distance: element.distance,
        });
      }
    }
    if (
      element.sketchElement === "SketchElementConstraintPointLineDistance" &&
      !element.measureOnly
    ) {
      const line = getSketchElement(sketch, element.line);
      database.addFact({
        geom: "point-line-distance",
        point: element.point,
        line1: line.endpointA,
        line2: line.endpointB,
        distance: element.distance,
        INDEX_IGNORE: "distance",
      });
      database.addFact({
        geom: "point-line-distance",
        point: element.point,
        line1: line.endpointB,
        line2: line.endpointA,
        distance: -element.distance,
        INDEX_IGNORE: "distance",
      });
    }
    if (element.sketchElement === "SketchElementConstraintPointOnLine") {
      database.addFact({
        geom: "collinear",
        points: [
          element.point,
          getSketchElement(sketch, element.line).endpointA,
          getSketchElement(sketch, element.line).endpointB,
        ].sort((a, b) => a.toString().localeCompare(b.toString())),
      });
    }
    if (element.sketchElement === "SketchElementConstraintPointOnArc") {
      const arcSketch = getSketchElement(sketch, element.arc);
      database.addFact({
        geom: "equidistant",
        point1: arcSketch.endpointA,
        point2: element.point,
        center: arcSketch.center,
      });
    }
  }

  // Infer new constraints
  for (let iter = 0; iter < 50; iter++) {
    const initialFactCount = database.countFacts();

    for (const {
      point: fixedPoint,
      position: fixedPosition,
    } of database.getFacts({ geom: "fixed" })) {
      for (const { point2: p } of database.getFacts({
        geom: "vertical",
        point1: fixedPoint,
      })) {
        database.addFact({
          geom: "line",
          point: p,
          a: fixedPosition,
          b: pointAdd(fixedPosition, { x: 0, y: 100 }),
        });
      }
      for (const { point2: p } of database.getFacts({
        geom: "horizontal",
        point1: fixedPoint,
      })) {
        database.addFact({
          geom: "line",
          point: p,
          a: fixedPosition,
          b: pointAdd(fixedPosition, { x: 100, y: 0 }),
        });
      }
      for (const { point2: p, distance } of database.getFacts({
        geom: "distance",
        point1: fixedPoint,
      })) {
        database.addFact({
          geom: "circle",
          point: p,
          center: fixedPosition,
          radius: distance,
        });
      }
    }

    for (const { point, a: lineA, b: lineB } of database.getFacts({
      geom: "line",
    })) {
      const originalLocation = originalLocations.get(point)!;
      // This point lies on a known line.
      for (const { center, radius } of database.getFacts({
        geom: "circle",
        point,
      })) {
        // This point also lies on a known circle.
        const intersections = intersectionBetweenLineAndCircle(
          { a: lineA, b: lineB },
          { c: center, r: radius },
        );

        let closestIntersection: XY | null = null;
        for (const intersection of intersections) {
          if (
            closestIntersection === null ||
            distanceBetweenPoints(closestIntersection, originalLocation) >
              distanceBetweenPoints(intersection, originalLocation)
          ) {
            closestIntersection = intersection;
          }
        }
        if (closestIntersection !== null) {
          database.addFact({
            geom: "fixed",
            INDEX_IGNORE: "position",
            point,
            position: closestIntersection,
          });
        }
      }
    }

    for (const { point, center: center1, radius: radius1 } of database.getFacts(
      { geom: "circle" },
    )) {
      for (const { center: center2, radius: radius2 } of database.getFacts({
        geom: "circle",
        point,
      })) {
        if (distanceBetweenPoints(center1, center2) > EPS) {
          const originalLocation = originalLocations.get(point)!;

          // Find the intersection of these two circles.
          const intersectionPoints = intersectionBetweenTwoCircles(
            { center: center1, radius: radius1 },
            { center: center2, radius: radius2 },
          );
          let closestIntersection: XY | null = null;
          for (const intersection of intersectionPoints) {
            if (
              closestIntersection === null ||
              distanceBetweenPoints(closestIntersection, originalLocation) >
                distanceBetweenPoints(intersection, originalLocation)
            ) {
              closestIntersection = intersection;
            }
          }
          if (closestIntersection !== null) {
            database.addFact({
              geom: "fixed",
              INDEX_IGNORE: "position",
              point,
              position: closestIntersection,
            });
          }
        }
      }
    }

    for (const { point, a, b } of database.getFacts({ geom: "line" })) {
      for (const { a: a2, b: b2 } of database.getFacts({
        geom: "line",
        point,
      })) {
        const intersection = intersectionBetweenTwoLines(
          { a, b },
          { a: a2, b: b2 },
        );
        if (intersection !== null) {
          database.addFact({
            geom: "fixed",
            INDEX_IGNORE: "position",
            point,
            position: intersection,
          });
        }
      }
    }

    for (const pointLineDistance of database.getFacts({
      geom: "point-line-distance",
    })) {
      const line1 = database.getFacts({
        geom: "fixed",
        point: pointLineDistance.line1,
      });
      const line2 = database.getFacts({
        geom: "fixed",
        point: pointLineDistance.line2,
      });

      if (line1.length > 0 && line2.length > 0) {
        const line1xy = line1[0].position;
        const line2xy = line2[0].position;
        if (distanceBetweenPoints(line1xy, line2xy) > EPS) {
          // It's a signed distance.
          const delta = pointNormalize(pointSubtract(line2xy, line1xy));
          const perpendicular = pointScale(
            { x: -delta.y, y: delta.x },
            pointLineDistance.distance,
          );
          const offset1 = pointAdd(line1xy, perpendicular);
          const offset2 = pointAdd(line2xy, perpendicular);

          database.addFact({
            geom: "line",
            point: pointLineDistance.point,
            a: offset1,
            b: offset2,
          });
        }
      }
    }

    for (const { points } of database.getFacts({ geom: "collinear" })) {
      const fixedOnLine: XY[] = [];
      const addFixed = (p: XY): void => {
        if (fixedOnLine.length >= 2) {
          // The line already has enough points; adding more will just make this slower.
          return;
        }
        if (
          fixedOnLine.some(
            (existing) => distanceBetweenPoints(existing, p) < EPS,
          )
        ) {
          // This point is already in the same location as another on the line.
          return;
        }
        fixedOnLine.push(p);
      };
      // First, check to see if there are 2+ different fixed points already on this line:
      for (const p of points) {
        const fixed = database.getFacts({ geom: "fixed", point: p });
        for (const { position } of fixed) {
          addFixed(position);
        }
      }
      if (fixedOnLine.length >= 2) {
        // There are at least 2 lines, so every point on this line can be fixed on this particular line.
        for (const point of points) {
          database.addFact({
            geom: "line",
            point,
            a: fixedOnLine[0],
            b: fixedOnLine[1],
          });
        }
      }
    }

    for (const equidistant of database.getFacts({ geom: "equidistant" })) {
      const fixed1 = database.getFacts({
        geom: "fixed",
        point: equidistant.point1,
      });
      const fixed2 = database.getFacts({
        geom: "fixed",
        point: equidistant.point2,
      });

      if (
        fixed1.length > 0 &&
        fixed2.length > 0 &&
        distanceBetweenPoints(fixed1[0].position, fixed2[0].position) > EPS
      ) {
        const f1 = fixed1[0].position;
        const f2 = fixed2[0].position;
        const center = midpointBetweenPoints(f1, f2);
        const perp = {
          x: center.x + (f2.y - f1.y),
          y: center.y - (f2.x - f1.x),
        };
        database.addFact({
          geom: "line",
          point: equidistant.center,
          a: center,
          b: perp,
        });
      }
    }

    for (const equidistant of database.getFacts({ geom: "equidistant" })) {
      const r1 = getKnownDistance(equidistant.center, equidistant.point1);
      const r2 = getKnownDistance(equidistant.center, equidistant.point2);

      if (r1 !== null && r2 === null) {
        database.addFact({
          geom: "distance",
          point1: equidistant.center,
          point2: equidistant.point2,
          distance: r1,
          INDEX_IGNORE: "distance",
        });
      }
      if (r1 === null && r2 !== null) {
        database.addFact({
          geom: "distance",
          point1: equidistant.center,
          point2: equidistant.point1,
          distance: r2,
          INDEX_IGNORE: "distance",
        });
      }
    }

    if (database.countFacts() === initialFactCount) {
      // No new facts have been learned.
      break;
    }
  }

  // Extract facts from the database to assign point positions.
  const fixedPositions = new Map<PointID, XY>();
  for (const fixedFact of database.getFacts({ geom: "fixed" })) {
    fixedPositions.set(fixedFact.point, fixedFact.position);
  }

  return {
    updated: sketch.withSketchElements(
      sketch.sketchElements.map((element) => {
        if (
          element.sketchElement === "SketchElementPoint" &&
          fixedPositions.has(element.id)
        ) {
          return {
            ...element,
            position: fixedPositions.get(element.id)!,
          };
        }
        return element;
      }),
    ),
    fixedPositions,
  };
}
