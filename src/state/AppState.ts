import { ID } from "../id";
import { SketchToolState } from "./ToolState";

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

  undoState: UndoState;
};

export type UndoState = {
  /**
   * A stack of previous states to revert to.
   */
  undoStack: readonly {
    state: {
      view: View;
      sketch: SketchState;
    };
    key: string | null;
  }[];
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

export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };

export type SketchElement =
  | SketchElementPoint
  | SketchElementLine
  | SketchElementConstraintFixed
  | SketchElementConstraintVertical
  | SketchElementConstraintDistance;
export type SketchElementID = SketchElement["id"];

export type TypeCorrespondingToSketchElementID<ID> =
  TypeCorrespondingToSketchElementIDHelper<ID, SketchElement>;
type TypeCorrespondingToSketchElementIDHelper<ID, T> = T extends {
  id: ID;
}
  ? T
  : never;

/**
 * The ID of a point.
 */
export class PointID extends ID {
  __point: void = undefined;
}

/**
 * The ID of a line.
 */
export class LineID extends ID {
  __line: void = undefined;
}

export class ConstraintID extends ID {
  __constraint: void = undefined;
}

export function isPointID(id: SketchElementID): id is PointID {
  return id instanceof PointID;
}

export function isLineID(id: SketchElementID): id is LineID {
  return id instanceof LineID;
}

export function isConstraintFixedID(
  id: SketchElementID,
): id is ConstraintFixedID {
  return id instanceof ConstraintFixedID;
}

export function isConstraintVerticalID(
  id: SketchElementID,
): id is ConstraintVerticalID {
  return id instanceof ConstraintVerticalID;
}

export function isConstraintDistanceID(
  id: SketchElementID,
): id is ConstraintDistanceID {
  return id instanceof ConstraintDistanceID;
}

export class ConstraintFixedID extends ID {
  __constraintFixed: void = undefined;
}

export class ConstraintVerticalID extends ID {
  __constraintVertical: void = undefined;
}

export class ConstraintDistanceID extends ID {
  __constraintDistance: void = undefined;
}

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

const getElementCacheMap = new WeakMap<
  SketchState,
  ReadonlyMap<SketchElementID, SketchElement>
>();
function getElementCache(
  sketch: SketchState,
): ReadonlyMap<SketchElementID, SketchElement> {
  if (getElementCacheMap.has(sketch)) {
    return getElementCacheMap.get(sketch)!;
  }
  const newMap = new Map();
  for (const element of sketch.sketchElements) {
    newMap.set(element.id, element);
  }
  getElementCacheMap.set(sketch, newMap);
  return newMap;
}

/**
 * Returns the element with the corresponding ID in this app.
 * This function is cached, so it is efficient to call it repeatedly with
 * the same or different IDs, provided that they belong to the same underlying app.
 */
export function getElement<ID extends SketchElementID>(
  app: AppState,
  id: ID,
): TypeCorrespondingToSketchElementID<ID> {
  const cache = getElementCache(app.sketch);
  if (!cache.has(id)) {
    throw new Error(`the application has no sketch element '${id}'`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cache.get(id)! as any;
}

export function getPointPosition(app: AppState, point: PointID): XY {
  return getElement(app, point).position;
}

export type SketchElementConstraintFixed = {
  sketchElement: "SketchElementConstraintFixed";
  id: ConstraintFixedID;
  point: PointID;
  position: XY;
};

export type SketchElementConstraintVertical = {
  sketchElement: "SketchElementConstraintVertical";
  id: ConstraintVerticalID;
  pointA: PointID;
  pointB: PointID;
};

export type SketchElementConstraintDistance = {
  sketchElement: "SketchElementConstraintDistance";
  id: ConstraintDistanceID;
  pointA: PointID;
  pointB: PointID;
  distance: number /** TODO: Replace this with a formula */;

  cosmetic: {
    /**
     * The ratio along the line pointA-->pointB where the label is placed.
     */
    t: number;
    /**
     * The offset (in sketch units) of the label from the line.
     */
    offset: number;
  };
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
      {
        sketchElement: "SketchElementConstraintFixed",
        id: new ConstraintFixedID("C_A"),
        point: new PointID("A"),
        position: { x: 40, y: 40 },
      },
      {
        sketchElement: "SketchElementConstraintVertical",
        id: new ConstraintVerticalID("C_AB_VERT"),
        pointA: new PointID("A"),
        pointB: new PointID("B"),
      },
      {
        sketchElement: "SketchElementConstraintDistance",
        id: new ConstraintDistanceID("C_DIST"),
        pointA: new PointID("A"),
        pointB: new PointID("B"),
        distance: 200,
        cosmetic: {
          t: 0.75,
          offset: 25,
        },
      },
    ],
  },
  undoState: {
    undoStack: [],
  },
};
