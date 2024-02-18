import { useLayoutEffect, useRef } from "react";

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
};

/**
 * Renders a zoomable SVG.
 */
export function Canvas({
  children,
  viewCenter,
  viewSize,
  style,
  containerStyle,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null!);

  useLayoutEffectOnInterval(() => {
    const svg = svgRef.current;
    const bounds = svg.getBoundingClientRect();
    const minSize = Math.min(bounds.width, bounds.height);

    const scale = viewSize / minSize;

    svg.setAttribute(
      "viewBox",
      `${viewCenter.x - (scale * bounds.width) / 2} ${
        viewCenter.y - (scale * bounds.height) / 2
      } ${scale * bounds.width} ${scale * bounds.height}`
    );
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
      >
        {children}
      </svg>
    </div>
  );
}

/**
 * Runs `f` ones in `useLayoutEffect`, and then periodically
 * every 500 milliseconds until the next render.
 */
function useLayoutEffectOnInterval(f: () => void): void {
  useLayoutEffect(() => {
    f();

    const interval = setInterval(() => {
      f();
    }, 500);

    return () => {
      clearInterval(interval);
    };
  });
}
