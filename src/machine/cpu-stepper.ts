import {
  serviceExternalInterrupt,
  stepInstructionTraced,
  type ExecutionResult,
  type InstructionMemory,
  type InstructionTrace,
  type PortIo
} from "../cpu/x86/execution.js";
import { Cpu386State } from "../cpu/x86/state.js";

export interface StepRunResult {
  readonly executed: number;
  readonly halted: boolean;
}

export class CpuStepper {
  public constructor(
    private readonly memory: InstructionMemory,
    private readonly cpu: Cpu386State,
    private readonly ports?: PortIo,
    private readonly trace?: InstructionTrace
  ) {}

  public step(): ExecutionResult {
    return stepInstructionTraced(this.memory, this.cpu, this.ports, this.trace);
  }

  public serviceExternalInterrupt(vector: number): boolean {
    return serviceExternalInterrupt(this.memory, this.cpu, vector);
  }

  public run(maxInstructions: number): StepRunResult {
    if (!Number.isInteger(maxInstructions) || maxInstructions < 0) {
      throw new RangeError("Instruction budget must be a non-negative integer");
    }
    let executed = 0;
    let result: ExecutionResult = { halted: this.cpu.snapshot().halted };
    while (executed < maxInstructions && !result.halted) {
      result = this.step();
      executed += 1;
    }
    return { executed, halted: result.halted };
  }
}
