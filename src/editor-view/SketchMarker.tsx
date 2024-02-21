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
  localOffset?: XY;
  text?: string;
};

export const SketchMarker = memo(
  ({
    position,
    variety = "default",
    localOffset = { x: 0, y: 0 },
    text,
  }: SketchMarkerProps) => {
    const pixelSize = useContext(PixelSize);
    const RECT_WIDTH = pixelSize * 15;

    if (text) {
      return (
        <text
          style={{ pointerEvents: "none" }}
          fill={COLOR_SKETCH_CONSTRAINT}
          fontSize={22 * pixelSize}
          x={position.x + localOffset.x * pixelSize}
          y={position.y + localOffset.y * pixelSize}
        >
          {text}
        </text>
      );
    }

    return (
      <rect
        vectorEffect="non-scaling-stroke"
        stroke={
          variety === "fixed"
            ? COLOR_SKETCH_CONSTRAINT
            : COLOR_SKETCH_MARKER_STROKE
        }
        fill="none"
        x={position.x - RECT_WIDTH / 2 + localOffset.x * pixelSize}
        y={position.y - RECT_WIDTH / 2 + localOffset.y * pixelSize}
        width={RECT_WIDTH}
        height={RECT_WIDTH}
        strokeWidth={2}
        transform={`rotate(45 ${position.x} ${position.y})`}
      />
    );
  },
);
