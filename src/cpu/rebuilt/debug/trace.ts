import type { RebuiltCpuSnapshot } from "../state/cpu-state.js";

export interface RebuiltTraceEvent {
  readonly before: RebuiltCpuSnapshot;
  readonly opcodeOffset?: number;
  readonly opcode?: number;
  readonly fault?: boolean;
  readonly after: RebuiltCpuSnapshot;
}

export type RebuiltTraceHook = (event: RebuiltTraceEvent) => void;
