import { registerTool } from "../AppAction";
import "./toolCreateLine";
import { toolCreateLine } from "./toolCreateLine";

export function registerTools() {
  registerTool("line", toolCreateLine);
}
