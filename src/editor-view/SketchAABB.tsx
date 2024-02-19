import { memo } from "react";

import { XY } from "../state/AppState";

export type SketchPointProps = {
  endpointA: XY;
  endpointB: XY;
  dashed: boolean;
};

export const SketchAABB = memo(
  ({ endpointA, endpointB, dashed }: SketchPointProps) => {
    return (
      <rect
        vectorEffect="non-scaling-stroke"
        stroke="#aaf"
        fill="rgba(128, 128, 255, 0.05)"
        x={Math.min(endpointA.x, endpointB.x)}
        y={Math.min(endpointA.y, endpointB.y)}
        width={Math.abs(endpointA.x - endpointB.x)}
        height={Math.abs(endpointA.y - endpointB.y)}
        strokeDasharray={dashed ? "8 8" : undefined}
        strokeWidth={1}
      />
    );
  },
);
