import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";
import {
  COLOR_SKETCH_CONSTRAINT,
  COLOR_SKETCH_MARKER_STROKE,
} from "../palette/colors";
import { XY } from "../state/AppState";

export type SketchMarkerProps = {
  position: XY;
  variety?: "default" | "fixed";
};

export const SketchMarker = memo(
  ({ position, variety = "default" }: SketchMarkerProps) => {
    const pixelSize = useContext(PixelSize);
    const RECT_WIDTH = pixelSize * 15;

    return (
      <rect
        vectorEffect="non-scaling-stroke"
        stroke={
          variety === "fixed"
            ? COLOR_SKETCH_CONSTRAINT
            : COLOR_SKETCH_MARKER_STROKE
        }
        fill="none"
        x={position.x - RECT_WIDTH / 2}
        y={position.y - RECT_WIDTH / 2}
        width={RECT_WIDTH}
        height={RECT_WIDTH}
        strokeWidth={2}
        transform={`rotate(45 ${position.x} ${position.y})`}
      />
    );
  },
);
