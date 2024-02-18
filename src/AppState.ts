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

export type SketchToolState = SketchToolNone | SketchToolCreatePoint;

export type SketchToolNone = {
  sketchTool: "TOOL_NONE";
};

export type SketchToolCreatePoint = {
  sketchTool: "TOOL_CREATE_POINT";
};

export const APP_STATE_INITIAL: AppState = {
  view: { center: { x: 0, y: 0 }, size: 200 },
  controls: { panning: false, activeSketchTool: { sketchTool: "TOOL_NONE" } },
  sketch: {
    sketchElements: [],
  },
};

export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };

export type SketchElement = SketchElementPoint;
export type SketchElementID = PointID;

/**
 * The ID of a point.
 */
export class PointID extends ID {}

/**
 * A movable point in the sketch.
 */
export type SketchElementPoint = {
  sketchElement: "SketchElementPoint";
  id: PointID;
  position: XY;
};
