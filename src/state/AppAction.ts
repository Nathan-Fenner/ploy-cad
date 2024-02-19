import {
  AppState,
  LineID,
  PointID,
  SketchElementID,
  SketchToolState,
  View,
} from "./AppState";
import { distance } from "../geometry/vector";
import { ID } from "../id";

export type AppAction =
  | AppActionChangeView
  | AppActionBeginPanning
  | AppActionStopPanning
  | AppActionChangeTool
  | AppActionInterfaceClick
  | AppActionInterfaceClickRelease
  | AppActionInterfaceKeyDown
  | AppActionSketchCreatePoint
  | AppActionSketchCreateLine;

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
};
export type AppActionInterfaceClickRelease = {
  action: "INTERFACE_CLICK_RELEASE";
  at: XY;
};
export type AppActionInterfaceKeyDown = {
  action: "INTERFACE_KEYDOWN";
  key: string;
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

const SELECT_NEAR_THRESHOLD = 0.015;

export function findGeometryNear(
  app: AppState,
  near: XY,
): { id: SketchElementID } | null {
  // TODO: This should be interactive, so that the user can select an alternative point if they want to.
  const MAX_NEAR_DISTANCE = app.view.size * SELECT_NEAR_THRESHOLD;
  let closest: { id: PointID; distance: number } | null = null;
  for (const element of app.sketch.sketchElements) {
    if (element.sketchElement === "SketchElementPoint") {
      const distanceToPoint = distance(near, element.position);
      if (distanceToPoint > MAX_NEAR_DISTANCE) {
        continue;
      }
      if (closest === null || closest.distance > distanceToPoint) {
        closest = { id: element.id, distance: distanceToPoint };
      }
    }
  }
  if (closest !== null) {
    return { id: closest.id };
  }

  // TODO: Find the closest line segment.

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
    app: applyAppAction(app, { action: "SKETCH_CREATE_POINT", at: near, id }),
    id,
    position: near,
    created: true,
  };
}

export function applyAppActions(
  app: AppState,
  ...actions: AppAction[]
): AppState {
  for (const action of actions) {
    app = applyAppAction(app, action);
  }
  return app;
}

export function applyAppAction(app: AppState, action: AppAction): AppState {
  switch (action.action) {
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
        return applyAppActions(
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
      if (
        tool.sketchTool === "TOOL_NONE" ||
        tool.sketchTool === "TOOL_SELECT"
      ) {
        // If we clicked near a point, select it.
        const nearbyPoint = findOrCreatePointNear(app, action.at);
        // TODO: Select other geometry types too
        if (nearbyPoint.created) {
          // Nothing to select.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: action.at,
              selected:
                tool.sketchTool === "TOOL_SELECT" ? tool.selected : new Set(),
            },
          });
        } else {
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              selected: new Set([nearbyPoint.id]),
              boxCorner: null,
            },
          });
        }
      }
      return app;
    }
    case "INTERFACE_CLICK_RELEASE": {
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
            selected: new Set(withinBox),
          },
        });
      }
      return app;
    }
    case "INTERFACE_KEYDOWN": {
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
      return app;
    }
    case "SKETCH_CREATE_POINT": {
      // TODO: Verify that this ID does not already exist in the sketch.
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
