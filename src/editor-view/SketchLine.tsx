import { memo } from "react";
import {
  COLOR_SKETCH_FULLY_CONSTRAINED,
  COLOR_SKETCH_SELECTED,
} from "../palette/colors";
import { XY } from "../state/AppState";
import { COLOR_FROM_LINE_STYLE, LineStyle } from "./sketch-line-style";

export type SketchLineProps = {
  endpointA: XY;
  endpointB: XY;
  lineStyle: LineStyle;
  selected?: boolean;
  isFullyConstrained?: boolean;
};

export const SketchLine = memo(
  ({
    endpointA,
    endpointB,
    lineStyle,
    selected,
    isFullyConstrained = false,
  }: SketchLineProps) => {
    return (
      <line
        vectorEffect="non-scaling-stroke"
        stroke={
          selected
            ? COLOR_SKETCH_SELECTED
            : isFullyConstrained
            ? COLOR_SKETCH_FULLY_CONSTRAINED
            : COLOR_FROM_LINE_STYLE[lineStyle]
        }
        strokeDasharray={
          lineStyle === "sketch-construction"
            ? "5 5"
            : lineStyle === "preview"
            ? "3 2"
            : undefined
        }
        x1={endpointA.x}
        y1={endpointA.y}
        x2={endpointB.x}
        y2={endpointB.y}
        strokeWidth={lineStyle === "selection-halo" ? 15 : 2}
      />
    );
  },
);
