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

export interface RebuiltCpuRunnerState {
  readonly repeatContinuation: number | undefined;
}

export class RebuiltCpuRunner {
  public readonly state = new RebuiltCpuState();
  private readonly executor: RebuiltCpuExecutor;
  private repeatContinuation: number | undefined;

  public constructor(
    memory: RebuiltMemoryBus,
    io?: RebuiltPortBus,
    trace?: RebuiltTraceHook | RebuiltTraceOptions
  ) {
    this.executor = new RebuiltCpuExecutor(this.state, memory, trace, io);
  }

  public reset(): void {
    this.state.reset();
    this.repeatContinuation = undefined;
  }

  public step(): RebuiltCpuStepResult {
    const beforeEip = this.state.readEip();
    const codeDefault32 = this.state.codeDefault32();
    const protectedMode = Boolean(this.state.readCr0() & 1);
    const instruction = this.executor.step(dispatchRebuiltInstruction);
    const repeatContinuation = this.repeatContinuation === beforeEip;
    const continues =
      instruction?.prefixes.repeat !== undefined && this.state.readEip() === beforeEip;
    this.repeatContinuation = continues ? beforeEip : undefined;
    return {
      cycles: estimate386Cycles(
        instruction,
        beforeEip,
        this.state.readEip(),
        codeDefault32,
        repeatContinuation,
        protectedMode
      )
    };
  }

  public capture(): RebuiltCpuRunnerState {
    return { repeatContinuation: this.repeatContinuation };
  }

  public restore(state: RebuiltCpuRunnerState): void {
    if (state.repeatContinuation !== undefined && !Number.isInteger(state.repeatContinuation))
      throw new RangeError("Repeated-string continuation must be an integer instruction pointer");
    this.repeatContinuation = state.repeatContinuation;
  }

  public serviceExternalInterrupt(vector: number): boolean {
    this.repeatContinuation = undefined;
    return this.executor.serviceExternalInterrupt(vector);
  }

  public serviceNonMaskableInterrupt(vector = 2): boolean {
    this.repeatContinuation = undefined;
    return this.executor.serviceNonMaskableInterrupt(vector);
  }

  public run(instructionCount: number): void {
    if (!Number.isInteger(instructionCount) || instructionCount < 0)
      throw new RangeError("Instruction count must be a non-negative integer");
    for (let index = 0; index < instructionCount; index += 1) this.step();
  }
}
