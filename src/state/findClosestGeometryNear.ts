import {
  distanceBetweenPoints,
  pointProjectOntoLine,
  distancePointToLineSegment,
  distancePointToArc,
} from "../geometry/vector";
import { XY, SELECT_NEAR_THRESHOLD } from "./AppAction";
import {
  AppState,
  SketchElementID,
  ConstraintPointPointDistanceID,
  ConstraintPointLineDistanceID,
  computeConstraintDistanceHandlePosition,
  getPointPosition,
  getElement,
  PointID,
  LineID,
  ArcID,
} from "./AppState";

export function findClosestGeometryNear(
  app: AppState,
  near: XY,
): { id: SketchElementID } | null {
  // TODO: This should be interactive, so that the user can select an alternative point if they want to.
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;

  // (1/3) First the closest dimension, if any.
  let closestDimension: {
    id: ConstraintPointPointDistanceID | ConstraintPointLineDistanceID;
    distance: number;
  } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementConstraintPointPointDistance") {
      const elementHandlePosition = computeConstraintDistanceHandlePosition({
        a: getPointPosition(app, element.pointA),
        b: getPointPosition(app, element.pointB),
        t: element.cosmetic.t,
        offset: element.cosmetic.offset,
      });
      const distanceToHandle = distanceBetweenPoints(
        near,
        elementHandlePosition,
      );
      if (distanceToHandle > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (
        closestDimension === null ||
        closestDimension.distance > distanceToHandle
      ) {
        closestDimension = { id: element.id, distance: distanceToHandle };
      }
    }

    if (element.sketchElement === "SketchElementConstraintPointLineDistance") {
      const point = getPointPosition(app, element.point);
      const lineA = getPointPosition(
        app,
        getElement(app, element.line).endpointA,
      );
      const lineB = getPointPosition(
        app,
        getElement(app, element.line).endpointB,
      );

      const projected = pointProjectOntoLine(point, {
        a: lineA,
        b: lineB,
      }).point;

      const elementHandlePosition = computeConstraintDistanceHandlePosition({
        a: point,
        b: projected,
        t: element.cosmetic.t,
        offset: element.cosmetic.offset,
      });
      const distanceToHandle = distanceBetweenPoints(
        near,
        elementHandlePosition,
      );
      if (distanceToHandle > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (
        closestDimension === null ||
        closestDimension.distance > distanceToHandle
      ) {
        closestDimension = { id: element.id, distance: distanceToHandle };
      }
    }
  }
  if (closestDimension !== null) {
    return { id: closestDimension.id };
  }

  // (2/3) Find the closest point, if any.
  let closestPoint: { id: PointID; distance: number } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distanceBetweenPoints(near, element.position);
      if (distanceToPoint > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (closestPoint === null || closestPoint.distance > distanceToPoint) {
        closestPoint = { id: element.id, distance: distanceToPoint };
      }
    }
  }
  if (closestPoint !== null) {
    return { id: closestPoint.id };
  }

  // (3/3) Find the closest line segment.
  let closestLine: { id: LineID | ArcID; distance: number } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementLine") {
      const distanceToLine = distancePointToLineSegment(near, {
        a: getPointPosition(app, element.endpointA),
        b: getPointPosition(app, element.endpointB),
      });
      if (distanceToLine > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (closestLine === null || closestLine.distance > distanceToLine) {
        closestLine = { id: element.id, distance: distanceToLine };
      }
    }
    if (element.sketchElement === "SketchElementArc") {
      const distanceToArc = distancePointToArc(near, {
        a: getPointPosition(app, element.endpointA),
        b: getPointPosition(app, element.endpointB),
        center: getPointPosition(app, element.center),
      });
      if (distanceToArc > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (closestLine === null || closestLine.distance > distanceToArc) {
        closestLine = { id: element.id, distance: distanceToArc };
      }
    }
  }
  if (closestLine !== null) {
    return { id: closestLine.id };
  }

  return null;
}
