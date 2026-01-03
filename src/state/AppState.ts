/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  distanceBetweenPoints,
  dotProduct,
  pointAdd,
  pointNormalize,
  pointScale,
  pointSubtract,
} from "../geometry/vector";
import { ID } from "../id";
import { registerConstructor } from "../save/saveToJson";
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
  currentSketchStyle: "sketch" | "sketch-construction";
};

export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };

export type SketchElement<Tag = unknown> =
  | SketchElementPoint<Tag>
  | SketchElementLine<Tag>
  | SketchElementArc<Tag>
  | SketchElementConstraintFixed<Tag>
  | SketchElementConstraintAxisAligned<Tag>
  | SketchElementConstraintPointPointDistance<Tag>
  | SketchElementConstraintPointLineDistance<Tag>
  | SketchElementConstraintPointOnLine<Tag>
  | SketchElementConstraintPointOnArc<Tag>;
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
export class PointID<Tag = unknown> extends ID {
  readonly __point: void = undefined;
  readonly __tag: Tag = undefined as any;

  public castTag<NewTag>(_oldTag: Tag, _newTag: NewTag): PointID<NewTag> {
    return this as any;
  }
}

registerConstructor(PointID<any>, {
  serialize: (p: PointID<any>) => p.id,
  deserialize: (p: any): PointID<any> => new PointID<any>(p),
});

/**
 * The ID of a line.
 */
export class LineID extends ID {
  __line: void = undefined;
}

registerConstructor(LineID, {
  serialize: (p: LineID) => p.id,
  deserialize: (p: any): LineID => new LineID(p),
});

export class ArcID extends ID {
  __arc: void = undefined;
}

registerConstructor(ArcID, {
  serialize: (p: ArcID) => p.id,
  deserialize: (p: any): ArcID => new ArcID(p),
});

export abstract class ConstraintID extends ID {
  __constraint: void = undefined;
}

export function isPointID(id: SketchElementID): id is PointID {
  return id instanceof PointID;
}

export function isLineID(id: SketchElementID): id is LineID {
  return id instanceof LineID;
}

export function isLineElement(
  element: SketchElement,
): element is SketchElementLine {
  return isLineID(element.id);
}

export function isArcID(id: SketchElementID): id is ArcID {
  return id instanceof ArcID;
}

export function isArcElement(
  element: SketchElement,
): element is SketchElementArc {
  return isArcID(element.id);
}

export function isConstraintFixedID(
  id: SketchElementID,
): id is ConstraintFixedID {
  return id instanceof ConstraintFixedID;
}

export function isConstraintAxisAlignedID(
  id: SketchElementID,
): id is ConstraintAxisAlignedID {
  return id instanceof ConstraintAxisAlignedID;
}

export function isConstraintPointPointDistanceID(
  id: SketchElementID,
): id is ConstraintPointPointDistanceID {
  return id instanceof ConstraintPointPointDistanceID;
}

export function isConstraintPointLineDistanceID(
  id: SketchElementID,
): id is ConstraintPointLineDistanceID {
  return id instanceof ConstraintPointLineDistanceID;
}

export function isConstraintPointOnLineID(
  id: SketchElementID,
): id is ConstraintPointOnLineID {
  return id instanceof ConstraintPointOnLineID;
}

export function isConstraintPointOnArcID(
  id: SketchElementID,
): id is ConstraintPointOnArcID {
  return id instanceof ConstraintPointOnArcID;
}

export class ConstraintFixedID extends ID {
  __constraintFixed: void = undefined;
}

registerConstructor(ConstraintFixedID, {
  serialize: (p: ConstraintFixedID) => p.id,
  deserialize: (p: any): ConstraintFixedID => new ConstraintFixedID(p),
});

export class ConstraintAxisAlignedID extends ID {
  __constraintAxisAligned: void = undefined;
}

registerConstructor(ConstraintAxisAlignedID, {
  serialize: (p: ConstraintAxisAlignedID) => p.id,
  deserialize: (p: any): ConstraintAxisAlignedID =>
    new ConstraintAxisAlignedID(p),
});

export class ConstraintPointPointDistanceID extends ID {
  __constraintPointPointDistance: void = undefined;
}

registerConstructor(ConstraintPointPointDistanceID, {
  serialize: (p: ConstraintPointPointDistanceID) => p.id,
  deserialize: (p: any): ConstraintPointPointDistanceID =>
    new ConstraintPointPointDistanceID(p),
});

export class ConstraintPointLineDistanceID extends ID {
  __constraintPointLineDistance: void = undefined;
}

registerConstructor(ConstraintPointLineDistanceID, {
  serialize: (p: ConstraintPointLineDistanceID) => p.id,
  deserialize: (p: any): ConstraintPointLineDistanceID =>
    new ConstraintPointLineDistanceID(p),
});

export class ConstraintPointOnLineID extends ID {
  __constraintPointOnLine: void = undefined;
}

registerConstructor(ConstraintPointOnLineID, {
  serialize: (p: ConstraintPointOnLineID) => p.id,
  deserialize: (p: any): ConstraintPointOnLineID =>
    new ConstraintPointOnLineID(p),
});

export class ConstraintPointOnArcID extends ID {
  __constraintPointOnArc: void = undefined;
}

registerConstructor(ConstraintPointOnArcID, {
  serialize: (p: ConstraintPointOnArcID) => p.id,
  deserialize: (p: any): ConstraintPointOnArcID =>
    new ConstraintPointOnArcID(p),
});

/**
 * A movable point in the sketch.
 */
export type SketchElementPoint<Tag = unknown> = {
  sketchElement: "SketchElementPoint";
  id: PointID<Tag>;
  position: XY;
};

/**
 * A line joining two points.
 */
export type SketchElementLine<Tag = unknown> = {
  sketchElement: "SketchElementLine";
  id: LineID;
  endpointA: PointID<Tag>;
  endpointB: PointID<Tag>;
  sketchStyle: "sketch" | "sketch-construction";
};

/**
 * An arc joining two points, with the specified center.
 * There is an implicit assumption that the two points
 * are equidistant from the center of the circle.
 */
export type SketchElementArc<Tag = unknown> = {
  sketchElement: "SketchElementArc";
  id: ArcID;
  endpointA: PointID<Tag>;
  endpointB: PointID<Tag>;
  center: PointID<Tag>;
  sketchStyle: "sketch" | "sketch-construction";
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
  return getSketchElement(app.sketch, id);
}

export function getSketchElement<ID extends SketchElementID>(
  sketch: SketchState,
  id: ID,
): TypeCorrespondingToSketchElementID<ID> {
  const cache = getElementCache(sketch);
  if (!cache.has(id)) {
    throw new Error(`the application has no sketch element '${id}'`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cache.get(id)! as any;
}

export function getPointPosition(app: AppState, point: PointID): XY {
  return getElement(app, point).position;
}

export type SketchElementConstraintFixed<Tag = unknown> = {
  sketchElement: "SketchElementConstraintFixed";
  id: ConstraintFixedID;
  point: PointID<Tag>;
  position: XY;
};

export type SketchElementConstraintAxisAligned<Tag = unknown> = {
  sketchElement: "SketchElementConstraintAxisAligned";
  axis: "horizontal" | "vertical";
  id: ConstraintAxisAlignedID;
  pointA: PointID<Tag>;
  pointB: PointID<Tag>;
};

export type SketchElementConstraintPointOnLine<Tag = unknown> = {
  sketchElement: "SketchElementConstraintPointOnLine";
  id: ConstraintPointOnLineID;
  point: PointID<Tag>;
  line: LineID;
};

export type SketchElementConstraintPointOnArc<Tag = unknown> = {
  sketchElement: "SketchElementConstraintPointOnArc";
  id: ConstraintPointOnArcID;
  point: PointID<Tag>;
  arc: ArcID;
};

export function computeConstraintDistanceParameters({
  a,
  b,
  labelPosition,
}: {
  a: XY;
  b: XY;
  labelPosition: XY;
}): { t: number; offset: number } {
  const delta = pointSubtract(b, a);
  const direction = pointNormalize(delta);
  const perpendicular = { x: -direction.y, y: direction.x };
  const t =
    dotProduct(direction, pointSubtract(labelPosition, a)) /
    distanceBetweenPoints(a, b);
  const offset = dotProduct(perpendicular, pointSubtract(labelPosition, a));
  return { t, offset };
}

export function computeConstraintDistanceHandlePosition({
  a,
  b,
  t,
  offset,
}: {
  a: XY;
  b: XY;
  t: number;
  offset: number;
}): XY {
  const delta = pointSubtract(b, a);
  const perpendicular = pointNormalize({ x: -delta.y, y: delta.x });
  return pointAdd(
    pointAdd(a, pointScale(delta, t)),
    pointScale(perpendicular, offset),
  );
}

export type SketchElementConstraintPointPointDistance<Tag = unknown> = {
  sketchElement: "SketchElementConstraintPointPointDistance";
  id: ConstraintPointPointDistanceID;
  pointA: PointID<Tag>;
  pointB: PointID<Tag>;
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

export type SketchElementConstraintPointLineDistance<Tag = unknown> = {
  sketchElement: "SketchElementConstraintPointLineDistance";
  id: ConstraintPointLineDistanceID;
  point: PointID<Tag>;
  line: LineID;
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
  controls: {
    panning: false,
    activeSketchTool: { sketchTool: "TOOL_NONE" },
    currentSketchStyle: "sketch",
  },
  sketch: {
    sketchElements: [
      {
        sketchElement: "SketchElementPoint",
        id: new PointID("Origin"),
        position: { x: 0, y: 0 },
      },
      {
        sketchElement: "SketchElementConstraintFixed",
        id: new ConstraintFixedID("C_Origin"),
        point: new PointID("Origin"),
        position: { x: 0, y: 0 },
      },
    ],
  },
  undoState: {
    undoStack: [],
  },
};
