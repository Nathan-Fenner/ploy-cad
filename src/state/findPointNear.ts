import { distanceBetweenPoints } from "../geometry/vector";
import { XY, SELECT_NEAR_THRESHOLD } from "./AppAction";
import { AppState, PointID } from "./AppState";

export function findPointNear(
  app: AppState,
  near: XY,
): { id: PointID | null; position: XY; created: boolean } {
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;

  // TODO: This should be interactive, so that the user can select an alternative point if they want to.
  let closest: { id: PointID; distance: number; position: XY } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distanceBetweenPoints(near, element.position);
      if (distanceToPoint > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (closest === null || distanceToPoint < closest.distance) {
        closest = {
          id: element.id,
          distance: distanceToPoint,
          position: element.position,
        };
      }
    }
  }
  if (closest) {
    return { id: closest.id, position: closest.position, created: false };
  }

  return {
    id: null,
    position: near,
    created: true,
  };
}
