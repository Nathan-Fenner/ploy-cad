import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";
import {
  COLOR_SKETCH_FULLY_CONSTRAINED,
  COLOR_SKETCH_POINT_FILL,
  COLOR_SKETCH_POINT_STROKE,
  COLOR_SKETCH_SELECTED,
  COLOR_SKETCH_SELECT_HALO,
} from "../palette/colors";
import { XY } from "../state/AppState";

export type SketchPointProps = {
  position: XY;
  pointStyle?: "default" | "selection-halo";
  selected?: boolean;
  isFullyConstrained?: boolean;
};

export const SketchPoint = memo(
  ({
    position,
    selected = false,
    pointStyle = "default",
    isFullyConstrained = false,
  }: SketchPointProps) => {
    const pixelSize = useContext(PixelSize);
    const RECT_WIDTH = pixelSize * 8;

    if (pointStyle === "selection-halo") {
      return (
        <circle
          cx={position.x}
          cy={position.y}
          r={15 * pixelSize}
          fill={COLOR_SKETCH_SELECT_HALO}
        />
      );
    }

    return (
      <rect
        vectorEffect="non-scaling-stroke"
        stroke={
          selected
            ? COLOR_SKETCH_SELECTED
            : isFullyConstrained
            ? COLOR_SKETCH_FULLY_CONSTRAINED
            : COLOR_SKETCH_POINT_STROKE
        }
        fill={COLOR_SKETCH_POINT_FILL}
        x={position.x - RECT_WIDTH / 2}
        y={position.y - RECT_WIDTH / 2}
        width={RECT_WIDTH}
        height={RECT_WIDTH}
        strokeWidth={2}
      />
    );
  },
);
