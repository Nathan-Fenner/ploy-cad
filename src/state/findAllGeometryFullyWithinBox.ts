import { XY, isPointInAABB } from "./AppAction";
import { AppState, SketchElementID, PointID } from "./AppState";

/**
 * Returns all geometry which is fully contained within the provided box.
 */

export function findAllGeometryFullyWithinBox(
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
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementLine") {
      const positionA = pointPositions.get(element.endpointA);
      const positionB = pointPositions.get(element.endpointB);
      if (
        positionA !== undefined &&
        positionB !== undefined &&
        isPointInAABB({ point: positionA, min, max }) &&
        isPointInAABB({ point: positionB, min, max })
      ) {
        inside.push(element.id);
      }
    }
  }

  return inside;
}
