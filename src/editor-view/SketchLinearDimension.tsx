import { memo, useContext } from "react";
import {
  COLOR_SKETCH_CONSTRAINT,
  COLOR_SKETCH_SELECT_HALO,
} from "../palette/colors";
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

  dimensionStyle?: "normal" | "selection-halo";
};

const EXTENSION_LINE_GAP = { world: 5 };
const EXTENSION_LINE_EXTRA = { world: 10 };

export const SketchLinearDimension = memo(
  ({ a, b, t, offset, label, dimensionStyle = "normal" }: SketchPointProps) => {
    const pixelSize = useContext(PixelSize);

    const direction = pointSubtract(b, a);
    const alignMark = pointScale(direction, t);
    const perpendicular = pointNormalize({ x: -direction.y, y: direction.x });

    const perpendicularOffset = pointScale(perpendicular, offset);

    const labelPosition = pointAdd(a, pointAdd(alignMark, perpendicularOffset));

    const extensionGap = pointScale(
      perpendicular,
      Math.sign(offset) * EXTENSION_LINE_GAP.world,
    );

    const extensionEnd = pointAdd(
      pointScale(
        perpendicular,
        Math.sign(offset) * pixelSize * EXTENSION_LINE_EXTRA.world,
      ),
      perpendicularOffset,
    );

    const color =
      dimensionStyle === "normal"
        ? COLOR_SKETCH_CONSTRAINT
        : COLOR_SKETCH_SELECT_HALO;

    const strokeWidth = dimensionStyle === "normal" ? undefined : 15;

    return (
      <g className="linear-dimension">
        EXTENSION_LINE_GAP
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={pointAdd(a, extensionGap).x}
          y1={pointAdd(a, extensionGap).y}
          x2={pointAdd(a, extensionEnd).x}
          y2={pointAdd(a, extensionEnd).y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={pointAdd(b, extensionGap).x}
          y1={pointAdd(b, extensionGap).y}
          x2={pointAdd(b, extensionEnd).x}
          y2={pointAdd(b, extensionEnd).y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={pointAdd(a, perpendicularOffset).x}
          y1={pointAdd(a, perpendicularOffset).y}
          x2={pointAdd(b, perpendicularOffset).x}
          y2={pointAdd(b, perpendicularOffset).y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {dimensionStyle === "normal" && (
          <text
            x={labelPosition.x}
            y={labelPosition.y}
            fill={color}
            fontSize={22 * pixelSize}
            alignmentBaseline="middle"
            textAnchor="middle"
          >
            {label}
          </text>
        )}
      </g>
    );
  },
);
