import { decodeInstruction, type DecodedInstruction } from "./decode/decoder.js";
import type { InstructionReader } from "./decode/instruction-reader.js";
import type { RebuiltTraceHook } from "./debug/trace.js";
import { SegmentedMemory, type RebuiltMemoryBus } from "./memory/segmented-memory.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

export interface RebuiltExecutionContext {
  readonly state: RebuiltCpuState;
  readonly memory: SegmentedMemory;
  readonly instruction: DecodedInstruction;
  readonly reader: InstructionReader;
}

export type RebuiltInstructionDispatcher = (context: RebuiltExecutionContext) => void;

export class RebuiltUnsupportedOpcodeError extends Error {
  public constructor(
    readonly opcode: number,
    readonly faultEip: number
  ) {
    super(`Unsupported rebuilt opcode 0x${opcode.toString(16)}`);
  }
}

export class RebuiltCpuExecutor {
  private readonly memory: SegmentedMemory;

  public constructor(
    private readonly state: RebuiltCpuState,
    bus: RebuiltMemoryBus,
    private readonly trace?: RebuiltTraceHook
  ) {
    this.memory = new SegmentedMemory(bus, state);
  }

  public step(dispatch: RebuiltInstructionDispatcher): DecodedInstruction {
    const before = this.state.snapshot();
    const codeAddressSize = before.segments.cs.default32 ? 32 : 16;
    const reader = {
      readCodeByte: (offset: number) =>
        this.memory.read8("cs", before.eip + offset, codeAddressSize)
    };
    const instruction = decodeInstruction(reader, before.eip, before.segments.cs.default32);
    dispatch({ state: this.state, memory: this.memory, instruction, reader });
    this.trace?.({
      before,
      opcodeOffset: instruction.opcodeOffset,
      opcode: instruction.opcode,
      after: this.state.snapshot()
    });
    return instruction;
  }
}
