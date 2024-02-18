export type XY = { readonly x: number; readonly y: number };

export type View = { readonly center: XY; readonly size: number };

export type AppControls = {
  panning: boolean;
};

export type AppState = {
  view: View;
  controls: AppControls;
};

export const APP_STATE_INITIAL: AppState = {
  view: { center: { x: 0, y: 0 }, size: 200 },
  controls: { panning: false },
};
