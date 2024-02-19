import {
  Fragment,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";
import { Canvas } from "./canvas/Canvas";
import { EditorAxes } from "./editor-view/EditorAxes";
import { APP_STATE_INITIAL, PointID, View, XY } from "./AppState";
import { applyAppAction, findOrCreatePointNear } from "./AppAction";
import { COLOR_EDITOR_BACKGROUND } from "./palette/colors";
import { SketchPoint } from "./editor-view/SketchPoint";
import { ZOOM_SPEED } from "./constants";
import { SketchLine } from "./editor-view/SketchLine";
import { SketchMarker } from "./editor-view/SketchMarker";

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

function useKeyDown(callback: (key: string) => void): void {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  useLayoutEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      callbackRef.current(e.key);
    };
    document.body.addEventListener("keydown", listener);
    return (): void => {
      document.body.removeEventListener("keydown", listener);
    };
  }, []);
}

function App() {
  const [appState, dispatch] = useReducer(applyAppAction, APP_STATE_INITIAL);

  const view = appState.view;
  const setView = (view: View): void => {
    dispatch({ action: "CHANGE_VIEW", newView: view });
  };
  const panning = appState.controls.panning;

  const [at, setAt] = useState({ x: 0, y: 0 });

  useKeyDown((key) => {
    dispatch({ action: "INTERFACE_KEYDOWN", key });
  });

  const pointPositions = useMemo(() => {
    const positions = new Map<PointID, XY>();
    for (const element of appState.sketch.sketchElements) {
      if (element.sketchElement === "SketchElementPoint") {
        positions.set(element.id, element.position);
      }
    }
    return positions;
  }, [appState.sketch.sketchElements]);

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
          setView(zoomTo(view, zoomCenter, zoomSteps * ZOOM_SPEED));
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
          if (buttons === 1) {
            dispatch({ action: "INTERFACE_CLICK", at });
          }
        }}
      >
        <EditorAxes />
        {appState.sketch.sketchElements.map((element) => {
          if (element.sketchElement === "SketchElementLine") {
            const endpointA = pointPositions.get(element.endpointA);
            const endpointB = pointPositions.get(element.endpointB);
            if (endpointA !== undefined && endpointB !== undefined) {
              return (
                <SketchLine
                  key={element.id.toString()}
                  endpointA={endpointA}
                  endpointB={endpointB}
                  lineStyle="sketch"
                />
              );
            }
          }
          return null;
        })}
        {appState.sketch.sketchElements.map((element) => {
          if (element.sketchElement === "SketchElementPoint") {
            return (
              <SketchPoint
                key={element.id.toString()}
                id={element.id}
                position={element.position}
              />
            );
          }
          return null;
        })}
        {appState.sketch.sketchElements.map((element) => {
          const previewElements: JSX.Element[] = [];

          const sketchTool = appState.controls.activeSketchTool;

          if (
            element.sketchElement === "SketchElementPoint" &&
            sketchTool.sketchTool === "TOOL_CREATE_LINE_FROM_POINT" &&
            element.id === sketchTool.fromPoint
          ) {
            previewElements.push(
              <SketchMarker key="from-marker" position={element.position} />,
            );
            const destination = findOrCreatePointNear(appState, at).position;
            previewElements.push(
              <SketchLine
                key="line-preview"
                endpointA={element.position}
                endpointB={destination}
                lineStyle="preview"
              />,
            );
          }

          if (previewElements.length > 0) {
            return (
              <Fragment key={`preview-${element.id}`}>
                {previewElements}
              </Fragment>
            );
          }
          return null;
        })}
      </Canvas>

      <div style={{ position: "fixed", left: 20, bottom: 20 }}>
        {appState.controls.activeSketchTool.sketchTool}
      </div>
    </div>
  );
}

export default App;
