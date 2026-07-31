import { dispatchRebuiltInstruction } from "./dispatch.js";
import type { RebuiltTraceHook, RebuiltTraceOptions } from "./debug/trace.js";
import { RebuiltCpuExecutor } from "./execution.js";
import type { RebuiltPortBus } from "./io/port-bus.js";
import { RebuiltCpuState } from "./state/cpu-state.js";
import type { RebuiltMemoryBus } from "./memory/segmented-memory.js";
import { estimate386Cycles } from "./timing/cycle-estimator.js";

export interface RebuiltCpuStepResult {
  readonly cycles: number;
}

export class RebuiltCpuRunner {
  public readonly state = new RebuiltCpuState();
  private readonly executor: RebuiltCpuExecutor;

  public constructor(
    memory: RebuiltMemoryBus,
    io?: RebuiltPortBus,
    trace?: RebuiltTraceHook | RebuiltTraceOptions
  ) {
    this.executor = new RebuiltCpuExecutor(this.state, memory, trace, io);
  }

  public reset(): void {
    this.state.reset();
  }

  public step(): RebuiltCpuStepResult {
    const beforeEip = this.state.readEip();
    const codeDefault32 = this.state.codeDefault32();
    const instruction = this.executor.step(dispatchRebuiltInstruction);
    return {
      cycles: estimate386Cycles(instruction, beforeEip, this.state.readEip(), codeDefault32)
    };
  }

  public serviceExternalInterrupt(vector: number): boolean {
    return this.executor.serviceExternalInterrupt(vector);
  }

  public serviceNonMaskableInterrupt(vector = 2): boolean {
    return this.executor.serviceNonMaskableInterrupt(vector);
  }

  public run(instructionCount: number): void {
    if (!Number.isInteger(instructionCount) || instructionCount < 0)
      throw new RangeError("Instruction count must be a non-negative integer");
    for (let index = 0; index < instructionCount; index += 1) this.step();
  }
}
