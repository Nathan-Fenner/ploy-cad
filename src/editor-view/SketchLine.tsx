import { memo } from "react";
import {
  COLOR_SKETCH_LINE_STROKE,
  COLOR_SKETCH_PREVIEW,
  COLOR_SKETCH_FULLY_CONSTRAINED,
  COLOR_SKETCH_SELECTED,
  COLOR_SKETCH_SELECT_HALO,
} from "../palette/colors";
import { XY } from "../state/AppState";

type LineStyle = "sketch" | "preview" | "selection-halo";

const COLOR_FROM_LINE_STYLE: Record<LineStyle, string> = {
  sketch: COLOR_SKETCH_LINE_STROKE,
  preview: COLOR_SKETCH_PREVIEW,
  "selection-halo": COLOR_SKETCH_SELECT_HALO,
};

export type SketchPointProps = {
  endpointA: XY;
  endpointB: XY;
  lineStyle: LineStyle;
  selected?: boolean;
  fullyConstrained?: boolean;
};

export const SketchLine = memo(
  ({
    endpointA,
    endpointB,
    lineStyle,
    selected,
    fullyConstrained = false,
  }: SketchPointProps) => {
    return (
      <line
        vectorEffect="non-scaling-stroke"
        stroke={
          selected
            ? COLOR_SKETCH_SELECTED
            : fullyConstrained
            ? COLOR_SKETCH_FULLY_CONSTRAINED
            : COLOR_FROM_LINE_STYLE[lineStyle]
        }
        strokeDasharray={lineStyle === "preview" ? "3 2" : undefined}
        x1={endpointA.x}
        y1={endpointA.y}
        x2={endpointB.x}
        y2={endpointB.y}
        strokeWidth={lineStyle === "selection-halo" ? 15 : 2}
      />
    );
  },
);
