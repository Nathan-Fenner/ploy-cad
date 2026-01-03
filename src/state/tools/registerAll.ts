import { registerTool } from "../AppAction";
import "./toolCreateLine";
import { toolCreateLine } from "./toolCreateLine";

import { registerToolToggleConstruction } from "./toolToggleConstruction";

export function registerTools() {
  registerTool("line", toolCreateLine);
  registerToolToggleConstruction();
}
