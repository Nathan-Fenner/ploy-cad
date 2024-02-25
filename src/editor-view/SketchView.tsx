import { Fragment, useMemo } from "react";

import { EditorAxes } from "../editor-view/EditorAxes";
import {
  AppState,
  PointID,
  XY,
  computeConstraintDistanceParameters,
  getPointPosition,
} from "../state/AppState";
import { findOrCreatePointNear, findPointNear } from "../state/AppAction";
import { SketchPoint } from "../editor-view/SketchPoint";
import { SketchLine } from "../editor-view/SketchLine";
import { SketchMarker } from "../editor-view/SketchMarker";
import { SketchAABB } from "../editor-view/SketchAABB";
import { applyConstraint } from "../solver/constrain";
import {
  distanceBetweenPoints,
  pointAdd,
  pointScale,
} from "../geometry/vector";
import { SketchLinearDimension } from "./SketchLinearDimension";

export function SketchView({
  appState,
  cursorAt,
}: {
  appState: AppState;
  cursorAt: XY;
}) {
  const constrainedPoints = useMemo(() => {
    return applyConstraint(appState.sketch).fixedPositions;
  }, [appState.sketch]);
  const hoveringPoint = useMemo(
    () => findPointNear(appState, cursorAt),
    [appState, cursorAt],
  );

  const visuallySelectedSet = useMemo(() => {
    if (appState.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
      return appState.controls.activeSketchTool.selected;
    }
    if (appState.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
      return new Set([appState.controls.activeSketchTool.geometry]);
    }
    return new Set();
  }, [appState.controls.activeSketchTool]);

  const isConstrained = (p: PointID): boolean => {
    return (
      constrainedPoints.has(p) &&
      distanceBetweenPoints(
        getPointPosition(appState, p),
        constrainedPoints.get(p)!,
      ) < 0.01
    );
  };

  return (
    <>
      <EditorAxes />
      <g style={{ opacity: 0.25 }}>
        {appState.sketch.sketchElements.map((element) => {
          if (!visuallySelectedSet.has(element.id)) {
            return null;
          }
          if (element.sketchElement === "SketchElementLine") {
            const endpointA = getPointPosition(appState, element.endpointA);
            const endpointB = getPointPosition(appState, element.endpointB);

            return (
              <SketchLine
                key={element.id.toString()}
                endpointA={endpointA}
                endpointB={endpointB}
                lineStyle="selection-halo"
              />
            );
          }
          if (element.sketchElement === "SketchElementPoint") {
            return (
              <SketchPoint
                key={element.id.toString()}
                position={element.position}
                pointStyle="selection-halo"
              />
            );
          }
          if (element.sketchElement === "SketchElementConstraintDistance") {
            return (
              <SketchLinearDimension
                key={element.id.toString()}
                a={getPointPosition(appState, element.pointA)}
                b={getPointPosition(appState, element.pointB)}
                t={element.cosmetic.t}
                offset={element.cosmetic.offset}
                label={String(element.distance)}
                dimensionStyle="selection-halo"
              />
            );
          }
          return null;
        })}
      </g>
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
              isFullyConstrained={
                isConstrained(element.endpointA) &&
                isConstrained(element.endpointB)
              }
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
              isFullyConstrained={isConstrained(element.id)}
            />
          );
        }
        return null;
      })}
      {appState.sketch.sketchElements.map((element) => {
        // Always render the point itself as "fixed".
        if (element.sketchElement === "SketchElementConstraintFixed") {
          return (
            <SketchMarker
              key={element.id.toString()}
              position={element.position}
              variety="fixed"
            />
          );
        }
        return null;
      })}

      {appState.sketch.sketchElements.map((element) => {
        if (element.sketchElement === "SketchElementConstraintFixed") {
          if (
            visuallySelectedSet.has(element.point) ||
            visuallySelectedSet.has(element.point)
          ) {
            return (
              <SketchMarker
                key={element.id.toString()}
                position={element.position}
                localOffset={{ x: 15, y: -15 }}
                text="F"
              />
            );
          }
        }
        if (element.sketchElement === "SketchElementConstraintVertical") {
          const a = getPointPosition(appState, element.pointA);
          const b = getPointPosition(appState, element.pointB);
          const middle = pointScale(pointAdd(a, b), 0.5);
          return (
            <SketchMarker
              key={element.id.toString()}
              position={middle}
              localOffset={{ x: 15, y: -15 }}
              text="V"
            />
          );
        }
        if (element.sketchElement === "SketchElementConstraintDistance") {
          const a = getPointPosition(appState, element.pointA);
          const b = getPointPosition(appState, element.pointB);
          return (
            <SketchLinearDimension
              key={element.id.toString()}
              a={a}
              b={b}
              t={element.cosmetic.t}
              offset={element.cosmetic.offset}
              label={String(element.distance)}
            />
          );
        }
        return null;
      })}

      {/* TOOLS AND PREVIEWS */}

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

        if (sketchTool.sketchTool === "TOOL_CREATE_DISTANCE_CONSTRAINT") {
          const pointA = getPointPosition(appState, sketchTool.pointA);
          const pointB = getPointPosition(appState, sketchTool.pointB);
          const { t, offset } = computeConstraintDistanceParameters({
            a: pointA,
            b: pointB,
            labelPosition: cursorAt,
          });

          return (
            <SketchLinearDimension
              a={pointA}
              b={pointB}
              t={t}
              offset={offset}
              label="..."
            />
          );
        }
        return null;
      })()}
    </>
  );
}
