import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";
import { COLOR_SKETCH_MARKER_STROKE } from "../palette/colors";
import { XY } from "../AppState";

export type SketchMarkerProps = {
  position: XY;
};

export const SketchMarker = memo(({ position }: SketchMarkerProps) => {
  const pixelSize = useContext(PixelSize);
  const RECT_WIDTH = pixelSize * 15;

  return (
    <rect
      vectorEffect="non-scaling-stroke"
      stroke={COLOR_SKETCH_MARKER_STROKE}
      fill="none"
      x={position.x - RECT_WIDTH / 2}
      y={position.y - RECT_WIDTH / 2}
      width={RECT_WIDTH}
      height={RECT_WIDTH}
      strokeWidth={2}
    />
  );
});
