import { ID } from "./id";

/**
 * The state of a window/application, including the view and currently-selected tools.
 */
export type AppState = {
  /**
   * The viewport in the document.
   */
  view: View;
  /**
   * The tools that are currently active.
   */
  controls: AppControls;
  /**
   * The sketch
   */
  sketch: SketchState;
};

export type SketchState = {
  /**
   * All of the editable elements in the sketch.
   */
  sketchElements: readonly SketchElement[];
};

export type AppControls = {
  panning: boolean;
  activeSketchTool: SketchToolState;
};

export type SketchToolState =
  | SketchToolNone
  | SketchToolCreatePoint
  | SketchToolCreateLine
  | SketchToolCreateLineFromPoint
  | SketchToolSelect;

export type SketchToolNone = {
  sketchTool: "TOOL_NONE";
};

export type SketchToolSelect = {
  sketchTool: "TOOL_SELECT";
  boxCorner: XY | null;
  selected: ReadonlySet<SketchElementID>;
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

export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };

export type SketchElement = SketchElementPoint | SketchElementLine;
export type SketchElementID = PointID | LineID;

/**
 * The ID of a point.
 */
export class PointID extends ID {}

/**
 * The ID of a line.
 */
export class LineID extends ID {}

/**
 * A movable point in the sketch.
 */
export type SketchElementPoint = {
  sketchElement: "SketchElementPoint";
  id: PointID;
  position: XY;
};

/**
 * A line joining two points.
 */
export type SketchElementLine = {
  sketchElement: "SketchElementLine";
  id: LineID;
  endpointA: PointID;
  endpointB: PointID;
};

export const APP_STATE_INITIAL: AppState = {
  view: { center: { x: 0, y: 0 }, size: 200 },
  controls: { panning: false, activeSketchTool: { sketchTool: "TOOL_NONE" } },
  sketch: {
    sketchElements: [
      {
        sketchElement: "SketchElementPoint",
        id: new PointID("A"),
        position: { x: 40, y: 40 },
      },
      {
        sketchElement: "SketchElementPoint",
        id: new PointID("B"),
        position: { x: 20, y: -20 },
      },
      {
        sketchElement: "SketchElementLine",
        id: new LineID("AB"),
        endpointA: new PointID("A"),
        endpointB: new PointID("B"),
      },
    ],
  },
};
