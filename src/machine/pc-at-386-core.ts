import { type ExecutionResult, type InstructionTrace, type PortIo } from "../cpu/x86/execution.js";
import { Cpu386State } from "../cpu/x86/state.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { CpuStepper, type StepRunResult } from "./cpu-stepper.js";

export interface PcAt386CoreOptions {
  readonly memory: PhysicalMemory;
  readonly ports?: PortIo;
  readonly trace?: InstructionTrace;
}

export class PcAt386Core {
  public readonly cpu = new Cpu386State();
  public readonly stepper: CpuStepper;

  public constructor(options: PcAt386CoreOptions) {
    this.stepper = new CpuStepper(options.memory, this.cpu, options.ports, options.trace);
  }

  public resetCpu(): void {
    this.cpu.reset();
  }

  public step(): ExecutionResult {
    return this.stepper.step();
  }

  public run(maxInstructions: number): StepRunResult {
    return this.stepper.run(maxInstructions);
  }
}
