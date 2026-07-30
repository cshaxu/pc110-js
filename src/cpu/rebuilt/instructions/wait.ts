import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";

const CR0_TASK_SWITCHED = 0x00000008;

export function executeWait(context: RebuiltExecutionContext): void {
  // TODO(High): NXVM leaves WAIT TODO; this project-native #NM boundary needs
  // future review against the selected complete 80386 behavior.
  if (context.state.readCr0() & CR0_TASK_SWITCHED)
    return deliverFault(context.memory, context.state, 7, context.state.readEip());
  context.state.advanceEip(context.instruction.length);
}
