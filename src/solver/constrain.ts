/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EPS,
  distanceBetweenPoints,
  intersectionBetweenLineAndCircle,
  intersectionBetweenTwoCircles,
  pointAdd,
} from "../geometry/vector";
import { PointID, SketchState, XY } from "../state/AppState";
import { FactDatabase } from "./database";

type GeomFact =
  | GeomFactFixed
  | GeomFactOnLine
  | GeomFactOnCircle
  | GeomFactVertical
  | GeomFactDistance;
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
type GeomFactDistance = {
  geom: "distance";
  INDEX_IGNORE: "distance";

  point1: PointID;
  point2: PointID;
  distance: number;
};

export function applyConstraint(sketch: SketchState): {
  updated: SketchState;
  fixedPositions: ReadonlyMap<PointID, XY>;
} {
  const database = new FactDatabase<GeomFact>();

  const originalLocations = new Map<PointID, XY>();

  // Fill the database using the sketch constraints.
  for (const element of sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      originalLocations.set(element.id, element.position);
    }
    if (element.sketchElement === "SketchElementConstraintFixed") {
      database.addFact({
        geom: "fixed",
        INDEX_IGNORE: "position",
        point: element.point,
        position: element.position,
      });
    }
    if (element.sketchElement === "SketchElementConstraintVertical") {
      database.addFact({
        geom: "vertical",
        point1: element.pointA,
        point2: element.pointB,
      });
      database.addFact({
        geom: "vertical",
        point1: element.pointB,
        point2: element.pointA,
      });
    }
    if (element.sketchElement === "SketchElementConstraintDistance") {
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
  }

  // Infer new constraints
  for (let iter = 0; iter < 10; iter++) {
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
    updated: {
      sketchElements: sketch.sketchElements.map((element) => {
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
    },
    fixedPositions,
  };
}
