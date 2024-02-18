import { memo } from "react";

export const EditorAxes = memo(() => {
  const EXTENT = 3000;
  const SPACING = 50;
  const COUNT = 20;

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
      />,
      <line
        key={`y${i}`}
        x1={i * SPACING}
        y1={-EXTENT}
        x2={i * SPACING}
        y2={EXTENT}
        stroke={stroke}
      />,
    );
  }

  for (let i = 1; i <= COUNT; i++) {
    addLine(i, "var(--editor-axis-stroke-secondary)");
    addLine(-i, "var(--editor-axis-stroke-secondary)");
  }
  addLine(0, "var(--editor-axis-stroke-primary)");

  return elements;
});
