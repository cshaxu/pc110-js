import {
  decodeInstruction,
  InstructionLengthError,
  type DecodedInstruction
} from "./decode/decoder.js";
import type { InstructionReader } from "./decode/instruction-reader.js";
import type { RebuiltTraceHook, RebuiltTraceOptions } from "./debug/trace.js";
import { PageFaultError } from "../../memory/address-translation.js";
import {
  deliverFault,
  deliverInterrupt,
  InterruptDeliveryError
} from "./events/interrupt-delivery.js";
import { RebuiltDivideError } from "./instructions/group-three.js";
import type { RebuiltPortBus } from "./io/port-bus.js";
import {
  SegmentAccessError,
  SegmentedMemory,
  type RebuiltMemoryBus
} from "./memory/segmented-memory.js";
import { SegmentLoadError } from "./protection/segment-loader.js";
import { RebuiltIoPermissionError } from "./protection/io-permission.js";
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
  private readonly trace?: RebuiltTraceHook;
  private readonly shouldCapture?: RebuiltTraceOptions["shouldCapture"];

  public constructor(
    private readonly state: RebuiltCpuState,
    bus: RebuiltMemoryBus,
    trace?: RebuiltTraceHook | RebuiltTraceOptions,
    private readonly io?: RebuiltPortBus
  ) {
    this.memory = new SegmentedMemory(bus, state);
    if (typeof trace === "function") this.trace = trace;
    else if (trace) {
      this.trace = trace.onTrace;
      this.shouldCapture = trace.shouldCapture;
    }
  }

  public step(dispatch: RebuiltInstructionDispatcher): DecodedInstruction | undefined {
    const faultEip = this.state.readEip();
    const codeDefault32 = this.state.codeDefault32();
    const tracePoint = {
      cs: this.state.readSegment("cs").selector,
      eip: faultEip,
      codeDefault32
    };
    // A diagnostic run must retain a pre-fault state even when this ordinary
    // instruction boundary is not selected for emission.
    const before = this.trace ? this.state.snapshot() : undefined;
    const captureInstruction = this.shouldCapture === undefined || this.shouldCapture(tracePoint);
    const codeAddressSize = codeDefault32 ? 32 : 16;
    const reader = {
      readCodeByte: (offset: number) => {
        if (offset < 0 || offset >= 15) throw new InstructionLengthError(faultEip);
        return this.memory.readCode8(faultEip + offset, codeAddressSize);
      }
    };
    let instruction: DecodedInstruction;
    try {
      instruction = decodeInstruction(reader, faultEip, codeDefault32);
    } catch (error) {
      if (!this.deliverAccessFault(error, faultEip)) throw error;
      if (this.trace && before) this.trace({ before, fault: true, after: this.state.snapshot() });
      return undefined;
    }
    let dispatchFaultBefore: typeof before = undefined;
    try {
      dispatch({ state: this.state, memory: this.memory, instruction, reader, io: this.io });
    } catch (error) {
      dispatchFaultBefore = before;
      if (!this.deliverAccessFault(error, faultEip)) throw error;
    }
    this.state.completeInstructionBoundary();
    if (this.trace && dispatchFaultBefore)
      this.trace({
        before: dispatchFaultBefore,
        opcodeOffset: instruction.opcodeOffset,
        opcode: instruction.opcode,
        fault: true,
        after: this.state.snapshot()
      });
    else if (this.trace && before && captureInstruction)
      this.trace({
        before,
        opcodeOffset: instruction.opcodeOffset,
        opcode: instruction.opcode,
        after: this.state.snapshot()
      });
    return instruction;
  }

  public serviceExternalInterrupt(vector: number): boolean {
    if (!Number.isInteger(vector) || vector < 0 || vector > 0xff)
      throw new RangeError("Interrupt vector must be an 8-bit integer");
    if (!(this.state.flags.read() & 0x00000200) || this.state.maskableInterruptsInhibited())
      return false;
    deliverInterrupt(this.memory, this.state, {
      vector,
      returnEip: this.state.readEip(),
      operandSize: this.state.codeDefault32() ? 32 : 16,
      software: false
    });
    this.state.resume();
    return true;
  }

  public serviceNonMaskableInterrupt(vector = 2): boolean {
    if (!Number.isInteger(vector) || vector < 0 || vector > 0xff)
      throw new RangeError("Interrupt vector must be an 8-bit integer");
    deliverInterrupt(this.memory, this.state, {
      vector,
      returnEip: this.state.readEip(),
      operandSize: this.state.codeDefault32() ? 32 : 16,
      software: false
    });
    this.state.resume();
    return true;
  }

  private deliverAccessFault(error: unknown, faultEip: number): boolean {
    if (error instanceof InterruptDeliveryError) {
      deliverFault(this.memory, this.state, error.vector, faultEip, error.errorCode);
      return true;
    }
    if (error instanceof InstructionLengthError) {
      deliverFault(this.memory, this.state, 13, error.faultEip, 0);
      return true;
    }
    if (error instanceof RebuiltDivideError) {
      deliverFault(this.memory, this.state, 0, error.faultEip);
      return true;
    }
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
    if (error instanceof RebuiltIoPermissionError) {
      deliverFault(this.memory, this.state, 13, faultEip, 0);
      return true;
    }
    return false;
  }
}
