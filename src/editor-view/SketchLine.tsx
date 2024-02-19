import { memo } from "react";
import { COLOR_SKETCH_LINE_STROKE } from "../palette/colors";
import { XY } from "../AppState";

export type SketchPointProps = {
  endpointA: XY;
  endpointB: XY;
};

export const SketchLine = memo(({ endpointA, endpointB }: SketchPointProps) => {
  return (
    <line
      vectorEffect="non-scaling-stroke"
      stroke={COLOR_SKETCH_LINE_STROKE}
      x1={endpointA.x}
      y1={endpointA.y}
      x2={endpointB.x}
      y2={endpointB.y}
      strokeWidth={2}
    />
  );
});
