import { decodeInstruction, type DecodedInstruction } from "./decode/decoder.js";
import type { InstructionReader } from "./decode/instruction-reader.js";
import type { RebuiltTraceHook } from "./debug/trace.js";
import { PageFaultError } from "../../memory/address-translation.js";
import { deliverFault } from "./events/interrupt-delivery.js";
import type { RebuiltPortBus } from "./io/port-bus.js";
import {
  SegmentAccessError,
  SegmentedMemory,
  type RebuiltMemoryBus
} from "./memory/segmented-memory.js";
import { SegmentLoadError } from "./protection/segment-loader.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

export interface RebuiltExecutionContext {
  readonly state: RebuiltCpuState;
  readonly memory: SegmentedMemory;
  readonly instruction: DecodedInstruction;
  readonly reader: InstructionReader;
  readonly io?: RebuiltPortBus;
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
    private readonly trace?: RebuiltTraceHook,
    private readonly io?: RebuiltPortBus
  ) {
    this.memory = new SegmentedMemory(bus, state);
  }

  public step(dispatch: RebuiltInstructionDispatcher): DecodedInstruction | undefined {
    const before = this.state.snapshot();
    const codeAddressSize = before.segments.cs.default32 ? 32 : 16;
    const reader = {
      readCodeByte: (offset: number) => this.memory.readCode8(before.eip + offset, codeAddressSize)
    };
    let instruction: DecodedInstruction;
    try {
      instruction = decodeInstruction(reader, before.eip, before.segments.cs.default32);
    } catch (error) {
      if (!this.deliverAccessFault(error, before.eip)) throw error;
      this.trace?.({ before, fault: true, after: this.state.snapshot() });
      return undefined;
    }
    try {
      dispatch({ state: this.state, memory: this.memory, instruction, reader, io: this.io });
    } catch (error) {
      if (!this.deliverAccessFault(error, before.eip)) throw error;
    }
    this.trace?.({
      before,
      opcodeOffset: instruction.opcodeOffset,
      opcode: instruction.opcode,
      after: this.state.snapshot()
    });
    return instruction;
  }

  private deliverAccessFault(error: unknown, faultEip: number): boolean {
    if (error instanceof PageFaultError) {
      const errorCode =
        (error.present ? 1 : 0) | (error.access.write ? 2 : 0) | (error.access.user ? 4 : 0);
      deliverFault(this.memory, this.state, 14, faultEip, errorCode);
      return true;
    }
    if (error instanceof SegmentAccessError) {
      deliverFault(this.memory, this.state, error.segment === "ss" ? 12 : 13, faultEip, 0);
      return true;
    }
    if (error instanceof SegmentLoadError) {
      deliverFault(this.memory, this.state, error.vector, faultEip, error.errorCode);
      return true;
    }
    return false;
  }
}
