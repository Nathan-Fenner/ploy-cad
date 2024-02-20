import { Fragment, useMemo } from "react";

import { EditorAxes } from "../editor-view/EditorAxes";
import { AppState, XY, getPointPosition } from "../state/AppState";
import { findOrCreatePointNear, findPointNear } from "../state/AppAction";
import { SketchPoint } from "../editor-view/SketchPoint";
import { SketchLine } from "../editor-view/SketchLine";
import { SketchMarker } from "../editor-view/SketchMarker";
import { SketchAABB } from "../editor-view/SketchAABB";

export function SketchView({
  appState,
  cursorAt,
}: {
  appState: AppState;
  cursorAt: XY;
}) {
  const hoveringPoint = findPointNear(appState, cursorAt);

  const visuallySelectedSet = useMemo(() => {
    if (appState.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
      return appState.controls.activeSketchTool.selected;
    }
    if (appState.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
      return new Set([appState.controls.activeSketchTool.point]);
    }
    return new Set();
  }, [appState.controls.activeSketchTool]);

  return (
    <>
      <EditorAxes />
      {appState.sketch.sketchElements.map((element) => {
        if (element.sketchElement === "SketchElementLine") {
          const endpointA = getPointPosition(appState, element.endpointA);
          const endpointB = getPointPosition(appState, element.endpointB);

          return (
            <SketchLine
              key={element.id.toString()}
              endpointA={endpointA}
              endpointB={endpointB}
              lineStyle="sketch"
              selected={visuallySelectedSet.has(element.id)}
            />
          );
        }
        return null;
      })}
      {appState.sketch.sketchElements.map((element) => {
        if (element.sketchElement === "SketchElementPoint") {
          return (
            <SketchPoint
              key={element.id.toString()}
              position={element.position}
              selected={visuallySelectedSet.has(element.id)}
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
          const destination = findOrCreatePointNear(
            appState,
            cursorAt,
          ).position;
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
            <Fragment key={`preview-${element.id}`}>{previewElements}</Fragment>
          );
        }
        return null;
      })}

      {(() => {
        const sketchTool = appState.controls.activeSketchTool;
        if (
          sketchTool.sketchTool === "TOOL_CREATE_POINT" ||
          sketchTool.sketchTool === "TOOL_CREATE_LINE" ||
          sketchTool.sketchTool === "TOOL_CREATE_LINE_FROM_POINT"
        ) {
          return <SketchMarker position={hoveringPoint.position} />;
        }

        if (
          sketchTool.sketchTool === "TOOL_SELECT" &&
          sketchTool.boxCorner !== null
        ) {
          return (
            <SketchAABB
              endpointA={sketchTool.boxCorner}
              endpointB={cursorAt}
              dashed={cursorAt.x < sketchTool.boxCorner.x}
            />
          );
        }
        return null;
      })()}
    </>
  );
}
