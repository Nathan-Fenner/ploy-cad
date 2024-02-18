import "./App.css";
import { Canvas } from "./canvas/Canvas";
import { EditorAxes } from "./editor-view/EditorAxes";

function App() {
  const RADIUS = 650;
  const CENTER = { x: 0, y: 0 };
  return (
    <div style={{ position: "relative" }}>
      <Canvas
        viewCenter={{ x: CENTER.x, y: CENTER.y }}
        viewSize={RADIUS * 2}
        containerStyle={{
          background: "var(--editor-background)",
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <EditorAxes />
      </Canvas>
    </div>
  );
}

export default App;
