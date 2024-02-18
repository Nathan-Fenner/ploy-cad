import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";
import {
  COLOR_SKETCH_POINT_FILL,
  COLOR_SKETCH_POINT_STROKE,
} from "../palette/colors";
import { PointID, XY } from "../AppState";

export type SketchPointProps = {
  id: PointID;
  position: XY;
};

export const SketchPoint = memo(({ position }: SketchPointProps) => {
  const pixelSize = useContext(PixelSize);
  const RECT_WIDTH = pixelSize * 8;

  return (
    <rect
      vectorEffect="non-scaling-stroke"
      stroke={COLOR_SKETCH_POINT_STROKE}
      fill={COLOR_SKETCH_POINT_FILL}
      x={position.x - RECT_WIDTH / 2}
      y={position.y - RECT_WIDTH / 2}
      width={RECT_WIDTH}
      height={RECT_WIDTH}
      strokeWidth={1}
    />
  );
});
