import { addressMode, translateSegmentOffset } from "./address-translation.js";
import type { Cpu386State, LoadableSegment } from "./state.js";

export interface InstructionMemory {
  readUint8(linearAddress: number): number;
}

export interface PortIo {
  readPort8?(port: number): number;
  writePort8?(port: number, value: number): void;
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

function segmentForMove(index: number): LoadableSegment | undefined {
  switch (index) {
    case 0:
      return "es";
    case 2:
      return "ss";
    case 3:
      return "ds";
    case 4:
      return "fs";
    case 5:
      return "gs";
    default:
      return undefined;
  }
}

export function stepInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  ports?: PortIo
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
    case 0x0f: {
      const extension = fetchCodeByte(memory, state, 1).opcode;
      const modRm = fetchCodeByte(memory, state, 2).opcode;
      if (extension === 0x01 && modRm === 0xf0) {
        state.loadMachineStatusWord(state.snapshot().registers.eax & 0xffff);
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      throw new UnsupportedOpcodeError(
        `Unsupported 0F opcode 0x${extension.toString(16).padStart(2, "0")}`
      );
    }
    case 0x8e: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real")
        throw new UnsupportedOpcodeError("Protected-mode segment loads are not implemented");
      const modRm = fetchCodeByte(memory, state, 1).opcode;
      if ((modRm & 0xc0) !== 0xc0)
        throw new UnsupportedOpcodeError("Memory-form segment loads are not implemented");
      const segment = segmentForMove((modRm >>> 3) & 0x07);
      if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
      state.loadRealModeSegment(segment, state.readRegister16(modRm & 0x07));
      state.advanceEip(2);
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
    case 0x75: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.zeroFlag()) state.advanceEip(2);
      else state.writeEip16(fetched.instructionPointer + 2 + displacement);
      return { halted: false, fetched };
    }
    case 0xa8: {
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      state.writeLogicFlags8(state.snapshot().registers.eax & 0xff & immediate);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xe4: {
      if (!ports?.readPort8) throw new UnsupportedOpcodeError("IN requires a port reader");
      const port = fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, ports.readPort8(port));
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xe6: {
      if (!ports?.writePort8) throw new UnsupportedOpcodeError("OUT requires a port writer");
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
