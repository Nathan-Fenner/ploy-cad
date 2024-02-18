import { useReducer, useState } from "react";
import "./App.css";
import { Canvas } from "./canvas/Canvas";
import { EditorAxes } from "./editor-view/EditorAxes";
import { APP_STATE_INITIAL, View, XY } from "./AppState";
import { applyAppAction } from "./AppAction";
import { COLOR_EDITOR_BACKGROUND } from "./palette/colors";

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

function App() {
  const [appState, dispatch] = useReducer(applyAppAction, APP_STATE_INITIAL);

  const view = appState.view;
  const setView = (view: View): void => {
    dispatch({ action: "CHANGE_VIEW", newView: view });
  };
  const panning = appState.controls.panning;

  const [at, setAt] = useState({ x: 0, y: 0 });
  return (
    <div style={{ position: "relative" }}>
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
            setView({
              center: {
                x: view.center.x - delta.x,
                y: view.center.y - delta.y,
              },
              size: view.size,
            });
          }
        }}
        onZoom={(zoomCenter, zoomSteps) => {
          setView(zoomTo(view, zoomCenter, zoomSteps / 5));
        }}
        onMouseUp={(buttons, _at) => {
          if ((buttons & 4) === 0 && panning) {
            dispatch({ action: "STOP_PANNING" });
          }
        }}
        onMouseDown={(buttons, _at) => {
          if ((buttons & 4) !== 0 && !panning) {
            dispatch({ action: "BEGIN_PANNING" });
          }
        }}
      >
        <EditorAxes />
        <circle cx={at.x} cy={at.y} r={20} fill="white" />
      </Canvas>
    </div>
  );
}

export default App;
