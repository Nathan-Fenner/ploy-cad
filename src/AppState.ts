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
};

export type AppControls = {
  panning: boolean;
};

export const APP_STATE_INITIAL: AppState = {
  view: { center: { x: 0, y: 0 }, size: 200 },
  controls: { panning: false },
};

export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };
