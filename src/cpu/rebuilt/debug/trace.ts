import type { RebuiltCpuSnapshot } from "../state/cpu-state.js";

export interface RebuiltTraceEvent {
  readonly before: RebuiltCpuSnapshot;
  readonly opcodeOffset?: number;
  readonly opcode?: number;
  readonly fault?: boolean;
  readonly after: RebuiltCpuSnapshot;
}

export type RebuiltTraceHook = (event: RebuiltTraceEvent) => void;

/** Minimal pre-execution identity used to select ordinary trace-event emission. */
export interface RebuiltTracePoint {
  readonly cs: number;
  readonly eip: number;
  readonly codeDefault32: boolean;
}

export interface RebuiltTraceOptions {
  readonly onTrace: RebuiltTraceHook;
  /**
   * Undefined emits every instruction boundary. A selector emits only eligible
   * ordinary boundaries; faults always retain a full before/after event.
   */
  readonly shouldCapture?: (point: RebuiltTracePoint) => boolean;
}
