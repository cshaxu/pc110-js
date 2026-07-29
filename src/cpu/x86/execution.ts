import { addressMode, translateSegmentOffset } from "../../memory/address-translation.js";
import { decodeModRm, decodeModRm16Address } from "./modrm.js";
import type { Cpu386State, LoadableSegment } from "./state.js";

export interface InstructionMemory {
  readUint8(linearAddress: number): number;
  writeUint8?(linearAddress: number, value: number): void;
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
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  const lowAddress = translateSegmentOffset(mode, selected, offset);
  const highAddress = translateSegmentOffset(mode, selected, (offset + 1) & 0xffff);
  return (memory.readUint8(lowAddress) & 0xff) | ((memory.readUint8(highAddress) & 0xff) << 8);
}

function readSegmentUint8(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  return (
    memory.readUint8(
      translateSegmentOffset(mode, { ...snapshot[segment], present: true }, offset)
    ) & 0xff
  );
}

function writeSegmentUint16(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  value: number
): void {
  if (!memory.writeUint8) throw new UnsupportedOpcodeError("Memory does not support writes");
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  memory.writeUint8(translateSegmentOffset(mode, selected, offset), value & 0xff);
  memory.writeUint8(translateSegmentOffset(mode, selected, (offset + 1) & 0xffff), value >>> 8);
}

function writeSegmentUint8(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  value: number
): void {
  if (!memory.writeUint8) throw new UnsupportedOpcodeError("Memory does not support writes");
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  memory.writeUint8(
    translateSegmentOffset(mode, { ...snapshot[segment], present: true }, offset),
    value & 0xff
  );
}

function pushUint16(memory: InstructionMemory, state: Cpu386State, value: number): void {
  const stackPointer = (state.readRegister16(4) - 2) & 0xffff;
  state.writeRegister16(4, stackPointer);
  writeSegmentUint16(memory, state, "ss", stackPointer, value);
}

function popUint16(memory: InstructionMemory, state: Cpu386State): number {
  const stackPointer = state.readRegister16(4);
  const value = readSegmentUint16(memory, state, "ss", stackPointer);
  state.writeRegister16(4, (stackPointer + 2) & 0xffff);
  return value;
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

function segmentForStore(index: number): "cs" | LoadableSegment | undefined {
  switch (index) {
    case 0:
      return "es";
    case 1:
      return "cs";
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

function executeMovReg16FromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "ss"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) {
    state.writeRegister16(modRm.reg, state.readRegister16(modRm.rm));
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  state.writeRegister16(
    modRm.reg,
    readSegmentUint16(memory, state, segmentOverride ?? address.segment, address.offset)
  );
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executeMovSegmentFromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
    throw new UnsupportedOpcodeError("Protected-mode segment loads are not implemented");
  }
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const segment = segmentForMove(modRm.reg);
  if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
  if (modRm.registerDirect) {
    state.loadRealModeSegment(segment, state.readRegister16(modRm.rm));
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  state.loadRealModeSegment(
    segment,
    readSegmentUint16(memory, state, address.segment, address.offset)
  );
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executeMov8FromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  destinationIsMemory: boolean
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  if (modRm.registerDirect) {
    const source = state.readRegister8(destinationIsMemory ? modRm.reg : modRm.rm);
    state.writeRegister8(destinationIsMemory ? modRm.rm : modRm.reg, source);
    state.advanceEip(2);
    return;
  }
  const address = decodeMemoryAddress(memory, state, modRm);
  if (destinationIsMemory) {
    writeSegmentUint8(
      memory,
      state,
      address.segment,
      address.offset,
      state.readRegister8(modRm.reg)
    );
  } else {
    state.writeRegister8(
      modRm.reg,
      readSegmentUint8(memory, state, address.segment, address.offset)
    );
  }
  state.advanceEip(2 + address.displacementBytes);
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
    case 0xfc:
      state.clearDirectionFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xfd:
      state.setDirectionFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xf8:
      state.clearCarryFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xf9:
      state.setCarryFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
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
      if (opcode === 0xff) executeMemoryFarJump(memory, state, 2, "cs");
      else if (opcode === 0x8b) executeMovReg16FromModRm(memory, state, 2, "cs");
      else throw new UnsupportedOpcodeError("Unsupported CS override instruction");
      return { halted: false, fetched };
    }
    case 0xf3: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode !== 0xab && opcode !== 0xa5)
        throw new UnsupportedOpcodeError("Unsupported REP instruction");
      let count = state.readRegister16(1);
      let source = state.readRegister16(6);
      let destination = state.readRegister16(7);
      const step = state.directionFlag() ? -2 : 2;
      while (count > 0) {
        const value =
          opcode === 0xab
            ? state.readRegister16(0)
            : readSegmentUint16(memory, state, "ds", source);
        writeSegmentUint16(memory, state, "es", destination, value);
        source = (source + step) & 0xffff;
        destination = (destination + step) & 0xffff;
        count -= 1;
      }
      if (opcode === 0xa5) state.writeRegister16(6, source);
      state.writeRegister16(7, destination);
      state.writeRegister16(1, count);
      state.advanceEip(2);
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
      executeMovSegmentFromModRm(memory, state, 1);
      return { halted: false, fetched };
    }
    case 0x8c: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const segment = segmentForStore(modRm.reg);
      if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
      const selector = state.snapshot()[segment].selector;
      if (modRm.registerDirect) {
        state.writeRegister16(modRm.rm, selector);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      writeSegmentUint16(memory, state, address.segment, address.offset, selector);
      state.advanceEip(2 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x89: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const source = state.readRegister16(modRm.reg);
      if (modRm.registerDirect) {
        state.writeRegister16(modRm.rm, source);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      writeSegmentUint16(memory, state, address.segment, address.offset, source);
      state.advanceEip(2 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x88:
      executeMov8FromModRm(memory, state, true);
      return { halted: false, fetched };
    case 0x8a:
      executeMov8FromModRm(memory, state, false);
      return { halted: false, fetched };
    case 0x8b: {
      executeMovReg16FromModRm(memory, state, 1);
      return { halted: false, fetched };
    }
    case 0x8d: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.registerDirect) throw new UnsupportedOpcodeError("LEA requires a memory operand");
      const address = decodeMemoryAddress(memory, state, modRm);
      state.writeRegister16(modRm.reg, address.offset);
      state.advanceEip(2 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0xa0: {
      const offset = fetchCodeUint16(memory, state, 1);
      state.writeRegister8(0, readSegmentUint8(memory, state, "ds", offset));
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0xa1: {
      const offset = fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, readSegmentUint16(memory, state, "ds", offset));
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0xa2: {
      const offset = fetchCodeUint16(memory, state, 1);
      writeSegmentUint8(memory, state, "ds", offset, state.readRegister8(0));
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0xa3: {
      const offset = fetchCodeUint16(memory, state, 1);
      writeSegmentUint16(memory, state, "ds", offset, state.readRegister16(0));
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0xc6: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0) throw new UnsupportedOpcodeError("Unsupported C6 opcode form");
      if (modRm.registerDirect) {
        state.writeRegister8(modRm.rm, fetchCodeByte(memory, state, 2).opcode);
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      writeSegmentUint8(
        memory,
        state,
        address.segment,
        address.offset,
        fetchCodeByte(memory, state, 2 + address.displacementBytes).opcode
      );
      state.advanceEip(3 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0xc7: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0) throw new UnsupportedOpcodeError("Unsupported C7 opcode form");
      if (modRm.registerDirect) {
        state.writeRegister16(modRm.rm, fetchCodeUint16(memory, state, 2));
        state.advanceEip(4);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      writeSegmentUint16(
        memory,
        state,
        address.segment,
        address.offset,
        fetchCodeUint16(memory, state, 2 + address.displacementBytes)
      );
      state.advanceEip(4 + address.displacementBytes);
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
    case 0xe8: {
      const displacement = signedWord(fetchCodeUint16(memory, state, 1));
      const returnAddress = (fetched.instructionPointer + 3) & 0xffff;
      pushUint16(memory, state, returnAddress);
      state.writeEip16(returnAddress + displacement);
      return { halted: false, fetched };
    }
    case 0xc3:
      state.writeEip16(popUint16(memory, state));
      return { halted: false, fetched };
    case 0xcd: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode INT is not implemented");
      }
      const vector = fetchCodeByte(memory, state, 1).opcode;
      const vectorAddress = vector << 2;
      const instructionPointer =
        memory.readUint8(vectorAddress) | (memory.readUint8(vectorAddress + 1) << 8);
      const selector =
        memory.readUint8(vectorAddress + 2) | (memory.readUint8(vectorAddress + 3) << 8);
      pushUint16(memory, state, snapshot.eflags & 0xffff);
      pushUint16(memory, state, snapshot.cs.selector);
      pushUint16(memory, state, (fetched.instructionPointer + 2) & 0xffff);
      state.clearInterruptFlag();
      state.loadRealModeCodeSegment(selector, instructionPointer);
      return { halted: false, fetched };
    }
    case 0xcf: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode IRET is not implemented");
      }
      const instructionPointer = popUint16(memory, state);
      const selector = popUint16(memory, state);
      const flags = popUint16(memory, state);
      state.writeEflags(flags);
      state.loadRealModeCodeSegment(selector, instructionPointer);
      return { halted: false, fetched };
    }
    case 0x60: {
      const originalStackPointer = state.readRegister16(4);
      for (const register of [0, 1, 2, 3, 4, 5, 6, 7]) {
        pushUint16(
          memory,
          state,
          register === 4 ? originalStackPointer : state.readRegister16(register)
        );
      }
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x61:
      for (const register of [7, 6, 5]) state.writeRegister16(register, popUint16(memory, state));
      popUint16(memory, state);
      for (const register of [3, 2, 1, 0])
        state.writeRegister16(register, popUint16(memory, state));
      state.advanceEip(1);
      return { halted: false, fetched };
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
    case 0x74: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.zeroFlag()) state.writeEip16(fetched.instructionPointer + 2 + displacement);
      else state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x76: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.carryFlag() || state.zeroFlag())
        state.writeEip16(fetched.instructionPointer + 2 + displacement);
      else state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x72: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (state.carryFlag()) state.writeEip16(fetched.instructionPointer + 2 + displacement);
      else state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xa8: {
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      state.writeLogicFlags8(state.snapshot().registers.eax & 0xff & immediate);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x0c: {
      const result = state.readRegister8(0) | fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x24: {
      const result = state.readRegister8(0) & fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x3c:
      state.writeCompareFlags8(state.readRegister8(0), fetchCodeByte(memory, state, 1).opcode);
      state.advanceEip(2);
      return { halted: false, fetched };
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
    case 0xec: {
      if (!ports?.readPort8) throw new UnsupportedOpcodeError("IN requires a port reader");
      state.writeRegister8(0, ports.readPort8(state.readRegister16(2)));
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xee: {
      if (!ports?.writePort8) throw new UnsupportedOpcodeError("OUT requires a port writer");
      ports.writePort8(state.readRegister16(2), state.readRegister8(0));
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    default:
      if (fetched.opcode >= 0x40 && fetched.opcode <= 0x47) {
        const register = fetched.opcode - 0x40;
        const source = state.readRegister16(register);
        const result = (source + 1) & 0xffff;
        state.writeRegister16(register, result);
        state.writeIncrementFlags16(source);
        state.advanceEip(1);
        return { halted: false, fetched };
      }
      if (fetched.opcode >= 0x48 && fetched.opcode <= 0x4f) {
        const register = fetched.opcode - 0x48;
        const source = state.readRegister16(register);
        state.writeRegister16(register, (source - 1) & 0xffff);
        state.writeDecrementFlags16(source);
        state.advanceEip(1);
        return { halted: false, fetched };
      }
      if (fetched.opcode >= 0x50 && fetched.opcode <= 0x57) {
        pushUint16(memory, state, state.readRegister16(fetched.opcode - 0x50));
        state.advanceEip(1);
        return { halted: false, fetched };
      }
      if (fetched.opcode >= 0x58 && fetched.opcode <= 0x5f) {
        state.writeRegister16(fetched.opcode - 0x58, popUint16(memory, state));
        state.advanceEip(1);
        return { halted: false, fetched };
      }
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
