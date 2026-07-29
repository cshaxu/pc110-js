import { addressMode, translateSegmentOffset } from "./address-translation.js";
import type { Cpu386State } from "./state.js";

export interface InstructionMemory {
  readUint8(linearAddress: number): number;
}

export interface FetchedOpcode {
  readonly linearAddress: number;
  readonly instructionPointer: number;
  readonly opcode: number;
}

export interface ExecutionResult {
  readonly halted: boolean;
  readonly fetched?: FetchedOpcode;
}

export class UnsupportedOpcodeError extends Error {}

export function fetchOpcode(memory: InstructionMemory, state: Cpu386State): FetchedOpcode {
  const snapshot = state.snapshot();
  const linearAddress = translateSegmentOffset(
    addressMode(snapshot.cr0, snapshot.eflags),
    { ...snapshot.cs, present: true },
    snapshot.eip
  );

  return {
    linearAddress,
    instructionPointer: snapshot.eip,
    opcode: memory.readUint8(linearAddress) & 0xff
  };
}

export function stepInstruction(memory: InstructionMemory, state: Cpu386State): ExecutionResult {
  if (state.snapshot().halted) return { halted: true };

  const fetched = fetchOpcode(memory, state);
  switch (fetched.opcode) {
    case 0x90:
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xf4:
      state.advanceEip(1);
      state.halt();
      return { halted: true, fetched };
    default:
      throw new UnsupportedOpcodeError(
        `Unsupported opcode 0x${fetched.opcode.toString(16).padStart(2, "0")}`
      );
  }
}
