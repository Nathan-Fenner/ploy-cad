import { memo } from "react";
import {
  COLOR_SKETCH_FULLY_CONSTRAINED,
  COLOR_SKETCH_SELECTED,
} from "../palette/colors";
import { XY } from "../state/AppState";
import { COLOR_FROM_LINE_STYLE, LineStyle } from "./sketch-line-style";
import { distanceBetweenPoints } from "../geometry/vector";

export type SketchLineProps = {
  endpointA: XY;
  endpointB: XY;
  center: XY;
  lineStyle: LineStyle;
  selected?: boolean;
  isFullyConstrained?: boolean;
};

export const SketchArc = memo(
  ({
    endpointA,
    endpointB,
    center,
    lineStyle,
    selected,
    isFullyConstrained = false,
  }: SketchLineProps) => {
    const arcRadius = Math.max(
      distanceBetweenPoints(endpointA, center),
      distanceBetweenPoints(endpointB, center),
    );

    let angleA = Math.atan2(endpointA.y - center.y, endpointA.x - center.x);
    let angleB = Math.atan2(endpointB.y - center.y, endpointB.x - center.x);
    if (angleB < angleA) {
      angleB += Math.PI * 2;
    }
    let sweep = 0;
    if (angleB - angleA > Math.PI) {
      angleA += Math.PI;
      sweep = 1;
    }

    return (
      <>
        <path
          vectorEffect="non-scaling-stroke"
          strokeDasharray={
            lineStyle === "sketch-construction"
              ? "5 5 2 5"
              : lineStyle === "preview"
              ? "3 2"
              : undefined
          }
          strokeWidth={lineStyle === "selection-halo" ? 15 : 2}
          stroke={
            selected
              ? COLOR_SKETCH_SELECTED
              : isFullyConstrained
              ? COLOR_SKETCH_FULLY_CONSTRAINED
              : COLOR_FROM_LINE_STYLE[lineStyle]
          }
          fill="none"
          d={`M ${endpointA.x} ${endpointA.y} A ${arcRadius} ${arcRadius} 0 0 ${
            sweep ? 0 : 1
          } ${endpointB.x} ${endpointB.y}`}
        />

        <line
          vectorEffect="non-scaling-stroke"
          stroke={"#0ff"}
          strokeDasharray="1 5 6 5"
          x1={center.x}
          y1={center.y}
          x2={endpointA.x}
          y2={endpointA.y}
          strokeWidth={1}
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={"#0ff"}
          strokeDasharray="1 5 6 5"
          x1={center.x}
          y1={center.y}
          x2={endpointB.x}
          y2={endpointB.y}
          strokeWidth={1}
        />
      </>
    );
  },
);
