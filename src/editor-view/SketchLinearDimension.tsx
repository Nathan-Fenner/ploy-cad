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

    const ptGapA = pointAdd(a, extensionGap);
    const ptEndA = pointAdd(a, extensionEnd);

    const ptGapB = pointAdd(b, extensionGap);
    const ptEndB = pointAdd(b, extensionEnd);

    const ptDimA = pointAdd(a, perpendicularOffset);
    const ptDimB = pointAdd(b, perpendicularOffset);

    const arrowLength = 18;
    const arrowWidth = 3;

    // Points for the arrow heads.
    const ptDimAArrow1 = pointAdd(
      ptDimA,
      pointScale(
        pointAdd(
          pointScale(pointNormalize(direction), arrowLength),
          pointScale(perpendicular, arrowWidth),
        ),
        pixelSize,
      ),
    );
    const ptDimAArrow2 = pointAdd(
      ptDimA,
      pointScale(
        pointAdd(
          pointScale(pointNormalize(direction), arrowLength),
          pointScale(perpendicular, -arrowWidth),
        ),
        pixelSize,
      ),
    );

    const ptDimBArrow1 = pointAdd(
      ptDimB,
      pointScale(
        pointAdd(
          pointScale(pointNormalize(direction), -arrowLength),
          pointScale(perpendicular, arrowWidth),
        ),
        pixelSize,
      ),
    );
    const ptDimBArrow2 = pointAdd(
      ptDimB,
      pointScale(
        pointAdd(
          pointScale(pointNormalize(direction), -arrowLength),
          pointScale(perpendicular, -arrowWidth),
        ),
        pixelSize,
      ),
    );

    return (
      <g className="linear-dimension">
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptGapA.x}
          y1={ptGapA.y}
          x2={ptEndA.x}
          y2={ptEndA.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptGapB.x}
          y1={ptGapB.y}
          x2={ptEndB.x}
          y2={ptEndB.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptDimA.x}
          y1={ptDimA.y}
          x2={ptDimB.x}
          y2={ptDimB.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptDimA.x}
          y1={ptDimA.y}
          x2={ptDimAArrow1.x}
          y2={ptDimAArrow1.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptDimA.x}
          y1={ptDimA.y}
          x2={ptDimAArrow2.x}
          y2={ptDimAArrow2.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptDimB.x}
          y1={ptDimB.y}
          x2={ptDimBArrow1.x}
          y2={ptDimBArrow1.y}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          vectorEffect="non-scaling-stroke"
          stroke={color}
          x1={ptDimB.x}
          y1={ptDimB.y}
          x2={ptDimBArrow2.x}
          y2={ptDimBArrow2.y}
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
