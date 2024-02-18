import { AppState, View } from "./AppState";

export type AppAction =
  | AppActionChangeView
  | AppActionBeginPanning
  | AppActionStopPanning;

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
