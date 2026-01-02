import {
  COLOR_SKETCH_CONSTRUCTION_LINE_STROKE,
  COLOR_SKETCH_LINE_STROKE,
  COLOR_SKETCH_PREVIEW,
  COLOR_SKETCH_SELECT_HALO,
} from "../palette/colors";

export type LineStyle =
  | "sketch"
  | "sketch-construction"
  | "preview"
  | "selection-halo";

// eslint-disable-next-line react-refresh/only-export-components
export const COLOR_FROM_LINE_STYLE: Record<LineStyle, string> = {
  sketch: COLOR_SKETCH_LINE_STROKE,
  "sketch-construction": COLOR_SKETCH_CONSTRUCTION_LINE_STROKE,
  preview: COLOR_SKETCH_PREVIEW,
  "selection-halo": COLOR_SKETCH_SELECT_HALO,
};
