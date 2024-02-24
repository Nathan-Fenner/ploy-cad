/* eslint-disable @typescript-eslint/no-explicit-any */
import { distanceBetweenPoints, pointAdd } from "../geometry/vector";
import { ID } from "../id";
import {
  PointID,
  SketchState,
  XY,
  isConstraintFixedID,
} from "../state/AppState";
import { FactDatabase } from "./database";

type GeomFact = GeomFactFixed | GeomFactVertical | GeomFactDistance;
type GeomFactFixed = {
  INDEX_IGNORE: "position"; // Ensures that there cannot be multiple facts for the same point.

  geom: "fixed";
  point: PointID;
  position: XY;
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
        for (const { distance } of database.getFacts({
          geom: "distance",
          point1: fixedPoint,
          point2: p,
        })) {
          const originalLocation = originalLocations.get(p)!;
          const candidate1 = pointAdd(fixedPosition, { x: 0, y: -distance });
          const candidate2 = pointAdd(fixedPosition, { x: 0, y: distance });
          if (
            distanceBetweenPoints(originalLocation, candidate1) <
            distanceBetweenPoints(originalLocation, candidate2)
          ) {
            database.addFact({
              geom: "fixed",
              INDEX_IGNORE: "position",
              point: p,
              position: candidate1,
            });
          } else {
            database.addFact({
              geom: "fixed",
              INDEX_IGNORE: "position",
              point: p,
              position: candidate2,
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
