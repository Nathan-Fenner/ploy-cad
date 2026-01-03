import { registerAppAction, registerTool } from "../AppAction";
import { isArcElement, isLineElement, SketchElementID } from "../AppState";
import { ToolInterface } from "../ToolState";

export function registerToolToggleConstruction() {
  registerTool("construction", toolToggleConstruction);
}

const actionToggleConstruction = registerAppAction("toggle-line-construction", {
  run: (app, { selected }: { selected: ReadonlySet<SketchElementID> }) => {
    return {
      ...app,
      sketch: app.sketch.withSketchElements(
        app.sketch.sketchElements.map((element) => {
          if (selected.has(element.id)) {
            if (isLineElement(element)) {
              return {
                ...element,
                sketchStyle:
                  element.sketchStyle === "sketch"
                    ? "sketch-construction"
                    : "sketch",
              };
            } else if (isArcElement(element)) {
              return {
                ...element,
                sketchStyle:
                  element.sketchStyle === "sketch"
                    ? "sketch-construction"
                    : "sketch",
              };
            }
          }
          return element;
        }),
      ),
    };
  },
});

export function toolToggleConstruction(tool: ToolInterface) {
  const selected = tool.trigger({ key: "c" }).selected;

  tool.apply(actionToggleConstruction({ selected: new Set(selected) }));
}
