import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";

export function executeUndefinedOpcode(context: RebuiltExecutionContext): void {
  // TODO(High): NXVM labels WBINVD, RDMSR, WRMSR, CPUID, and RSM TODO; this
  // project intentionally mirrors their present UndefinedOpcode behavior.
  deliverFault(context.memory, context.state, 6, context.state.readEip());
}
