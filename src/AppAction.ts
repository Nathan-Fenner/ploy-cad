import { AppState, PointID, View } from "./AppState";
import { ID } from "./id";

export type AppAction =
  | AppActionChangeView
  | AppActionBeginPanning
  | AppActionStopPanning
  | AppActionInterfaceClick
  | AppActionInterfaceKeyDown
  | AppActionSketchCreatePoint;

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
export type AppActionInterfaceKeyDown = {
  action: "INTERFACE_KEYDOWN";
  key: string;
};

export type AppActionSketchCreatePoint = {
  action: "SKETCH_CREATE_POINT";
  id: PointID;
  at: XY;
};

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
    case "INTERFACE_CLICK": {
      if (app.controls.activeSketchTool.sketchTool === "TOOL_CREATE_POINT") {
        // Create a new point.
        const id = ID.uniqueID();
        return applyAppAction(app, {
          action: "SKETCH_CREATE_POINT",
          id: new PointID(id),
          at: action.at,
        });
      }
      return app;
    }
    case "INTERFACE_KEYDOWN": {
      if (action.key === "Escape") {
        return {
          ...app,
          controls: {
            ...app.controls,
            activeSketchTool: { sketchTool: "TOOL_NONE" },
          },
        };
      }
      if (action.key === "p") {
        return {
          ...app,
          controls: {
            ...app.controls,
            activeSketchTool: { sketchTool: "TOOL_CREATE_POINT" },
          },
        };
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
