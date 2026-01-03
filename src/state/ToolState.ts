import { ID } from "../id";
import type { AppAction } from "./AppAction";
import {
  AppState,
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
  | SketchToolCreateArc
  | SketchToolCreateArcFromPoint
  | SketchToolCreateArcFromTwoPoints
  | SketchToolSelect
  | SketchToolDragPoint
  | SketchToolCreateDistanceConstraint
  | SketchToolCreatePointLineDistanceConstraint
  | SketchToolEditDimension
  | SketchToolFlow;

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
  dimension: ConstraintPointPointDistanceID | ConstraintPointLineDistanceID;
  selected: ReadonlySet<SketchElementID>;
};

export type ToolFlowRecord =
  | ToolFlowTriggerKey
  | ToolFlowPickOrCreatePoint
  | ToolFlowApplyAction
  | ToolFlowAbort
  | ToolFlowGenerateID;

export type ToolFlowSend<RS = ToolFlowRecord> = RS extends infer R
  ? "recordType" | "send" extends keyof R
    ? Pick<R, "recordType" | "send">
    : never
  : never;
export type ToolFlowReceive<RS = ToolFlowRecord> = RS extends infer R
  ? "recordType" | "receive" extends keyof R
    ? Pick<R, "recordType" | "receive">
    : never
  : never;

export type ToolFlowTriggerKey = {
  recordType: "trigger-key";
  send: {
    key: string;
  };
  receive: {
    key: string;
    selected: ReadonlySet<SketchElementID>;
  };
};

export type ViewInfo = {
  cursorAt: XY;
};

export type ToolFlowPickOrCreatePoint = {
  recordType: "pick-or-create-point";
  send: {
    pointName: string;
    /**
     * If set, this function is used to preview the tool.
     */
    preview?: (app: AppState, view: ViewInfo) => JSX.Element;
  };
  receive: {
    point: PointID;
  };
};

export type ToolFlowApplyAction = {
  recordType: "apply-action";
  send: { action: AppAction };
  receive: null;
};

export type ToolFlowAbort = {
  recordType: "abort";
  send: null;
  receive: never;
};

export type ToolFlowGenerateID = {
  recordType: "generate-id";
  send: { idClass: new (id: string) => ID };
  receive: { id: ID };
};

export type ToolFlowState = {
  _toolRecords: ReadonlyArray<ToolFlowReceive>;
};

/**
 * Handles one effect in a tool flow state.
 */
export function handleToolEffect(
  state: ToolFlowState,
  send: ToolFlowReceive,
): ToolFlowState {
  return {
    _toolRecords: [...state._toolRecords, send],
  };
}

export const INITIAL_TOOL_STATE: ToolFlowState = {
  _toolRecords: [],
};

export type SketchToolFlow = {
  sketchTool: "TOOL_FLOW";
  toolName: string;
  flowNeeds: ToolFlowSend;
  flowState: ToolFlowState;
};

export type ToolInterface = {
  /**
   * Must be called before picking or creating geometry.
   *
   * This indicates the trigger for the tool.
   */
  trigger: (trigger: { key: string }) => {
    key: string;
    selected: ReadonlySet<SketchElementID>;
  };

  /**
   * Asks the user to select a point, or creates a new one
   * (possibly applying constraints to it) if there is none
   * near where the user selects.
   */
  pickOrCreatePoint: (
    pointName: string,
    options?: { preview: (appState: AppState, view: ViewInfo) => JSX.Element },
  ) => PointID;

  /**
   * Applies an action to the app.
   */
  apply: (action: AppAction) => void;

  /**
   * Aborts the tool.
   */
  abort: () => never;

  /**
   * Generates and records an ID.
   * Tool definitions must be deterministic; here, the ID is recorded in local state.
   */
  generateID: <TID extends ID>(construct: new (id: string) => TID) => TID;
};

export type ToolFunction = (tool: ToolInterface) => void;

/// This exception class is used for control-flow within tools.
export class ToolFlowError extends Error {}

/**
 * Runs the tool until the first unhandled effect, and returns that effect.
 * If the tool runs to completion, an 'abort' event is generated automatically.
 */
export function runTool(
  tool: ToolFunction,
  records: ToolFlowState,
): ToolFlowSend {
  let flowToHandle: ToolFlowSend | null = null;

  let recordIndex = 0;
  const effectStep = <RS extends ToolFlowRecord>(
    record: ToolFlowSend<RS>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): RS["receive"] => {
    if (recordIndex >= records._toolRecords.length) {
      // This case must be handled by the caller.
      flowToHandle = record;
      // This error should not be caught by the tool.
      throw new ToolFlowError("needs info from environment");
    }

    if (record.recordType !== records._toolRecords[recordIndex].recordType) {
      // TODO: Probably need to provide a way to handle this, in case it depends on state
      // that changes for other reasons.
      throw new Error("tool was non-deterministic");
    }

    const receive = records._toolRecords[recordIndex].receive;
    recordIndex += 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return receive as any;
  };

  const iface: ToolInterface = {
    trigger: function (trigger: { key: string }): {
      key: string;
      selected: ReadonlySet<SketchElementID>;
    } {
      return effectStep<ToolFlowTriggerKey>({
        recordType: "trigger-key",
        send: trigger,
      });
    },
    pickOrCreatePoint: function (
      pointName: string,
      options?: {
        preview: (appState: AppState, view: ViewInfo) => JSX.Element;
      },
    ): PointID {
      const eff = effectStep<ToolFlowPickOrCreatePoint>({
        recordType: "pick-or-create-point",
        send: { pointName, preview: options?.preview ?? undefined },
      });

      return eff.point;
    },
    apply: function (action: AppAction): void {
      effectStep<ToolFlowApplyAction>({
        recordType: "apply-action",
        send: { action },
      });
    },
    abort: function (): never {
      return effectStep<ToolFlowAbort>({
        recordType: "abort",
        send: null,
      });
    },
    generateID: function <TID extends ID>(
      construct: new (id: string) => TID,
    ): TID {
      return effectStep<ToolFlowGenerateID>({
        recordType: "generate-id",
        send: {
          idClass: construct,
        },
      }).id as TID;
    },
  };

  try {
    tool(iface);
  } catch (err) {
    if (err instanceof ToolFlowError) {
      return (
        flowToHandle ?? {
          recordType: "abort",
          send: null,
        }
      );
    } else {
      throw err;
    }
  }
  return {
    recordType: "abort",
    send: null,
  };
}
