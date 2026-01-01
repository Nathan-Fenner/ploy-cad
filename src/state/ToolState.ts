import {
  ConstraintPointLineDistanceID,
  ConstraintPointPointDistanceID,
  LineID,
  PointID,
  SketchElementID,
  XY,
} from "./AppState";

export type SketchToolState =
  | SketchToolNone
  | SketchToolCreatePoint
  | SketchToolCreateLine
  | SketchToolCreateLineFromPoint
  | SketchToolCreateArc
  | SketchToolCreateArcFromPoint
  | SketchToolCreateArcFromTwoPoints
  | SketchToolSelect
  | SketchToolDragPoint
  | SketchToolCreateDistanceConstraint
  | SketchToolCreatePointLineDistanceConstraint
  | SketchToolEditDimension;

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
  readonly geometry:
    | PointID
    | ConstraintPointPointDistanceID
    | ConstraintPointLineDistanceID;
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

export type SketchToolCreateArc = {
  sketchTool: "TOOL_CREATE_ARC";
};
export type SketchToolCreateArcFromPoint = {
  sketchTool: "TOOL_CREATE_ARC_FROM_POINT";
  endpointA: PointID;
};

export type SketchToolCreateArcFromTwoPoints = {
  sketchTool: "TOOL_CREATE_ARC_FROM_TWO_POINTS";
  endpointA: PointID;
  endpointB: PointID;
};

export type SketchToolCreateDistanceConstraint = {
  sketchTool: "TOOL_CREATE_DISTANCE_CONSTRAINT";
  pointA: PointID;
  pointB: PointID;
};

export type SketchToolCreatePointLineDistanceConstraint = {
  sketchTool: "SketchToolCreatePointLineDistanceConstraint";
  point: PointID;
  line: LineID;
};

export type SketchToolEditDimension = {
  sketchTool: "TOOL_EDIT_DIMENSION";
  dimension: ConstraintPointPointDistanceID;
  selected: ReadonlySet<SketchElementID>;
};
