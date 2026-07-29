import { addressMode, translateSegmentOffset } from "../../memory/address-translation.js";
import { decodeModRm, decodeModRm16Address } from "./modrm.js";
import { SegmentRegister } from "./segment-register.js";
import type { Cpu386Snapshot, Cpu386State, LoadableSegment } from "./state.js";

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

export interface InstructionTraceEvent {
  readonly before: Cpu386Snapshot;
  readonly after: Cpu386Snapshot;
  readonly result: ExecutionResult;
}

export type InstructionTrace = (event: InstructionTraceEvent) => void;

export class UnsupportedOpcodeError extends Error {}

export class DivideError extends Error {}

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

function fetchCodeUint32(
  memory: InstructionMemory,
  state: Cpu386State,
  displacement: number
): number {
  return (
    (fetchCodeByte(memory, state, displacement).opcode |
      (fetchCodeByte(memory, state, displacement + 1).opcode << 8) |
      (fetchCodeByte(memory, state, displacement + 2).opcode << 16) |
      (fetchCodeByte(memory, state, displacement + 3).opcode << 24)) >>>
    0
  );
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

function deliverRealModeInterrupt(
  memory: InstructionMemory,
  state: Cpu386State,
  vector: number,
  returnInstructionPointer: number
): void {
  const snapshot = state.snapshot();
  const vectorAddress = (vector & 0xff) << 2;
  const instructionPointer =
    memory.readUint8(vectorAddress) | (memory.readUint8(vectorAddress + 1) << 8);
  const selector = memory.readUint8(vectorAddress + 2) | (memory.readUint8(vectorAddress + 3) << 8);
  pushUint16(memory, state, snapshot.eflags & 0xffff);
  pushUint16(memory, state, snapshot.cs.selector);
  pushUint16(memory, state, returnInstructionPointer & 0xffff);
  state.clearInterruptAndTrapFlags();
  state.loadRealModeCodeSegment(selector, instructionPointer);
}

export function serviceExternalInterrupt(
  memory: InstructionMemory,
  state: Cpu386State,
  vector: number
): boolean {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
    throw new UnsupportedOpcodeError(
      "Protected-mode external interrupt delivery is not implemented"
    );
  }
  if (!state.interruptFlag()) return false;
  deliverRealModeInterrupt(memory, state, vector, snapshot.eip);
  state.resume();
  return true;
}

function signedByte(value: number): number {
  return (value << 24) >> 24;
}

function signedWord(value: number): number {
  return (value << 16) >> 16;
}

function shortJumpCondition(state: Cpu386State, condition: number): boolean {
  const carry = state.carryFlag();
  const zero = state.zeroFlag();
  const sign = state.signFlag();
  const overflow = state.overflowFlag();

  switch (condition) {
    case 0x00:
      return overflow;
    case 0x01:
      return !overflow;
    case 0x02:
      return carry;
    case 0x03:
      return !carry;
    case 0x04:
      return zero;
    case 0x05:
      return !zero;
    case 0x06:
      return carry || zero;
    case 0x07:
      return !carry && !zero;
    case 0x08:
      return sign;
    case 0x09:
      return !sign;
    case 0x0a:
      return state.parityFlag();
    case 0x0b:
      return !state.parityFlag();
    case 0x0c:
      return sign !== overflow;
    case 0x0d:
      return sign === overflow;
    case 0x0e:
      return zero || sign !== overflow;
    case 0x0f:
      return !zero && sign === overflow;
    default:
      throw new UnsupportedOpcodeError("Unsupported short conditional-jump form");
  }
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

function segmentForPop(index: number): LoadableSegment | undefined {
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

function loadProtectedModeCodeSegment(
  memory: InstructionMemory,
  state: Cpu386State,
  selector: number,
  instructionPointer: number
): void {
  const snapshot = state.snapshot();
  const descriptorMemory = {
    readUint32: (address: number) =>
      (memory.readUint8(address) & 0xff) |
      ((memory.readUint8((address + 1) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((address + 2) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((address + 3) >>> 0) & 0xff) << 24)
  };
  const loaded = new SegmentRegister().load(
    "protected",
    selector,
    "execute",
    snapshot.cs.selector & 0x03,
    descriptorMemory,
    { gdt: snapshot.gdtr }
  );
  state.loadProtectedModeCodeSegment(
    loaded.selector,
    loaded.base,
    loaded.limit,
    instructionPointer
  );
}

function loadProtectedModeSegment(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: LoadableSegment,
  selector: number
): void {
  const snapshot = state.snapshot();
  const descriptorMemory = {
    readUint32: (address: number) =>
      (memory.readUint8(address) & 0xff) |
      ((memory.readUint8((address + 1) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((address + 2) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((address + 3) >>> 0) & 0xff) << 24)
  };
  const loaded = new SegmentRegister().load(
    "protected",
    selector,
    segment === "ss" ? "stack" : "read",
    snapshot.cs.selector & 0x03,
    descriptorMemory,
    { gdt: snapshot.gdtr }
  );
  state.loadProtectedModeSegment(segment, loaded.selector, loaded.base, loaded.limit);
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
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
    state.loadRealModeCodeSegment(pointer.selector, pointer.instructionPointer);
  } else {
    loadProtectedModeCodeSegment(memory, state, pointer.selector, pointer.instructionPointer);
  }
}

function executeMemoryFarCall(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
    throw new UnsupportedOpcodeError("Protected-mode far CALL is not implemented");
  }
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x03 || modRm.registerDirect) {
    throw new UnsupportedOpcodeError("Unsupported FF opcode form");
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const pointer = readFarPointer(memory, state, address.segment, address.offset);
  const returnInstructionPointer =
    (snapshot.eip + modRmOffset + 1 + address.displacementBytes) & 0xffff;
  pushUint16(memory, state, snapshot.cs.selector);
  pushUint16(memory, state, returnInstructionPointer);
  state.loadRealModeCodeSegment(pointer.selector, pointer.instructionPointer);
}

function executeNearCall(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "ss"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x02) throw new UnsupportedOpcodeError("Unsupported FF opcode form");
  if (modRm.registerDirect) {
    pushUint16(memory, state, (state.snapshot().eip + modRmOffset + 1) & 0xffff);
    state.writeEip16(state.readRegister16(modRm.rm));
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const target = readSegmentUint16(
    memory,
    state,
    segmentOverride ?? address.segment,
    address.offset
  );
  pushUint16(
    memory,
    state,
    (state.snapshot().eip + modRmOffset + 1 + address.displacementBytes) & 0xffff
  );
  state.writeEip16(target);
}

function executePushModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "es" | "ss"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x06) throw new UnsupportedOpcodeError("Unsupported FF opcode form");
  if (modRm.registerDirect) {
    pushUint16(memory, state, state.readRegister16(modRm.rm));
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  pushUint16(
    memory,
    state,
    readSegmentUint16(memory, state, segmentOverride ?? address.segment, address.offset)
  );
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executePopModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "es" | "ss"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x00) throw new UnsupportedOpcodeError("Unsupported 8F opcode form");
  if (modRm.registerDirect) {
    state.writeRegister16(modRm.rm, popUint16(memory, state));
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const value = popUint16(memory, state);
  writeSegmentUint16(memory, state, segmentOverride ?? address.segment, address.offset, value);
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executeMovReg16FromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  segmentOverride?: "cs" | "ds" | "es" | "ss" | "fs" | "gs"
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
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const segment = segmentForMove(modRm.reg);
  if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
  let selector: number;
  let displacementBytes = 0;
  if (modRm.registerDirect) {
    selector = state.readRegister16(modRm.rm);
  } else {
    const address = decodeModRm16Address(
      modRm,
      (index) => state.readRegister16(index),
      (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
    );
    selector = readSegmentUint16(memory, state, address.segment, address.offset);
    displacementBytes = address.displacementBytes;
  }
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
    state.loadRealModeSegment(segment, selector);
  } else {
    loadProtectedModeSegment(memory, state, segment, selector);
  }
  state.advanceEip(modRmOffset + 1 + displacementBytes);
}

function executeMov8FromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  destinationIsMemory: boolean,
  modRmOffset = 1,
  segmentOverride?: "cs" | "ds" | "es" | "ss" | "fs" | "gs"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) {
    const source = state.readRegister8(destinationIsMemory ? modRm.reg : modRm.rm);
    state.writeRegister8(destinationIsMemory ? modRm.rm : modRm.reg, source);
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  if (destinationIsMemory) {
    writeSegmentUint8(
      memory,
      state,
      segmentOverride ?? address.segment,
      address.offset,
      state.readRegister8(modRm.reg)
    );
  } else {
    state.writeRegister8(
      modRm.reg,
      readSegmentUint8(memory, state, segmentOverride ?? address.segment, address.offset)
    );
  }
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executeXchgModRm(memory: InstructionMemory, state: Cpu386State, width: 8 | 16): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  if (modRm.registerDirect) {
    if (width === 8) {
      const register = state.readRegister8(modRm.reg);
      state.writeRegister8(modRm.reg, state.readRegister8(modRm.rm));
      state.writeRegister8(modRm.rm, register);
    } else {
      const register = state.readRegister16(modRm.reg);
      state.writeRegister16(modRm.reg, state.readRegister16(modRm.rm));
      state.writeRegister16(modRm.rm, register);
    }
    state.advanceEip(2);
    return;
  }
  const address = decodeMemoryAddress(memory, state, modRm);
  if (width === 8) {
    const register = state.readRegister8(modRm.reg);
    state.writeRegister8(
      modRm.reg,
      readSegmentUint8(memory, state, address.segment, address.offset)
    );
    writeSegmentUint8(memory, state, address.segment, address.offset, register);
  } else {
    const register = state.readRegister16(modRm.reg);
    state.writeRegister16(
      modRm.reg,
      readSegmentUint16(memory, state, address.segment, address.offset)
    );
    writeSegmentUint16(memory, state, address.segment, address.offset, register);
  }
  state.advanceEip(2 + address.displacementBytes);
}

function executeByteAluModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  operation: "add" | "sub",
  destinationIsMemory: boolean
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  const destinationRegister = destinationIsMemory ? modRm.rm : modRm.reg;
  const sourceRegister = destinationIsMemory ? modRm.reg : modRm.rm;
  let destination: number;
  let source: number;
  let address: ReturnType<typeof decodeMemoryAddress> | undefined;
  if (modRm.registerDirect) {
    destination = state.readRegister8(destinationRegister);
    source = state.readRegister8(sourceRegister);
  } else {
    address = decodeMemoryAddress(memory, state, modRm);
    if (destinationIsMemory) {
      destination = readSegmentUint8(memory, state, address.segment, address.offset);
      source = state.readRegister8(sourceRegister);
    } else {
      destination = state.readRegister8(destinationRegister);
      source = readSegmentUint8(memory, state, address.segment, address.offset);
    }
  }
  const result = operation === "add" ? destination + source : destination - source;
  if (modRm.registerDirect || !destinationIsMemory)
    state.writeRegister8(destinationRegister, result);
  else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
  if (operation === "add") state.writeAddFlags8(destination, source);
  else state.writeCompareFlags8(destination, source);
  state.advanceEip(2 + (address?.displacementBytes ?? 0));
}

function executeWordAddModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  destinationIsRegister: boolean
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
  const destination = destinationIsRegister
    ? state.readRegister16(modRm.reg)
    : modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset);
  const source = destinationIsRegister
    ? modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset)
    : state.readRegister16(modRm.reg);
  const result = destination + source;
  if (destinationIsRegister) state.writeRegister16(modRm.reg, result);
  else if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
  else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
  state.writeAddFlags16(destination, source);
  state.advanceEip(2 + (address?.displacementBytes ?? 0));
}

function executeShiftWord(
  memory: InstructionMemory,
  state: Cpu386State,
  count: number,
  immediateCount = false
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  if (modRm.reg !== 0x04 && modRm.reg !== 0x05)
    throw new UnsupportedOpcodeError("Unsupported word shift opcode form");
  const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
  const source = modRm.registerDirect
    ? state.readRegister16(modRm.rm)
    : readSegmentUint16(memory, state, address!.segment, address!.offset);
  const normalizedCount = count & 0x1f;
  const result =
    normalizedCount > 16
      ? 0
      : modRm.reg === 0x04
        ? (source << normalizedCount) & 0xffff
        : source >>> normalizedCount;
  if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
  else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
  if (modRm.reg === 0x04) state.writeShiftLeftFlags16(source, count);
  else state.writeShiftRightFlags16(source, count);
  state.advanceEip(2 + (address?.displacementBytes ?? 0) + (immediateCount ? 1 : 0));
}

function executeShiftRightByte(memory: InstructionMemory, state: Cpu386State, count: number): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
  if (modRm.reg !== 0x05) throw new UnsupportedOpcodeError("Unsupported byte shift opcode form");
  const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
  const source = modRm.registerDirect
    ? state.readRegister8(modRm.rm)
    : readSegmentUint8(memory, state, address!.segment, address!.offset);
  const normalizedCount = count & 0x1f;
  const result = normalizedCount > 8 ? 0 : source >>> normalizedCount;
  if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
  else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
  state.writeShiftRightFlags8(source, count);
  state.advanceEip(3 + (address?.displacementBytes ?? 0));
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
    case 0x9c:
      pushUint16(memory, state, state.snapshot().eflags & 0xffff);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9d: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode POPF is not implemented");
      }
      state.writeEflags(popUint16(memory, state));
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x06:
    case 0x0e:
    case 0x16:
    case 0x1e: {
      const segment =
        fetched.opcode === 0x06
          ? "es"
          : fetched.opcode === 0x0e
            ? "cs"
            : fetched.opcode === 0x16
              ? "ss"
              : "ds";
      pushUint16(memory, state, state.snapshot()[segment].selector);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x07:
    case 0x17:
    case 0x1f: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode POP segment is not implemented");
      }
      const segment = segmentForPop((fetched.opcode - 0x07) >>> 3);
      if (!segment) throw new UnsupportedOpcodeError("Unsupported POP segment opcode");
      state.loadRealModeSegment(segment, popUint16(memory, state));
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xfa: {
      const snapshot = state.snapshot();
      if (
        addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
        (snapshot.cs.selector & 0x03) !== 0
      ) {
        throw new UnsupportedOpcodeError("Protected-mode CLI requires exception delivery");
      }
      state.clearInterruptFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xfb: {
      const snapshot = state.snapshot();
      if (
        addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
        (snapshot.cs.selector & 0x03) !== 0
      ) {
        throw new UnsupportedOpcodeError("Protected-mode STI requires exception delivery");
      }
      state.setInterruptFlag();
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
      const instructionPointer = fetchCodeUint16(memory, state, 1);
      const selector = fetchCodeUint16(memory, state, 3);
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
        state.loadRealModeCodeSegment(selector, instructionPointer);
      } else {
        loadProtectedModeCodeSegment(memory, state, selector, instructionPointer);
      }
      return { halted: false, fetched };
    }
    case 0x2e: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode === 0xff) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (modRm.reg === 0x05) executeMemoryFarJump(memory, state, 2, "cs");
        else if (modRm.reg === 0x02) executeNearCall(memory, state, 2, "cs");
        else throw new UnsupportedOpcodeError("Unsupported CS override instruction");
      } else if (opcode === 0x8b) executeMovReg16FromModRm(memory, state, 2, "cs");
      else throw new UnsupportedOpcodeError("Unsupported CS override instruction");
      return { halted: false, fetched };
    }
    case 0x26: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode === 0x8b) {
        executeMovReg16FromModRm(memory, state, 2, "es");
        return { halted: false, fetched };
      }
      if (opcode === 0x88) {
        executeMov8FromModRm(memory, state, true, 2, "es");
        return { halted: false, fetched };
      }
      if (opcode === 0xff) {
        executePushModRm(memory, state, 2, "es");
        return { halted: false, fetched };
      }
      if (opcode === 0x8f) {
        executePopModRm(memory, state, 2, "es");
        return { halted: false, fetched };
      }
      if (opcode !== 0xc6 && opcode !== 0xc7)
        throw new UnsupportedOpcodeError("Unsupported ES override instruction");
      const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
      if (modRm.reg !== 0)
        throw new UnsupportedOpcodeError(`Unsupported ${opcode.toString(16)} opcode form`);
      const immediateBytes = opcode === 0xc6 ? 1 : 2;
      if (modRm.registerDirect) {
        if (opcode === 0xc6) state.writeRegister8(modRm.rm, fetchCodeByte(memory, state, 3).opcode);
        else state.writeRegister16(modRm.rm, fetchCodeUint16(memory, state, 3));
        state.advanceEip(3 + immediateBytes);
        return { halted: false, fetched };
      }
      const address = decodeModRm16Address(
        modRm,
        (index) => state.readRegister16(index),
        (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
      );
      if (opcode === 0xc6) {
        writeSegmentUint8(
          memory,
          state,
          "es",
          address.offset,
          fetchCodeByte(memory, state, 3 + address.displacementBytes).opcode
        );
      } else {
        writeSegmentUint16(
          memory,
          state,
          "es",
          address.offset,
          fetchCodeUint16(memory, state, 3 + address.displacementBytes)
        );
      }
      state.advanceEip(3 + immediateBytes + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x66: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode !== 0x25) throw new UnsupportedOpcodeError("Unsupported operand-size override");
      const result = state.readRegister(0) & fetchCodeUint32(memory, state, 2);
      state.writeRegister(0, result);
      state.writeLogicFlags32(result);
      state.advanceEip(6);
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
      if (extension === 0x20 || extension === 0x22) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (!modRm.registerDirect || modRm.reg !== 0x00) {
          throw new UnsupportedOpcodeError("Unsupported control-register MOV form");
        }
        if (extension === 0x20) state.writeRegister(modRm.rm, state.snapshot().cr0);
        else state.writeCr0(state.readRegister(modRm.rm));
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      if (extension === 0x01) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (modRm.registerDirect && modRm.reg === 0x06 && modRm.rm === 0x00) {
          state.loadMachineStatusWord(state.snapshot().registers.eax & 0xffff);
          state.advanceEip(3);
          return { halted: false, fetched };
        }
        if (!modRm.registerDirect && (modRm.reg === 0x02 || modRm.reg === 0x03)) {
          const address = decodeModRm16Address(
            modRm,
            (index) => state.readRegister16(index),
            (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
          );
          const limit = readSegmentUint16(memory, state, address.segment, address.offset);
          const base =
            readSegmentUint8(memory, state, address.segment, (address.offset + 2) & 0xffff) |
            (readSegmentUint8(memory, state, address.segment, (address.offset + 3) & 0xffff) << 8) |
            (readSegmentUint8(memory, state, address.segment, (address.offset + 4) & 0xffff) << 16);
          if (modRm.reg === 0x02) state.writeGdtr(base, limit);
          else state.writeIdtr(base, limit);
          state.advanceEip(3 + address.displacementBytes);
          return { halted: false, fetched };
        }
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
    case 0x86:
      executeXchgModRm(memory, state, 8);
      return { halted: false, fetched };
    case 0x87:
      executeXchgModRm(memory, state, 16);
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
    case 0x8f:
      executePopModRm(memory, state, 1);
      return { halted: false, fetched };
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
    case 0xac: {
      const source = state.readRegister16(6);
      state.writeRegister8(0, readSegmentUint8(memory, state, "ds", source));
      state.writeRegister16(6, (source + (state.directionFlag() ? -1 : 1)) & 0xffff);
      state.advanceEip(1);
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
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = state.readRegister16(modRm.reg) ^ source;
      state.writeRegister16(modRm.reg, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x0b: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = state.readRegister16(modRm.reg) | source;
      state.writeRegister16(modRm.reg, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x09: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = destination | state.readRegister16(modRm.reg);
      if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
      else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x21: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = destination & state.readRegister16(modRm.reg);
      if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
      else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x08: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = destination | state.readRegister8(modRm.reg);
      if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
      else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x0a: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      let source: number;
      let displacementBytes = 0;
      if (modRm.registerDirect) source = state.readRegister8(modRm.rm);
      else {
        const address = decodeMemoryAddress(memory, state, modRm);
        source = readSegmentUint8(memory, state, address.segment, address.offset);
        displacementBytes = address.displacementBytes;
      }
      const result = state.readRegister8(modRm.reg) | source;
      state.writeRegister8(modRm.reg, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + displacementBytes);
      return { halted: false, fetched };
    }
    case 0x00:
      executeByteAluModRm(memory, state, "add", true);
      return { halted: false, fetched };
    case 0x01:
      executeWordAddModRm(memory, state, false);
      return { halted: false, fetched };
    case 0x02:
      executeByteAluModRm(memory, state, "add", false);
      return { halted: false, fetched };
    case 0x03:
      executeWordAddModRm(memory, state, true);
      return { halted: false, fetched };
    case 0x05: {
      const accumulator = state.readRegister16(0);
      const immediate = fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, accumulator + immediate);
      state.writeAddFlags16(accumulator, immediate);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x0d: {
      const result = state.readRegister16(0) | fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, result);
      state.writeLogicFlags16(result);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x2a:
      executeByteAluModRm(memory, state, "sub", false);
      return { halted: false, fetched };
    case 0x2b: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const destination = state.readRegister16(modRm.reg);
      state.writeRegister16(modRm.reg, destination - source);
      state.writeCompareFlags16(destination, source);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x2c: {
      const accumulator = state.readRegister8(0);
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, accumulator - immediate);
      state.writeCompareFlags8(accumulator, immediate);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x2d: {
      const accumulator = state.readRegister16(0);
      const immediate = fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, accumulator - immediate);
      state.writeCompareFlags16(accumulator, immediate);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x38: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const left = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      state.writeCompareFlags8(left, state.readRegister8(modRm.reg));
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x32: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = state.readRegister8(modRm.reg) ^ source;
      state.writeRegister8(modRm.reg, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x80: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (
        modRm.reg !== 0x00 &&
        modRm.reg !== 0x02 &&
        modRm.reg !== 0x04 &&
        modRm.reg !== 0x05 &&
        modRm.reg !== 0x07
      ) {
        throw new UnsupportedOpcodeError("Unsupported 80 opcode form");
      }
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const immediate = fetchCodeByte(memory, state, 2 + (address?.displacementBytes ?? 0)).opcode;
      const destination = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      if (modRm.reg === 0x00 || modRm.reg === 0x02) {
        const carry = modRm.reg === 0x02 && state.carryFlag() ? 1 : 0;
        const result = destination + immediate + carry;
        if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
        else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
        state.writeAddFlags8(destination, immediate, carry);
      } else if (modRm.reg === 0x04) {
        const result = destination & immediate;
        if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
        else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
        state.writeLogicFlags8(result);
      } else if (modRm.reg === 0x05) {
        const result = destination - immediate;
        if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
        else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
        state.writeCompareFlags8(destination, immediate);
      } else {
        state.writeCompareFlags8(destination, immediate);
      }
      state.advanceEip(3 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x84: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const operand = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      state.writeLogicFlags8(operand & state.readRegister8(modRm.reg));
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x85: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const operand = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      state.writeLogicFlags16(operand & state.readRegister16(modRm.reg));
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x81: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x01 && modRm.reg !== 0x04 && modRm.reg !== 0x07)
        throw new UnsupportedOpcodeError("Unsupported 81 opcode form");
      if (modRm.registerDirect) {
        const immediate = fetchCodeUint16(memory, state, 2);
        if (modRm.reg === 0x01 || modRm.reg === 0x04) {
          const result =
            modRm.reg === 0x01
              ? state.readRegister16(modRm.rm) | immediate
              : state.readRegister16(modRm.rm) & immediate;
          state.writeRegister16(modRm.rm, result);
          state.writeLogicFlags16(result);
        } else state.writeCompareFlags16(state.readRegister16(modRm.rm), immediate);
        state.advanceEip(4);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      const immediate = fetchCodeUint16(memory, state, 2 + address.displacementBytes);
      const destination = readSegmentUint16(memory, state, address.segment, address.offset);
      if (modRm.reg === 0x01 || modRm.reg === 0x04) {
        const result = modRm.reg === 0x01 ? destination | immediate : destination & immediate;
        writeSegmentUint16(memory, state, address.segment, address.offset, result);
        state.writeLogicFlags16(result);
      } else state.writeCompareFlags16(destination, immediate);
      state.advanceEip(4 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x83: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x00 && modRm.reg !== 0x05 && modRm.reg !== 0x07)
        throw new UnsupportedOpcodeError("Unsupported 83 opcode form");
      const immediate = signedByte(fetchCodeByte(memory, state, 2).opcode) & 0xffff;
      if (modRm.registerDirect) {
        const destination = state.readRegister16(modRm.rm);
        if (modRm.reg === 0x00) {
          state.writeRegister16(modRm.rm, destination + immediate);
          state.writeAddFlags16(destination, immediate);
        } else if (modRm.reg === 0x05) {
          state.writeRegister16(modRm.rm, destination - immediate);
          state.writeCompareFlags16(destination, immediate);
        } else state.writeCompareFlags16(destination, immediate);
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      const address = decodeMemoryAddress(memory, state, modRm);
      const destination = readSegmentUint16(memory, state, address.segment, address.offset);
      const memoryImmediate =
        signedByte(fetchCodeByte(memory, state, 2 + address.displacementBytes).opcode) & 0xffff;
      if (modRm.reg === 0x00) {
        writeSegmentUint16(
          memory,
          state,
          address.segment,
          address.offset,
          destination + memoryImmediate
        );
        state.writeAddFlags16(destination, memoryImmediate);
      } else if (modRm.reg === 0x05) {
        writeSegmentUint16(
          memory,
          state,
          address.segment,
          address.offset,
          destination - memoryImmediate
        );
        state.writeCompareFlags16(destination, memoryImmediate);
      } else state.writeCompareFlags16(destination, memoryImmediate);
      state.advanceEip(3 + address.displacementBytes);
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
    case 0xd1:
      executeShiftWord(memory, state, 1);
      return { halted: false, fetched };
    case 0xc1: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const displacementBytes = modRm.registerDirect
        ? 0
        : decodeMemoryAddress(memory, state, modRm).displacementBytes;
      executeShiftWord(
        memory,
        state,
        fetchCodeByte(memory, state, 2 + displacementBytes).opcode,
        true
      );
      return { halted: false, fetched };
    }
    case 0xc0: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const displacementBytes = modRm.registerDirect
        ? 0
        : decodeMemoryAddress(memory, state, modRm).displacementBytes;
      executeShiftRightByte(
        memory,
        state,
        fetchCodeByte(memory, state, 2 + displacementBytes).opcode
      );
      return { halted: false, fetched };
    }
    case 0xf7: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x00 && modRm.reg !== 0x04 && modRm.reg !== 0x06)
        throw new UnsupportedOpcodeError("Unsupported F7 opcode form");
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const operand = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      if (modRm.reg === 0x00) {
        const immediate = fetchCodeUint16(memory, state, 2 + (address?.displacementBytes ?? 0));
        state.writeLogicFlags16(operand & immediate);
        state.advanceEip(4 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x04) {
        const product = state.readRegister16(0) * operand;
        state.writeRegister16(0, product);
        state.writeRegister16(2, product >>> 16);
        state.writeMultiplyFlags16(product >>> 16);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      const divisor = operand;
      const dividend = ((state.readRegister16(2) << 16) | state.readRegister16(0)) >>> 0;
      const quotient = Math.floor(dividend / divisor);
      if (divisor === 0 || quotient > 0xffff) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "real")
          throw new DivideError("Protected-mode divide-error delivery is not implemented");
        deliverRealModeInterrupt(memory, state, 0, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      state.writeRegister16(0, quotient);
      state.writeRegister16(2, dividend % divisor);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0xf6: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x00) throw new UnsupportedOpcodeError("Unsupported F6 opcode form");
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const operand = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const immediate = fetchCodeByte(memory, state, 2 + (address?.displacementBytes ?? 0)).opcode;
      state.writeLogicFlags8(operand & immediate);
      state.advanceEip(3 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0xff:
      {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
        if (modRm.reg === 0x04) {
          if (modRm.registerDirect) state.writeEip16(state.readRegister16(modRm.rm));
          else {
            const address = decodeMemoryAddress(memory, state, modRm);
            state.writeEip16(readSegmentUint16(memory, state, address.segment, address.offset));
          }
        } else if (modRm.reg === 0x05) {
          executeMemoryFarJump(memory, state, 1);
        } else if (modRm.reg === 0x03) executeMemoryFarCall(memory, state, 1);
        else if (modRm.reg === 0x02) executeNearCall(memory, state, 1);
        else if (modRm.reg === 0x06) executePushModRm(memory, state, 1);
        else throw new UnsupportedOpcodeError("Unsupported FF opcode form");
      }
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
    case 0xcb:
    case 0xca: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode far RET is not implemented");
      }
      const stackAdjustment = fetched.opcode === 0xca ? fetchCodeUint16(memory, state, 1) : 0;
      const instructionPointer = popUint16(memory, state);
      const selector = popUint16(memory, state);
      if (stackAdjustment) state.writeRegister16(4, state.readRegister16(4) + stackAdjustment);
      state.loadRealModeCodeSegment(selector, instructionPointer);
      return { halted: false, fetched };
    }
    case 0xcd: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) !== "real") {
        throw new UnsupportedOpcodeError("Protected-mode INT is not implemented");
      }
      const vector = fetchCodeByte(memory, state, 1).opcode;
      deliverRealModeInterrupt(memory, state, vector, fetched.instructionPointer + 2);
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
    case 0x70:
    case 0x71:
    case 0x72:
    case 0x73:
    case 0x74:
    case 0x75:
    case 0x76:
    case 0x77:
    case 0x78:
    case 0x79:
    case 0x7a:
    case 0x7b:
    case 0x7c:
    case 0x7d:
    case 0x7e:
    case 0x7f: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      if (shortJumpCondition(state, fetched.opcode & 0x0f))
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

export function stepInstructionTraced(
  memory: InstructionMemory,
  state: Cpu386State,
  ports?: PortIo,
  trace?: InstructionTrace
): ExecutionResult {
  const before = state.snapshot();
  const result = stepInstruction(memory, state, ports);
  trace?.({ before, after: state.snapshot(), result });
  return result;
}
