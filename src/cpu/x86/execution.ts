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
