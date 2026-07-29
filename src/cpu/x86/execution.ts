import { addressMode, translateSegmentOffset } from "../../memory/address-translation.js";
import { decodeModRm, decodeModRm16Address } from "./modrm.js";
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

function readSegmentUint16(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "ss",
  offset: number
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  const lowAddress = translateSegmentOffset(mode, selected, offset);
  const highAddress = translateSegmentOffset(mode, selected, (offset + 1) & 0xffff);
  return (memory.readUint8(lowAddress) & 0xff) | ((memory.readUint8(highAddress) & 0xff) << 8);
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

function readFarPointer(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "ss",
  offset: number
): { instructionPointer: number; selector: number } {
  return {
    instructionPointer: readSegmentUint16(memory, state, segment, offset),
    selector: readSegmentUint16(memory, state, segment, (offset + 2) & 0xffff)
  };
}

function decodeMemoryAddress(
  memory: InstructionMemory,
  state: Cpu386State,
  modRm: ReturnType<typeof decodeModRm>
) {
  return decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, offset).opcode
  );
}

function executeMemoryFarJump(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "ss"
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
    throw new UnsupportedOpcodeError("Protected-mode far jumps are not implemented");
  }
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x05 || modRm.registerDirect) {
    throw new UnsupportedOpcodeError("Unsupported FF opcode form");
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const pointer = readFarPointer(memory, state, segmentOverride ?? address.segment, address.offset);
  state.loadRealModeCodeSegment(pointer.selector, pointer.instructionPointer);
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
    case 0x2e: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode !== 0xff) throw new UnsupportedOpcodeError("Unsupported CS override instruction");
      executeMemoryFarJump(memory, state, 2, "cs");
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
    case 0x8b: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.registerDirect) {
        state.writeRegister16(modRm.reg, state.readRegister16(modRm.rm));
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      state.writeRegister16(
        modRm.reg,
        readSegmentUint16(memory, state, address.segment, address.offset)
      );
      state.advanceEip(2 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x33: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect)
        throw new UnsupportedOpcodeError("Memory-form XOR is not implemented");
      const result = state.readRegister16(modRm.reg) ^ state.readRegister16(modRm.rm);
      state.writeRegister16(modRm.reg, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x32: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect)
        throw new UnsupportedOpcodeError("Memory-form XOR is not implemented");
      const result = state.readRegister8(modRm.reg) ^ state.readRegister8(modRm.rm);
      state.writeRegister8(modRm.reg, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x80: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect || modRm.reg !== 0x07)
        throw new UnsupportedOpcodeError("Unsupported 80 opcode form");
      state.writeCompareFlags8(
        state.readRegister8(modRm.rm),
        fetchCodeByte(memory, state, 2).opcode
      );
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x81: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x07) throw new UnsupportedOpcodeError("Unsupported 81 opcode form");
      if (modRm.registerDirect) {
        const immediate = fetchCodeUint16(memory, state, 2);
        state.writeCompareFlags16(state.readRegister16(modRm.rm), immediate);
        state.advanceEip(4);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      const immediate = fetchCodeUint16(memory, state, 2 + address.displacementBytes);
      state.writeCompareFlags16(
        readSegmentUint16(memory, state, address.segment, address.offset),
        immediate
      );
      state.advanceEip(4 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0xd0: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect || modRm.reg !== 0x04)
        throw new UnsupportedOpcodeError("Unsupported D0 opcode form");
      const source = state.readRegister8(modRm.rm);
      const result = (source << 1) & 0xff;
      state.writeRegister8(modRm.rm, result);
      state.writeShiftLeftFlags8(source);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xff:
      executeMemoryFarJump(memory, state, 1);
      return { halted: false, fetched };
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
    case 0xe2: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      const count = (state.readRegister16(1) - 1) & 0xffff;
      state.writeRegister16(1, count);
      if (count === 0) state.advanceEip(2);
      else state.writeEip16(fetched.instructionPointer + 2 + displacement);
      return { halted: false, fetched };
    }
    case 0xe3: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.readRegister16(1) === 0)
        state.writeEip16(fetched.instructionPointer + 2 + displacement);
      else state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x75: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.zeroFlag()) state.advanceEip(2);
      else state.writeEip16(fetched.instructionPointer + 2 + displacement);
      return { halted: false, fetched };
    }
    case 0x76: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.carryFlag() || state.zeroFlag())
        state.writeEip16(fetched.instructionPointer + 2 + displacement);
      else state.advanceEip(2);
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
