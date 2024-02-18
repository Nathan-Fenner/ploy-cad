import { createContext, useLayoutEffect, useRef, useState } from "react";

type XY = {
  readonly x: number;
  readonly y: number;
};

type CanvasProps = {
  children?: React.ReactNode;
  /**
   * The center of the view in SVG units.
   */
  viewCenter: XY;
  /**
   * The size of the view in SVG units.
   * A square with side length `viewSize`, centered at `viewCenter`,
   * will be just barely visible in the canvas.
   */
  viewSize: number;
  /**
   * Styles to be applied to the `<svg />` element, which is wrapped
   * in a `<div>` called the container.
   */
  style?: React.CSSProperties;
  /**
   * Styles to be applied to the `<div />` that wraps the `<svg />`
   * element.
   */
  containerStyle?: React.CSSProperties;

  /**
   * Whenever the mouse moves, this callback is called
   * with the mouse's position in SVG coordinates.
   */
  onMouseMove?: (newMousePos: XY, delta: XY) => void;

  /**
   * When the user zooms in/out by scrolling, this
   * callback is called with the mouse's position and
   * the amount of inward/outward zoom.
   */
  onZoom?: (zoomCenter: XY, zoomSteps: number) => void;

  onMouseDown?: (buttons: number, at: XY) => void;
  onMouseUp?: (buttons: number, at: XY) => void;
};

function screenToMouse(
  e: { readonly clientX: number; readonly clientY: number },
  svg: SVGSVGElement,
): XY {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM()!.inverse());
}

/**
 * The number of SVG units in a single pixel.
 */
export const PixelSize = createContext(1);

/**
 * Renders a zoomable SVG.
 */
export function Canvas({
  children,
  viewCenter,
  viewSize,
  style,
  containerStyle,
  onMouseMove,
  onZoom,
  onMouseDown,
  onMouseUp,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null!);

  const [pixelSize, setPixelSize] = useState(1);

  useLayoutEffectOnInterval(() => {
    const svg = svgRef.current;
    const bounds = svg.getBoundingClientRect();
    const minSize = Math.min(bounds.width, bounds.height);

    const scale = viewSize / minSize;

    svg.setAttribute(
      "viewBox",
      `${viewCenter.x - (scale * bounds.width) / 2} ${
        viewCenter.y - (scale * bounds.height) / 2
      } ${scale * bounds.width} ${scale * bounds.height}`,
    );

    if (pixelSize !== viewSize / minSize) {
      setPixelSize(viewSize / minSize);
    }
  });

  return (
    <div
      className="svg-container"
      style={{
        ...containerStyle,
      }}
    >
      <svg
        ref={svgRef}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          ...style,
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          const svg = e.currentTarget;
          const p = screenToMouse(e, svg);
          const p2 = screenToMouse(
            {
              clientX: e.clientX + e.movementX,
              clientY: e.clientY + e.movementY,
            },
            svg,
          );

          onMouseMove?.({ x: p.x, y: p.y }, { x: p2.x - p.x, y: p2.y - p.y });
        }}
        onWheel={(e) => {
          if (onZoom) {
            const p = screenToMouse(e, e.currentTarget);
            onZoom(p, e.deltaY);
          }
        }}
        onMouseDown={(e) => {
          if (onMouseDown) {
            onMouseDown(e.buttons, screenToMouse(e, e.currentTarget));
          }
        }}
        onMouseUp={(e) => {
          if (onMouseUp) {
            onMouseUp(e.buttons, screenToMouse(e, e.currentTarget));
          }
        }}
      >
        <PixelSize.Provider value={pixelSize}>{children}</PixelSize.Provider>
      </svg>
    </div>
  );
}

/**
 * Runs `f` ones in `useLayoutEffect`, and then periodically
 * every 500 milliseconds until the next render.
 */
function useLayoutEffectOnInterval(
  f: (options: { isDelayed: boolean }) => void,
): void {
  useLayoutEffect(() => {
    f({ isDelayed: false });

    const interval = setInterval(() => {
      f({ isDelayed: true });
    }, 500);

    return () => {
      clearInterval(interval);
    };
  });
}
