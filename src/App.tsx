import { useState } from "react";
import "./App.css";
import { Canvas } from "./canvas/Canvas";
import { EditorAxes } from "./editor-view/EditorAxes";

type XY = { readonly x: number; readonly y: number };

type View = { readonly center: XY; readonly size: number };

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
  const [view, setView] = useState({
    center: { x: 0, y: 0 },
    size: 300,
  });

  const [at, setAt] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Canvas
        viewCenter={view.center}
        viewSize={view.size}
        containerStyle={{
          background: "var(--editor-background)",
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
            setPanning(false);
          }
        }}
        onMouseDown={(buttons, _at) => {
          if ((buttons & 4) !== 0 && !panning) {
            setPanning(true);
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
