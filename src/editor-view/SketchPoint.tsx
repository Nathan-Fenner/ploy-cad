import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";
import {
  COLOR_SKETCH_POINT_FILL,
  COLOR_SKETCH_POINT_STROKE,
  COLOR_SKETCH_SELECTED,
} from "../palette/colors";
import { XY } from "../state/AppState";

export type SketchPointProps = {
  position: XY;
  selected?: boolean;
};

export const SketchPoint = memo(
  ({ position, selected = false }: SketchPointProps) => {
    const pixelSize = useContext(PixelSize);
    const RECT_WIDTH = pixelSize * 8;

    return (
      <rect
        vectorEffect="non-scaling-stroke"
        stroke={selected ? COLOR_SKETCH_SELECTED : COLOR_SKETCH_POINT_STROKE}
        fill={COLOR_SKETCH_POINT_FILL}
        x={position.x - RECT_WIDTH / 2}
        y={position.y - RECT_WIDTH / 2}
        width={RECT_WIDTH}
        height={RECT_WIDTH}
        strokeWidth={1}
      />
    );
  },
);
