import {
  AppState,
  ConstraintDistanceID,
  ConstraintFixedID,
  ConstraintVerticalID,
  LineID,
  PointID,
  SketchElementID,
  View,
  computeConstraintDistanceParameters,
  getElement,
  getPointPosition,
  isConstraintDistanceID,
  isConstraintFixedID,
  isConstraintVerticalID,
  isLineID,
  isPointID,
} from "./AppState";
import {
  distance,
  distancePointToLineSegment,
  pointAdd,
} from "../geometry/vector";
import { ID } from "../id";
import { SketchToolState } from "./ToolState";
import { applyConstraint } from "../solver/constrain";

export type AppAction =
  | AppActionUndo
  | AppActionPushToUndoStack
  | AppActionChangeView
  | AppActionBeginPanning
  | AppActionStopPanning
  | AppActionChangeTool
  | AppActionInterfaceClick
  | AppActionInterfaceClickRelease
  | AppActionInterfaceMouseMove
  | AppActionInterfaceKeyDown
  | AppActionSketchCreatePoint
  | AppActionSketchCreateLine
  | AppActionSketchCreateFixedConstraint
  | AppActionSketchCreateConstraintVertical
  | AppActionSketchCreateConstraintDistance
  | AppActionSketchMovePoint
  | AppActionSketchDelete;

applyConstraint;

export type AppActionUndo = {
  action: "UNDO";
};

export type AppActionPushToUndoStack = {
  action: "PUSH_TO_UNDO_STACK";
  debugName: string;
  key: null | string;
};

export type AppActionChangeTool = {
  action: "STATE_CHANGE_TOOL";
  newTool: SketchToolState;
};

export type AppActionChangeView = {
  action: "CHANGE_VIEW";
  newView: View;
};

export type AppActionBeginPanning = {
  action: "BEGIN_PANNING";
};
export type AppActionStopPanning = {
  action: "STOP_PANNING";
};

export type XY = { readonly x: number; readonly y: number };

export type AppActionInterfaceClick = {
  action: "INTERFACE_CLICK";
  at: XY;
  shiftKey: boolean;
};
export type AppActionInterfaceClickRelease = {
  action: "INTERFACE_CLICK_RELEASE";
  at: XY;
  shiftKey: boolean;
};
export type AppActionInterfaceMouseMove = {
  action: "INTERFACE_MOUSE_MOVE";
  position: XY;
  delta: XY;
};
export type AppActionInterfaceKeyDown = {
  action: "INTERFACE_KEYDOWN";
  key: string;
  ctrlKey: boolean;
};

export type AppActionSketchCreatePoint = {
  action: "SKETCH_CREATE_POINT";
  id: PointID;
  at: XY;
};

export type AppActionSketchCreateLine = {
  action: "SKETCH_CREATE_LINE";
  id: LineID;
  endpointA: PointID;
  endpointB: PointID;
};

export type AppActionSketchCreateFixedConstraint = {
  action: "SKETCH_CREATE_FIXED_CONSTRAINT";
  id: ConstraintFixedID;
  point: PointID;
  position: XY;
};

export type AppActionSketchCreateConstraintVertical = {
  action: "SKETCH_CREATE_CONSTRAINT_VERTICAL";
  id: ConstraintVerticalID;
  pointA: PointID;
  pointB: PointID;
};

export type AppActionSketchCreateConstraintDistance = {
  action: "SKETCH_CREATE_CONSTRAINT_DISTANCE";
  id: ConstraintDistanceID;
  pointA: PointID;
  pointB: PointID;
  offset: number;
  t: number;
  distance: number;
};

export type AppActionSketchMovePoint = {
  action: "SKETCH_MOVE_POINT";
  point: PointID;
  toPosition: XY;
};

export type AppActionSketchDelete = {
  action: "SKETCH_DELETE";
  toDelete: readonly SketchElementID[];
};

const SELECT_NEAR_THRESHOLD = 0.015;

export function findGeometryNear(
  app: AppState,
  near: XY,
): { id: SketchElementID } | null {
  // TODO: This should be interactive, so that the user can select an alternative point if they want to.

  // (1/2) First, find the closest point, if any.
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;
  let closestPoint: { id: PointID; distance: number } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distance(near, element.position);
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

  // (2/2) Find the closest line segment.
  let closestLine: { id: LineID; distance: number } | null = null;
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
  }
  if (closestLine !== null) {
    return { id: closestLine.id };
  }

  return null;
}

function isPointInAABB({
  point,
  min,
  max,
}: {
  point: XY;
  min: XY;
  max: XY;
}): boolean {
  return (
    point.x >= min.x && point.x <= max.x && point.y >= min.y && point.y <= max.y
  );
}

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

/**
 * Returns all geometry which is fully contained within the provided box.
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
  for (const element of app.sketch.sketchElements) {
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
      // TODO: Otherwise, check whether it crosses the box boundary
    }
  }
  return inside;
}

export function findPointNear(
  app: AppState,
  near: XY,
): { id: PointID | null; position: XY; created: boolean } {
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;

  // TODO: This should be interactive, so that the user can select an alternative point if they want to.
  let closest: { id: PointID; distance: number; position: XY } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distance(near, element.position);
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

export function findOrCreatePointNear(
  app: AppState,
  near: XY,
): { app: AppState; id: PointID; position: XY; created: boolean } {
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;

  // TODO: This should be interactive, so that the user can select an alternative point if they want to.
  let closest: { id: PointID; distance: number; position: XY } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distance(near, element.position);
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
    return { app, id: closest.id, position: closest.position, created: false };
  }

  const id = new PointID(ID.uniqueID());
  return {
    app: applyAppAction(app, {
      action: "SKETCH_CREATE_POINT",
      at: near,
      id,
    }),
    id,
    position: near,
    created: true,
  };
}

export function applyAppAction(
  app: AppState,
  ...actions: AppAction[]
): AppState {
  for (const action of actions) {
    app = applyAppActionImplementation(app, action);
  }
  return app;
}

export function applyAppActionImplementation(
  app: AppState,
  action: AppAction,
): AppState {
  switch (action.action) {
    case "UNDO": {
      if (app.undoState.undoStack.length > 0) {
        const lastEntry =
          app.undoState.undoStack[app.undoState.undoStack.length - 1];
        return {
          controls: {
            panning: app.controls.panning,
            activeSketchTool: { sketchTool: "TOOL_NONE" },
          },
          view: lastEntry.state.view,
          sketch: lastEntry.state.sketch,
          undoState: {
            undoStack: app.undoState.undoStack.slice(
              0,
              app.undoState.undoStack.length - 1,
            ),
          },
        };
      }
      return app;
    }
    case "PUSH_TO_UNDO_STACK": {
      if (
        action.key !== null &&
        app.undoState.undoStack.length > 0 &&
        app.undoState.undoStack[app.undoState.undoStack.length - 1].key ===
          action.key
      ) {
        // Since this action already had an original state recorded, we don't need to
        // write a new one.
        return app;
      }

      return {
        ...app,
        undoState: {
          undoStack: [
            ...app.undoState.undoStack,
            { state: app, key: action.key },
          ],
        },
      };
    }
    case "CHANGE_VIEW":
      return {
        ...app,
        view: action.newView,
      };
    case "BEGIN_PANNING":
      if (app.controls.panning) {
        return app;
      }
      return {
        ...app,
        controls: {
          ...app.controls,
          panning: true,
        },
      };
    case "STOP_PANNING":
      if (!app.controls.panning) {
        return app;
      }
      return {
        ...app,
        controls: {
          ...app.controls,
          panning: false,
        },
      };
    case "STATE_CHANGE_TOOL": {
      return {
        ...app,
        controls: {
          ...app.controls,
          activeSketchTool: action.newTool,
        },
      };
    }
    case "INTERFACE_CLICK": {
      const tool = app.controls.activeSketchTool;
      if (tool.sketchTool === "TOOL_CREATE_POINT") {
        // Create a new point.
        const id = ID.uniqueID();
        return applyAppAction(app, {
          action: "SKETCH_CREATE_POINT",
          id: new PointID(id),
          at: action.at,
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_LINE") {
        // Find or create a point near the mouse.
        const { app: newApp, id } = findOrCreatePointNear(app, action.at);
        app = newApp;
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_LINE_FROM_POINT", fromPoint: id },
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_LINE_FROM_POINT") {
        const fromPoint = tool.fromPoint;
        const { app: newApp, id: toPoint } = findOrCreatePointNear(
          app,
          action.at,
        );
        app = newApp;
        return applyAppAction(
          app,
          {
            action: "SKETCH_CREATE_LINE",
            id: new LineID(ID.uniqueID()),
            endpointA: fromPoint,
            endpointB: toPoint,
          },
          {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" },
          },
        );
      }
      if (tool.sketchTool === "TOOL_CREATE_DISTANCE_CONSTRAINT") {
        const pointA = getPointPosition(app, tool.pointA);
        const pointB = getPointPosition(app, tool.pointB);
        const { offset, t } = computeConstraintDistanceParameters({
          a: pointA,
          b: pointB,
          labelPosition: action.at,
        });
        return applyAppAction(
          app,
          {
            action: "SKETCH_CREATE_CONSTRAINT_DISTANCE",
            id: new ConstraintDistanceID(ID.uniqueID()),
            pointA: tool.pointA,
            pointB: tool.pointB,
            t,
            offset,
            distance: distance(pointA, pointB),
          },
          {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" }, // TODO: Edit the newly-created dimension
          },
        );
      }
      if (
        tool.sketchTool === "TOOL_NONE" ||
        tool.sketchTool === "TOOL_SELECT"
      ) {
        // If we clicked near a point, select it.
        const nearbyGeometry = findGeometryNear(app, action.at);

        if (action.shiftKey && nearbyGeometry !== null) {
          // Select the new geometry, in addition to anything currently selected.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: null,
              selected: new Set([
                ...(tool.sketchTool === "TOOL_SELECT" ? tool.selected : []),
                nearbyGeometry.id,
              ]),
            },
          });
        }

        if (nearbyGeometry === null) {
          // Nothing to select at the click site -- allow the user to select a box.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: action.at,
              selected:
                tool.sketchTool === "TOOL_SELECT" ? tool.selected : new Set(),
            },
          });
        } else if (isPointID(nearbyGeometry.id)) {
          // The user clicked on a point -- allow them to move it.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_DRAG_POINT",
              point: nearbyGeometry.id,
            },
          });
        } else {
          // The user clicked on other geometry -- select it.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: null,
              selected: new Set([nearbyGeometry.id]),
            },
          });
        }
      }
      return app;
    }
    case "INTERFACE_CLICK_RELEASE": {
      const existingSelection =
        app.controls.activeSketchTool.sketchTool === "TOOL_SELECT"
          ? app.controls.activeSketchTool.selected
          : [];
      if (
        app.controls.activeSketchTool.sketchTool === "TOOL_SELECT" &&
        app.controls.activeSketchTool.boxCorner !== null
      ) {
        // Select whatever is in the box.
        const withinBox = (
          action.at.x < app.controls.activeSketchTool.boxCorner.x
            ? findAllGeometryPartiallyWithinBox
            : findAllGeometryFullyWithinBox
        )(app, action.at, app.controls.activeSketchTool.boxCorner);
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_SELECT",
            boxCorner: null,
            selected: new Set(
              action.shiftKey
                ? [...existingSelection, ...withinBox]
                : withinBox,
            ),
          },
        });
      }
      if (app.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_SELECT",
            selected: new Set([app.controls.activeSketchTool.point]),
            boxCorner: null,
          },
        });
      }
      return app;
    }
    case "INTERFACE_MOUSE_MOVE": {
      if (app.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
        // Drag the point.
        const currentPosition = getPointPosition(
          app,
          app.controls.activeSketchTool.point,
        );
        const targetPosition = pointAdd(currentPosition, action.delta);
        return applyAppAction(app, {
          action: "SKETCH_MOVE_POINT",
          point: app.controls.activeSketchTool.point,
          toPosition: targetPosition,
        });
      }
      return app;
    }
    case "INTERFACE_KEYDOWN": {
      if (action.ctrlKey && action.key === "z") {
        return applyAppAction(app, {
          action: "UNDO",
        });
      }
      if (action.key === "Escape") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_NONE" },
        });
      }
      if (action.key === "p") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_POINT" },
        });
      }
      if (action.key === "l") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_LINE" },
        });
      }
      if (action.key === "Delete") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          return applyAppAction(
            app,
            {
              action: "STATE_CHANGE_TOOL",
              newTool: { sketchTool: "TOOL_NONE" },
            },
            {
              action: "SKETCH_DELETE",
              toDelete: [...app.controls.activeSketchTool.selected],
            },
          );
        }
      }
      if (action.key === "f") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [...app.controls.activeSketchTool.selected].filter(
            isPointID,
          );
          return applyAppAction(
            app,
            ...points.map(
              (point): AppAction => ({
                action: "SKETCH_CREATE_FIXED_CONSTRAINT",
                id: new ConstraintFixedID(ID.uniqueID()),
                point,
                position: getPointPosition(app, point),
              }),
            ),
          );
        }
      }
      if (action.key === "v") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [
            ...new Set(
              [...app.controls.activeSketchTool.selected].flatMap((element) => {
                if (isPointID(element)) {
                  return [element];
                }
                if (isLineID(element)) {
                  return [
                    getElement(app, element).endpointA,
                    getElement(app, element).endpointB,
                  ];
                }
                return [];
              }),
            ),
          ];
          if (points.length === 2) {
            const id = new ConstraintVerticalID(ID.uniqueID());
            return applyAppAction(app, {
              action: "SKETCH_CREATE_CONSTRAINT_VERTICAL",
              id,
              pointA: points[0],
              pointB: points[1],
            });
          }
        }
      }
      if (action.key === "d") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [
            ...new Set(
              [...app.controls.activeSketchTool.selected].flatMap((element) => {
                if (isPointID(element)) {
                  return [element];
                }
                if (isLineID(element)) {
                  return [
                    getElement(app, element).endpointA,
                    getElement(app, element).endpointB,
                  ];
                }
                return [];
              }),
            ),
          ];
          if (points.length === 2) {
            return applyAppAction(app, {
              action: "STATE_CHANGE_TOOL",
              newTool: {
                sketchTool: "TOOL_CREATE_DISTANCE_CONSTRAINT",
                pointA: points[0],
                pointB: points[1],
              },
            });
          }
        }
      }
      return app;
    }
    case "SKETCH_CREATE_POINT": {
      // TODO: Verify that this ID does not already exist in the sketch.
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create point",
      });
      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementPoint",
              id: action.id,
              position: action.at,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_LINE": {
      // TODO: Verify that `endpointA` and `endpointB` already exist, and that `id` does not.
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create line",
      });
      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementLine",
              id: action.id,
              endpointA: action.endpointA,
              endpointB: action.endpointB,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_FIXED_CONSTRAINT": {
      // TODO: Verify that the point exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "fix point",
      });

      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintFixed",
              id: action.id,
              point: action.point,
              position: action.position,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_VERTICAL": {
      // TODO: Verify that the points exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "fix point",
      });

      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintVertical",
              id: action.id,
              pointA: action.pointA,
              pointB: action.pointB,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_DISTANCE": {
      // TODO: Verify that the points exist
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create distance dimension",
      });
      return applyAppAction({
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintDistance",
              id: action.id,
              pointA: action.pointA,
              pointB: action.pointB,
              distance: action.distance,
              cosmetic: {
                t: action.t,
                offset: action.offset,
              },
            },
          ],
        },
      });
    }
    case "SKETCH_MOVE_POINT": {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: `move-point-${action.point}`,
        debugName: "move point",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: app.sketch.sketchElements.map((sketchElement) => {
            if (
              sketchElement.sketchElement === "SketchElementPoint" &&
              sketchElement.id === action.point
            ) {
              return {
                ...sketchElement,
                position: action.toPosition,
              };
            } else {
              return sketchElement;
            }
          }),
        }).updated,
      };
    }
    case "SKETCH_DELETE": {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "delete",
      });
      const toDelete = new Set(action.toDelete);

      const isDeleted = (id: SketchElementID): boolean => {
        if (toDelete.has(id)) {
          return true;
        }
        if (isLineID(id)) {
          for (const endpoint of [
            getElement(app, id).endpointA,
            getElement(app, id).endpointB,
          ]) {
            if (isDeleted(endpoint)) {
              return true;
            }
          }
        }
        if (isConstraintFixedID(id)) {
          return isDeleted(getElement(app, id).point);
        }
        if (isConstraintVerticalID(id)) {
          return (
            isDeleted(getElement(app, id).pointA) ||
            isDeleted(getElement(app, id).pointB)
          );
        }
        if (isConstraintDistanceID(id)) {
          return (
            isDeleted(getElement(app, id).pointA) ||
            isDeleted(getElement(app, id).pointB)
          );
        }
        return false;
      };

      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: app.sketch.sketchElements.filter((sketchElement) => {
            return !isDeleted(sketchElement.id);
          }),
        },
      };
    }
  }
  assertUnreachable(action, "unhandled action " + JSON.stringify(action));
}

/**
 * This
 */
function assertUnreachable(
  _x: never,
  message: string = "expected unreachable",
): never {
  throw new Error(message);
}
