import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";
import { Canvas } from "./canvas/Canvas";

import {
  APP_STATE_INITIAL,
  AppState,
  ConstraintPointPointDistanceID,
  View,
  XY,
  getElement,
} from "./state/AppState";
import { AppAction, applyAppActionImplementation } from "./state/AppAction";
import { COLOR_EDITOR_BACKGROUND } from "./palette/colors";
import { ZOOM_SPEED } from "./constants";
import { SketchToolState } from "./state/ToolState";
import { SketchView } from "./editor-view/SketchView";

function zoomTo(view: View, zoomCenter: XY, steps: number): View {
  const newZoom = view.size * Math.pow(2, steps / 200);
  // These must be the same:
  // (a): (zoomCenter - old.viewCenter) / old.size
  // (b): (zoomCenter - new.viewCenter) / new.size
  // Therefore:
  return {
    center: {
      x: zoomCenter.x - (newZoom * (zoomCenter.x - view.center.x)) / view.size,
      y: zoomCenter.y - (newZoom * (zoomCenter.y - view.center.y)) / view.size,
    },
    size: newZoom,
  };
}

function useKeyDown(
  callback: (key: string, modifiers: { ctrlKey: boolean }) => void,
): void {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  useLayoutEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      callbackRef.current(e.key, { ctrlKey: e.ctrlKey });
    };
    document.body.addEventListener("keydown", listener);
    return (): void => {
      document.body.removeEventListener("keydown", listener);
    };
  }, []);
}

/**
 * Returns true if the current action is modal, meaning that it prevents access to the app via the canvas.
 */
function isToolModal(appState: AppState): boolean {
  return (
    appState.controls.activeSketchTool.sketchTool === "TOOL_EDIT_DIMENSION"
  );
}

function App() {
  const [appState, dispatchApp] = useReducer(
    applyAppActionImplementation,
    APP_STATE_INITIAL,
  );

  const isInModalMode = useMemo(() => isToolModal(appState), [appState]);

  // This callback can be selectively disabled to "freeze" the canvas.
  const dispatchCanvas = useCallback(
    (action: AppAction) => {
      if (isInModalMode) {
        return;
      }
      dispatchApp(action);
    },
    [dispatchApp, isInModalMode],
  );

  const view = appState.view;
  const canvasSetView = (view: View): void => {
    dispatchCanvas({ action: "CHANGE_VIEW", newView: view });
  };
  const panning = appState.controls.panning;

  const [at, setAt] = useState({ x: 0, y: 0 });

  useKeyDown((key, { ctrlKey }) => {
    dispatchCanvas({ action: "INTERFACE_KEYDOWN", key, ctrlKey });
  });

  return (
    <div style={{ position: "relative" }} className="editor">
      <Canvas
        viewCenter={view.center}
        viewSize={view.size}
        containerStyle={{
          background: COLOR_EDITOR_BACKGROUND,
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
        onMouseMove={(p, delta) => {
          setAt(p);
          if (panning) {
            canvasSetView({
              center: {
                x: view.center.x - delta.x,
                y: view.center.y - delta.y,
              },
              size: view.size,
            });
          }
          dispatchCanvas({
            action: "INTERFACE_MOUSE_MOVE",
            position: p,
            delta,
          });
        }}
        onZoom={(zoomCenter, zoomSteps) => {
          canvasSetView(zoomTo(view, zoomCenter, zoomSteps * ZOOM_SPEED));
        }}
        onMouseUp={(buttons, _at, { shiftKey }) => {
          if ((buttons & 4) === 0 && panning) {
            dispatchCanvas({ action: "STOP_PANNING" });
          }
          if (!(buttons & 1)) {
            dispatchCanvas({ action: "INTERFACE_CLICK_RELEASE", at, shiftKey });
          }
        }}
        onMouseDown={(buttons, _at, { shiftKey, isDouble }) => {
          if ((buttons & 4) !== 0 && !panning) {
            dispatchCanvas({ action: "BEGIN_PANNING" });
          }
          if (buttons === 1) {
            dispatchCanvas({
              action: "INTERFACE_CLICK",
              at,
              shiftKey,
              isDouble,
            });
          }
        }}
      >
        <SketchView appState={appState} cursorAt={at} />
      </Canvas>

      {isInModalMode && (
        <ModalView appState={appState} dispatch={dispatchApp} />
      )}

      <div style={{ position: "fixed", left: 20, bottom: 20 }}>
        <DebugToolState tool={appState.controls.activeSketchTool} />
      </div>
    </div>
  );
}

function DebugToolState({ tool }: { tool: SketchToolState }) {
  return (
    <div style={{ display: "flex", gap: 20 }}>
      <DebugToolStateLabel tool={tool} />
      <DebugToolStateExtra tool={tool} />
    </div>
  );
}

function ModalContents({
  appState,
  dispatch,
  onClose,
}: {
  appState: AppState;
  dispatch: (action: AppAction) => void;
  onClose: () => void;
}) {
  if (appState.controls.activeSketchTool.sketchTool === "TOOL_EDIT_DIMENSION") {
    return (
      <ModalEditDimensionValue
        appState={appState}
        dimensionID={appState.controls.activeSketchTool.dimension}
        dispatch={dispatch}
        onClose={onClose}
      />
    );
  }
  return <>??? unknown tool/action</>;
}

function ModalEditDimensionValue({
  appState,
  dispatch,
  dimensionID,
  onClose,
}: {
  appState: AppState;
  dispatch: (action: AppAction) => void;
  dimensionID: ConstraintPointPointDistanceID;
  onClose: () => void;
}) {
  const dimension = useMemo(() => {
    return getElement(appState, dimensionID);
  }, [appState, dimensionID]);
  const [valueAsText, setValueAsText] = useState(() => {
    return dimension.distance.toFixed(2);
  });

  const inputRef = useRef<HTMLInputElement>(null!);
  useEffect(() => {
    // It's unclear to me why this is needed-
    // maybe something to do with the input being
    // inside of a dialog?
    setTimeout(() => {
      inputRef.current.focus();
      inputRef.current.select();
    }, 0);
  }, []);

  const validatedResult = useMemo(():
    | { ok: false; message: string }
    | { ok: true; value: number } => {
    if (!valueAsText.trim()) {
      return { ok: false, message: "You must enter a value." };
    }
    const newValue = parseFloat(valueAsText.trim());

    if (!isFinite(newValue)) {
      return { ok: false, message: "You must enter a finite value." };
    }

    if (newValue < 0) {
      return { ok: false, message: "You must enter a positive value." };
    }

    return { ok: true, value: newValue };
  }, [valueAsText]);

  const submitCurrentValue = () => {
    if (validatedResult.ok) {
      dispatch({
        action: "SKETCH_UPDATE_CONSTRAINT",
        dimensionID,
        newDistance: validatedResult.value,
      });
      onClose();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span>Edit dimension</span>
      <input
        value={valueAsText}
        onChange={(e) => {
          setValueAsText(e.currentTarget.value);
        }}
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            submitCurrentValue();
          }
        }}
      />

      <button
        onClick={() => {
          submitCurrentValue();
        }}
      >
        Set
      </button>
      {validatedResult.ok === false && <span>{validatedResult.message}</span>}
    </div>
  );
}

function ModalView({
  appState,
  dispatch,
}: {
  appState: AppState;
  dispatch: (action: AppAction) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null!);

  const close = () => {
    dispatch({
      action: "INTERFACE_KEYDOWN",
      key: "Escape",
      ctrlKey: false,
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        close();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          // ...
          dispatch({
            action: "INTERFACE_KEYDOWN",
            key: "Escape",
            ctrlKey: false,
          });
        }
      }}
      style={{ padding: 0 }}
    >
      <div style={{ padding: 20 }}>
        <ModalContents
          appState={appState}
          dispatch={dispatch}
          onClose={close}
        />
      </div>
    </dialog>
  );
}

function DebugToolStateLabel({ tool }: { tool: SketchToolState }) {
  return (
    <span>
      {tool.sketchTool}
      {tool.sketchTool === "TOOL_FLOW" && " " + tool.toolName}
      {tool.sketchTool === "TOOL_FLOW" && " / " + tool.flowNeeds.recordType}
    </span>
  );
}
function DebugToolStateExtra({ tool }: { tool: SketchToolState }) {
  if (tool.sketchTool === "TOOL_SELECT") {
    return (
      <>
        <span>{tool.boxCorner !== null ? "[b]" : null}</span>
        <span>{[...tool.selected].join(", ")}</span>
      </>
    );
  }
  return null;
}

export default App;
