import { SketchLine } from "../../editor-view/SketchLine";
import { SketchMarker } from "../../editor-view/SketchMarker";
import { actionCreateLine } from "../AppAction";
import { getPointPosition, LineID } from "../AppState";
import { findOrCreatePointNear } from "../findOrCreatePointNear";
import { ToolInterface } from "../ToolState";

export function toolCreateLine(tool: ToolInterface) {
  tool.trigger({ key: "l" });

  const endpointA = tool.pickOrCreatePoint("endpoint-1");
  const endpointB = tool.pickOrCreatePoint("endpoint-2", {
    preview: (appState, view) => {
      const fromXY = getPointPosition(appState, endpointA);
      const destination = findOrCreatePointNear(
        appState,
        view.cursorAt,
      ).position;
      return (
        <>
          <SketchMarker key="from-marker" position={fromXY} />
          <SketchLine
            key="line-preview"
            endpointA={fromXY}
            endpointB={destination}
            lineStyle="preview"
          />
        </>
      );
    },
  });

  if (endpointA === endpointB) {
    tool.abort();
  }

  tool.apply(
    actionCreateLine({
      id: tool.generateID(LineID),
      endpointA,
      endpointB,
    }),
  );
}
