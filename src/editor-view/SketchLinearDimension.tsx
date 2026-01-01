import { memo, useContext, useLayoutEffect, useRef, useState } from "react";
import {
  COLOR_SKETCH_CONSTRAINT,
  COLOR_SKETCH_SELECT_HALO,
} from "../palette/colors";
import { XY } from "../state/AppState";
import {
  distanceBetweenPoints,
  EPS,
  intersectionBetweenTwoLineSegments,
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

    const [textBounds, setTextBounds] = useState<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);

    const labelTextRef = useRef<SVGTextElement | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
      if (labelTextRef.current === null && textBounds !== null) {
        setTextBounds(null);
        return;
      } else if (labelTextRef.current !== null) {
        const bbox = labelTextRef.current.getBBox();
        if (
          textBounds?.left !== bbox.x ||
          textBounds?.top !== bbox.y ||
          textBounds?.width !== bbox.width ||
          textBounds?.height !== bbox.height
        ) {
          setTextBounds({
            left: bbox.x,
            top: bbox.y,
            width: bbox.width,
            height: bbox.height,
          });
        }
      }
    });

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

    const linesToDraw = (() => {
      let lines: Array<{ a: XY; b: XY }> = [];

      lines.push({
        a: ptDimA,
        b: ptDimB,
      });

      // Lines can be cut and/or filtered out by boxes.
      if (textBounds !== null) {
        const isInBox = (p: XY): boolean => {
          const dx = Math.abs(textBounds.left + textBounds.width / 2 - p.x);
          const dy = Math.abs(textBounds.top + textBounds.height / 2 - p.y);

          return (
            Math.max(dx - textBounds.width / 2, dy - textBounds.height / 2) <
            EPS
          );
        };

        const textTopLeft = {
          x: textBounds.left,
          y: textBounds.top,
        };
        const textTopRight = {
          x: textBounds.left + textBounds.width,
          y: textBounds.top,
        };
        const textBottomLeft = {
          x: textBounds.left,
          y: textBounds.top + textBounds.height,
        };
        const textBottomRight = {
          x: textBounds.left + textBounds.width,
          y: textBounds.top + textBounds.height,
        };

        for (const segmentSide of [
          { a: textBottomLeft, b: textBottomRight },
          { a: textBottomRight, b: textTopRight },
          { a: textTopLeft, b: textTopRight },
          { a: textBottomLeft, b: textTopLeft },
        ]) {
          lines = lines.flatMap((line) => {
            const hit = intersectionBetweenTwoLineSegments(line, segmentSide);
            if (hit === null) {
              return [line];
            }
            return [
              { a: line.a, b: hit },
              { a: hit, b: line.b },
            ];
          });

          lines = lines.filter((line) => {
            if (distanceBetweenPoints(line.a, line.b) < EPS) {
              return false;
            }
            if (isInBox(line.a) && isInBox(line.b)) {
              return false;
            }
            return true;
          });
        }

        return lines;
      }

      return lines;
    })();

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
        {linesToDraw.map((line, index) => (
          <line
            key={index}
            vectorEffect="non-scaling-stroke"
            stroke={color}
            x1={line.a.x}
            y1={line.a.y}
            x2={line.b.x}
            y2={line.b.y}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}

        {dimensionStyle === "normal" && (
          <text
            ref={labelTextRef}
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
