import { memo, useContext } from "react";
import { PixelSize } from "../canvas/Canvas";

function colorMix(a: string, b: string, alpha: number): string {
  return `color-mix(in srgb, ${a} ${Math.floor(
    Math.max(0, Math.min(1, alpha)) * 100,
  )}%, ${b})`;
}

const BAND_SIZE = 5;
const COUNT = 200;

export const EditorAxes = memo(() => {
  const pixelSize = useContext(PixelSize);
  const STROKE_WIDTH = pixelSize * 2;

  const fractionalGridLevel = Math.log(pixelSize * 50) / Math.log(BAND_SIZE);
  const SPACING = Math.pow(BAND_SIZE, Math.floor(fractionalGridLevel));

  const EXTENT = COUNT * SPACING;

  const elements: JSX.Element[] = [];

  function addLine(i: number, stroke: string): void {
    elements.push(
      <line
        key={`x${i}`}
        x1={-EXTENT}
        y1={i * SPACING}
        x2={EXTENT}
        y2={i * SPACING}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />,
      <line
        key={`y${i}`}
        x1={i * SPACING}
        y1={-EXTENT}
        x2={i * SPACING}
        y2={EXTENT}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />,
    );
  }

  const fractionalLevelPart =
    fractionalGridLevel - Math.floor(fractionalGridLevel);

  const COLOR_BACKGROUND = "var(--editor-background)";
  const COLOR_SECONDARY = "var(--editor-axis-stroke-secondary)";
  const COLOR_TERTIARY = "var(--editor-axis-stroke-tertiary)";

  const lowerAlpha = Math.max(0, Math.min(1, 2 - fractionalLevelPart * 3));
  const lowerColor = colorMix(COLOR_TERTIARY, COLOR_BACKGROUND, lowerAlpha);
  const upperColor = colorMix(COLOR_SECONDARY, COLOR_TERTIARY, lowerAlpha);

  for (let i = 1; i <= COUNT; i++) {
    if (i % BAND_SIZE === 0) {
      continue;
    }
    const stroke =
      i % (BAND_SIZE * BAND_SIZE) === 0
        ? COLOR_SECONDARY
        : i % BAND_SIZE === 0
        ? upperColor
        : lowerColor;
    addLine(i, stroke);
    addLine(-i, stroke);
  }
  for (let i = BAND_SIZE; i <= COUNT; i += BAND_SIZE) {
    const stroke =
      i % (BAND_SIZE * BAND_SIZE) === 0
        ? COLOR_SECONDARY
        : i % BAND_SIZE === 0
        ? upperColor
        : lowerColor;
    addLine(i, stroke);
    addLine(-i, stroke);
  }
  addLine(0, "var(--editor-axis-stroke-primary)");

  return elements;
});
