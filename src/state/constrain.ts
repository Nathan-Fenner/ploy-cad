/* eslint-disable @typescript-eslint/no-explicit-any */
import { pointAdd } from "../geometry/vector";
import { ID } from "../id";
import { PointID, SketchState, XY } from "./AppState";

function serialize(x: object): string {
  return JSON.stringify(x, (_, value) => {
    if (value instanceof ID) {
      return `${value.constructor.name} ${value}`;
    }
    return value;
  });
}

type LocalConstraint = LocalFixed | LocalVertical | LocalDistance;
type LocalFixed = {
  constraintType: "LocalFixed";
  point: PointID;
  position: XY;
};

type LocalVertical = {
  constraintType: "LocalVertical";
  pointA: PointID;
  pointB: PointID;
};

type LocalDistance = {
  constraintType: "LocalDistance";
  pointA: PointID;
  pointB: PointID;
  distance: number;
};

type RelativeConstraint = RelativeVertical | RelativeDistance;

type RelativeVertical = {
  relativeType: "RelativeVertical";
  point: PointID;
};
type RelativeDistance = {
  relativeType: "RelativeDistance";
  point: PointID;
  distance: number;
};

export function applyConstraint(sketch: SketchState): {
  updated: SketchState;
  fixedPositions: ReadonlyMap<PointID, XY>;
} {
  // We track a set of constraints.
  // Each constraint is relevant to some set of points.

  // TODO: Make this more efficient.

  const localConstraintsMap = new Map<string, LocalConstraint>();
  const localConstraintsList: LocalConstraint[] = [];

  const addConstraint = (constraint: LocalConstraint): void => {
    const serializedConstraint = serialize(constraint);
    if (localConstraintsMap.has(serializedConstraint)) {
      return;
    }
    localConstraintsMap.set(serializedConstraint, constraint);
    localConstraintsList.push(constraint);
  };

  // Add all of the constraints to the local set.
  // Track the initial positions of all points.
  const currentPosition = new Map<PointID, XY>();
  const fixedPositions = new Map<PointID, XY>();
  const fixPoint = (point: PointID, at: XY): void => {
    if (fixedPositions.has(point)) {
      return;
    }
    fixedPositions.set(point, at);
    currentPosition.set(point, at);
  };

  for (const element of sketch.sketchElements) {
    if (element.sketchElement === "SketchElementConstraintFixed") {
      addConstraint({
        constraintType: "LocalFixed",
        point: element.point,
        position: element.position,
      });
    }
    if (element.sketchElement === "SketchElementConstraintVertical") {
      addConstraint({
        constraintType: "LocalVertical",
        pointA: element.pointA,
        pointB: element.pointB,
      });
    }
    if (element.sketchElement === "SketchElementConstraintDistance") {
      addConstraint({
        constraintType: "LocalDistance",
        pointA: element.pointA,
        pointB: element.pointB,
        distance: element.distance,
      });
    }
    if (element.sketchElement === "SketchElementPoint") {
      currentPosition.set(element.id, element.position);
    }
  }

  const MAX_PASSES = 100;

  for (let passNumber = 0; passNumber < MAX_PASSES; passNumber++) {
    const originalConstraintCount = localConstraintsList.length;
    const originalFixedCount = fixedPositions.size;

    // Learn constraints!
    const relativeConstraints = new Map<PointID, RelativeConstraint[]>();
    const addRelativeConstraint = (p: PointID, c: RelativeConstraint): void => {
      if (!relativeConstraints.has(p)) {
        relativeConstraints.set(p, []);
      }
      relativeConstraints.get(p)!.push(c);
    };

    // Convert all of the constraints into constraints relative to a single point.
    for (const c of localConstraintsList) {
      if (c.constraintType === "LocalFixed") {
        fixPoint(c.point, c.position);
      }
      if (c.constraintType === "LocalDistance") {
        for (const [a, b] of [
          [c.pointA, c.pointB],
          [c.pointB, c.pointA],
        ]) {
          addRelativeConstraint(a, {
            relativeType: "RelativeDistance",
            point: b,
            distance: c.distance,
          });
        }
      }
      if (c.constraintType === "LocalVertical") {
        for (const [a, b] of [
          [c.pointA, c.pointB],
          [c.pointB, c.pointA],
        ]) {
          addRelativeConstraint(a, {
            relativeType: "RelativeVertical",
            point: b,
          });
        }
      }
    }

    // Traverse the constraints for each point, to see if it can be placed.
    for (const [point, constraints] of relativeConstraints) {
      if (fixedPositions.has(point)) {
        // This point is already placed, and does not need additional search.
        continue;
      }
      for (const c1 of constraints) {
        if (
          c1.relativeType === "RelativeVertical" &&
          fixedPositions.has(c1.point)
        ) {
          // `point` is vertical relative to this other point!
          // Hence, it must lie on this particular vertical line.
          // TODO: Treat this more efficiently and less ad-hoc.
          for (const c2 of constraints) {
            if (
              c2.relativeType === "RelativeDistance" &&
              c2.point === c1.point
            ) {
              const q = fixedPositions.get(c1.point)!;
              if (q.y < currentPosition.get(point)!.y) {
                fixPoint(point, pointAdd(q, { x: 0, y: c2.distance }));
              } else {
                fixPoint(point, pointAdd(q, { x: 0, y: -c2.distance }));
              }
            }
          }
        }
      }
    }

    if (
      localConstraintsList.length === originalConstraintCount &&
      fixedPositions.size === originalFixedCount
    ) {
      // No new constraints were learned.
      break;
    }
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
