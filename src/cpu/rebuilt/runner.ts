import { dispatchRebuiltInstruction } from "./dispatch.js";
import { RebuiltCpuExecutor } from "./execution.js";
import type { RebuiltPortBus } from "./io/port-bus.js";
import { RebuiltCpuState } from "./state/cpu-state.js";
import type { RebuiltMemoryBus } from "./memory/segmented-memory.js";

export class RebuiltCpuRunner {
  public readonly state = new RebuiltCpuState();
  private readonly executor: RebuiltCpuExecutor;

  public constructor(memory: RebuiltMemoryBus, io?: RebuiltPortBus) {
    this.executor = new RebuiltCpuExecutor(this.state, memory, undefined, io);
  }

  public reset(): void {
    this.state.reset();
  }

  public step(): void {
    this.executor.step(dispatchRebuiltInstruction);
  }

  public serviceExternalInterrupt(vector: number): boolean {
    return this.executor.serviceExternalInterrupt(vector);
  }

  public run(instructionCount: number): void {
    if (!Number.isInteger(instructionCount) || instructionCount < 0)
      throw new RangeError("Instruction count must be a non-negative integer");
    for (let index = 0; index < instructionCount; index += 1) this.step();
  }
}
