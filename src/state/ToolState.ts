import { PointID, SketchElementID, XY } from "./AppState";

export type SketchToolState =
  | SketchToolNone
  | SketchToolCreatePoint
  | SketchToolCreateLine
  | SketchToolCreateLineFromPoint
  | SketchToolSelect
  | SketchToolDragPoint
  | SketchToolCreateDistanceConstraint;

export type SketchToolNone = {
  sketchTool: "TOOL_NONE";
};

export type SketchToolSelect = {
  sketchTool: "TOOL_SELECT";
  boxCorner: XY | null;
  selected: ReadonlySet<SketchElementID>;
};

export type SketchToolDragPoint = {
  sketchTool: "TOOL_DRAG_POINT";
  point: PointID;
};

export type SketchToolCreatePoint = {
  sketchTool: "TOOL_CREATE_POINT";
};

export type SketchToolCreateLine = {
  sketchTool: "TOOL_CREATE_LINE";
};
export type SketchToolCreateLineFromPoint = {
  sketchTool: "TOOL_CREATE_LINE_FROM_POINT";
  fromPoint: PointID;
};

export type SketchToolCreateDistanceConstraint = {
  sketchTool: "TOOL_CREATE_DISTANCE_CONSTRAINT";
  pointA: PointID;
  pointB: PointID;
};
