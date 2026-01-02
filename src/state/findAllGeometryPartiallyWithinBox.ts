import {
  intersectionBetweenTwoLines,
  distancePointToLineSegment,
  EPS,
} from "../geometry/vector";
import { XY, isPointInAABB } from "./AppAction";
import { AppState, SketchElementID, PointID } from "./AppState";

/**
 * Returns all geometry which is partially contained within the provided box.
 */

export function findAllGeometryPartiallyWithinBox(
  app: AppState,
  cornerA: XY,
  cornerB: XY,
): SketchElementID[] {
  const min = {
    x: Math.min(cornerA.x, cornerB.x),
    y: Math.min(cornerA.y, cornerB.y),
  };
  const max = {
    x: Math.max(cornerA.x, cornerB.x),
    y: Math.max(cornerA.y, cornerB.y),
  };
  const inside: SketchElementID[] = [];
  const pointPositions = new Map<PointID, XY>();
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      pointPositions.set(element.id, element.position);
      if (isPointInAABB({ point: element.position, min, max })) {
        inside.push(element.id);
      }
    }
  }
  elementLoop: for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementLine") {
      const positionA = pointPositions.get(element.endpointA);
      const positionB = pointPositions.get(element.endpointB);
      if (positionA === undefined || positionB === undefined) {
        continue;
      }
      if (
        isPointInAABB({ point: positionA, min, max }) ||
        isPointInAABB({ point: positionB, min, max })
      ) {
        inside.push(element.id);
        continue;
      }

      const corners = [
        min,
        { x: min.x, y: max.y },
        max,
        { x: max.x, y: min.y },
      ];
      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        const intersection = intersectionBetweenTwoLines(
          { a: positionA, b: positionB },
          { a, b },
        );
        if (intersection === null) {
          // The intersection does not exist.
          continue;
        }
        if (
          distancePointToLineSegment(intersection, {
            a: positionA,
            b: positionB,
          }) > EPS
        ) {
          // The intersection is outside of the segment.
          continue;
        }
        if (isPointInAABB({ point: intersection, min, max, slack: EPS })) {
          inside.push(element.id);
          continue elementLoop;
        }
      }
    }
  }
  return inside;
}
