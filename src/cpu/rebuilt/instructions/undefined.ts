import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";

export function executeUndefinedOpcode(context: RebuiltExecutionContext): void {
  deliverFault(context.memory, context.state, 6, context.state.readEip());
}
