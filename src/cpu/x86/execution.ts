import { addressMode, translateSegmentOffset } from "./address-translation.js";
import type { Cpu386State } from "./state.js";

export interface InstructionMemory {
  readUint8(linearAddress: number): number;
}

export interface PortWriter {
  writePort8(port: number, value: number): void;
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
  return fetchCodeByte(memory, state, 0);
}

function fetchCodeByte(
  memory: InstructionMemory,
  state: Cpu386State,
  displacement: number
): FetchedOpcode {
  const snapshot = state.snapshot();
  const instructionPointer = (snapshot.eip + displacement) >>> 0;
  const linearAddress = translateSegmentOffset(
    addressMode(snapshot.cr0, snapshot.eflags),
    { ...snapshot.cs, present: true },
    instructionPointer
  );

  return {
    linearAddress,
    instructionPointer,
    opcode: memory.readUint8(linearAddress) & 0xff
  };
}

function fetchCodeUint16(
  memory: InstructionMemory,
  state: Cpu386State,
  displacement: number
): number {
  const low = fetchCodeByte(memory, state, displacement).opcode;
  const high = fetchCodeByte(memory, state, displacement + 1).opcode;
  return low | (high << 8);
}

function signedByte(value: number): number {
  return (value << 24) >> 24;
}

function signedWord(value: number): number {
  return (value << 16) >> 16;
}

export function stepInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  ports?: PortWriter
): ExecutionResult {
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
    case 0x9e:
      state.writeStatusFlagsFromAh((state.snapshot().registers.eax >>> 8) & 0xff);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xfa: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real")
        throw new UnsupportedOpcodeError("Protected-mode CLI is not implemented");
      state.clearInterruptFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xea: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real")
        throw new UnsupportedOpcodeError("Protected-mode far jumps are not implemented");
      const instructionPointer = fetchCodeUint16(memory, state, 1);
      const selector = fetchCodeUint16(memory, state, 3);
      state.loadRealModeCodeSegment(selector, instructionPointer);
      return { halted: false, fetched };
    }
    case 0xe9: {
      const displacement = signedWord(fetchCodeUint16(memory, state, 1));
      state.writeEip16(fetched.instructionPointer + 3 + displacement);
      return { halted: false, fetched };
    }
    case 0xeb: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      state.writeEip16(fetched.instructionPointer + 2 + displacement);
      return { halted: false, fetched };
    }
    case 0xe6: {
      if (!ports) throw new UnsupportedOpcodeError("OUT requires a port writer");
      const port = fetchCodeByte(memory, state, 1).opcode;
      ports.writePort8(port, state.snapshot().registers.eax & 0xff);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    default:
      if (fetched.opcode >= 0xb0 && fetched.opcode <= 0xb7) {
        state.writeRegister8(fetched.opcode - 0xb0, fetchCodeByte(memory, state, 1).opcode);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (fetched.opcode >= 0xb8 && fetched.opcode <= 0xbf) {
        state.writeRegister16(fetched.opcode - 0xb8, fetchCodeUint16(memory, state, 1));
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      throw new UnsupportedOpcodeError(
        `Unsupported opcode 0x${fetched.opcode.toString(16).padStart(2, "0")}`
      );
  }
}
