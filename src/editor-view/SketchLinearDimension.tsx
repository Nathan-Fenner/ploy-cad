import { memo, useContext } from "react";
import { COLOR_SKETCH_CONSTRAINT } from "../palette/colors";
import { XY } from "../state/AppState";
import {
  pointAdd,
  pointNormalize,
  pointScale,
  pointSubtract,
} from "../geometry/vector";
import { PixelSize } from "../canvas/Canvas";

export type SketchPointProps = {
  a: XY;
  b: XY;
  t: number;
  offset: number;
  label: string;
};

const EXTENSION_LINE_GAP = { world: 5 };
const EXTENSION_LINE_EXTRA = { world: 10 };

export const SketchLinearDimension = memo(
  ({ a, b, t, offset, label }: SketchPointProps) => {
    const pixelSize = useContext(PixelSize);

    const direction = pointSubtract(b, a);
    const alignMark = pointScale(direction, t);
    const perpendicular = pointNormalize({ x: -direction.y, y: direction.x });

    const perpendicularOffset = pointScale(perpendicular, offset);

    const labelPosition = pointAdd(a, pointAdd(alignMark, perpendicularOffset));

    const extensionGap = pointScale(perpendicular, EXTENSION_LINE_GAP.world);

    const extensionEnd = pointAdd(
      pointScale(perpendicular, pixelSize * EXTENSION_LINE_EXTRA.world),
      perpendicularOffset,
    );

    return (
      <g className="linear-dimension">
        EXTENSION_LINE_GAP
        <line
          vectorEffect="non-scaling-stroke"
          stroke={COLOR_SKETCH_CONSTRAINT}
          x1={pointAdd(a, extensionGap).x}
          y1={pointAdd(a, extensionGap).y}
          x2={pointAdd(a, extensionEnd).x}
          y2={pointAdd(a, extensionEnd).y}
        />{" "}
        <line
          vectorEffect="non-scaling-stroke"
          stroke={COLOR_SKETCH_CONSTRAINT}
          x1={pointAdd(b, extensionGap).x}
          y1={pointAdd(b, extensionGap).y}
          x2={pointAdd(b, extensionEnd).x}
          y2={pointAdd(b, extensionEnd).y}
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={COLOR_SKETCH_CONSTRAINT}
          x1={pointAdd(a, perpendicularOffset).x}
          y1={pointAdd(a, perpendicularOffset).y}
          x2={pointAdd(b, perpendicularOffset).x}
          y2={pointAdd(b, perpendicularOffset).y}
        />
        <text
          x={labelPosition.x}
          y={labelPosition.y}
          fill={COLOR_SKETCH_CONSTRAINT}
          fontSize={22 * pixelSize}
          alignmentBaseline="middle"
          textAnchor="middle"
        >
          {label}
        </text>
      </g>
    );
  },
);
