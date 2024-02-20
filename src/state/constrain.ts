/* eslint-disable @typescript-eslint/no-explicit-any */
import { ID } from "../id";
import { PointID, SketchState, XY } from "./AppState";

function serialize(x: object): string {
  return JSON.stringify(x, (_, value) => {
    if (value instanceof ID) {
      return `${value.constructor.name} ${value}`;
    }
    return undefined;
  });
}

type LocalFixed = {
  constraintType: "LocalFixed";
  point: PointID;
  position: XY;
};

type LocalConstraint = LocalFixed;

export function applyConstraint(sketch: SketchState): SketchState {
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
    if (element.sketchElement === "SketchElementPoint") {
      currentPosition.set(element.id, element.position);
    }
  }

  const MAX_PASSES = 100;

  for (let passNumber = 0; passNumber < MAX_PASSES; passNumber++) {
    const originalConstraintCount = localConstraintsList.length;

    // Learn constraints!
    for (const c of localConstraintsList) {
      if (c.constraintType === "LocalFixed") {
        fixPoint(c.point, c.position);
      }
    }

    if (localConstraintsList.length === originalConstraintCount) {
      // No new constraints were learned.
      break;
    }
  }

  return {
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
  };
}
