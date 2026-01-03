import {
  AppState,
  ConstraintPointPointDistanceID,
  ConstraintFixedID,
  ConstraintAxisAlignedID,
  LineID,
  PointID,
  SketchElementID,
  View,
  computeConstraintDistanceHandlePosition,
  computeConstraintDistanceParameters,
  getElement,
  getPointPosition,
  isConstraintPointPointDistanceID,
  isConstraintFixedID,
  isConstraintAxisAlignedID,
  isLineID,
  isPointID,
  SketchElement,
  isConstraintPointOnLineID,
  ConstraintPointOnLineID,
  isArcID,
  ArcID,
  isConstraintPointOnArcID,
  ConstraintPointOnArcID,
  isConstraintPointLineDistanceID,
  ConstraintPointLineDistanceID,
} from "./AppState";
import {
  distanceBetweenPoints,
  dotProduct,
  pointAdd,
  pointNormalize,
  pointProjectOntoLine,
  pointSubtract,
} from "../geometry/vector";
import { ID } from "../id";
import {
  handleToolEffect,
  INITIAL_TOOL_STATE,
  runTool,
  ToolFlowSend,
  type SketchToolState,
  type ToolFunction,
  type ToolInterface,
} from "./ToolState";
import { applyConstraint } from "../solver/constrain";
import { findClosestGeometryNear } from "./findClosestGeometryNear";
import { findAllGeometryFullyWithinBox } from "./findAllGeometryFullyWithinBox";
import { findAllGeometryPartiallyWithinBox } from "./findAllGeometryPartiallyWithinBox";
import { findOrCreatePointNear } from "./findOrCreatePointNear";
import { SketchMarker } from "../editor-view/SketchMarker";
import { SketchLine } from "../editor-view/SketchLine";

/**
 * A type-erased action definition.
 */
export interface AppActionErased {
  action: "erased";
  registeredActionName: string;
  actionProps: unknown;
}

const globalActionDefinitions: Map<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppActionDefinition<any>
> = new Map();

export type AppActionDefinition<Props> = {
  /**
   * If `true` (or unset), this action will automatically be added to the undo stack.
   *
   * default: `true`
   */
  addToUndoStack?: boolean;
  run: (app: AppState, props: Props) => AppState;
};

function normalizeDefinition<Props>(
  actionName: string,
  def: AppActionDefinition<Props>,
): AppActionDefinition<Props> {
  const addToUndoStack = def.addToUndoStack ?? true;
  const run = (app: AppState, props: Props): AppState => {
    if (addToUndoStack) {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: actionName,
      });
    }
    return def.run(app, props);
  };
  return {
    addToUndoStack,
    run,
  };
}

/**
 * A function that creates an action object.
 */
export type AppActionConstructor<Props> = (props: Props) => AppAction;

export function registerAppAction<Props>(
  actionName: string,
  definition: AppActionDefinition<Props>,
): AppActionConstructor<Props> {
  if (globalActionDefinitions.has(actionName)) {
    throw new Error(`cannot register the action '${actionName}' twice`);
  }
  globalActionDefinitions.set(
    actionName,
    normalizeDefinition(actionName, definition),
  );

  return (actionProps: Props): AppAction => {
    return {
      action: "erased",
      registeredActionName: actionName,
      actionProps,
    };
  };
}

const globalTools = new Map<string, ToolFunction>();

/**
 * Registers a tool function.
 *
 * Tool functions must be completely deterministic.
 * The `ToolInterface` callbacks throw special exceptions which
 * must not be caught, or the tool will misbehave.
 */
export function registerTool(
  toolName: string,
  toolFunction: ToolFunction,
): void {
  if (globalTools.has(toolName)) {
    throw new Error(`cannot register already-registered tool '${toolName}'`);
  }
  globalTools.set(toolName, toolFunction);
}

export type AppAction =
  | AppActionUndo
  | AppActionPushToUndoStack
  | AppActionChangeView
  | AppActionBeginPanning
  | AppActionStopPanning
  | AppActionChangeTool
  | AppActionInterfaceClick
  | AppActionInterfaceClickRelease
  | AppActionInterfaceMouseMove
  | AppActionInterfaceKeyDown
  | AppActionSketchCreatePoint
  | AppActionSketchCreateArc
  | AppActionSketchCreateFixedConstraint
  | AppActionSketchCreateConstraintAxisAligned
  | AppActionSketchCreateConstraintDistance
  | AppActionSketchCreateConstraintPointLineDistance
  | AppActionSketchCreateConstraintPointOnLine
  | AppActionSketchCreateConstraintPointOnArc
  | AppActionSketchMovePoint
  | AppActionSketchDelete
  | AppActionSketchUpdateConstraint
  | AppActionSketchMergePoints
  | AppActionErased;

export type AppActionUndo = {
  action: "UNDO";
};

export type AppActionPushToUndoStack = {
  action: "PUSH_TO_UNDO_STACK";
  debugName: string;
  key: null | string;
};

export type AppActionChangeTool = {
  action: "STATE_CHANGE_TOOL";
  newTool: SketchToolState;
};

export type AppActionChangeView = {
  action: "CHANGE_VIEW";
  newView: View;
};

export type AppActionBeginPanning = {
  action: "BEGIN_PANNING";
};
export type AppActionStopPanning = {
  action: "STOP_PANNING";
};

export type XY = { readonly x: number; readonly y: number };

export type AppActionInterfaceClick = {
  action: "INTERFACE_CLICK";
  at: XY;
  shiftKey: boolean;
  isDouble: boolean;
};
export type AppActionInterfaceClickRelease = {
  action: "INTERFACE_CLICK_RELEASE";
  at: XY;
  shiftKey: boolean;
};
export type AppActionInterfaceMouseMove = {
  action: "INTERFACE_MOUSE_MOVE";
  position: XY;
  delta: XY;
};
export type AppActionInterfaceKeyDown = {
  action: "INTERFACE_KEYDOWN";
  key: string;
  ctrlKey: boolean;
};

export type AppActionSketchCreatePoint = {
  action: "SKETCH_CREATE_POINT";
  id: PointID;
  at: XY;
};

export type AppActionSketchCreateArc = {
  action: "SKETCH_CREATE_ARC";
  id: ArcID;
  endpointA: PointID;
  endpointB: PointID;
  center: PointID;
};

export type AppActionSketchCreateFixedConstraint = {
  action: "SKETCH_CREATE_FIXED_CONSTRAINT";
  id: ConstraintFixedID;
  point: PointID;
  position: XY;
};

export type AppActionSketchCreateConstraintAxisAligned = {
  action: "SKETCH_CREATE_CONSTRAINT_AXIS_ALIGNED";
  axis: "horizontal" | "vertical";
  id: ConstraintAxisAlignedID;
  pointA: PointID;
  pointB: PointID;
};

export type AppActionSketchCreateConstraintDistance = {
  action: "SKETCH_CREATE_CONSTRAINT_DISTANCE";
  id: ConstraintPointPointDistanceID;
  pointA: PointID;
  pointB: PointID;
  offset: number;
  t: number;
  distance: number;
};

export type AppActionSketchCreateConstraintPointLineDistance = {
  action: "AppActionSketchCreateConstraintPointLineDistance";
  id: ConstraintPointLineDistanceID;
  point: PointID;
  line: LineID;
  offset: number;
  t: number;
  distance: number;
};

export type AppActionSketchCreateConstraintPointOnLine = {
  action: "SKETCH_CREATE_CONSTRAINT_POINT_ON_LINE";
  id: ConstraintPointOnLineID;
  point: PointID;
  line: LineID;
};

export type AppActionSketchCreateConstraintPointOnArc = {
  action: "SKETCH_CREATE_CONSTRAINT_POINT_ON_ARC";
  id: ConstraintPointOnArcID;
  point: PointID;
  arc: ArcID;
};

export type AppActionSketchMovePoint = {
  action: "SKETCH_MOVE_POINT";
  point:
    | PointID
    | ConstraintPointPointDistanceID
    | ConstraintPointLineDistanceID;
  toPosition: XY;
};

export type AppActionSketchDelete = {
  action: "SKETCH_DELETE";
  toDelete: readonly SketchElementID[];
};

export type AppActionSketchUpdateConstraint = {
  action: "SKETCH_UPDATE_CONSTRAINT";
  dimensionID: ConstraintPointPointDistanceID;
  newDistance: number;
};

export type AppActionSketchMergePoints = {
  action: "SKETCH_MERGE_POINTS";
  points: readonly PointID[];
};

export const SELECT_NEAR_THRESHOLD = 0.015;

export function isPointInAABB({
  point,
  min,
  max,
  slack = 0,
}: {
  point: XY;
  min: XY;
  max: XY;
  slack?: number;
}): boolean {
  return (
    point.x >= min.x - slack &&
    point.x <= max.x + slack &&
    point.y >= min.y - slack &&
    point.y <= max.y + slack
  );
}

export function applyAppAction(
  app: AppState,
  ...actions: AppAction[]
): AppState {
  for (const action of actions) {
    app = applyAppActionImplementation(app, action);
  }
  return app;
}

export function applyAppActionImplementation(
  app: AppState,
  action: AppAction,
): AppState {
  switch (action.action) {
    case "erased": {
      const registeredAction = globalActionDefinitions.get(
        action.registeredActionName,
      );
      if (!registeredAction) {
        throw new Error(
          `no action registered for name '${action.registeredActionName}`,
        );
      }
      return registeredAction.run(app, action.actionProps);
    }
    case "UNDO": {
      if (app.undoState.undoStack.length > 0) {
        const lastEntry =
          app.undoState.undoStack[app.undoState.undoStack.length - 1];
        return {
          controls: {
            panning: app.controls.panning,
            currentSketchStyle: app.controls.currentSketchStyle,
            activeSketchTool: { sketchTool: "TOOL_NONE" },
          },
          view: lastEntry.state.view,
          sketch: lastEntry.state.sketch,
          undoState: {
            undoStack: app.undoState.undoStack.slice(
              0,
              app.undoState.undoStack.length - 1,
            ),
          },
        };
      }
      return app;
    }
    case "PUSH_TO_UNDO_STACK": {
      if (
        action.key !== null &&
        app.undoState.undoStack.length > 0 &&
        app.undoState.undoStack[app.undoState.undoStack.length - 1].key ===
          action.key
      ) {
        // Since this action already had an original state recorded, we don't need to
        // write a new one.
        return app;
      }

      return {
        ...app,
        undoState: {
          undoStack: [
            ...app.undoState.undoStack,
            { state: app, key: action.key },
          ],
        },
      };
    }
    case "CHANGE_VIEW":
      return {
        ...app,
        view: action.newView,
      };
    case "BEGIN_PANNING":
      if (app.controls.panning) {
        return app;
      }
      return {
        ...app,
        controls: {
          ...app.controls,
          panning: true,
        },
      };
    case "STOP_PANNING":
      if (!app.controls.panning) {
        return app;
      }
      return {
        ...app,
        controls: {
          ...app.controls,
          panning: false,
        },
      };
    case "STATE_CHANGE_TOOL": {
      if (action.newTool.sketchTool === "TOOL_FLOW") {
        const flowTool = action.newTool;
        if (flowTool.flowNeeds.recordType === "abort") {
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" },
          });
        }
        if (flowTool.flowNeeds.recordType === "generate-id") {
          const nextState = handleToolEffect(flowTool.flowState, {
            recordType: "generate-id",
            receive: {
              id: new flowTool.flowNeeds.send.idClass(ID.uniqueID()),
            },
          });
          const nextNeeds = runTool(
            globalTools.get(flowTool.toolName)!,
            nextState,
          );
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_FLOW",
              toolName: flowTool.toolName,
              flowState: nextState,
              flowNeeds: nextNeeds,
            },
          });
        }
        if (flowTool.flowNeeds.recordType === "apply-action") {
          // Apply this action, then move on to the next tool step.
          app = applyAppAction(app, flowTool.flowNeeds.send.action);
          const nextState = handleToolEffect(flowTool.flowState, {
            recordType: "apply-action",
            receive: null,
          });
          const nextNeeds = runTool(
            globalTools.get(flowTool.toolName)!,
            nextState,
          );
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_FLOW",
              toolName: flowTool.toolName,
              flowState: nextState,
              flowNeeds: nextNeeds,
            },
          });
        }
      }

      return {
        ...app,
        controls: {
          ...app.controls,
          activeSketchTool: action.newTool,
        },
      };
    }
    case "INTERFACE_CLICK": {
      const tool = app.controls.activeSketchTool;
      if (
        tool.sketchTool === "TOOL_FLOW" &&
        tool.flowNeeds.recordType === "pick-or-create-point"
      ) {
        const foundPoint = findOrCreatePointNear(app, action.at);
        app = foundPoint.app;

        const nextState = handleToolEffect(tool.flowState, {
          recordType: "pick-or-create-point",
          receive: { point: foundPoint.id },
        });

        const nextTool = runTool(globalTools.get(tool.toolName)!, nextState);

        // Apply the next step to the tool.
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_FLOW",
            toolName: tool.toolName,
            flowState: nextState,
            flowNeeds: nextTool,
          },
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_POINT") {
        // Create a new point.
        const id = ID.uniqueID();
        return applyAppAction(app, {
          action: "SKETCH_CREATE_POINT",
          id: new PointID(id),
          at: action.at,
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_ARC") {
        // Find or create a point near the mouse.
        const { app: newApp, id } = findOrCreatePointNear(app, action.at);
        app = newApp;
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_ARC_FROM_POINT", endpointA: id },
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_ARC_FROM_POINT") {
        const endpointA = tool.endpointA;
        const { app: newApp, id: toPoint } = findOrCreatePointNear(
          app,
          action.at,
        );
        app = newApp;
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_CREATE_ARC_FROM_TWO_POINTS",
            endpointA,
            endpointB: toPoint,
          },
        });
      }
      if (tool.sketchTool === "TOOL_CREATE_ARC_FROM_TWO_POINTS") {
        const { endpointA, endpointB } = tool;
        const { app: newApp, id: toPoint } = findOrCreatePointNear(
          app,
          action.at,
        );
        app = newApp;
        return applyAppAction(
          app,
          {
            action: "SKETCH_CREATE_ARC",
            id: new ArcID(ID.uniqueID()),
            endpointA,
            endpointB,
            center: toPoint,
          },
          {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" },
          },
        );
      }
      if (tool.sketchTool === "TOOL_CREATE_DISTANCE_CONSTRAINT") {
        const pointA = getPointPosition(app, tool.pointA);
        const pointB = getPointPosition(app, tool.pointB);
        const { offset, t } = computeConstraintDistanceParameters({
          a: pointA,
          b: pointB,
          labelPosition: action.at,
        });
        return applyAppAction(
          app,
          {
            action: "SKETCH_CREATE_CONSTRAINT_DISTANCE",
            id: new ConstraintPointPointDistanceID(ID.uniqueID()),
            pointA: tool.pointA,
            pointB: tool.pointB,
            t,
            offset,
            distance: distanceBetweenPoints(pointA, pointB),
          },
          {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" }, // TODO: Edit the newly-created dimension
          },
        );
      }
      if (tool.sketchTool === "SketchToolCreatePointLineDistanceConstraint") {
        const point = getPointPosition(app, tool.point);
        const lineA = getPointPosition(
          app,
          getElement(app, tool.line).endpointA,
        );
        const lineB = getPointPosition(
          app,
          getElement(app, tool.line).endpointB,
        );
        const projected = pointProjectOntoLine(point, {
          a: lineA,
          b: lineB,
        }).point;
        const { offset, t } = computeConstraintDistanceParameters({
          a: point,
          b: projected,
          labelPosition: action.at,
        });

        const delta = pointNormalize(pointSubtract(lineB, lineA));
        const perpendicular = { x: -delta.y, y: delta.x };

        const signedDistance = dotProduct(
          perpendicular,
          pointSubtract(point, projected),
        );

        return applyAppAction(
          app,
          {
            action: "AppActionSketchCreateConstraintPointLineDistance",
            id: new ConstraintPointLineDistanceID(ID.uniqueID()),
            point: tool.point,
            line: tool.line,
            t,
            offset,
            distance: signedDistance,
          },
          {
            action: "STATE_CHANGE_TOOL",
            newTool: { sketchTool: "TOOL_NONE" }, // TODO: Edit the newly-created dimension
          },
        );
      }
      if (
        tool.sketchTool === "TOOL_NONE" ||
        tool.sketchTool === "TOOL_SELECT"
      ) {
        // If we clicked near a point, select it.
        const nearbyGeometry = findClosestGeometryNear(app, action.at);

        if (action.shiftKey && nearbyGeometry !== null) {
          // Select the new geometry, in addition to anything currently selected.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: null,
              selected: new Set([
                ...(tool.sketchTool === "TOOL_SELECT" ? tool.selected : []),
                nearbyGeometry.id,
              ]),
            },
          });
        }

        if (nearbyGeometry === null) {
          // Nothing to select at the click site -- allow the user to select a box.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: action.at,
              selected:
                tool.sketchTool === "TOOL_SELECT" ? tool.selected : new Set(),
            },
          });
        } else if (
          action.isDouble &&
          isConstraintPointPointDistanceID(nearbyGeometry.id) &&
          tool.sketchTool === "TOOL_SELECT" &&
          tool.selected.has(nearbyGeometry.id)
        ) {
          // The user double-clicked a dimension that is already selected.
          // Enter constraint-editing mode.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_EDIT_DIMENSION",
              dimension: nearbyGeometry.id,
              selected: tool.selected,
            },
          });
        } else if (isPointID(nearbyGeometry.id)) {
          // The user clicked on a point -- allow them to move it.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_DRAG_POINT",
              geometry: nearbyGeometry.id,
            },
          });
        } else if (
          isConstraintPointPointDistanceID(nearbyGeometry.id) ||
          isConstraintPointLineDistanceID(nearbyGeometry.id)
        ) {
          // The user clicked on a dimension -- allow them to move it.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_DRAG_POINT",
              geometry: nearbyGeometry.id,
            },
          });
        } else {
          // The user clicked on other geometry -- select it.
          return applyAppAction(app, {
            action: "STATE_CHANGE_TOOL",
            newTool: {
              sketchTool: "TOOL_SELECT",
              boxCorner: null,
              selected: new Set([nearbyGeometry.id]),
            },
          });
        }
      }
      return app;
    }
    case "INTERFACE_CLICK_RELEASE": {
      const existingSelection =
        app.controls.activeSketchTool.sketchTool === "TOOL_SELECT"
          ? app.controls.activeSketchTool.selected
          : [];
      if (
        app.controls.activeSketchTool.sketchTool === "TOOL_SELECT" &&
        app.controls.activeSketchTool.boxCorner !== null
      ) {
        // Select whatever is in the box.
        const withinBox = (
          action.at.x < app.controls.activeSketchTool.boxCorner.x
            ? findAllGeometryPartiallyWithinBox
            : findAllGeometryFullyWithinBox
        )(app, action.at, app.controls.activeSketchTool.boxCorner);
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_SELECT",
            boxCorner: null,
            selected: new Set(
              action.shiftKey
                ? [...existingSelection, ...withinBox]
                : withinBox,
            ),
          },
        });
      }
      if (app.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_SELECT",
            selected: new Set([app.controls.activeSketchTool.geometry]),
            boxCorner: null,
          },
        });
      }
      return app;
    }
    case "INTERFACE_MOUSE_MOVE": {
      if (app.controls.activeSketchTool.sketchTool === "TOOL_DRAG_POINT") {
        if (isPointID(app.controls.activeSketchTool.geometry)) {
          // Drag the point.
          const currentPosition = getPointPosition(
            app,
            app.controls.activeSketchTool.geometry,
          );
          const targetPosition = pointAdd(currentPosition, action.delta);
          return applyAppAction(app, {
            action: "SKETCH_MOVE_POINT",
            point: app.controls.activeSketchTool.geometry,
            toPosition: targetPosition,
          });
        } else if (
          isConstraintPointPointDistanceID(
            app.controls.activeSketchTool.geometry,
          )
        ) {
          const dimension = getElement(
            app,
            app.controls.activeSketchTool.geometry,
          );

          const dimensionHandlePosition =
            computeConstraintDistanceHandlePosition({
              a: getPointPosition(app, dimension.pointA),
              b: getPointPosition(app, dimension.pointB),
              t: dimension.cosmetic.t,
              offset: dimension.cosmetic.offset,
            });

          const targetPosition = pointAdd(
            dimensionHandlePosition,
            action.delta,
          );
          return applyAppAction(app, {
            action: "SKETCH_MOVE_POINT",
            point: app.controls.activeSketchTool.geometry,
            toPosition: targetPosition,
          });
        } else if (
          isConstraintPointLineDistanceID(
            app.controls.activeSketchTool.geometry,
          )
        ) {
          const dimension = getElement(
            app,
            app.controls.activeSketchTool.geometry,
          );

          const point = getPointPosition(app, dimension.point);
          const lineA = getPointPosition(
            app,
            getElement(app, dimension.line).endpointA,
          );
          const lineB = getPointPosition(
            app,
            getElement(app, dimension.line).endpointB,
          );
          const projected = pointProjectOntoLine(point, {
            a: lineA,
            b: lineB,
          }).point;

          const dimensionHandlePosition =
            computeConstraintDistanceHandlePosition({
              a: point,
              b: projected,
              t: dimension.cosmetic.t,
              offset: dimension.cosmetic.offset,
            });

          const targetPosition = pointAdd(
            dimensionHandlePosition,
            action.delta,
          );
          return applyAppAction(app, {
            action: "SKETCH_MOVE_POINT",
            point: app.controls.activeSketchTool.geometry,
            toPosition: targetPosition,
          });
        }
        return assertUnreachable(app.controls.activeSketchTool.geometry);
      }
      return app;
    }
    case "INTERFACE_KEYDOWN": {
      if (action.ctrlKey && action.key === "z") {
        return applyAppAction(app, {
          action: "UNDO",
        });
      }
      if (action.key === "Escape") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_NONE" },
        });
      }
      if (action.key === "p") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_POINT" },
        });
      }
      if (action.key === "a") {
        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: { sketchTool: "TOOL_CREATE_ARC" },
        });
      }
      if (action.key === "Delete") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          return applyAppAction(
            app,
            {
              action: "STATE_CHANGE_TOOL",
              newTool: { sketchTool: "TOOL_NONE" },
            },
            {
              action: "SKETCH_DELETE",
              toDelete: [...app.controls.activeSketchTool.selected],
            },
          );
        }
      }
      if (action.key === "f") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [...app.controls.activeSketchTool.selected].filter(
            isPointID,
          );
          return applyAppAction(
            app,
            ...points.map(
              (point): AppAction => ({
                action: "SKETCH_CREATE_FIXED_CONSTRAINT",
                id: new ConstraintFixedID(ID.uniqueID()),
                point,
                position: getPointPosition(app, point),
              }),
            ),
          );
        }
      }
      if (action.key === "v") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [
            ...new Set(
              [...app.controls.activeSketchTool.selected].flatMap((element) => {
                if (isPointID(element)) {
                  return [element];
                }
                if (isLineID(element)) {
                  return [
                    getElement(app, element).endpointA,
                    getElement(app, element).endpointB,
                  ];
                }
                return [];
              }),
            ),
          ];
          if (points.length === 2) {
            const id = new ConstraintAxisAlignedID(ID.uniqueID());
            return applyAppAction(app, {
              action: "SKETCH_CREATE_CONSTRAINT_AXIS_ALIGNED",
              axis: "vertical",
              id,
              pointA: points[0],
              pointB: points[1],
            });
          }
        }
      }
      if (action.key === "h") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const points = [
            ...new Set(
              [...app.controls.activeSketchTool.selected].flatMap((element) => {
                if (isPointID(element)) {
                  return [element];
                }
                if (isLineID(element)) {
                  return [
                    getElement(app, element).endpointA,
                    getElement(app, element).endpointB,
                  ];
                }
                return [];
              }),
            ),
          ];
          if (points.length === 2) {
            const id = new ConstraintAxisAlignedID(ID.uniqueID());
            return applyAppAction(app, {
              action: "SKETCH_CREATE_CONSTRAINT_AXIS_ALIGNED",
              axis: "horizontal",
              id,
              pointA: points[0],
              pointB: points[1],
            });
          }
        }
      }

      if (action.key === "d") {
        if (app.controls.activeSketchTool.sketchTool === "TOOL_SELECT") {
          const selected = [...app.controls.activeSketchTool.selected];

          const points = selected.filter(isPointID);
          const lines = selected.filter(isLineID);

          if (points.length === 2 && selected.length === 2) {
            return applyAppAction(app, {
              action: "STATE_CHANGE_TOOL",
              newTool: {
                sketchTool: "TOOL_CREATE_DISTANCE_CONSTRAINT",
                pointA: points[0],
                pointB: points[1],
              },
            });
          }
          if (lines.length === 1 && selected.length === 1) {
            return applyAppAction(app, {
              action: "STATE_CHANGE_TOOL",
              newTool: {
                sketchTool: "TOOL_CREATE_DISTANCE_CONSTRAINT",
                pointA: getElement(app, lines[0]).endpointA,
                pointB: getElement(app, lines[0]).endpointB,
              },
            });
          }

          if (
            points.length === 1 &&
            lines.length === 1 &&
            selected.length === 2
          ) {
            return applyAppAction(app, {
              action: "STATE_CHANGE_TOOL",
              newTool: {
                sketchTool: "SketchToolCreatePointLineDistanceConstraint",
                point: points[0],
                line: lines[0],
              },
            });
          }
        }
      }
      if (
        action.key === "x" &&
        app.controls.activeSketchTool.sketchTool === "TOOL_SELECT"
      ) {
        const selectedElements = app.controls.activeSketchTool.selected;
        const selectedPoints = [...selectedElements].filter(isPointID);
        const selectedLines = [...selectedElements].filter(isLineID);
        const selectedArcs = [...selectedElements].filter(isArcID);

        if (selectedPoints.length === 2 && selectedElements.size === 2) {
          // There were exactly 2 points selected.
          return applyAppAction(app, {
            action: "SKETCH_MERGE_POINTS",
            points: selectedPoints,
          });
        }

        if (
          selectedPoints.length === 1 &&
          selectedLines.length === 1 &&
          selectedElements.size === 2
        ) {
          // There is exactly 1 line and 1 point selected.
          return applyAppAction(app, {
            action: "SKETCH_CREATE_CONSTRAINT_POINT_ON_LINE",
            id: new ConstraintPointOnLineID(ID.uniqueID()),
            point: selectedPoints[0],
            line: selectedLines[0],
          });
        }

        if (
          selectedPoints.length === 1 &&
          selectedArcs.length === 1 &&
          selectedElements.size === 2
        ) {
          // There is exactly 1 arc and 1 point selected.
          return applyAppAction(app, {
            action: "SKETCH_CREATE_CONSTRAINT_POINT_ON_ARC",
            id: new ConstraintPointOnArcID(ID.uniqueID()),
            point: selectedPoints[0],
            arc: selectedArcs[0],
          });
        }
      }

      // Check all registered tools.
      for (const [toolName, tool] of globalTools) {
        let state = INITIAL_TOOL_STATE;
        let isTriggered = false;

        let lastRequest: ToolFlowSend | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          lastRequest = runTool(tool, state);
          if (
            lastRequest.recordType === "trigger-key" &&
            action.key === lastRequest.send.key
          ) {
            // Mark the tool as triggered, so that its effects can be applied.
            isTriggered = true;
            state = handleToolEffect(state, {
              recordType: "trigger-key",
              receive: { key: action.key },
            });
            continue;
          }
          break;
        }

        if (!isTriggered) {
          // Nothing triggered the tool to fire.
          continue;
        }

        if (lastRequest === null) {
          // The tool ran to completion!
          // This could happen for an 'instant' tool like adding a constraint to the current selection.
          break;
        }

        return applyAppAction(app, {
          action: "STATE_CHANGE_TOOL",
          newTool: {
            sketchTool: "TOOL_FLOW",
            toolName,
            flowNeeds: lastRequest,
            flowState: handleToolEffect(INITIAL_TOOL_STATE, {
              recordType: "trigger-key",
              receive: { key: action.key },
            }),
          },
        });
      }

      return app;
    }
    case "SKETCH_CREATE_POINT": {
      // TODO: Verify that this ID does not already exist in the sketch.
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create point",
      });
      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementPoint",
              id: action.id,
              position: action.at,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_ARC": {
      // TODO: Verify that `endpointA` and `endpointB` already exist, and that `id` does not.
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create arc",
      });
      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementArc",
              id: action.id,
              endpointA: action.endpointA,
              endpointB: action.endpointB,
              center: action.center,
              sketchStyle: app.controls.currentSketchStyle,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_FIXED_CONSTRAINT": {
      // TODO: Verify that the point exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "fix point",
      });

      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintFixed",
              id: action.id,
              point: action.point,
              position: action.position,
            },
          ],
        },
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_AXIS_ALIGNED": {
      // TODO: Verify that the points exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "fix point",
      });

      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintAxisAligned",
              id: action.id,
              axis: action.axis,
              pointA: action.pointA,
              pointB: action.pointB,
            },
          ],
        }).updated,
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_DISTANCE": {
      // TODO: Verify that the points exist
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create distance dimension",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintPointPointDistance",
              id: action.id,
              pointA: action.pointA,
              pointB: action.pointB,
              distance: action.distance,
              cosmetic: {
                t: action.t,
                offset: action.offset,
              },
            },
          ],
        }).updated,
      };
    }
    case "AppActionSketchCreateConstraintPointLineDistance": {
      // TODO: Verify that the point and line exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create point-line distance dimension",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintPointLineDistance",
              id: action.id,
              point: action.point,
              line: action.line,
              distance: action.distance,
              cosmetic: {
                t: action.t,
                offset: action.offset,
              },
            },
          ],
        }).updated,
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_POINT_ON_LINE": {
      // TODO: Verify that the point and line exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create point-line coincidence constraint",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintPointOnLine",
              id: action.id,
              point: action.point,
              line: action.line,
            },
          ],
        }).updated,
      };
    }
    case "SKETCH_CREATE_CONSTRAINT_POINT_ON_ARC": {
      // TODO: Verify that the point and arc exists
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "create point-arc coincidence constraint",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: [
            ...app.sketch.sketchElements,
            {
              sketchElement: "SketchElementConstraintPointOnArc",
              id: action.id,
              point: action.point,
              arc: action.arc,
            },
          ],
        }).updated,
      };
    }
    case "SKETCH_UPDATE_CONSTRAINT": {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "update distance dimension",
      });
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: app.sketch.sketchElements.map((element) => {
            if (element.id === action.dimensionID) {
              return { ...element, distance: action.newDistance };
            } else {
              return element;
            }
          }),
        }).updated,
      };
    }
    case "SKETCH_MOVE_POINT": {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: `move-point-${action.point}`,
        debugName: "move point",
      });
      const moveGeometry:
        | PointID
        | ConstraintPointPointDistanceID
        | ConstraintPointLineDistanceID = action.point;
      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: app.sketch.sketchElements.map((sketchElement) => {
            if (
              sketchElement.sketchElement === "SketchElementPoint" &&
              sketchElement.id === moveGeometry
            ) {
              return {
                ...sketchElement,
                position: action.toPosition,
              };
            } else if (
              sketchElement.sketchElement ===
                "SketchElementConstraintPointPointDistance" &&
              sketchElement.id === moveGeometry
            ) {
              const parameters = computeConstraintDistanceParameters({
                a: getPointPosition(app, sketchElement.pointA),
                b: getPointPosition(app, sketchElement.pointB),
                labelPosition: action.toPosition,
              });
              return {
                ...sketchElement,
                cosmetic: parameters,
              };
            } else if (
              sketchElement.sketchElement ===
                "SketchElementConstraintPointLineDistance" &&
              sketchElement.id === moveGeometry
            ) {
              const point = getPointPosition(app, sketchElement.point);
              const lineA = getPointPosition(
                app,
                getElement(app, sketchElement.line).endpointA,
              );
              const lineB = getPointPosition(
                app,
                getElement(app, sketchElement.line).endpointB,
              );
              const projected = pointProjectOntoLine(point, {
                a: lineA,
                b: lineB,
              }).point;
              const parameters = computeConstraintDistanceParameters({
                a: point,
                b: projected,
                labelPosition: action.toPosition,
              });
              return {
                ...sketchElement,
                cosmetic: parameters,
              };
            } else {
              return sketchElement;
            }
          }),
        }).updated,
      };
    }
    case "SKETCH_DELETE": {
      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "delete",
      });
      const toDelete = new Set(action.toDelete);

      const isDeleted = (id: SketchElementID): boolean => {
        if (toDelete.has(id)) {
          return true;
        }
        if (isPointID(id)) {
          return false;
        }
        if (isLineID(id)) {
          for (const endpoint of [
            getElement(app, id).endpointA,
            getElement(app, id).endpointB,
          ]) {
            if (isDeleted(endpoint)) {
              return true;
            }
          }
          return false;
        }
        if (isArcID(id)) {
          for (const endpoint of [
            getElement(app, id).endpointA,
            getElement(app, id).endpointB,
            getElement(app, id).center,
          ]) {
            if (isDeleted(endpoint)) {
              return true;
            }
          }
          return false;
        }
        if (isConstraintFixedID(id)) {
          return isDeleted(getElement(app, id).point);
        }
        if (isConstraintAxisAlignedID(id)) {
          return (
            isDeleted(getElement(app, id).pointA) ||
            isDeleted(getElement(app, id).pointB)
          );
        }
        if (isConstraintPointPointDistanceID(id)) {
          return (
            isDeleted(getElement(app, id).pointA) ||
            isDeleted(getElement(app, id).pointB)
          );
        }
        if (isConstraintPointLineDistanceID(id)) {
          return (
            isDeleted(getElement(app, id).point) ||
            isDeleted(getElement(app, id).line)
          );
        }
        if (isConstraintPointOnLineID(id)) {
          return (
            isDeleted(getElement(app, id).point) ||
            isDeleted(getElement(app, id).line)
          );
        }
        if (isConstraintPointOnArcID(id)) {
          const arc = getElement(app, id);
          return isDeleted(arc.point) || isDeleted(arc.arc);
        }
        return assertUnreachable(id, "...");
      };

      return {
        ...app,
        sketch: {
          ...app.sketch,
          sketchElements: app.sketch.sketchElements.filter((sketchElement) => {
            return !isDeleted(sketchElement.id);
          }),
        },
      };
    }
    case "SKETCH_MERGE_POINTS": {
      if (action.points.length <= 1) {
        return app;
      }
      const targetPoint = action.points[0];
      const renamedPoints = new Set(action.points.slice(1));

      app = applyAppAction(app, {
        action: "PUSH_TO_UNDO_STACK",
        key: null,
        debugName: "merge points",
      });

      const renamePoint = (p: PointID): PointID<"renamed"> => {
        if (renamedPoints.has(p)) {
          return targetPoint.castTag(null, "renamed");
        }
        return p.castTag(null, "renamed");
      };

      return {
        ...app,
        sketch: applyConstraint({
          ...app.sketch,
          sketchElements: app.sketch.sketchElements
            .filter((sketchElement) => {
              if (
                sketchElement.sketchElement === "SketchElementPoint" &&
                renamedPoints.has(sketchElement.id)
              ) {
                return false;
              }
              return true;
            })
            .flatMap((sketchElement): SketchElement<"renamed">[] => {
              switch (sketchElement.sketchElement) {
                case "SketchElementPoint":
                  return [
                    {
                      ...sketchElement,
                      id: renamePoint(sketchElement.id),
                    },
                  ];
                case "SketchElementLine":
                  if (
                    renamePoint(sketchElement.endpointA) ===
                    renamePoint(sketchElement.endpointB)
                  ) {
                    // This line becomes trivial.
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      endpointA: renamePoint(sketchElement.endpointA),
                      endpointB: renamePoint(sketchElement.endpointB),
                    },
                  ];
                case "SketchElementArc": {
                  const renamedA = renamePoint(sketchElement.endpointA);
                  const renamedB = renamePoint(sketchElement.endpointB);
                  const renamedC = renamePoint(sketchElement.center);
                  // If any of these 3 become equal, the arc becomes trivial.
                  if (
                    renamedA === renamedB ||
                    renamedA === renamedC ||
                    renamedB === renamedC
                  ) {
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      endpointA: renamedA,
                      endpointB: renamedB,
                      center: renamedC,
                    },
                  ];
                }
                case "SketchElementConstraintAxisAligned": {
                  if (
                    renamePoint(sketchElement.pointA) ===
                    renamePoint(sketchElement.pointB)
                  ) {
                    // The constraint becomes trivial.
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      pointA: renamePoint(sketchElement.pointA),
                      pointB: renamePoint(sketchElement.pointB),
                    },
                  ];
                }
                case "SketchElementConstraintPointPointDistance": {
                  if (
                    renamePoint(sketchElement.pointA) ===
                    renamePoint(sketchElement.pointB)
                  ) {
                    // The constraint becomes trivial.
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      pointA: renamePoint(sketchElement.pointA),
                      pointB: renamePoint(sketchElement.pointB),
                    },
                  ];
                }
                case "SketchElementConstraintPointLineDistance": {
                  const line = getElement(app, sketchElement.line);
                  const points = new Set([
                    renamePoint(line.endpointA),
                    renamePoint(line.endpointB),
                    renamePoint(sketchElement.point),
                  ]);
                  if (points.size !== 3) {
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      point: renamePoint(sketchElement.point),
                    },
                  ];
                }
                case "SketchElementConstraintFixed": {
                  return [
                    {
                      ...sketchElement,
                      point: renamePoint(sketchElement.point),
                    },
                  ];
                }
                case "SketchElementConstraintPointOnLine": {
                  const involvedPoints = new Set([
                    renamePoint(sketchElement.point),
                    renamePoint(getElement(app, sketchElement.line).endpointA),
                    renamePoint(getElement(app, sketchElement.line).endpointB),
                  ]);
                  if (involvedPoints.size < 3) {
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      point: renamePoint(sketchElement.point),
                    },
                  ];
                }
                case "SketchElementConstraintPointOnArc": {
                  const arc = getElement(app, sketchElement.arc);

                  const involvedPoints = new Set([
                    renamePoint(sketchElement.point),
                    renamePoint(arc.endpointA),
                    renamePoint(arc.endpointB),
                    renamePoint(arc.center),
                  ]);
                  if (involvedPoints.size < 4) {
                    return [];
                  }
                  return [
                    {
                      ...sketchElement,
                      point: renamePoint(sketchElement.point),
                    },
                  ];
                }
              }

              return assertUnreachable(
                sketchElement,
                `merge points: unhandled element ${JSON.stringify(
                  sketchElement,
                )}`,
              );
            }),
        }).updated,
      };
    }
  }
  assertUnreachable(action, "unhandled action " + JSON.stringify(action));
}

export const actionCreateLine = registerAppAction("sketch-create-line", {
  run: (
    app: AppState,
    action: {
      id: LineID;
      endpointA: PointID;
      endpointB: PointID;
    },
  ): AppState => {
    // TODO: Verify that `endpointA` and `endpointB` already exist, and that `id` does not.
    return {
      ...app,
      sketch: {
        ...app.sketch,
        sketchElements: [
          ...app.sketch.sketchElements,
          {
            sketchElement: "SketchElementLine",
            id: action.id,
            endpointA: action.endpointA,
            endpointB: action.endpointB,
            sketchStyle: app.controls.currentSketchStyle,
          },
        ],
      },
    };
  },
});

function toolCreateLine(tool: ToolInterface) {
  tool.trigger({ key: "l" });

  const endpointA = tool.pickOrCreatePoint("endpoint-1");
  const endpointB = tool.pickOrCreatePoint("endpoint-2", {
    preview: (appState, view) => {
      const fromXY = getPointPosition(appState, endpointA);
      const destination = findOrCreatePointNear(
        appState,
        view.cursorAt,
      ).position;
      return (
        <>
          <SketchMarker key="from-marker" position={fromXY} />
          <SketchLine
            key="line-preview"
            endpointA={fromXY}
            endpointB={destination}
            lineStyle="preview"
          />
        </>
      );
    },
  });

  if (endpointA === endpointB) {
    tool.abort();
  }

  tool.apply(
    actionCreateLine({
      id: tool.generateID(LineID),
      endpointA,
      endpointB,
    }),
  );
}

registerTool("line", toolCreateLine);

function assertUnreachable(
  _x: never,
  message: string = "expected unreachable",
): never {
  throw new Error(message);
}
