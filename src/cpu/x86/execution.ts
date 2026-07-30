import { addressMode, translateSegmentOffset } from "../../memory/address-translation.js";
import { decodeExecutionContext, type ExecutionContext } from "./execution-context.js";
import { decodeModRm, decodeModRm16Address, decodeModRm32Address } from "./modrm.js";
import {
  loadDescriptor,
  loadInterruptGate,
  loadLocalDescriptorTable as resolveLocalDescriptorTable
} from "./segmentation.js";
import { SegmentRegister, type LoadedSegment } from "./segment-register.js";
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

const NXVM_UNDEFINED_TWO_BYTE_EXTENSIONS = new Set([0x09, 0x30, 0x32, 0xa2, 0xaa]);

interface DecodedMemoryAddress {
  readonly offset: number;
  readonly displacementBytes: number;
  readonly sibBytes?: number;
  readonly segment: "ds" | "ss";
}

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
  offset: number,
  addressSize: 16 | 32 = 16
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  const lowAddress = translateSegmentOffset(mode, selected, offset);
  const nextOffset = addressSize === 16 ? (offset + 1) & 0xffff : (offset + 1) >>> 0;
  const highAddress = translateSegmentOffset(mode, selected, nextOffset);
  return (memory.readUint8(lowAddress) & 0xff) | ((memory.readUint8(highAddress) & 0xff) << 8);
}

function readSegmentUint32(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  addressSize: 16 | 32 = 16
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  const nextOffset = (delta: number) =>
    addressSize === 16 ? (offset + delta) & 0xffff : (offset + delta) >>> 0;
  return (
    (memory.readUint8(translateSegmentOffset(mode, selected, offset)) |
      (memory.readUint8(translateSegmentOffset(mode, selected, nextOffset(1))) << 8) |
      (memory.readUint8(translateSegmentOffset(mode, selected, nextOffset(2))) << 16) |
      (memory.readUint8(translateSegmentOffset(mode, selected, nextOffset(3))) << 24)) >>>
    0
  );
}

function readSegmentUint8(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  addressSize?: 16 | 32
): number {
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
  return (
    memory.readUint8(
      translateSegmentOffset(mode, { ...snapshot[segment], present: true }, normalizedOffset)
    ) & 0xff
  );
}

function writeSegmentUint16(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  value: number,
  addressSize: 16 | 32 = 16
): void {
  if (!memory.writeUint8) throw new UnsupportedOpcodeError("Memory does not support writes");
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  memory.writeUint8(translateSegmentOffset(mode, selected, offset), value & 0xff);
  const nextOffset = addressSize === 16 ? (offset + 1) & 0xffff : (offset + 1) >>> 0;
  memory.writeUint8(translateSegmentOffset(mode, selected, nextOffset), value >>> 8);
}

function decodeModRmAddress(
  memory: InstructionMemory,
  state: Cpu386State,
  modRm: ReturnType<typeof decodeModRm>,
  modRmOffset: number,
  addressSize: 16 | 32
): DecodedMemoryAddress | undefined {
  if (modRm.registerDirect) return undefined;
  return addressSize === 16
    ? decodeModRm16Address(
        modRm,
        (index) => state.readRegister16(index),
        (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
      )
    : decodeModRm32Address(
        modRm,
        (index) => state.readRegister(index),
        (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
      );
}

function decodedAddressBytes(
  address: DecodedMemoryAddress | undefined,
  addressSize: 16 | 32
): number {
  if (address === undefined) return 0;
  return address.displacementBytes + (addressSize === 32 ? (address.sibBytes ?? 0) : 0);
}

function executeMov16ModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  opcode: number,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  if (opcode === 0x89) {
    const source = state.readRegister16(modRm.reg);
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, source);
    else writeSegmentUint16(memory, state, address!.segment, address!.offset, source, addressSize);
  } else {
    const source = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
    state.writeRegister16(modRm.reg, source);
  }
  state.advanceEip(modRmOffset + 1 + addressBytes);
}

function writeSegmentUint32(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  value: number,
  addressSize: 16 | 32 = 16
): void {
  if (!memory.writeUint8) throw new UnsupportedOpcodeError("Memory does not support writes");
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const selected = { ...snapshot[segment], present: true };
  const nextOffset = (delta: number) =>
    addressSize === 16 ? (offset + delta) & 0xffff : (offset + delta) >>> 0;
  memory.writeUint8(translateSegmentOffset(mode, selected, offset), value & 0xff);
  memory.writeUint8(translateSegmentOffset(mode, selected, nextOffset(1)), value >>> 8);
  memory.writeUint8(translateSegmentOffset(mode, selected, nextOffset(2)), value >>> 16);
  memory.writeUint8(translateSegmentOffset(mode, selected, nextOffset(3)), value >>> 24);
}

function executeMov32ModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  opcode: number,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address: DecodedMemoryAddress | undefined = modRm.registerDirect
    ? undefined
    : addressSize === 16
      ? decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        )
      : decodeModRm32Address(
          modRm,
          (index) => state.readRegister(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        );
  const addressBytes =
    address === undefined
      ? 0
      : address.displacementBytes + (addressSize === 32 ? (address.sibBytes ?? 0) : 0);
  if (opcode === 0x89) {
    const source = state.readRegister(modRm.reg);
    if (modRm.registerDirect) state.writeRegister(modRm.rm, source);
    else writeSegmentUint32(memory, state, address!.segment, address!.offset, source, addressSize);
  } else {
    const source = modRm.registerDirect
      ? state.readRegister(modRm.rm)
      : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
    state.writeRegister(modRm.reg, source);
  }
  state.advanceEip(modRmOffset + 1 + addressBytes);
}

function executeBound32(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  faultInstructionPointer: number
): void {
  executeBound(memory, state, modRmOffset, addressSize, 32, faultInstructionPointer);
}

function executeBound(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  operandSize: 16 | 32,
  faultInstructionPointer: number
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) throw new UnsupportedOpcodeError("BOUND requires a memory operand");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize)!;
  const offsetMask = addressSize === 16 ? 0xffff : 0xffffffff;
  const width = operandSize / 8;
  const index =
    operandSize === 32
      ? state.readRegister(modRm.reg) | 0
      : (state.readRegister16(modRm.reg) << 16) >> 16;
  const lower =
    operandSize === 32
      ? readSegmentUint32(memory, state, address.segment, address.offset, addressSize) | 0
      : (readSegmentUint16(memory, state, address.segment, address.offset, addressSize) << 16) >>
        16;
  const upper =
    operandSize === 32
      ? readSegmentUint32(
          memory,
          state,
          address.segment,
          (address.offset + width) & offsetMask,
          addressSize
        ) | 0
      : (readSegmentUint16(
          memory,
          state,
          address.segment,
          (address.offset + width) & offsetMask,
          addressSize
        ) <<
          16) >>
        16;
  if (index < lower || index > upper) {
    deliverCpuFault(memory, state, 5, faultInstructionPointer);
    return;
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function writeSegmentUint8(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "cs" | "ds" | "es" | "ss" | "fs" | "gs",
  offset: number,
  value: number,
  addressSize?: 16 | 32
): void {
  if (!memory.writeUint8) throw new UnsupportedOpcodeError("Memory does not support writes");
  const snapshot = state.snapshot();
  const mode = addressMode(snapshot.cr0, snapshot.eflags);
  const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
  memory.writeUint8(
    translateSegmentOffset(mode, { ...snapshot[segment], present: true }, normalizedOffset),
    value & 0xff
  );
}

function executeBitTest(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: 0xa3 | 0xab | 0xb3 | 0xbb,
  source: number,
  expandMemoryBitIndex: boolean,
  instructionBytes: number
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
  const address = modRm.registerDirect
    ? undefined
    : decodeModRm16Address(
        modRm,
        (index) => state.readRegister16(index),
        (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
      );
  const signedSource = (source << 16) >> 16;
  const targetOffset =
    address && expandMemoryBitIndex
      ? (address.offset + Math.floor(signedSource / 16) * 2) & 0xffff
      : address?.offset;
  const target = modRm.registerDirect
    ? state.readRegister16(modRm.rm)
    : readSegmentUint16(memory, state, address!.segment, targetOffset!);
  const mask = 1 << (source & 0x0f);
  if (target & mask) state.setCarryFlag();
  else state.clearCarryFlag();

  if (extension === 0xab) {
    const result = target | mask;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else writeSegmentUint16(memory, state, address!.segment, targetOffset!, result);
  } else if (extension === 0xb3) {
    const result = target & ~mask;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else writeSegmentUint16(memory, state, address!.segment, targetOffset!, result);
  } else if (extension === 0xbb) {
    const result = target ^ mask;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else writeSegmentUint16(memory, state, address!.segment, targetOffset!, result);
  }

  state.advanceEip(instructionBytes + (address?.displacementBytes ?? 0));
}

function executeContextualBitTest(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  extension: 0xa3 | 0xab | 0xb3 | 0xbb,
  source: number,
  expandMemoryBitIndex: boolean,
  immediateBytes = 0
): void {
  const modRmOffset = context.opcodeOffset + 2;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const width = context.operandSize;
  const signedSource = width === 32 ? source | 0 : (source << 16) >> 16;
  const targetOffset =
    address && expandMemoryBitIndex
      ? context.addressSize === 32
        ? (address.offset + Math.floor(signedSource / width) * (width / 8)) >>> 0
        : (address.offset + Math.floor(signedSource / width) * (width / 8)) & 0xffff
      : address?.offset;
  const target = modRm.registerDirect
    ? width === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : width === 32
      ? readSegmentUint32(memory, state, address!.segment, targetOffset!, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, targetOffset!, context.addressSize);
  const mask = 1 << (source & (width - 1));
  if (target & mask) state.setCarryFlag();
  else state.clearCarryFlag();
  const result =
    extension === 0xab ? target | mask : extension === 0xb3 ? target & ~mask : target ^ mask;
  if (extension !== 0xa3) {
    if (modRm.registerDirect) {
      if (width === 32) state.writeRegister(modRm.rm, result);
      else state.writeRegister16(modRm.rm, result);
    } else if (width === 32)
      writeSegmentUint32(
        memory,
        state,
        address!.segment,
        targetOffset!,
        result,
        context.addressSize
      );
    else
      writeSegmentUint16(
        memory,
        state,
        address!.segment,
        targetOffset!,
        result,
        context.addressSize
      );
  }
  state.advanceEip(
    modRmOffset + 1 + decodedAddressBytes(address, context.addressSize) + immediateBytes
  );
}

function executeLoadSegmentPointer(
  memory: InstructionMemory,
  state: Cpu386State,
  segment: "ss" | "fs" | "gs",
  modRmOffset = 2,
  addressSize: 16 | 32 = 16,
  operandSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect)
    throw new UnsupportedOpcodeError("Segment pointer source must be memory");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize)!;
  const value =
    operandSize === 32
      ? readSegmentUint32(memory, state, address.segment, address.offset, addressSize)
      : readSegmentUint16(memory, state, address.segment, address.offset, addressSize);
  const selectorOffset =
    addressSize === 16
      ? (address.offset + operandSize / 8) & 0xffff
      : (address.offset + operandSize / 8) >>> 0;
  const selector = readSegmentUint16(memory, state, address.segment, selectorOffset, addressSize);
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
    state.loadRealModeSegment(segment, selector);
  else loadProtectedModeSegment(memory, state, segment, selector);
  if (operandSize === 32) state.writeRegister(modRm.reg, value);
  else state.writeRegister16(modRm.reg, value);
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeDoubleShiftWord(
  memory: InstructionMemory,
  state: Cpu386State,
  left: boolean,
  count: number,
  immediateCount: boolean
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
  const address = modRm.registerDirect
    ? undefined
    : decodeModRm16Address(
        modRm,
        (index) => state.readRegister16(index),
        (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
      );
  const instructionBytes = 3 + (address?.displacementBytes ?? 0) + (immediateCount ? 1 : 0);
  let normalizedCount = count & 0x1f;
  if (!normalizedCount) {
    state.advanceEip(instructionBytes);
    return;
  }
  let destination = modRm.registerDirect
    ? state.readRegister16(modRm.rm)
    : readSegmentUint16(memory, state, address!.segment, address!.offset);
  const source = state.readRegister16(modRm.reg);
  if (normalizedCount > 16) {
    destination = source;
    normalizedCount -= 16;
  }
  const carry = left
    ? Boolean((destination << (normalizedCount - 1)) & 0x8000)
    : Boolean((destination >>> (normalizedCount - 1)) & 0x01);
  const result = left
    ? ((destination << normalizedCount) | (source >>> (16 - normalizedCount))) & 0xffff
    : ((destination >>> normalizedCount) | (source << (16 - normalizedCount))) & 0xffff;
  if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
  else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
  state.writeDoubleShiftFlags16(result, carry);
  state.advanceEip(instructionBytes);
}

function executeContextualDoubleShift(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  extension: number
): void {
  const modRmOffset = context.opcodeOffset + 2;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const immediateCount = extension === 0xa4 || extension === 0xac;
  const instructionBytes =
    modRmOffset + 1 + decodedAddressBytes(address, context.addressSize) + (immediateCount ? 1 : 0);
  let count = immediateCount
    ? fetchCodeByte(memory, state, instructionBytes - 1).opcode
    : state.readRegister8(1);
  count &= 0x1f;
  if (!count) {
    state.advanceEip(instructionBytes);
    return;
  }
  const left = extension === 0xa4 || extension === 0xa5;
  const width = context.operandSize;
  const mask = width === 32 ? 0xffffffff : 0xffff;
  let destination = modRm.registerDirect
    ? width === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : width === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
  const source = width === 32 ? state.readRegister(modRm.reg) : state.readRegister16(modRm.reg);
  if (width === 16 && count > 16) {
    destination = source;
    count -= 16;
  }
  const carry = left
    ? Boolean((destination << (count - 1)) & (width === 32 ? 0x80000000 : 0x8000))
    : Boolean((destination >>> (count - 1)) & 0x01);
  const result = left
    ? ((destination << count) | (source >>> (width - count))) & mask
    : ((destination >>> count) | (source << (width - count))) & mask;
  if (modRm.registerDirect) {
    if (width === 32) state.writeRegister(modRm.rm, result);
    else state.writeRegister16(modRm.rm, result);
  } else if (width === 32)
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  else
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  if (width === 32) state.writeDoubleShiftFlags32(result, carry);
  else state.writeDoubleShiftFlags16(result, carry);
  state.advanceEip(instructionBytes);
}

function executeContextualLogicalShift(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  count: number,
  immediateBytes = 0
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x04 && modRm.reg !== 0x05 && modRm.reg !== 0x07)
    throw new UnsupportedOpcodeError("Unsupported contextual shift opcode form");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const normalizedCount = count & 0x1f;
  const instructionBytes =
    modRmOffset + 1 + decodedAddressBytes(address, context.addressSize) + immediateBytes;
  if (!normalizedCount) {
    state.advanceEip(instructionBytes);
    return;
  }
  const width = context.operandSize;
  const source = modRm.registerDirect
    ? width === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : width === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
  const result =
    modRm.reg === 0x04
      ? width === 32
        ? (source << normalizedCount) >>> 0
        : (source << normalizedCount) & 0xffff
      : modRm.reg === 0x05
        ? source >>> normalizedCount
        : width === 32
          ? source >> normalizedCount
          : (((source << 16) >> 16) >> normalizedCount) & 0xffff;
  if (modRm.registerDirect) {
    if (width === 32) state.writeRegister(modRm.rm, result);
    else state.writeRegister16(modRm.rm, result);
  } else if (width === 32)
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  else
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  if (modRm.reg === 0x04) {
    if (width === 32) state.writeShiftLeftFlags32(source, normalizedCount);
    else state.writeShiftLeftFlags16(source, normalizedCount);
  } else if (modRm.reg === 0x05) {
    if (width === 32) state.writeShiftRightFlags32(source, normalizedCount);
    else state.writeShiftRightFlags16(source, normalizedCount);
  } else if (width === 32) state.writeArithmeticShiftRightFlags32(source, normalizedCount);
  else state.writeArithmeticShiftRightFlags16(source, normalizedCount);
  state.advanceEip(instructionBytes);
}

function executeContextualRotateLeft(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  count: number,
  immediateBytes = 0
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x00)
    throw new UnsupportedOpcodeError("Unsupported contextual rotate opcode form");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const width = context.operandSize;
  const normalizedCount = (count & 0x1f) % width;
  const instructionBytes =
    modRmOffset + 1 + decodedAddressBytes(address, context.addressSize) + immediateBytes;
  if (!normalizedCount) {
    state.advanceEip(instructionBytes);
    return;
  }
  const source = modRm.registerDirect
    ? width === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : width === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
  const result =
    width === 32
      ? ((source << normalizedCount) | (source >>> (32 - normalizedCount))) >>> 0
      : ((source << normalizedCount) | (source >>> (16 - normalizedCount))) & 0xffff;
  const carry = Boolean(result & 0x01);
  if (modRm.registerDirect) {
    if (width === 32) state.writeRegister(modRm.rm, result);
    else state.writeRegister16(modRm.rm, result);
  } else if (width === 32)
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  else
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  if (width === 32) state.writeRotateFlags32(result, carry);
  else state.writeRotateFlags16(result, carry);
  state.advanceEip(instructionBytes);
}

function executeContextualRotateRight(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  count: number,
  immediateBytes = 0
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x01)
    throw new UnsupportedOpcodeError("Unsupported contextual rotate opcode form");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const width = context.operandSize;
  const normalizedCount = (count & 0x1f) % width;
  const instructionBytes =
    modRmOffset + 1 + decodedAddressBytes(address, context.addressSize) + immediateBytes;
  if (!normalizedCount) {
    state.advanceEip(instructionBytes);
    return;
  }
  const source = modRm.registerDirect
    ? width === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : width === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
  const result =
    width === 32
      ? ((source >>> normalizedCount) | (source << (32 - normalizedCount))) >>> 0
      : ((source >>> normalizedCount) | (source << (16 - normalizedCount))) & 0xffff;
  if (modRm.registerDirect) {
    if (width === 32) state.writeRegister(modRm.rm, result);
    else state.writeRegister16(modRm.rm, result);
  } else if (width === 32)
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  else
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      result,
      context.addressSize
    );
  if (width === 32) state.writeRotateRightFlags32(result);
  else state.writeRotateRightFlags16(result);
  state.advanceEip(instructionBytes);
}

function pushUint16(memory: InstructionMemory, state: Cpu386State, value: number): void {
  const stackPointer = (state.readRegister16(4) - 2) & 0xffff;
  state.writeRegister16(4, stackPointer);
  writeSegmentUint16(memory, state, "ss", stackPointer, value);
}

function pushUint32(memory: InstructionMemory, state: Cpu386State, value: number): void {
  const stackPointer = (state.readRegister(4) - 4) >>> 0;
  state.writeRegister(4, stackPointer);
  writeSegmentUint32(memory, state, "ss", stackPointer, value, 32);
}

function popUint16(memory: InstructionMemory, state: Cpu386State): number {
  const stackPointer = state.readRegister16(4);
  const value = readSegmentUint16(memory, state, "ss", stackPointer);
  state.writeRegister16(4, (stackPointer + 2) & 0xffff);
  return value;
}

function popUint32(memory: InstructionMemory, state: Cpu386State): number {
  const stackPointer = state.readRegister(4);
  const value = readSegmentUint32(memory, state, "ss", stackPointer, 32);
  state.writeRegister(4, stackPointer + 4);
  return value;
}

function pushContextOperand(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  value: number
): void {
  const width = context.operandSize === 32 ? 4 : 2;
  if (context.stackAddressSize === 32) {
    const stackPointer = (state.readRegister(4) - width) >>> 0;
    state.writeRegister(4, stackPointer);
    if (context.operandSize === 32)
      writeSegmentUint32(memory, state, "ss", stackPointer, value, 32);
    else writeSegmentUint16(memory, state, "ss", stackPointer, value, 32);
    return;
  }

  const stackPointer = (state.readRegister16(4) - width) & 0xffff;
  state.writeRegister16(4, stackPointer);
  if (context.operandSize === 32) writeSegmentUint32(memory, state, "ss", stackPointer, value, 16);
  else writeSegmentUint16(memory, state, "ss", stackPointer, value);
}

function popContextOperand(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext
): number {
  const width = context.operandSize === 32 ? 4 : 2;
  if (context.stackAddressSize === 32) {
    const stackPointer = state.readRegister(4);
    const value =
      context.operandSize === 32
        ? readSegmentUint32(memory, state, "ss", stackPointer, 32)
        : readSegmentUint16(memory, state, "ss", stackPointer, 32);
    state.writeRegister(4, stackPointer + width);
    return value;
  }

  const stackPointer = state.readRegister16(4);
  const value =
    context.operandSize === 32
      ? readSegmentUint32(memory, state, "ss", stackPointer, 16)
      : readSegmentUint16(memory, state, "ss", stackPointer);
  state.writeRegister16(4, (stackPointer + width) & 0xffff);
  return value;
}

function executeContextualRepeatComparison(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (
    !context.repeatPrefix ||
    (context.opcode !== 0xa6 &&
      context.opcode !== 0xa7 &&
      context.opcode !== 0xae &&
      context.opcode !== 0xaf)
  )
    return undefined;

  const compare = context.opcode === 0xa6 || context.opcode === 0xa7;
  const width =
    context.opcode === 0xa6 || context.opcode === 0xae ? 1 : context.operandSize === 32 ? 4 : 2;
  const repeatWhileZero = context.repeatPrefix === "rep";
  let count = context.addressSize === 32 ? state.readRegister(1) : state.readRegister16(1);
  let source = context.addressSize === 32 ? state.readRegister(6) : state.readRegister16(6);
  let destination = context.addressSize === 32 ? state.readRegister(7) : state.readRegister16(7);
  const delta = state.directionFlag() ? -width : width;

  while (count > 0) {
    const left = compare
      ? width === 1
        ? readSegmentUint8(memory, state, "ds", source, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "ds", source, context.addressSize)
          : readSegmentUint32(memory, state, "ds", source, context.addressSize)
      : width === 1
        ? state.readRegister8(0)
        : width === 2
          ? state.readRegister16(0)
          : state.readRegister(0);
    const right =
      width === 1
        ? readSegmentUint8(memory, state, "es", destination, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "es", destination, context.addressSize)
          : readSegmentUint32(memory, state, "es", destination, context.addressSize);
    if (width === 1) state.writeCompareFlags8(left, right);
    else if (width === 2) state.writeCompareFlags16(left, right);
    else state.writeCompareFlags32(left, right);
    if (compare)
      source = context.addressSize === 32 ? (source + delta) >>> 0 : (source + delta) & 0xffff;
    destination =
      context.addressSize === 32 ? (destination + delta) >>> 0 : (destination + delta) & 0xffff;
    count -= 1;
    if (state.zeroFlag() !== repeatWhileZero) break;
  }

  if (compare) {
    if (context.addressSize === 32) state.writeRegister(6, source);
    else state.writeRegister16(6, source);
  }
  if (context.addressSize === 32) {
    state.writeRegister(7, destination);
    state.writeRegister(1, count);
  } else {
    state.writeRegister16(7, destination);
    state.writeRegister16(1, count);
  }
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualRepeatTransfer(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (
    context.repeatPrefix !== "rep" ||
    (context.opcode !== 0xa4 &&
      context.opcode !== 0xa5 &&
      context.opcode !== 0xaa &&
      context.opcode !== 0xab)
  )
    return undefined;

  const copy = context.opcode === 0xa4 || context.opcode === 0xa5;
  const width =
    context.opcode === 0xa4 || context.opcode === 0xaa ? 1 : context.operandSize === 32 ? 4 : 2;
  let count = context.addressSize === 32 ? state.readRegister(1) : state.readRegister16(1);
  let source = context.addressSize === 32 ? state.readRegister(6) : state.readRegister16(6);
  let destination = context.addressSize === 32 ? state.readRegister(7) : state.readRegister16(7);
  const delta = state.directionFlag() ? -width : width;

  while (count > 0) {
    const value = copy
      ? width === 1
        ? readSegmentUint8(memory, state, "ds", source, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "ds", source, context.addressSize)
          : readSegmentUint32(memory, state, "ds", source, context.addressSize)
      : width === 1
        ? state.readRegister8(0)
        : width === 2
          ? state.readRegister16(0)
          : state.readRegister(0);
    if (width === 1)
      writeSegmentUint8(memory, state, "es", destination, value, context.addressSize);
    else if (width === 2)
      writeSegmentUint16(memory, state, "es", destination, value, context.addressSize);
    else writeSegmentUint32(memory, state, "es", destination, value, context.addressSize);
    if (copy)
      source = context.addressSize === 32 ? (source + delta) >>> 0 : (source + delta) & 0xffff;
    destination =
      context.addressSize === 32 ? (destination + delta) >>> 0 : (destination + delta) & 0xffff;
    count -= 1;
  }

  if (copy) {
    if (context.addressSize === 32) state.writeRegister(6, source);
    else state.writeRegister16(6, source);
  }
  if (context.addressSize === 32) {
    state.writeRegister(7, destination);
    state.writeRegister(1, count);
  } else {
    state.writeRegister16(7, destination);
    state.writeRegister16(1, count);
  }
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualAccumulatorAlu(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (![0x05, 0x0d, 0x15, 0x1d, 0x25, 0x2d, 0x35, 0x3d].includes(context.opcode)) return undefined;
  const width = context.operandSize;
  const accumulator = width === 32 ? state.readRegister(0) : state.readRegister16(0);
  const immediate =
    width === 32
      ? fetchCodeUint32(memory, state, context.opcodeOffset + 1)
      : fetchCodeUint16(memory, state, context.opcodeOffset + 1);
  const carry = state.carryFlag() ? 1 : 0;
  const write = (value: number) => {
    if (width === 32) state.writeRegister(0, value);
    else state.writeRegister16(0, value);
  };
  const addFlags = (left: number, right: number, carryIn = 0) => {
    if (width === 32) state.writeAddFlags32(left, right, carryIn);
    else state.writeAddFlags16(left, right, carryIn);
  };
  const compareFlags = (left: number, right: number, borrow = 0) => {
    if (width === 32) state.writeCompareFlags32(left, right, borrow);
    else state.writeCompareFlags16(left, right, borrow);
  };
  const logicFlags = (value: number) => {
    if (width === 32) state.writeLogicFlags32(value);
    else state.writeLogicFlags16(value);
  };

  switch (context.opcode) {
    case 0x05:
      write(accumulator + immediate);
      addFlags(accumulator, immediate);
      break;
    case 0x0d:
      write(accumulator | immediate);
      logicFlags(accumulator | immediate);
      break;
    case 0x15:
      write(accumulator + immediate + carry);
      addFlags(accumulator, immediate, carry);
      break;
    case 0x1d:
      write(accumulator - immediate - carry);
      compareFlags(accumulator, immediate, carry);
      break;
    case 0x25:
      write(accumulator & immediate);
      logicFlags(accumulator & immediate);
      break;
    case 0x2d:
      write(accumulator - immediate);
      compareFlags(accumulator, immediate);
      break;
    case 0x35:
      write(accumulator ^ immediate);
      logicFlags(accumulator ^ immediate);
      break;
    case 0x3d:
      compareFlags(accumulator, immediate);
      break;
  }
  state.advanceEip(context.opcodeOffset + 1 + width / 8);
  return { halted: false, fetched };
}

function executeContextualIncrementDecrement(
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode < 0x40 || context.opcode > 0x4f) return undefined;
  const decrement = context.opcode >= 0x48;
  const register = context.opcode & 0x07;
  if (context.operandSize === 32) {
    const value = state.readRegister(register);
    state.writeRegister(register, decrement ? value - 1 : value + 1);
    if (decrement) state.writeDecrementFlags32(value);
    else state.writeIncrementFlags32(value);
  } else {
    const value = state.readRegister16(register);
    state.writeRegister16(register, decrement ? value - 1 : value + 1);
    if (decrement) state.writeDecrementFlags16(value);
    else state.writeIncrementFlags16(value);
  }
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualSignExtension(
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x98 && context.opcode !== 0x99) return undefined;
  if (context.opcode === 0x98) {
    if (context.operandSize === 32) {
      const value = state.readRegister16(0);
      state.writeRegister(0, value & 0x8000 ? value | 0xffff0000 : value);
    } else {
      const value = state.readRegister8(0);
      state.writeRegister16(0, value & 0x80 ? value | 0xff00 : value);
    }
  } else if (context.operandSize === 32) {
    state.writeRegister(2, state.readRegister(0) & 0x80000000 ? 0xffffffff : 0);
  } else state.writeRegister16(2, state.readRegister16(0) & 0x8000 ? 0xffff : 0);
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualImmediatePush(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x68 && context.opcode !== 0x6a) return undefined;
  const value =
    context.opcode === 0x68
      ? context.operandSize === 32
        ? fetchCodeUint32(memory, state, context.opcodeOffset + 1)
        : fetchCodeUint16(memory, state, context.opcodeOffset + 1)
      : signedByte(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
  pushContextOperand(memory, state, context, value);
  state.advanceEip(
    context.opcodeOffset + (context.opcode === 0x68 ? 1 + context.operandSize / 8 : 2)
  );
  return { halted: false, fetched };
}

function executeContextualPushfPopf(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x9c && context.opcode !== 0x9d) return undefined;
  const snapshot = state.snapshot();
  const protectedMode = addressMode(snapshot.cr0, snapshot.eflags) === "protected";
  if (context.opcode === 0x9d && protectedMode && (snapshot.cs.selector & 0x03) !== 0) {
    deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
    return { halted: false, fetched };
  }
  if (context.opcode === 0x9c) {
    const flags =
      context.operandSize === 32 ? snapshot.eflags & ~0x00030000 : snapshot.eflags & 0xffff;
    pushContextOperand(memory, state, context, flags);
  } else {
    const flags = popContextOperand(memory, state, context);
    if (context.operandSize === 32)
      state.writeEflags((flags & ~0x00030000) | (snapshot.eflags & 0x00030000));
    else if (protectedMode) state.writeEflags((snapshot.eflags & ~0xffff) | flags);
    else state.writeEflags(flags);
  }
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualPushAllPopAll(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x60 && context.opcode !== 0x61) return undefined;
  if (context.opcode === 0x60) {
    const originalStackPointer =
      context.operandSize === 32 ? state.readRegister(4) : state.readRegister16(4);
    for (const register of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const value =
        register === 4
          ? originalStackPointer
          : context.operandSize === 32
            ? state.readRegister(register)
            : state.readRegister16(register);
      pushContextOperand(memory, state, context, value);
    }
  } else {
    for (const register of [7, 6, 5]) {
      const value = popContextOperand(memory, state, context);
      if (context.operandSize === 32) state.writeRegister(register, value);
      else state.writeRegister16(register, value);
    }
    popContextOperand(memory, state, context);
    for (const register of [3, 2, 1, 0]) {
      const value = popContextOperand(memory, state, context);
      if (context.operandSize === 32) state.writeRegister(register, value);
      else state.writeRegister16(register, value);
    }
  }
  state.advanceEip(context.opcodeOffset + 1);
  return { halted: false, fetched };
}

function executeContextualNearJump(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0xe9) return undefined;
  const displacement =
    context.operandSize === 32
      ? fetchCodeUint32(memory, state, context.opcodeOffset + 1) | 0
      : signedWord(fetchCodeUint16(memory, state, context.opcodeOffset + 1));
  const nextInstruction =
    fetched.instructionPointer + context.opcodeOffset + 1 + context.operandSize / 8;
  if (context.operandSize === 32) state.writeEip(nextInstruction + displacement);
  else state.writeEip16(nextInstruction + displacement);
  return { halted: false, fetched };
}

function executeContextualNearCallReturn(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0xe8 && context.opcode !== 0xc2 && context.opcode !== 0xc3)
    return undefined;
  if (context.opcode === 0xe8) {
    const displacement =
      context.operandSize === 32
        ? fetchCodeUint32(memory, state, context.opcodeOffset + 1) | 0
        : signedWord(fetchCodeUint16(memory, state, context.opcodeOffset + 1));
    const returnAddress =
      fetched.instructionPointer + context.opcodeOffset + 1 + context.operandSize / 8;
    pushContextOperand(memory, state, context, returnAddress);
    if (context.operandSize === 32) state.writeEip(returnAddress + displacement);
    else state.writeEip16(returnAddress + displacement);
    return { halted: false, fetched };
  }
  const instructionPointer = popContextOperand(memory, state, context);
  if (context.opcode === 0xc2) {
    const adjustment = fetchCodeUint16(memory, state, context.opcodeOffset + 1);
    if (context.stackAddressSize === 32) state.writeRegister(4, state.readRegister(4) + adjustment);
    else state.writeRegister16(4, state.readRegister16(4) + adjustment);
  }
  if (context.operandSize === 32) state.writeEip(instructionPointer);
  else state.writeEip16(instructionPointer);
  return { halted: false, fetched };
}

function executeContextualNearConditionalJump(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x0f) return undefined;
  const extension = fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode;
  if (extension < 0x80 || extension > 0x8f) return undefined;
  const displacementOffset = context.opcodeOffset + 2;
  const displacement =
    context.operandSize === 32
      ? fetchCodeUint32(memory, state, displacementOffset) | 0
      : signedWord(fetchCodeUint16(memory, state, displacementOffset));
  const nextInstruction =
    fetched.instructionPointer + context.opcodeOffset + 2 + context.operandSize / 8;
  if (shortJumpCondition(state, extension & 0x0f)) {
    if (context.operandSize === 32) state.writeEip(nextInstruction + displacement);
    else state.writeEip16(nextInstruction + displacement);
  } else state.advanceEip(context.opcodeOffset + 2 + context.operandSize / 8);
  return { halted: false, fetched };
}

function executeContextualLea(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0x8d) return undefined;
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) throw new UnsupportedOpcodeError("LEA requires a memory operand");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize)!;
  if (context.operandSize === 32) state.writeRegister(modRm.reg, address.offset);
  else state.writeRegister16(modRm.reg, address.offset);
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, context.addressSize));
  return { halted: false, fetched };
}

function executeContextualImmediateMov(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode !== 0xc6 && context.opcode !== 0xc7) return undefined;
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0)
    throw new UnsupportedOpcodeError(`Unsupported ${context.opcode.toString(16)} opcode form`);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const addressBytes = decodedAddressBytes(address, context.addressSize);
  const width = context.opcode === 0xc6 ? 1 : context.operandSize === 32 ? 4 : 2;
  const immediateOffset = modRmOffset + 1 + addressBytes;
  const value =
    width === 1
      ? fetchCodeByte(memory, state, immediateOffset).opcode
      : width === 2
        ? fetchCodeUint16(memory, state, immediateOffset)
        : fetchCodeUint32(memory, state, immediateOffset);
  if (modRm.registerDirect) {
    if (width === 1) state.writeRegister8(modRm.rm, value);
    else if (width === 2) state.writeRegister16(modRm.rm, value);
    else state.writeRegister(modRm.rm, value);
  } else if (width === 1)
    writeSegmentUint8(memory, state, address!.segment, address!.offset, value, context.addressSize);
  else if (width === 2)
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      value,
      context.addressSize
    );
  else
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      value,
      context.addressSize
    );
  state.advanceEip(context.opcodeOffset + 2 + addressBytes + width);
  return { halted: false, fetched };
}

function executeContextualLoop(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode < 0xe0 || context.opcode > 0xe3) return undefined;
  const displacement = signedByte(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
  const count = context.addressSize === 32 ? state.readRegister(1) : state.readRegister16(1);
  const nextInstruction = fetched.instructionPointer + context.opcodeOffset + 2;
  let continueLoop: boolean;
  if (context.opcode === 0xe3) continueLoop = count === 0;
  else {
    const nextCount = context.addressSize === 32 ? (count - 1) >>> 0 : (count - 1) & 0xffff;
    if (context.addressSize === 32) state.writeRegister(1, nextCount);
    else state.writeRegister16(1, nextCount);
    continueLoop =
      nextCount !== 0 &&
      (context.opcode === 0xe2 ||
        (context.opcode === 0xe1 && state.zeroFlag()) ||
        (context.opcode === 0xe0 && !state.zeroFlag()));
  }
  if (continueLoop) {
    if (state.snapshot().cs.default32) state.writeEip(nextInstruction + displacement);
    else state.writeEip16(nextInstruction + displacement);
  } else state.advanceEip(context.opcodeOffset + 2);
  return { halted: false, fetched };
}

function executeContextualMoffs(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.opcode < 0xa0 || context.opcode > 0xa3) return undefined;
  const offset =
    context.addressSize === 32
      ? fetchCodeUint32(memory, state, context.opcodeOffset + 1)
      : fetchCodeUint16(memory, state, context.opcodeOffset + 1);
  const offsetBytes = context.addressSize === 32 ? 4 : 2;
  if (context.opcode === 0xa0)
    state.writeRegister8(0, readSegmentUint8(memory, state, "ds", offset, context.addressSize));
  else if (context.opcode === 0xa2)
    writeSegmentUint8(memory, state, "ds", offset, state.readRegister8(0), context.addressSize);
  else if (context.opcode === 0xa1) {
    if (context.operandSize === 32)
      state.writeRegister(0, readSegmentUint32(memory, state, "ds", offset, context.addressSize));
    else
      state.writeRegister16(0, readSegmentUint16(memory, state, "ds", offset, context.addressSize));
  } else if (context.operandSize === 32)
    writeSegmentUint32(memory, state, "ds", offset, state.readRegister(0), context.addressSize);
  else
    writeSegmentUint16(memory, state, "ds", offset, state.readRegister16(0), context.addressSize);
  state.advanceEip(context.opcodeOffset + 1 + offsetBytes);
  return { halted: false, fetched };
}

function executeContextualInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext,
  fetched: FetchedOpcode
): ExecutionResult | undefined {
  if (context.segmentOverride || context.lock) return undefined;
  const repeatedComparison = executeContextualRepeatComparison(memory, state, context, fetched);
  if (repeatedComparison) return repeatedComparison;
  const repeatedTransfer = executeContextualRepeatTransfer(memory, state, context, fetched);
  if (repeatedTransfer) return repeatedTransfer;
  if (context.repeatPrefix) return undefined;
  const accumulatorAlu = executeContextualAccumulatorAlu(memory, state, context, fetched);
  if (accumulatorAlu) return accumulatorAlu;
  const incrementDecrement = executeContextualIncrementDecrement(state, context, fetched);
  if (incrementDecrement) return incrementDecrement;
  const signExtension = executeContextualSignExtension(state, context, fetched);
  if (signExtension) return signExtension;
  const immediatePush = executeContextualImmediatePush(memory, state, context, fetched);
  if (immediatePush) return immediatePush;
  const pushfPopf = executeContextualPushfPopf(memory, state, context, fetched);
  if (pushfPopf) return pushfPopf;
  const pushAllPopAll = executeContextualPushAllPopAll(memory, state, context, fetched);
  if (pushAllPopAll) return pushAllPopAll;
  const nearJump = executeContextualNearJump(memory, state, context, fetched);
  if (nearJump) return nearJump;
  const nearCallReturn = executeContextualNearCallReturn(memory, state, context, fetched);
  if (nearCallReturn) return nearCallReturn;
  const nearConditionalJump = executeContextualNearConditionalJump(memory, state, context, fetched);
  if (nearConditionalJump) return nearConditionalJump;
  if (context.opcode >= 0x70 && context.opcode <= 0x7f) {
    const displacement = signedByte(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
    const nextInstruction = fetched.instructionPointer + context.opcodeOffset + 2;
    if (shortJumpCondition(state, context.opcode & 0x0f)) {
      if (context.operandSize === 32) state.writeEip(nextInstruction + displacement);
      else state.writeEip16(nextInstruction + displacement);
    } else state.advanceEip(context.opcodeOffset + 2);
    return { halted: false, fetched };
  }
  const lea = executeContextualLea(memory, state, context, fetched);
  if (lea) return lea;
  const immediateMov = executeContextualImmediateMov(memory, state, context, fetched);
  if (immediateMov) return immediateMov;
  if (context.opcode === 0x62) {
    executeBound(
      memory,
      state,
      context.opcodeOffset + 1,
      context.addressSize,
      context.operandSize,
      fetched.instructionPointer
    );
    return { halted: false, fetched };
  }
  if (context.opcode === 0x63) {
    const snapshot = state.snapshot();
    if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected") {
      deliverCpuFault(memory, state, 6, fetched.instructionPointer);
      return { halted: false, fetched };
    }
    const modRmOffset = context.opcodeOffset + 1;
    const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
    const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
    const destination = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
    const sourceRpl = state.readRegister16(modRm.reg) & 0x03;
    const adjusted = (destination & 0x03) < sourceRpl;
    const result = adjusted ? (destination & 0xfffc) | sourceRpl : destination;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else
      writeSegmentUint16(
        memory,
        state,
        address!.segment,
        address!.offset,
        result,
        context.addressSize
      );
    state.writeZeroFlag(adjusted);
    state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, context.addressSize));
    return { halted: false, fetched };
  }
  if (context.opcode === 0xff) {
    const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
    if (modRm.reg === 0x06) {
      executeContextualPushModRm(memory, state, context);
      return { halted: false, fetched };
    }
  }
  if (context.opcode === 0x8f) {
    executeContextualPopModRm(memory, state, context);
    return { halted: false, fetched };
  }
  if (context.opcode === 0x69 || context.opcode === 0x6b) {
    executeImmediateImul(
      memory,
      state,
      context.opcode,
      context.opcodeOffset + 1,
      context.addressSize,
      context.operandSize
    );
    return { halted: false, fetched };
  }
  if (context.opcode === 0xd1) {
    const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
    if (modRm.reg === 0x00) {
      executeContextualRotateLeft(memory, state, context, 1);
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x01) {
      executeContextualRotateRight(memory, state, context, 1);
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x04 || modRm.reg === 0x05 || modRm.reg === 0x07) {
      executeContextualLogicalShift(memory, state, context, 1);
      return { halted: false, fetched };
    }
  }
  if (context.opcode === 0xd3) {
    const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
    if (modRm.reg === 0x00) {
      executeContextualRotateLeft(memory, state, context, state.readRegister8(1));
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x01) {
      executeContextualRotateRight(memory, state, context, state.readRegister8(1));
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x04 || modRm.reg === 0x05 || modRm.reg === 0x07) {
      executeContextualLogicalShift(memory, state, context, state.readRegister8(1));
      return { halted: false, fetched };
    }
  }
  if (context.opcode === 0xc1) {
    const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode);
    if (modRm.reg === 0x00) {
      const address = decodeModRmAddress(
        memory,
        state,
        modRm,
        context.opcodeOffset + 1,
        context.addressSize
      );
      executeContextualRotateLeft(
        memory,
        state,
        context,
        fetchCodeByte(
          memory,
          state,
          context.opcodeOffset + 2 + decodedAddressBytes(address, context.addressSize)
        ).opcode,
        1
      );
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x01) {
      const address = decodeModRmAddress(
        memory,
        state,
        modRm,
        context.opcodeOffset + 1,
        context.addressSize
      );
      executeContextualRotateRight(
        memory,
        state,
        context,
        fetchCodeByte(
          memory,
          state,
          context.opcodeOffset + 2 + decodedAddressBytes(address, context.addressSize)
        ).opcode,
        1
      );
      return { halted: false, fetched };
    }
    if (modRm.reg === 0x04 || modRm.reg === 0x05 || modRm.reg === 0x07) {
      const address = decodeModRmAddress(
        memory,
        state,
        modRm,
        context.opcodeOffset + 1,
        context.addressSize
      );
      executeContextualLogicalShift(
        memory,
        state,
        context,
        fetchCodeByte(
          memory,
          state,
          context.opcodeOffset + 2 + decodedAddressBytes(address, context.addressSize)
        ).opcode,
        1
      );
      return { halted: false, fetched };
    }
  }
  const loop = executeContextualLoop(memory, state, context, fetched);
  if (loop) return loop;
  const moffs = executeContextualMoffs(memory, state, context, fetched);
  if (moffs) return moffs;
  if (context.opcode === 0x0f) {
    const extension = fetchCodeByte(memory, state, context.opcodeOffset + 1).opcode;
    if (NXVM_UNDEFINED_TWO_BYTE_EXTENSIONS.has(extension)) {
      deliverCpuFault(memory, state, 6, fetched.instructionPointer);
      return { halted: false, fetched };
    }
    if (extension === 0x06) {
      const snapshot = state.snapshot();
      if (
        addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
        (snapshot.cs.selector & 0x03) !== 0
      ) {
        deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
      } else {
        state.clearTaskSwitchedFlag();
        state.advanceEip(context.opcodeOffset + 2);
      }
      return { halted: false, fetched };
    }
    if (extension === 0x00) {
      executeSystemSelectorInstruction(
        memory,
        state,
        fetched.instructionPointer,
        context.opcodeOffset + 2,
        context.addressSize
      );
      return { halted: false, fetched };
    }
    if (extension === 0x01) {
      executeSystemTableInstruction(
        memory,
        state,
        fetched.instructionPointer,
        context.opcodeOffset + 2,
        context.addressSize,
        context.operandSize
      );
      return { halted: false, fetched };
    }
    if (extension === 0x20 || extension === 0x22) {
      const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 2).opcode);
      const snapshot = state.snapshot();
      if (
        addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
        (snapshot.cs.selector & 0x03) !== 0
      ) {
        deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
        return { halted: false, fetched };
      }
      if (modRm.reg !== 0x00 && modRm.reg !== 0x02 && modRm.reg !== 0x03)
        throw new UnsupportedOpcodeError("Unsupported control-register MOV form");
      if (extension === 0x20) {
        const value =
          modRm.reg === 0x00 ? snapshot.cr0 : modRm.reg === 0x02 ? snapshot.cr2 : snapshot.cr3;
        state.writeRegister(modRm.rm, value);
      } else if (modRm.reg === 0x00) state.writeCr0(state.readRegister(modRm.rm));
      else if (modRm.reg === 0x02) state.writeCr2(state.readRegister(modRm.rm));
      else state.writeCr3(state.readRegister(modRm.rm));
      state.advanceEip(context.opcodeOffset + 3);
      return { halted: false, fetched };
    }
    if (extension === 0xa0 || extension === 0xa8 || extension === 0xa1 || extension === 0xa9) {
      const segment = extension === 0xa0 || extension === 0xa1 ? "fs" : "gs";
      if (extension === 0xa0 || extension === 0xa8) {
        pushContextOperand(memory, state, context, state.snapshot()[segment].selector);
      } else {
        const selector = popContextOperand(memory, state, context) & 0xffff;
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
          state.loadRealModeSegment(segment, selector);
        else loadProtectedModeSegment(memory, state, segment, selector);
      }
      state.advanceEip(context.opcodeOffset + 2);
      return { halted: false, fetched };
    }
    if (extension >= 0x80 && extension <= 0x8f) {
      const displacement =
        context.operandSize === 32
          ? fetchCodeUint32(memory, state, context.opcodeOffset + 2)
          : fetchCodeUint16(memory, state, context.opcodeOffset + 2);
      const instructionBytes = context.opcodeOffset + 2 + context.operandSize / 8;
      if (shortJumpCondition(state, extension & 0x0f)) {
        if (context.operandSize === 32)
          state.writeEip(state.snapshot().eip + instructionBytes + (displacement | 0));
        else state.writeEip16(state.snapshot().eip + instructionBytes + displacement);
      } else state.advanceEip(instructionBytes);
      return { halted: false, fetched };
    }
    if (extension === 0xa4 || extension === 0xa5 || extension === 0xac || extension === 0xad) {
      executeContextualDoubleShift(memory, state, context, extension);
      return { halted: false, fetched };
    }
    if (extension === 0xb2 || extension === 0xb4 || extension === 0xb5) {
      executeLoadSegmentPointer(
        memory,
        state,
        extension === 0xb2 ? "ss" : extension === 0xb4 ? "fs" : "gs",
        context.opcodeOffset + 2,
        context.addressSize,
        context.operandSize
      );
      return { halted: false, fetched };
    }
    if (extension === 0xa3 || extension === 0xab || extension === 0xb3 || extension === 0xbb) {
      const modRm = decodeModRm(fetchCodeByte(memory, state, context.opcodeOffset + 2).opcode);
      executeContextualBitTest(
        memory,
        state,
        context,
        extension,
        context.operandSize === 32
          ? state.readRegister(modRm.reg)
          : state.readRegister16(modRm.reg),
        true
      );
      return { halted: false, fetched };
    }
    if (extension === 0xba) {
      const modRmOffset = context.opcodeOffset + 2;
      const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
      if (modRm.reg < 0x04) throw new UnsupportedOpcodeError("Unsupported 0F BA opcode form");
      const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
      const immediate = fetchCodeByte(
        memory,
        state,
        modRmOffset + 1 + decodedAddressBytes(address, context.addressSize)
      ).opcode;
      executeContextualBitTest(
        memory,
        state,
        context,
        ([0xa3, 0xab, 0xb3, 0xbb] as const)[modRm.reg - 0x04],
        immediate,
        false,
        1
      );
      return { halted: false, fetched };
    }
    if (extension === 0xb6 || extension === 0xb7 || extension === 0xbe || extension === 0xbf) {
      executeMovExtendModRm(
        memory,
        state,
        extension,
        context.opcodeOffset + 2,
        context.addressSize,
        context.operandSize
      );
      return { halted: false, fetched };
    }
    if (extension === 0xbc || extension === 0xbd) {
      executeBitScanModRm(
        memory,
        state,
        extension,
        context.opcodeOffset + 2,
        context.addressSize,
        context.operandSize
      );
      return { halted: false, fetched };
    }
    if (extension === 0xaf) {
      executeImulModRm(
        memory,
        state,
        context.opcodeOffset + 2,
        context.addressSize,
        context.operandSize
      );
      return { halted: false, fetched };
    }
    if (extension >= 0x90 && extension <= 0x9f) {
      executeSetcc(memory, state, extension, context.opcodeOffset + 2, context.addressSize);
      return { halted: false, fetched };
    }
  }

  const byteAluOperation = byteModRmAluOperation(context.opcode);
  if (byteAluOperation) {
    executeByteAluModRm(
      memory,
      state,
      byteAluOperation,
      byteModRmAluDestinationIsRegister(context.opcode),
      context.opcodeOffset + 1,
      context.addressSize
    );
    return { halted: false, fetched };
  }

  if (context.opcode === 0x80) {
    executeByteGroupOneImmediate(memory, state, context.opcodeOffset + 1, context.addressSize);
    return { halted: false, fetched };
  }

  if (context.opcode === 0x86 || context.opcode === 0x87) {
    executeXchgModRm(
      memory,
      state,
      context.opcode === 0x86 ? 8 : context.operandSize,
      context.opcodeOffset + 1,
      context.addressSize
    );
    return { halted: false, fetched };
  }

  const aluOperation = modRmAluOperation(context.opcode);
  if (aluOperation) {
    const modRmOffset = context.opcodeOffset + 1;
    if (context.operandSize === 32)
      executeDwordAluModRm(
        memory,
        state,
        aluOperation,
        modRmAluDestinationIsRegister(context.opcode),
        modRmOffset,
        context.addressSize
      );
    else
      executeWordAluModRm(
        memory,
        state,
        aluOperation,
        modRmAluDestinationIsRegister(context.opcode),
        modRmOffset,
        context.addressSize
      );
    return { halted: false, fetched };
  }

  if (context.opcode === 0x81 || context.opcode === 0x83) {
    const modRmOffset = context.opcodeOffset + 1;
    if (context.operandSize === 32)
      executeDwordGroupOneImmediate(
        memory,
        state,
        modRmOffset,
        context.addressSize,
        context.opcode === 0x81 ? 4 : 1
      );
    else
      executeWordGroupOneImmediate(
        memory,
        state,
        modRmOffset,
        context.addressSize,
        context.opcode === 0x81 ? 2 : 1
      );
    return { halted: false, fetched };
  }

  if (context.opcode >= 0xb8 && context.opcode <= 0xbf) {
    const register = context.opcode - 0xb8;
    if (context.operandSize === 32)
      state.writeRegister(register, fetchCodeUint32(memory, state, context.opcodeOffset + 1));
    else state.writeRegister16(register, fetchCodeUint16(memory, state, context.opcodeOffset + 1));
    state.advanceEip(context.opcodeOffset + (context.operandSize === 32 ? 5 : 3));
    return { halted: false, fetched };
  }

  if (context.opcode === 0x89 || context.opcode === 0x8b) {
    const modRmOffset = context.opcodeOffset + 1;
    if (context.operandSize === 32)
      executeMov32ModRm(memory, state, context.opcode, modRmOffset, context.addressSize);
    else executeMov16ModRm(memory, state, context.opcode, modRmOffset, context.addressSize);
    return { halted: false, fetched };
  }

  if (context.opcode >= 0x50 && context.opcode <= 0x57) {
    const register = context.opcode & 0x07;
    const value =
      context.operandSize === 32 ? state.readRegister(register) : state.readRegister16(register);
    pushContextOperand(memory, state, context, value);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (context.opcode >= 0x58 && context.opcode <= 0x5f) {
    const register = context.opcode & 0x07;
    const value = popContextOperand(memory, state, context);
    if (context.operandSize === 32) state.writeRegister(register, value);
    else state.writeRegister16(register, value);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (context.opcode === 0xc9) {
    if (context.stackAddressSize === 32) state.writeRegister(4, state.readRegister(5));
    else state.writeRegister16(4, state.readRegister16(5));
    const framePointer = popContextOperand(memory, state, context);
    if (context.operandSize === 32) state.writeRegister(5, framePointer);
    else state.writeRegister16(5, framePointer);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (context.opcode >= 0x91 && context.opcode <= 0x97) {
    const register = context.opcode & 0x07;
    if (context.operandSize === 32) {
      const accumulator = state.readRegister(0);
      state.writeRegister(0, state.readRegister(register));
      state.writeRegister(register, accumulator);
    } else {
      const accumulator = state.readRegister16(0);
      state.writeRegister16(0, state.readRegister16(register));
      state.writeRegister16(register, accumulator);
    }
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (context.opcode === 0x8c || context.opcode === 0x8e) {
    executeContextualMovSegment(memory, state, context);
    return { halted: false, fetched };
  }

  if (
    context.opcode === 0xa4 ||
    context.opcode === 0xa5 ||
    context.opcode === 0xaa ||
    context.opcode === 0xab
  ) {
    const copy = context.opcode === 0xa4 || context.opcode === 0xa5;
    const width =
      context.opcode === 0xa4 || context.opcode === 0xaa ? 1 : context.operandSize === 32 ? 4 : 2;
    const source = context.addressSize === 32 ? state.readRegister(6) : state.readRegister16(6);
    const destination =
      context.addressSize === 32 ? state.readRegister(7) : state.readRegister16(7);
    const value = copy
      ? width === 1
        ? readSegmentUint8(memory, state, "ds", source, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "ds", source, context.addressSize)
          : readSegmentUint32(memory, state, "ds", source, context.addressSize)
      : width === 1
        ? state.readRegister8(0)
        : width === 2
          ? state.readRegister16(0)
          : state.readRegister(0);
    if (width === 1)
      writeSegmentUint8(memory, state, "es", destination, value, context.addressSize);
    else if (width === 2)
      writeSegmentUint16(memory, state, "es", destination, value, context.addressSize);
    else writeSegmentUint32(memory, state, "es", destination, value, context.addressSize);
    const delta = state.directionFlag() ? -width : width;
    if (copy) {
      if (context.addressSize === 32) state.writeRegister(6, source + delta);
      else state.writeRegister16(6, source + delta);
    }
    if (context.addressSize === 32) state.writeRegister(7, destination + delta);
    else state.writeRegister16(7, destination + delta);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (
    context.opcode === 0xa6 ||
    context.opcode === 0xa7 ||
    context.opcode === 0xae ||
    context.opcode === 0xaf
  ) {
    const compare = context.opcode === 0xa6 || context.opcode === 0xa7;
    const width =
      context.opcode === 0xa6 || context.opcode === 0xae ? 1 : context.operandSize === 32 ? 4 : 2;
    const source = context.addressSize === 32 ? state.readRegister(6) : state.readRegister16(6);
    const destination =
      context.addressSize === 32 ? state.readRegister(7) : state.readRegister16(7);
    const left = compare
      ? width === 1
        ? readSegmentUint8(memory, state, "ds", source, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "ds", source, context.addressSize)
          : readSegmentUint32(memory, state, "ds", source, context.addressSize)
      : width === 1
        ? state.readRegister8(0)
        : width === 2
          ? state.readRegister16(0)
          : state.readRegister(0);
    const right =
      width === 1
        ? readSegmentUint8(memory, state, "es", destination, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "es", destination, context.addressSize)
          : readSegmentUint32(memory, state, "es", destination, context.addressSize);
    if (width === 1) state.writeCompareFlags8(left, right);
    else if (width === 2) state.writeCompareFlags16(left, right);
    else state.writeCompareFlags32(left, right);
    const delta = state.directionFlag() ? -width : width;
    if (compare) {
      if (context.addressSize === 32) state.writeRegister(6, source + delta);
      else state.writeRegister16(6, source + delta);
    }
    if (context.addressSize === 32) state.writeRegister(7, destination + delta);
    else state.writeRegister16(7, destination + delta);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  if (context.opcode === 0xac || context.opcode === 0xad) {
    const width = context.opcode === 0xac ? 1 : context.operandSize === 32 ? 4 : 2;
    const source = context.addressSize === 32 ? state.readRegister(6) : state.readRegister16(6);
    const value =
      width === 1
        ? readSegmentUint8(memory, state, "ds", source, context.addressSize)
        : width === 2
          ? readSegmentUint16(memory, state, "ds", source, context.addressSize)
          : readSegmentUint32(memory, state, "ds", source, context.addressSize);
    if (width === 1) state.writeRegister8(0, value);
    else if (width === 2) state.writeRegister16(0, value);
    else state.writeRegister(0, value);
    const nextSource = state.directionFlag() ? source - width : source + width;
    if (context.addressSize === 32) state.writeRegister(6, nextSource);
    else state.writeRegister16(6, nextSource);
    state.advanceEip(context.opcodeOffset + 1);
    return { halted: false, fetched };
  }

  return undefined;
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

function deliverProtectedModeInterrupt(
  memory: InstructionMemory,
  state: Cpu386State,
  vector: number,
  returnInstructionPointer: number,
  software = false,
  errorCode?: number
): void {
  const snapshot = state.snapshot();
  const descriptorMemory = {
    readUint32: (address: number) =>
      (memory.readUint8(address) & 0xff) |
      ((memory.readUint8((address + 1) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((address + 2) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((address + 3) >>> 0) & 0xff) << 24)
  };
  const gate = loadInterruptGate(descriptorMemory, snapshot.idtr, vector);
  if (!gate.present)
    throw new UnsupportedOpcodeError("Protected-mode interrupt gate is not present");
  if (software && (snapshot.cs.selector & 0x03) > gate.dpl)
    throw new UnsupportedOpcodeError("Protected-mode software interrupt gate privilege violation");
  const targetDescriptor = loadDescriptor(descriptorMemory, snapshot.gdtr, gate.selector);
  if (!targetDescriptor.system || !(targetDescriptor.type & 0x08) || !targetDescriptor.present)
    throw new UnsupportedOpcodeError(
      "Protected-mode interrupt gate requires a present code descriptor"
    );
  if (targetDescriptor.type & 0x04)
    throw new UnsupportedOpcodeError(
      "Conforming protected-mode interrupt targets are not implemented"
    );
  const currentPrivilege = snapshot.cs.selector & 0x03;
  const targetPrivilege = targetDescriptor.dpl;
  if (targetPrivilege > currentPrivilege)
    throw new UnsupportedOpcodeError("Protected-mode interrupt gate cannot target lower privilege");
  if (snapshot.ss.default32 !== gate.default32)
    throw new UnsupportedOpcodeError(
      "Mixed-size protected-mode interrupt frames are not implemented"
    );

  if (targetPrivilege < currentPrivilege) {
    if (!gate.default32 || !targetDescriptor.default32)
      throw new UnsupportedOpcodeError(
        "16-bit protected-mode privilege stack switching is not implemented"
      );
    const taskRegister = snapshot.tr;
    if (!taskRegister.default32 || taskRegister.limit < 0x0b)
      throw new UnsupportedOpcodeError(
        "Protected-mode privilege stack switching requires a 32-bit TSS"
      );
    const stackPointer =
      (memory.readUint8((taskRegister.base + 4) >>> 0) & 0xff) |
      ((memory.readUint8((taskRegister.base + 5) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((taskRegister.base + 6) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((taskRegister.base + 7) >>> 0) & 0xff) << 24);
    const stackSelector =
      (memory.readUint8((taskRegister.base + 8) >>> 0) & 0xff) |
      ((memory.readUint8((taskRegister.base + 9) >>> 0) & 0xff) << 8);
    const stackDescriptor = loadDescriptor(descriptorMemory, snapshot.gdtr, stackSelector);
    if (
      !stackDescriptor.system ||
      Boolean(stackDescriptor.type & 0x08) ||
      !(stackDescriptor.type & 0x02) ||
      !stackDescriptor.present ||
      stackDescriptor.dpl !== targetPrivilege ||
      (stackSelector & 0x03) !== targetPrivilege ||
      !stackDescriptor.default32
    )
      throw new UnsupportedOpcodeError(
        "TSS privilege stack selector is not a valid 32-bit stack segment"
      );
    state.loadProtectedModeSegment(
      "ss",
      stackSelector,
      stackDescriptor.base,
      stackDescriptor.limit,
      true
    );
    state.writeRegister(4, stackPointer >>> 0);
    pushUint32(memory, state, snapshot.ss.selector);
    pushUint32(memory, state, snapshot.registers.esp);
    pushUint32(memory, state, snapshot.eflags);
    pushUint32(memory, state, snapshot.cs.selector);
    pushUint32(memory, state, returnInstructionPointer);
    if (errorCode !== undefined) pushUint32(memory, state, errorCode);
    if (gate.trap) state.clearTrapFlag();
    else state.clearInterruptAndTrapFlags();
    state.loadProtectedModeCodeSegment(
      gate.selector,
      targetDescriptor.base,
      targetDescriptor.limit,
      gate.offset,
      targetDescriptor.default32
    );
    return;
  }

  if (gate.default32) {
    pushUint32(memory, state, snapshot.eflags);
    pushUint32(memory, state, snapshot.cs.selector);
    pushUint32(memory, state, returnInstructionPointer);
    if (errorCode !== undefined) pushUint32(memory, state, errorCode);
  } else {
    pushUint16(memory, state, snapshot.eflags);
    pushUint16(memory, state, snapshot.cs.selector);
    pushUint16(memory, state, returnInstructionPointer);
    if (errorCode !== undefined) pushUint16(memory, state, errorCode);
  }
  if (gate.trap) state.clearTrapFlag();
  else state.clearInterruptAndTrapFlags();
  loadProtectedModeCodeSegment(memory, state, gate.selector, gate.offset);
}

function deliverCpuFault(
  memory: InstructionMemory,
  state: Cpu386State,
  vector: number,
  faultInstructionPointer: number,
  errorCode?: number
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
    deliverRealModeInterrupt(memory, state, vector, faultInstructionPointer);
  else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected")
    deliverProtectedModeInterrupt(memory, state, vector, faultInstructionPointer, false, errorCode);
  else throw new UnsupportedOpcodeError("Virtual-8086 fault delivery is not implemented");
}

export function serviceExternalInterrupt(
  memory: InstructionMemory,
  state: Cpu386State,
  vector: number
): boolean {
  const snapshot = state.snapshot();
  if (!state.interruptFlag()) return false;
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
    deliverRealModeInterrupt(memory, state, vector, snapshot.eip);
  else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected")
    deliverProtectedModeInterrupt(memory, state, vector, snapshot.eip);
  else
    throw new UnsupportedOpcodeError("Virtual-8086 external interrupt delivery is not implemented");
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

function resolveProtectedModeCodeSegment(
  memory: InstructionMemory,
  state: Cpu386State,
  selector: number
): LoadedSegment {
  const snapshot = state.snapshot();
  const descriptorMemory = {
    readUint32: (address: number) =>
      (memory.readUint8(address) & 0xff) |
      ((memory.readUint8((address + 1) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((address + 2) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((address + 3) >>> 0) & 0xff) << 24)
  };
  return new SegmentRegister().load(
    "protected",
    selector,
    "execute",
    snapshot.cs.selector & 0x03,
    descriptorMemory,
    descriptorTables(snapshot)
  );
}

function applyProtectedModeCodeSegment(
  state: Cpu386State,
  loaded: LoadedSegment,
  instructionPointer: number
): void {
  state.loadProtectedModeCodeSegment(
    loaded.selector,
    loaded.base,
    loaded.limit,
    instructionPointer,
    loaded.default32
  );
}

function loadProtectedModeCodeSegment(
  memory: InstructionMemory,
  state: Cpu386State,
  selector: number,
  instructionPointer: number
): void {
  applyProtectedModeCodeSegment(
    state,
    resolveProtectedModeCodeSegment(memory, state, selector),
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
    descriptorTables(snapshot)
  );
  state.loadProtectedModeSegment(
    segment,
    loaded.selector,
    loaded.base,
    loaded.limit,
    loaded.default32
  );
}

function descriptorTables(snapshot: Cpu386Snapshot): {
  gdt: Cpu386Snapshot["gdtr"];
  ldt?: Cpu386Snapshot["ldtr"];
} {
  return snapshot.ldtr.selector === 0
    ? { gdt: snapshot.gdtr }
    : { gdt: snapshot.gdtr, ldt: snapshot.ldtr };
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
  if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
    pushUint16(memory, state, snapshot.cs.selector);
    pushUint16(memory, state, returnInstructionPointer);
    state.loadRealModeCodeSegment(pointer.selector, pointer.instructionPointer);
  } else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected") {
    const loaded = resolveProtectedModeCodeSegment(memory, state, pointer.selector);
    if ((loaded.selector & 0x03) !== (snapshot.cs.selector & 0x03))
      throw new UnsupportedOpcodeError(
        "Protected-mode far CALL stack switching is not implemented"
      );
    pushUint16(memory, state, snapshot.cs.selector);
    pushUint16(memory, state, returnInstructionPointer);
    applyProtectedModeCodeSegment(state, loaded, pointer.instructionPointer);
  } else {
    throw new UnsupportedOpcodeError("Virtual-8086 far CALL is not implemented");
  }
}

function executeDwordMemoryFarCall(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
    throw new UnsupportedOpcodeError(
      "32-bit memory far CALL requires the implemented protected-mode stack path"
    );
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x03 || modRm.registerDirect)
    throw new UnsupportedOpcodeError("Unsupported dword FF opcode form");
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const instructionPointer = readSegmentUint32(memory, state, address.segment, address.offset);
  const selector = readSegmentUint16(memory, state, address.segment, (address.offset + 4) & 0xffff);
  const loaded = resolveProtectedModeCodeSegment(memory, state, selector);
  if ((loaded.selector & 0x03) !== (snapshot.cs.selector & 0x03))
    throw new UnsupportedOpcodeError("Protected-mode far CALL stack switching is not implemented");
  pushUint32(memory, state, snapshot.cs.selector);
  pushUint32(memory, state, snapshot.eip + modRmOffset + 1 + address.displacementBytes);
  applyProtectedModeCodeSegment(state, loaded, instructionPointer);
}

function executeDwordMemoryFarJump(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected")
    throw new UnsupportedOpcodeError("32-bit memory far JMP is only implemented in protected mode");
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x05 || modRm.registerDirect)
    throw new UnsupportedOpcodeError("Unsupported dword FF opcode form");
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  const instructionPointer = readSegmentUint32(memory, state, address.segment, address.offset);
  const selector = readSegmentUint16(memory, state, address.segment, (address.offset + 4) & 0xffff);
  applyProtectedModeCodeSegment(
    state,
    resolveProtectedModeCodeSegment(memory, state, selector),
    instructionPointer
  );
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

function executeContextualPushModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  const value = modRm.registerDirect
    ? context.operandSize === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : context.operandSize === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, context.addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
  pushContextOperand(memory, state, context, value);
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, context.addressSize));
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

function executeContextualPopModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x00) throw new UnsupportedOpcodeError("Unsupported 8F opcode form");
  const value = popContextOperand(memory, state, context);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  if (modRm.registerDirect) {
    if (context.operandSize === 32) state.writeRegister(modRm.rm, value);
    else state.writeRegister16(modRm.rm, value);
  } else if (context.operandSize === 32)
    writeSegmentUint32(
      memory,
      state,
      address!.segment,
      address!.offset,
      value,
      context.addressSize
    );
  else
    writeSegmentUint16(
      memory,
      state,
      address!.segment,
      address!.offset,
      value,
      context.addressSize
    );
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, context.addressSize));
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

function executeContextualMovSegment(
  memory: InstructionMemory,
  state: Cpu386State,
  context: ExecutionContext
): void {
  const modRmOffset = context.opcodeOffset + 1;
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, context.addressSize);
  if (context.opcode === 0x8c) {
    const segment = segmentForStore(modRm.reg);
    if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
    const selector = state.snapshot()[segment].selector;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, selector);
    else
      writeSegmentUint16(
        memory,
        state,
        address!.segment,
        address!.offset,
        selector,
        context.addressSize
      );
  } else {
    const segment = segmentForMove(modRm.reg);
    if (!segment) throw new UnsupportedOpcodeError("Unsupported segment register in MOV");
    const selector = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, context.addressSize);
    if (addressMode(state.snapshot().cr0, state.snapshot().eflags) === "real")
      state.loadRealModeSegment(segment, selector);
    else loadProtectedModeSegment(memory, state, segment, selector);
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, context.addressSize));
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

function executeCompareRegFromModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  width: 8 | 16,
  modRmOffset = 1,
  segmentOverride?: "cs" | "ds" | "es" | "ss" | "fs" | "gs"
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) {
    if (width === 8)
      state.writeCompareFlags8(state.readRegister8(modRm.reg), state.readRegister8(modRm.rm));
    else state.writeCompareFlags16(state.readRegister16(modRm.reg), state.readRegister16(modRm.rm));
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRm16Address(
    modRm,
    (index) => state.readRegister16(index),
    (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
  );
  if (width === 8) {
    state.writeCompareFlags8(
      state.readRegister8(modRm.reg),
      readSegmentUint8(memory, state, segmentOverride ?? address.segment, address.offset)
    );
  } else {
    state.writeCompareFlags16(
      state.readRegister16(modRm.reg),
      readSegmentUint16(memory, state, segmentOverride ?? address.segment, address.offset)
    );
  }
  state.advanceEip(modRmOffset + 1 + address.displacementBytes);
}

function executeXchgModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  width: 8 | 16 | 32,
  modRmOffset = 1,
  addressSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) {
    if (width === 8) {
      const register = state.readRegister8(modRm.reg);
      state.writeRegister8(modRm.reg, state.readRegister8(modRm.rm));
      state.writeRegister8(modRm.rm, register);
    } else if (width === 16) {
      const register = state.readRegister16(modRm.reg);
      state.writeRegister16(modRm.reg, state.readRegister16(modRm.rm));
      state.writeRegister16(modRm.rm, register);
    } else {
      const register = state.readRegister(modRm.reg);
      state.writeRegister(modRm.reg, state.readRegister(modRm.rm));
      state.writeRegister(modRm.rm, register);
    }
    state.advanceEip(modRmOffset + 1);
    return;
  }
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize)!;
  if (width === 8) {
    const register = state.readRegister8(modRm.reg);
    state.writeRegister8(
      modRm.reg,
      readSegmentUint8(memory, state, address.segment, address.offset, addressSize)
    );
    writeSegmentUint8(memory, state, address.segment, address.offset, register, addressSize);
  } else if (width === 16) {
    const register = state.readRegister16(modRm.reg);
    state.writeRegister16(
      modRm.reg,
      readSegmentUint16(memory, state, address.segment, address.offset, addressSize)
    );
    writeSegmentUint16(memory, state, address.segment, address.offset, register, addressSize);
  } else {
    const register = state.readRegister(modRm.reg);
    state.writeRegister(
      modRm.reg,
      readSegmentUint32(memory, state, address.segment, address.offset, addressSize)
    );
    writeSegmentUint32(memory, state, address.segment, address.offset, register, addressSize);
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeByteAluModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  operation: DwordAluOperation,
  destinationIsRegister: boolean,
  modRmOffset = 1,
  addressSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  const destination = destinationIsRegister
    ? state.readRegister8(modRm.reg)
    : modRm.registerDirect
      ? state.readRegister8(modRm.rm)
      : readSegmentUint8(memory, state, address!.segment, address!.offset, addressSize);
  const source = destinationIsRegister
    ? modRm.registerDirect
      ? state.readRegister8(modRm.rm)
      : readSegmentUint8(memory, state, address!.segment, address!.offset, addressSize)
    : state.readRegister8(modRm.reg);
  const result = writeByteAluResult(state, operation, destination, source);
  if (operation !== "cmp" && operation !== "test") {
    if (destinationIsRegister) state.writeRegister8(modRm.reg, result);
    else if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
    else writeSegmentUint8(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(modRmOffset + 1 + addressBytes);
}

function executeWordAluModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  operation: DwordAluOperation,
  destinationIsRegister: boolean,
  modRmOffset = 1,
  addressSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  const destination = destinationIsRegister
    ? state.readRegister16(modRm.reg)
    : modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
  const source = destinationIsRegister
    ? modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize)
    : state.readRegister16(modRm.reg);
  const result = writeWordAluResult(state, operation, destination, source);
  if (operation !== "cmp" && operation !== "test") {
    if (destinationIsRegister) state.writeRegister16(modRm.reg, result);
    else if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else writeSegmentUint16(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(modRmOffset + 1 + addressBytes);
}

type DwordAluOperation = "add" | "adc" | "or" | "and" | "sub" | "xor" | "cmp" | "test" | "sbb";

function byteModRmAluOperation(opcode: number): DwordAluOperation | undefined {
  if (opcode === 0x00 || opcode === 0x02) return "add";
  if (opcode === 0x08 || opcode === 0x0a) return "or";
  if (opcode === 0x10 || opcode === 0x12) return "adc";
  if (opcode === 0x18 || opcode === 0x1a) return "sbb";
  if (opcode === 0x20 || opcode === 0x22) return "and";
  if (opcode === 0x28 || opcode === 0x2a) return "sub";
  if (opcode === 0x30 || opcode === 0x32) return "xor";
  if (opcode === 0x38 || opcode === 0x3a) return "cmp";
  if (opcode === 0x84) return "test";
  return undefined;
}

function byteModRmAluDestinationIsRegister(opcode: number): boolean {
  return (
    opcode === 0x02 ||
    opcode === 0x0a ||
    opcode === 0x12 ||
    opcode === 0x1a ||
    opcode === 0x22 ||
    opcode === 0x2a ||
    opcode === 0x32 ||
    opcode === 0x3a
  );
}

function modRmAluOperation(opcode: number): DwordAluOperation | undefined {
  if (opcode === 0x01 || opcode === 0x03) return "add";
  if (opcode === 0x09 || opcode === 0x0b) return "or";
  if (opcode === 0x11 || opcode === 0x13) return "adc";
  if (opcode === 0x19 || opcode === 0x1b) return "sbb";
  if (opcode === 0x21 || opcode === 0x23) return "and";
  if (opcode === 0x29 || opcode === 0x2b) return "sub";
  if (opcode === 0x31 || opcode === 0x33) return "xor";
  if (opcode === 0x39 || opcode === 0x3b) return "cmp";
  if (opcode === 0x85) return "test";
  return undefined;
}

function modRmAluDestinationIsRegister(opcode: number): boolean {
  return (
    opcode === 0x03 ||
    opcode === 0x0b ||
    opcode === 0x13 ||
    opcode === 0x1b ||
    opcode === 0x23 ||
    opcode === 0x2b ||
    opcode === 0x33 ||
    opcode === 0x3b
  );
}

function dwordGroupOneOperation(group: number): DwordAluOperation {
  switch (group) {
    case 0x00:
      return "add";
    case 0x01:
      return "or";
    case 0x02:
      return "adc";
    case 0x03:
      return "sbb";
    case 0x04:
      return "and";
    case 0x05:
      return "sub";
    case 0x06:
      return "xor";
    case 0x07:
      return "cmp";
    default:
      throw new UnsupportedOpcodeError("Unsupported dword Group 1 opcode form");
  }
}

function writeDwordAluResult(
  state: Cpu386State,
  operation: DwordAluOperation,
  destination: number,
  source: number
): number {
  const carry = operation === "adc" || operation === "sbb" ? (state.carryFlag() ? 1 : 0) : 0;
  let result: number;
  switch (operation) {
    case "add":
    case "adc":
      result = destination + source + carry;
      break;
    case "or":
      result = destination | source;
      break;
    case "and":
    case "test":
      result = destination & source;
      break;
    case "xor":
      result = destination ^ source;
      break;
    case "sub":
    case "sbb":
    case "cmp":
      result = destination - source - carry;
      break;
  }
  if (operation === "add" || operation === "adc") state.writeAddFlags32(destination, source, carry);
  else if (operation === "sub" || operation === "sbb" || operation === "cmp")
    state.writeCompareFlags32(destination, source, carry);
  else state.writeLogicFlags32(result);
  return result;
}

function writeByteAluResult(
  state: Cpu386State,
  operation: DwordAluOperation,
  destination: number,
  source: number
): number {
  const carry = operation === "adc" || operation === "sbb" ? (state.carryFlag() ? 1 : 0) : 0;
  let result: number;
  switch (operation) {
    case "add":
    case "adc":
      result = destination + source + carry;
      break;
    case "or":
      result = destination | source;
      break;
    case "and":
    case "test":
      result = destination & source;
      break;
    case "xor":
      result = destination ^ source;
      break;
    case "sub":
    case "sbb":
    case "cmp":
      result = destination - source - carry;
      break;
  }
  if (operation === "add" || operation === "adc") state.writeAddFlags8(destination, source, carry);
  else if (operation === "sub" || operation === "sbb" || operation === "cmp")
    state.writeCompareFlags8(destination, source, carry);
  else state.writeLogicFlags8(result);
  return result;
}

function writeWordAluResult(
  state: Cpu386State,
  operation: DwordAluOperation,
  destination: number,
  source: number
): number {
  const carry = operation === "adc" || operation === "sbb" ? (state.carryFlag() ? 1 : 0) : 0;
  let result: number;
  switch (operation) {
    case "add":
    case "adc":
      result = destination + source + carry;
      break;
    case "or":
      result = destination | source;
      break;
    case "and":
    case "test":
      result = destination & source;
      break;
    case "xor":
      result = destination ^ source;
      break;
    case "sub":
    case "sbb":
    case "cmp":
      result = destination - source - carry;
      break;
  }
  if (operation === "add" || operation === "adc") state.writeAddFlags16(destination, source, carry);
  else if (operation === "sub" || operation === "sbb" || operation === "cmp")
    state.writeCompareFlags16(destination, source, carry);
  else state.writeLogicFlags16(result);
  return result;
}

function executeDwordAluModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  operation: DwordAluOperation,
  destinationIsRegister: boolean,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  const destination = destinationIsRegister
    ? state.readRegister(modRm.reg)
    : modRm.registerDirect
      ? state.readRegister(modRm.rm)
      : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
  const source = destinationIsRegister
    ? modRm.registerDirect
      ? state.readRegister(modRm.rm)
      : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize)
    : state.readRegister(modRm.reg);
  const result = writeDwordAluResult(state, operation, destination, source);
  if (operation !== "cmp" && operation !== "test") {
    if (destinationIsRegister) state.writeRegister(modRm.reg, result);
    else if (modRm.registerDirect) state.writeRegister(modRm.rm, result);
    else writeSegmentUint32(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(modRmOffset + 1 + addressBytes);
}

function executeDwordGroupOneImmediate(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  immediateBytes: 1 | 4
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address: DecodedMemoryAddress | undefined = modRm.registerDirect
    ? undefined
    : addressSize === 16
      ? decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        )
      : decodeModRm32Address(
          modRm,
          (index) => state.readRegister(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        );
  const sibBytes =
    "sibBytes" in (address ?? {}) && typeof address?.sibBytes === "number" ? address.sibBytes : 0;
  const addressBytes = (address?.displacementBytes ?? 0) + sibBytes;
  const destination = modRm.registerDirect
    ? state.readRegister(modRm.rm)
    : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
  const immediateOffset = modRmOffset + 1 + addressBytes;
  const immediate =
    immediateBytes === 4
      ? fetchCodeUint32(memory, state, immediateOffset)
      : signedByte(fetchCodeByte(memory, state, immediateOffset).opcode) >>> 0;
  const operation = dwordGroupOneOperation(modRm.reg);
  const result = writeDwordAluResult(state, operation, destination, immediate);
  if (operation !== "cmp") {
    if (modRm.registerDirect) state.writeRegister(modRm.rm, result);
    else writeSegmentUint32(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(immediateOffset + immediateBytes);
}

function executeWordGroupOneImmediate(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  immediateBytes: 1 | 2
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  const destination = modRm.registerDirect
    ? state.readRegister16(modRm.rm)
    : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
  const immediateOffset = modRmOffset + 1 + addressBytes;
  const immediate =
    immediateBytes === 2
      ? fetchCodeUint16(memory, state, immediateOffset)
      : signedByte(fetchCodeByte(memory, state, immediateOffset).opcode) & 0xffff;
  const operation = dwordGroupOneOperation(modRm.reg);
  const result = writeWordAluResult(state, operation, destination, immediate);
  if (operation !== "cmp") {
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
    else writeSegmentUint16(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(immediateOffset + immediateBytes);
}

function executeByteGroupOneImmediate(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const addressBytes = decodedAddressBytes(address, addressSize);
  const destination = modRm.registerDirect
    ? state.readRegister8(modRm.rm)
    : readSegmentUint8(memory, state, address!.segment, address!.offset, addressSize);
  const immediateOffset = modRmOffset + 1 + addressBytes;
  const immediate = fetchCodeByte(memory, state, immediateOffset).opcode;
  const operation = dwordGroupOneOperation(modRm.reg);
  const result = writeByteAluResult(state, operation, destination, immediate);
  if (operation !== "cmp") {
    if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
    else writeSegmentUint8(memory, state, address!.segment, address!.offset, result, addressSize);
  }
  state.advanceEip(immediateOffset + 1);
}

function executeDwordF7(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  faultInstructionPointer: number
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address: DecodedMemoryAddress | undefined = modRm.registerDirect
    ? undefined
    : addressSize === 16
      ? decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        )
      : decodeModRm32Address(
          modRm,
          (index) => state.readRegister(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        );
  const sibBytes =
    "sibBytes" in (address ?? {}) && typeof address?.sibBytes === "number" ? address.sibBytes : 0;
  const addressBytes = (address?.displacementBytes ?? 0) + sibBytes;
  const operand = modRm.registerDirect
    ? state.readRegister(modRm.rm)
    : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
  const instructionBytes = modRmOffset + 1 + addressBytes;
  const writeOperand = (value: number): void => {
    if (modRm.registerDirect) state.writeRegister(modRm.rm, value);
    else writeSegmentUint32(memory, state, address!.segment, address!.offset, value, addressSize);
  };

  switch (modRm.reg) {
    case 0x00: {
      const immediate = fetchCodeUint32(memory, state, instructionBytes);
      state.writeLogicFlags32(operand & immediate);
      state.advanceEip(instructionBytes + 4);
      return;
    }
    case 0x02:
      writeOperand(~operand);
      state.advanceEip(instructionBytes);
      return;
    case 0x03:
      writeOperand(-operand);
      state.writeCompareFlags32(0, operand);
      state.advanceEip(instructionBytes);
      return;
    case 0x04: {
      const product = BigInt(state.readRegister(0)) * BigInt(operand);
      state.writeRegister(0, Number(BigInt.asUintN(32, product)));
      state.writeRegister(2, Number(BigInt.asUintN(32, product >> 32n)));
      state.writeMultiplyFlags32(Number(BigInt.asUintN(32, product >> 32n)));
      state.advanceEip(instructionBytes);
      return;
    }
    case 0x05: {
      const product =
        BigInt.asIntN(32, BigInt(state.readRegister(0))) * BigInt.asIntN(32, BigInt(operand));
      state.writeRegister(0, Number(BigInt.asUintN(32, product)));
      state.writeRegister(2, Number(BigInt.asUintN(32, product >> 32n)));
      state.writeSignedMultiplyFlags32(product < -0x80000000n || product > 0x7fffffffn);
      state.advanceEip(instructionBytes);
      return;
    }
    case 0x06: {
      const dividend = (BigInt(state.readRegister(2)) << 32n) | BigInt(state.readRegister(0));
      if (operand === 0) {
        deliverCpuFault(memory, state, 0, faultInstructionPointer);
        return;
      }
      const quotient = dividend / BigInt(operand);
      if (quotient > 0xffffffffn) {
        deliverCpuFault(memory, state, 0, faultInstructionPointer);
        return;
      }
      state.writeRegister(0, Number(quotient));
      state.writeRegister(2, Number(dividend % BigInt(operand)));
      state.advanceEip(instructionBytes);
      return;
    }
    case 0x07: {
      const divisor = BigInt.asIntN(32, BigInt(operand));
      const dividend = BigInt.asIntN(
        64,
        (BigInt(state.readRegister(2)) << 32n) | BigInt(state.readRegister(0))
      );
      if (divisor === 0n) {
        deliverCpuFault(memory, state, 0, faultInstructionPointer);
        return;
      }
      const quotient = dividend / divisor;
      if (quotient < -0x80000000n || quotient > 0x7fffffffn) {
        deliverCpuFault(memory, state, 0, faultInstructionPointer);
        return;
      }
      state.writeRegister(0, Number(BigInt.asUintN(32, quotient)));
      state.writeRegister(2, Number(BigInt.asUintN(32, dividend % divisor)));
      state.advanceEip(instructionBytes);
      return;
    }
    default:
      throw new UnsupportedOpcodeError("Unsupported dword F7 opcode form");
  }
}

function executeDwordImmediateImul(
  memory: InstructionMemory,
  state: Cpu386State,
  opcode: 0x69 | 0x6b,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  executeImmediateImul(memory, state, opcode, modRmOffset, addressSize, 32);
}

function executeImmediateImul(
  memory: InstructionMemory,
  state: Cpu386State,
  opcode: 0x69 | 0x6b,
  modRmOffset: number,
  addressSize: 16 | 32,
  operandSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const immediateOffset = modRmOffset + 1 + decodedAddressBytes(address, addressSize);
  if (operandSize === 32) {
    const source = modRm.registerDirect
      ? state.readRegister(modRm.rm)
      : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
    const immediate =
      opcode === 0x69
        ? fetchCodeUint32(memory, state, immediateOffset)
        : signedByte(fetchCodeByte(memory, state, immediateOffset).opcode);
    const product = BigInt.asIntN(32, BigInt(source)) * BigInt.asIntN(32, BigInt(immediate));
    state.writeRegister(modRm.reg, Number(BigInt.asUintN(32, product)));
    state.writeSignedMultiplyFlags32(product < -0x80000000n || product > 0x7fffffffn);
    state.advanceEip(immediateOffset + (opcode === 0x69 ? 4 : 1));
  } else {
    const source = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
    const immediate =
      opcode === 0x69
        ? signedWord(fetchCodeUint16(memory, state, immediateOffset))
        : signedByte(fetchCodeByte(memory, state, immediateOffset).opcode);
    const product = signedWord(source) * immediate;
    state.writeRegister16(modRm.reg, product);
    state.writeSignedMultiplyFlags16(product > 0x7fff || product < -0x8000);
    state.advanceEip(immediateOffset + (opcode === 0x69 ? 2 : 1));
  }
}

function executeDwordImul(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  executeImulModRm(memory, state, modRmOffset, addressSize, 32);
}

function executeImulModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32,
  operandSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  if (operandSize === 32) {
    const source = modRm.registerDirect
      ? state.readRegister(modRm.rm)
      : readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize);
    const product =
      BigInt.asIntN(32, BigInt(state.readRegister(modRm.reg))) * BigInt.asIntN(32, BigInt(source));
    state.writeRegister(modRm.reg, Number(BigInt.asUintN(32, product)));
    state.writeSignedMultiplyFlags32(product < -0x80000000n || product > 0x7fffffffn);
  } else {
    const source = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
    const product = signedWord(state.readRegister16(modRm.reg)) * signedWord(source);
    state.writeRegister16(modRm.reg, product);
    state.writeSignedMultiplyFlags16(product > 0x7fff || product < -0x8000);
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeMovImmediateDwordModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x00) throw new UnsupportedOpcodeError("Unsupported dword C7 opcode form");
  const address: DecodedMemoryAddress | undefined = modRm.registerDirect
    ? undefined
    : addressSize === 16
      ? decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        )
      : decodeModRm32Address(
          modRm,
          (index) => state.readRegister(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        );
  const sibBytes =
    "sibBytes" in (address ?? {}) && typeof address?.sibBytes === "number" ? address.sibBytes : 0;
  const addressBytes = (address?.displacementBytes ?? 0) + sibBytes;
  const immediate = fetchCodeUint32(memory, state, modRmOffset + 1 + addressBytes);
  if (modRm.registerDirect) state.writeRegister(modRm.rm, immediate);
  else writeSegmentUint32(memory, state, address!.segment, address!.offset, immediate, addressSize);
  state.advanceEip(modRmOffset + 5 + addressBytes);
}

function executeLeaDwordModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect) throw new UnsupportedOpcodeError("LEA requires a memory operand");
  const address =
    addressSize === 16
      ? decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        )
      : decodeModRm32Address(
          modRm,
          (index) => state.readRegister(index),
          (offset) => fetchCodeByte(memory, state, modRmOffset - 1 + offset).opcode
        );
  const sibBytes =
    "sibBytes" in address && typeof address.sibBytes === "number" ? address.sibBytes : 0;
  state.writeRegister(modRm.reg, address.offset);
  state.advanceEip(modRmOffset + 1 + address.displacementBytes + sibBytes);
}

function executeMovExtendDwordModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: number,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  executeMovExtendModRm(memory, state, extension, modRmOffset, addressSize, 32);
}

function executeMovExtendModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: number,
  modRmOffset: number,
  addressSize: 16 | 32,
  destinationSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const byteSource = extension === 0xb6 || extension === 0xbe;
  const signedSource = extension === 0xbe || extension === 0xbf;
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const source = byteSource
    ? modRm.registerDirect
      ? state.readRegister8(modRm.rm)
      : readSegmentUint8(memory, state, address!.segment, address!.offset, addressSize)
    : modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
  const result =
    signedSource && source & (byteSource ? 0x80 : 0x8000)
      ? source | (byteSource ? 0xffffff00 : 0xffff0000)
      : source;
  if (destinationSize === 32) state.writeRegister(modRm.reg, result);
  else state.writeRegister16(modRm.reg, result);
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeBitScanDwordModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: 0xbc | 0xbd,
  modRmOffset: number
): void {
  executeBitScanModRm(memory, state, extension, modRmOffset, 16, 32);
}

function executeBitScanModRm(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: 0xbc | 0xbd,
  modRmOffset: number,
  addressSize: 16 | 32,
  operandSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const source = modRm.registerDirect
    ? operandSize === 32
      ? state.readRegister(modRm.rm)
      : state.readRegister16(modRm.rm)
    : operandSize === 32
      ? readSegmentUint32(memory, state, address!.segment, address!.offset, addressSize)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
  state.writeBitScanZeroFlag(source === 0);
  if (source !== 0) {
    let index = extension === 0xbc ? 0 : operandSize - 1;
    if (extension === 0xbc) while (!(source & (1 << index))) index += 1;
    else while (!(source & (1 << index))) index -= 1;
    if (operandSize === 32) state.writeRegister(modRm.reg, index);
    else state.writeRegister16(modRm.reg, index);
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeSetcc(
  memory: InstructionMemory,
  state: Cpu386State,
  extension: number,
  modRmOffset: number,
  addressSize: 16 | 32
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const value = shortJumpCondition(state, extension & 0x0f) ? 1 : 0;
  if (modRm.registerDirect) state.writeRegister8(modRm.rm, value);
  else writeSegmentUint8(memory, state, address!.segment, address!.offset, value, addressSize);
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeStoreDescriptorTable(
  memory: InstructionMemory,
  state: Cpu386State,
  modRmOffset: number,
  addressSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.registerDirect || (modRm.reg !== 0x00 && modRm.reg !== 0x01))
    throw new UnsupportedOpcodeError("Unsupported descriptor-table store form");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize)!;
  const descriptorTable = modRm.reg === 0x00 ? state.snapshot().gdtr : state.snapshot().idtr;
  writeSegmentUint16(
    memory,
    state,
    address.segment,
    address.offset,
    descriptorTable.limit,
    addressSize
  );
  for (let index = 0; index < 4; index += 1) {
    writeSegmentUint8(
      memory,
      state,
      address.segment,
      addressSize === 16
        ? (address.offset + 2 + index) & 0xffff
        : (address.offset + 2 + index) >>> 0,
      descriptorTable.base >>> (index * 8)
    );
  }
  state.advanceEip(modRmOffset + 1 + decodedAddressBytes(address, addressSize));
}

function executeSystemTableInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  faultInstructionPointer: number,
  modRmOffset = 2,
  addressSize: 16 | 32 = 16,
  operandSize: 16 | 32 = 16
): void {
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  const snapshot = state.snapshot();
  if (
    (modRm.reg === 0x02 || modRm.reg === 0x03 || modRm.reg === 0x06) &&
    addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
    (snapshot.cs.selector & 0x03) !== 0
  ) {
    deliverCpuFault(memory, state, 13, faultInstructionPointer, 0);
    return;
  }
  if (!modRm.registerDirect && (modRm.reg === 0x00 || modRm.reg === 0x01)) {
    executeStoreDescriptorTable(memory, state, modRmOffset, addressSize);
    return;
  }
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const instructionBytes = modRmOffset + 1 + decodedAddressBytes(address, addressSize);
  if (modRm.reg === 0x04) {
    const machineStatusWord = snapshot.cr0 & 0xffff;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, machineStatusWord);
    else
      writeSegmentUint16(
        memory,
        state,
        address!.segment,
        address!.offset,
        machineStatusWord,
        addressSize
      );
    state.advanceEip(instructionBytes);
    return;
  }
  if (modRm.reg === 0x06) {
    const source = modRm.registerDirect
      ? state.readRegister16(modRm.rm)
      : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
    state.loadMachineStatusWord(source);
    state.advanceEip(instructionBytes);
    return;
  }
  if (!modRm.registerDirect && (modRm.reg === 0x02 || modRm.reg === 0x03)) {
    const limit = readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
    const baseBytes = operandSize === 32 ? 4 : 3;
    let base = 0;
    for (let index = 0; index < baseBytes; index += 1) {
      const offset =
        addressSize === 16
          ? (address!.offset + 2 + index) & 0xffff
          : (address!.offset + 2 + index) >>> 0;
      base |= readSegmentUint8(memory, state, address!.segment, offset) << (index * 8);
    }
    if (modRm.reg === 0x02) state.writeGdtr(base, limit);
    else state.writeIdtr(base, limit);
    state.advanceEip(instructionBytes);
    return;
  }
  throw new UnsupportedOpcodeError("Unsupported 0F 01 opcode form");
}

function executeSystemSelectorInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  faultInstructionPointer: number,
  modRmOffset = 2,
  addressSize: 16 | 32 = 16
): void {
  const snapshot = state.snapshot();
  if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected")
    throw new UnsupportedOpcodeError("System selector instructions require protected mode");
  const modRm = decodeModRm(fetchCodeByte(memory, state, modRmOffset).opcode);
  if (modRm.reg !== 0x00 && modRm.reg !== 0x01 && modRm.reg !== 0x02 && modRm.reg !== 0x03)
    throw new UnsupportedOpcodeError("Unsupported 0F 00 opcode form");
  const address = decodeModRmAddress(memory, state, modRm, modRmOffset, addressSize);
  const instructionBytes = modRmOffset + 1 + decodedAddressBytes(address, addressSize);
  if (modRm.reg === 0x00 || modRm.reg === 0x01) {
    const selector = modRm.reg === 0x00 ? snapshot.ldtr.selector : snapshot.tr.selector;
    if (modRm.registerDirect) state.writeRegister16(modRm.rm, selector);
    else
      writeSegmentUint16(memory, state, address!.segment, address!.offset, selector, addressSize);
    state.advanceEip(instructionBytes);
    return;
  }
  if ((snapshot.cs.selector & 0x03) !== 0) {
    deliverCpuFault(memory, state, 13, faultInstructionPointer, 0);
    return;
  }
  const descriptorMemory = {
    readUint32: (linearAddress: number) =>
      (memory.readUint8(linearAddress) & 0xff) |
      ((memory.readUint8((linearAddress + 1) >>> 0) & 0xff) << 8) |
      ((memory.readUint8((linearAddress + 2) >>> 0) & 0xff) << 16) |
      ((memory.readUint8((linearAddress + 3) >>> 0) & 0xff) << 24)
  };
  const selector = modRm.registerDirect
    ? state.readRegister16(modRm.rm)
    : readSegmentUint16(memory, state, address!.segment, address!.offset, addressSize);
  if (modRm.reg === 0x02) {
    const table = resolveLocalDescriptorTable(descriptorMemory, snapshot.gdtr, selector);
    state.loadLocalDescriptorTable(selector, table?.base ?? 0, table?.limit ?? 0);
    state.advanceEip(instructionBytes);
    return;
  }
  if (selector & 0x04) throw new UnsupportedOpcodeError("LTR requires a GDT selector");
  const descriptor = loadDescriptor(descriptorMemory, snapshot.gdtr, selector);
  if (descriptor.system || (descriptor.type !== 0x01 && descriptor.type !== 0x09))
    throw new UnsupportedOpcodeError("LTR requires an available TSS descriptor");
  if (!descriptor.present) throw new UnsupportedOpcodeError("LTR TSS descriptor is not present");
  if (!memory.writeUint8)
    throw new UnsupportedOpcodeError("LTR requires writable descriptor memory");
  const descriptorAddress = (snapshot.gdtr.base + (selector & 0xfff8)) >>> 0;
  memory.writeUint8(
    descriptorAddress + 5,
    (memory.readUint8(descriptorAddress + 5) & 0xf0) | (descriptor.type | 0x02)
  );
  state.loadTaskRegister(selector, descriptor.base, descriptor.limit, descriptor.type === 0x09);
  state.advanceEip(instructionBytes);
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
  if (!normalizedCount) {
    state.advanceEip(2 + (address?.displacementBytes ?? 0) + (immediateCount ? 1 : 0));
    return;
  }
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
  if (!normalizedCount) {
    state.advanceEip(3 + (address?.displacementBytes ?? 0));
    return;
  }
  const result = normalizedCount > 8 ? 0 : source >>> normalizedCount;
  if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
  else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
  state.writeShiftRightFlags8(source, count);
  state.advanceEip(3 + (address?.displacementBytes ?? 0));
}

function executeStringComparison(
  memory: InstructionMemory,
  state: Cpu386State,
  opcode: number,
  repeatWhileZero?: boolean
): void {
  const word = opcode === 0xa7 || opcode === 0xaf;
  const compare = opcode === 0xa6 || opcode === 0xa7;
  let count = repeatWhileZero === undefined ? 1 : state.readRegister16(1);
  let source = state.readRegister16(6);
  let destination = state.readRegister16(7);
  const step = state.directionFlag() ? (word ? -2 : -1) : word ? 2 : 1;
  while (count > 0) {
    if (word) {
      const left = compare
        ? readSegmentUint16(memory, state, "ds", source)
        : state.readRegister16(0);
      const right = readSegmentUint16(memory, state, "es", destination);
      state.writeCompareFlags16(left, right);
    } else {
      const left = compare ? readSegmentUint8(memory, state, "ds", source) : state.readRegister8(0);
      const right = readSegmentUint8(memory, state, "es", destination);
      state.writeCompareFlags8(left, right);
    }
    if (compare) source = (source + step) & 0xffff;
    destination = (destination + step) & 0xffff;
    count -= 1;
    if (repeatWhileZero === undefined || state.zeroFlag() !== repeatWhileZero) break;
  }
  if (compare) state.writeRegister16(6, source);
  state.writeRegister16(7, destination);
  if (repeatWhileZero !== undefined) state.writeRegister16(1, count);
}

export function stepInstruction(
  memory: InstructionMemory,
  state: Cpu386State,
  ports?: PortIo
): ExecutionResult {
  if (state.snapshot().halted) return { halted: true };

  const fetched = fetchOpcode(memory, state);
  const snapshot = state.snapshot();
  const context = decodeExecutionContext(
    { readByte: (displacement) => fetchCodeByte(memory, state, displacement).opcode },
    fetched.instructionPointer,
    { codeDefault32: snapshot.cs.default32, stackDefault32: snapshot.ss.default32 }
  );
  const contextualResult = executeContextualInstruction(memory, state, context, fetched);
  if (contextualResult) return contextualResult;
  switch (fetched.opcode) {
    case 0x62: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.registerDirect) throw new UnsupportedOpcodeError("BOUND requires a memory operand");
      const address = decodeMemoryAddress(memory, state, modRm);
      const index = (state.readRegister16(modRm.reg) << 16) >> 16;
      const lower = (readSegmentUint16(memory, state, address.segment, address.offset) << 16) >> 16;
      const upper =
        (readSegmentUint16(memory, state, address.segment, (address.offset + 2) & 0xffff) << 16) >>
        16;
      if (index < lower || index > upper) {
        deliverCpuFault(memory, state, 5, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      state.advanceEip(2 + address.displacementBytes);
      return { halted: false, fetched };
    }
    case 0x68:
      pushUint16(memory, state, fetchCodeUint16(memory, state, 1));
      state.advanceEip(3);
      return { halted: false, fetched };
    case 0x6a:
      pushUint16(memory, state, signedByte(fetchCodeByte(memory, state, 1).opcode));
      state.advanceEip(2);
      return { halted: false, fetched };
    case 0x37: {
      let accumulator = state.readRegister8(0);
      let highAccumulator = state.readRegister8(4);
      const adjusted = (accumulator & 0x0f) > 9 || state.auxiliaryCarryFlag();
      if (adjusted) {
        accumulator += 0x06;
        if (accumulator > 0xff) highAccumulator++;
        highAccumulator++;
      }
      state.writeRegister16(0, ((highAccumulator << 8) | accumulator) & 0xff0f);
      state.writeAsciiAdjustFlags(adjusted);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x3f: {
      let accumulator = state.readRegister8(0);
      let highAccumulator = state.readRegister8(4);
      const adjusted = (accumulator & 0x0f) > 9 || state.auxiliaryCarryFlag();
      if (adjusted) {
        accumulator = (accumulator - 0x06) & 0x0f;
        highAccumulator = (highAccumulator - 1) & 0xff;
      }
      state.writeRegister16(0, (highAccumulator << 8) | accumulator);
      state.writeAsciiAdjustFlags(adjusted);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x27: {
      let accumulator = state.readRegister8(0);
      let auxiliaryCarry = state.auxiliaryCarryFlag();
      let carry = state.carryFlag();
      if ((accumulator & 0x0f) > 9 || auxiliaryCarry) {
        accumulator += 0x06;
        auxiliaryCarry = true;
      } else auxiliaryCarry = false;
      if (accumulator > 0x9f || carry) {
        accumulator += 0x60;
        carry = true;
      } else carry = false;
      state.writeRegister8(0, accumulator);
      state.writeDecimalAdjustFlags8(accumulator, carry, auxiliaryCarry);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x2f: {
      let accumulator = state.readRegister8(0);
      let auxiliaryCarry = state.auxiliaryCarryFlag();
      let carry = state.carryFlag();
      if ((accumulator & 0x0f) > 9 || auxiliaryCarry) {
        accumulator -= 0x06;
        auxiliaryCarry = true;
      } else auxiliaryCarry = false;
      if (accumulator > 0x9f || carry) {
        accumulator -= 0x60;
        carry = true;
      } else carry = false;
      state.writeRegister8(0, accumulator);
      state.writeDecimalAdjustFlags8(accumulator, carry, auxiliaryCarry);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xd5: {
      const accumulator = state.readRegister8(0);
      const multiplicand = state.readRegister8(4) * fetchCodeByte(memory, state, 1).opcode;
      const result = accumulator + multiplicand;
      state.writeRegister16(0, result & 0xff);
      state.writeAddFlags8(accumulator, multiplicand);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xd7: {
      const offset = (state.readRegister16(3) + state.readRegister8(0)) & 0xffff;
      state.writeRegister8(0, readSegmentUint8(memory, state, "ds", offset));
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xc9:
      state.writeRegister16(4, state.readRegister16(5));
      state.writeRegister16(5, popUint16(memory, state));
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xc8: {
      const localBytes = fetchCodeUint16(memory, state, 1);
      let level = fetchCodeByte(memory, state, 3).opcode & 0x1f;
      pushUint16(memory, state, state.readRegister16(5));
      const frame = state.readRegister16(4);
      if (level > 0) {
        let basePointer = state.readRegister16(5);
        while (--level) {
          basePointer = (basePointer - 2) & 0xffff;
          pushUint16(memory, state, readSegmentUint16(memory, state, "ss", basePointer));
        }
        pushUint16(memory, state, frame);
      }
      state.writeRegister16(5, frame);
      state.writeRegister16(4, (state.readRegister16(4) - localBytes) & 0xffff);
      state.advanceEip(4);
      return { halted: false, fetched };
    }
    case 0xd4: {
      const divisor = fetchCodeByte(memory, state, 1).opcode;
      if (divisor === 0) {
        deliverCpuFault(memory, state, 0, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      const accumulator = state.readRegister8(0);
      const quotient = Math.floor(accumulator / divisor);
      const remainder = accumulator % divisor;
      state.writeRegister16(0, (quotient << 8) | remainder);
      state.writeDecimalAdjustFlags8(remainder, false, false);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x90:
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x91:
    case 0x92:
    case 0x93:
    case 0x94:
    case 0x95:
    case 0x96:
    case 0x97: {
      const register = fetched.opcode - 0x90;
      const accumulator = state.readRegister16(0);
      state.writeRegister16(0, state.readRegister16(register));
      state.writeRegister16(register, accumulator);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x98: {
      const value = state.readRegister8(0);
      state.writeRegister16(0, value & 0x80 ? value | 0xff00 : value);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0x99:
      state.writeRegister16(2, state.readRegister16(0) & 0x8000 ? 0xffff : 0);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9a: {
      const snapshot = state.snapshot();
      const instructionPointer = fetchCodeUint16(memory, state, 1);
      const selector = fetchCodeUint16(memory, state, 3);
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
        pushUint16(memory, state, snapshot.cs.selector);
        pushUint16(memory, state, (snapshot.eip + 5) & 0xffff);
        state.loadRealModeCodeSegment(selector, instructionPointer);
      } else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected") {
        const loaded = resolveProtectedModeCodeSegment(memory, state, selector);
        if ((loaded.selector & 0x03) !== (snapshot.cs.selector & 0x03))
          throw new UnsupportedOpcodeError(
            "Protected-mode far CALL stack switching is not implemented"
          );
        pushUint16(memory, state, snapshot.cs.selector);
        pushUint16(memory, state, (snapshot.eip + 5) & 0xffff);
        applyProtectedModeCodeSegment(state, loaded, instructionPointer);
      } else {
        throw new UnsupportedOpcodeError("Virtual-8086 far CALL is not implemented");
      }
      return { halted: false, fetched };
    }
    case 0x9b:
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xf4:
      state.advanceEip(1);
      state.halt();
      return { halted: true, fetched };
    case 0xf5:
      if (state.carryFlag()) state.clearCarryFlag();
      else state.setCarryFlag();
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9e:
      state.writeStatusFlagsFromAh((state.snapshot().registers.eax >>> 8) & 0xff);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9f:
      state.writeRegister8(4, state.snapshot().eflags & 0xff);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9c:
      pushUint16(memory, state, state.snapshot().eflags & 0xffff);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0x9d: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) === "protected") {
        if ((snapshot.cs.selector & 0x03) !== 0) {
          deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
          return { halted: false, fetched };
        }
        const flags = popUint16(memory, state);
        state.writeEflags((snapshot.eflags & ~0xffff) | flags);
      } else state.writeEflags(popUint16(memory, state));
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
      const segment = segmentForPop((fetched.opcode - 0x07) >>> 3);
      if (!segment) throw new UnsupportedOpcodeError("Unsupported POP segment opcode");
      const selector = popUint16(memory, state);
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
        state.loadRealModeSegment(segment, selector);
      else loadProtectedModeSegment(memory, state, segment, selector);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xfa: {
      const snapshot = state.snapshot();
      if (
        addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
        (snapshot.cs.selector & 0x03) !== 0
      ) {
        deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
        return { halted: false, fetched };
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
        deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
        return { halted: false, fetched };
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
      else if (opcode === 0x8a) executeMov8FromModRm(memory, state, false, 2, "cs");
      else if (opcode === 0x3a) executeCompareRegFromModRm(memory, state, 8, 2, "cs");
      else if (opcode === 0x3b) executeCompareRegFromModRm(memory, state, 16, 2, "cs");
      else if (opcode === 0xa0) {
        const offset = fetchCodeUint16(memory, state, 2);
        state.writeRegister8(0, readSegmentUint8(memory, state, "cs", offset));
        state.advanceEip(4);
      } else if (opcode === 0xa2) {
        const offset = fetchCodeUint16(memory, state, 2);
        writeSegmentUint8(memory, state, "cs", offset, state.readRegister8(0));
        state.advanceEip(4);
      } else if (opcode === 0xa5) {
        const source = state.readRegister16(6);
        const destination = state.readRegister16(7);
        const step = state.directionFlag() ? -2 : 2;
        writeSegmentUint16(
          memory,
          state,
          "es",
          destination,
          readSegmentUint16(memory, state, "cs", source)
        );
        state.writeRegister16(6, (source + step) & 0xffff);
        state.writeRegister16(7, (destination + step) & 0xffff);
        state.advanceEip(2);
      } else if (opcode === 0xad) {
        const source = state.readRegister16(6);
        const step = state.directionFlag() ? -2 : 2;
        state.writeRegister16(0, readSegmentUint16(memory, state, "cs", source));
        state.writeRegister16(6, (source + step) & 0xffff);
        state.advanceEip(2);
      } else throw new UnsupportedOpcodeError("Unsupported CS override instruction");
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
      if (opcode === 0x22) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const source = modRm.registerDirect
          ? state.readRegister8(modRm.rm)
          : readSegmentUint8(
              memory,
              state,
              "es",
              decodeModRm16Address(
                modRm,
                (index) => state.readRegister16(index),
                (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
              ).offset
            );
        const result = state.readRegister8(modRm.reg) & source;
        state.writeRegister8(modRm.reg, result);
        state.writeLogicFlags8(result);
        const displacementBytes = modRm.registerDirect
          ? 0
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            ).displacementBytes;
        state.advanceEip(3 + displacementBytes);
        return { halted: false, fetched };
      }
      if (opcode === 0x30) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (modRm.registerDirect) {
          const result = state.readRegister8(modRm.rm) ^ state.readRegister8(modRm.reg);
          state.writeRegister8(modRm.rm, result);
          state.writeLogicFlags8(result);
          state.advanceEip(3);
          return { halted: false, fetched };
        }
        const address = decodeModRm16Address(
          modRm,
          (index) => state.readRegister16(index),
          (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
        );
        const result =
          readSegmentUint8(memory, state, "es", address.offset) ^ state.readRegister8(modRm.reg);
        writeSegmentUint8(memory, state, "es", address.offset, result);
        state.writeLogicFlags8(result);
        state.advanceEip(3 + address.displacementBytes);
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
      if (opcode === 0x98) {
        const value = state.readRegister16(0);
        state.writeRegister(0, value & 0x8000 ? value | 0xffff0000 : value);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode === 0x99) {
        state.writeRegister(2, state.readRegister(0) & 0x80000000 ? 0xffffffff : 0);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode === 0x9c || opcode === 0x9d) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "32-bit flags stack operations require the implemented protected-mode stack path"
          );
        if ((snapshot.cs.selector & 0x03) !== 0) {
          deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
          return { halted: false, fetched };
        }
        if (opcode === 0x9c) pushUint32(memory, state, snapshot.eflags & ~0x00030000);
        else {
          const flags = popUint32(memory, state);
          state.writeEflags((flags & ~0x00030000) | (snapshot.eflags & 0x00030000));
        }
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode === 0x68 || opcode === 0x6a) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "32-bit immediate PUSH requires the implemented protected-mode stack path"
          );
        pushUint32(
          memory,
          state,
          opcode === 0x68
            ? fetchCodeUint32(memory, state, 2)
            : signedByte(fetchCodeByte(memory, state, 2).opcode)
        );
        state.advanceEip(opcode === 0x68 ? 6 : 3);
        return { halted: false, fetched };
      }
      if (opcode === 0xea) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected")
          throw new UnsupportedOpcodeError("32-bit far JMP is only implemented in protected mode");
        const instructionPointer = fetchCodeUint32(memory, state, 2);
        const selector = fetchCodeUint16(memory, state, 6);
        loadProtectedModeCodeSegment(memory, state, selector, instructionPointer);
        return { halted: false, fetched };
      }
      if (opcode === 0xf7) {
        executeDwordF7(memory, state, 2, 16, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      if (opcode === 0x69 || opcode === 0x6b) {
        executeDwordImmediateImul(memory, state, opcode, 2, 16);
        return { halted: false, fetched };
      }
      if (opcode === 0xc7) {
        executeMovImmediateDwordModRm(memory, state, 2, 16);
        return { halted: false, fetched };
      }
      if (opcode === 0x8d) {
        executeLeaDwordModRm(memory, state, 2, 16);
        return { halted: false, fetched };
      }
      if (opcode === 0x81 || opcode === 0x83) {
        executeDwordGroupOneImmediate(memory, state, 2, 16, opcode === 0x81 ? 4 : 1);
        return { halted: false, fetched };
      }
      if (
        opcode === 0x01 ||
        opcode === 0x03 ||
        opcode === 0x09 ||
        opcode === 0x0b ||
        opcode === 0x11 ||
        opcode === 0x13 ||
        opcode === 0x21 ||
        opcode === 0x23 ||
        opcode === 0x19 ||
        opcode === 0x1b ||
        opcode === 0x29 ||
        opcode === 0x2b ||
        opcode === 0x31 ||
        opcode === 0x33 ||
        opcode === 0x39 ||
        opcode === 0x3b ||
        opcode === 0x85
      ) {
        executeDwordAluModRm(
          memory,
          state,
          opcode === 0x01 || opcode === 0x03
            ? "add"
            : opcode === 0x09 || opcode === 0x0b
              ? "or"
              : opcode === 0x11 || opcode === 0x13
                ? "adc"
                : opcode === 0x21 || opcode === 0x23
                  ? "and"
                  : opcode === 0x19 || opcode === 0x1b
                    ? "sbb"
                    : opcode === 0x31 || opcode === 0x33
                      ? "xor"
                      : opcode === 0x39 || opcode === 0x3b
                        ? "cmp"
                        : opcode === 0x85
                          ? "test"
                          : "sub",
          opcode === 0x03 ||
            opcode === 0x0b ||
            opcode === 0x13 ||
            opcode === 0x23 ||
            opcode === 0x1b ||
            opcode === 0x2b ||
            opcode === 0x33 ||
            opcode === 0x3b,
          2,
          16
        );
        return { halted: false, fetched };
      }
      if (opcode === 0x0f) {
        const extension = fetchCodeByte(memory, state, 2).opcode;
        if (extension === 0x01) {
          const modRm = decodeModRm(fetchCodeByte(memory, state, 3).opcode);
          const snapshot = state.snapshot();
          if (
            (modRm.reg === 0x02 || modRm.reg === 0x03 || modRm.reg === 0x06) &&
            addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
            (snapshot.cs.selector & 0x03) !== 0
          ) {
            deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
            return { halted: false, fetched };
          }
          if (!modRm.registerDirect && (modRm.reg === 0x00 || modRm.reg === 0x01)) {
            executeStoreDescriptorTable(memory, state, 3);
            return { halted: false, fetched };
          }
          if (!modRm.registerDirect && (modRm.reg === 0x02 || modRm.reg === 0x03)) {
            const address = decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 2 + offset).opcode
            );
            const limit = readSegmentUint16(memory, state, address.segment, address.offset);
            const base =
              readSegmentUint8(memory, state, address.segment, (address.offset + 2) & 0xffff) |
              (readSegmentUint8(memory, state, address.segment, (address.offset + 3) & 0xffff) <<
                8) |
              (readSegmentUint8(memory, state, address.segment, (address.offset + 4) & 0xffff) <<
                16) |
              (readSegmentUint8(memory, state, address.segment, (address.offset + 5) & 0xffff) <<
                24);
            if (modRm.reg === 0x02) state.writeGdtr(base, limit);
            else state.writeIdtr(base, limit);
            state.advanceEip(4 + address.displacementBytes);
            return { halted: false, fetched };
          }
        }
        if (extension === 0xbc || extension === 0xbd) {
          executeBitScanDwordModRm(memory, state, extension, 3);
          return { halted: false, fetched };
        }
        if (extension === 0xaf) {
          executeDwordImul(memory, state, 3, 16);
          return { halted: false, fetched };
        }
        if (extension === 0xb6 || extension === 0xb7 || extension === 0xbe || extension === 0xbf) {
          executeMovExtendDwordModRm(memory, state, extension, 3, 16);
          return { halted: false, fetched };
        }
        if (extension < 0x80 || extension > 0x8f)
          throw new UnsupportedOpcodeError("Unsupported operand-size-overridden 0F opcode");
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.cs.default32)
          throw new UnsupportedOpcodeError(
            "32-bit near conditional jumps require the implemented protected-mode code path"
          );
        if (shortJumpCondition(state, extension & 0x0f))
          state.writeEip(snapshot.eip + 7 + (fetchCodeUint32(memory, state, 3) | 0));
        else state.advanceEip(7);
        return { halted: false, fetched };
      }
      if (opcode === 0xe9) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.cs.default32)
          throw new UnsupportedOpcodeError(
            "32-bit near jumps require the implemented protected-mode code path"
          );
        state.writeEip(snapshot.eip + 6 + (fetchCodeUint32(memory, state, 2) | 0));
        return { halted: false, fetched };
      }
      if (opcode >= 0x40 && opcode <= 0x47) {
        const register = opcode - 0x40;
        const value = state.readRegister(register);
        state.writeRegister(register, value + 1);
        state.writeIncrementFlags32(value);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode >= 0x48 && opcode <= 0x4f) {
        const register = opcode - 0x48;
        const value = state.readRegister(register);
        state.writeRegister(register, value - 1);
        state.writeDecrementFlags32(value);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode === 0x60 || opcode === 0x61) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "32-bit push-all and pop-all require the implemented protected-mode stack path"
          );
        if (opcode === 0x60) {
          const originalStackPointer = state.readRegister(4);
          for (const register of [0, 1, 2, 3, 4, 5, 6, 7]) {
            pushUint32(
              memory,
              state,
              register === 4 ? originalStackPointer : state.readRegister(register)
            );
          }
        } else {
          for (const register of [7, 6, 5]) state.writeRegister(register, popUint32(memory, state));
          popUint32(memory, state);
          for (const register of [3, 2, 1, 0])
            state.writeRegister(register, popUint32(memory, state));
        }
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if ((opcode >= 0x50 && opcode <= 0x57) || (opcode >= 0x58 && opcode <= 0x5f)) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "32-bit register push and pop require the implemented protected-mode stack path"
          );
        const register = opcode & 0x07;
        if (opcode < 0x58) pushUint32(memory, state, state.readRegister(register));
        else state.writeRegister(register, popUint32(memory, state));
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode === 0xe8 || opcode === 0xc2 || opcode === 0xc3) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected" || !snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "32-bit near transfers require the implemented protected-mode stack path"
          );
        if (opcode === 0xe8) {
          const returnInstructionPointer = (snapshot.eip + 6) >>> 0;
          pushUint32(memory, state, returnInstructionPointer);
          state.writeEip(returnInstructionPointer + (fetchCodeUint32(memory, state, 2) | 0));
        } else {
          const instructionPointer = popUint32(memory, state);
          if (opcode === 0xc2)
            state.writeRegister(4, state.readRegister(4) + fetchCodeUint16(memory, state, 2));
          state.writeEip(instructionPointer);
        }
        return { halted: false, fetched };
      }
      if (opcode === 0x62) {
        executeBound32(memory, state, 2, 16, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      if (opcode === 0x9a) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected")
          throw new UnsupportedOpcodeError("32-bit far CALL is only implemented in protected mode");
        if (!snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "Protected-mode 16-bit far CALL stacks are not implemented"
          );
        const instructionPointer = fetchCodeUint32(memory, state, 2);
        const selector = fetchCodeUint16(memory, state, 6);
        const loaded = resolveProtectedModeCodeSegment(memory, state, selector);
        if ((loaded.selector & 0x03) !== (snapshot.cs.selector & 0x03))
          throw new UnsupportedOpcodeError(
            "Protected-mode far CALL stack switching is not implemented"
          );
        pushUint32(memory, state, snapshot.cs.selector);
        pushUint32(memory, state, snapshot.eip + 8);
        applyProtectedModeCodeSegment(state, loaded, instructionPointer);
        return { halted: false, fetched };
      }
      if (opcode === 0xff) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (modRm.reg === 0x03) executeDwordMemoryFarCall(memory, state, 2);
        else if (modRm.reg === 0x05) executeDwordMemoryFarJump(memory, state, 2);
        else throw new UnsupportedOpcodeError("Unsupported dword FF opcode form");
        return { halted: false, fetched };
      }
      if (opcode === 0xcb || opcode === 0xca) {
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) !== "protected")
          throw new UnsupportedOpcodeError("32-bit far RET is only implemented in protected mode");
        if (!snapshot.ss.default32)
          throw new UnsupportedOpcodeError(
            "Protected-mode 16-bit far RET stacks are not implemented"
          );
        const instructionPointer = popUint32(memory, state);
        const selector = popUint32(memory, state) & 0xffff;
        if ((selector & 0x03) !== (snapshot.cs.selector & 0x03))
          throw new UnsupportedOpcodeError(
            "Protected-mode far RET privilege return is not implemented"
          );
        const stackAdjustment = opcode === 0xca ? fetchCodeUint16(memory, state, 2) : 0;
        if (stackAdjustment) state.writeRegister(4, state.readRegister(4) + stackAdjustment);
        applyProtectedModeCodeSegment(
          state,
          resolveProtectedModeCodeSegment(memory, state, selector),
          instructionPointer
        );
        return { halted: false, fetched };
      }
      if (opcode >= 0xb8 && opcode <= 0xbf) {
        state.writeRegister(opcode - 0xb8, fetchCodeUint32(memory, state, 2));
        state.advanceEip(6);
        return { halted: false, fetched };
      }
      if (opcode === 0x89 || opcode === 0x8b) {
        executeMov32ModRm(memory, state, opcode, 2, 16);
        return { halted: false, fetched };
      }
      if (opcode === 0x67) {
        const overriddenOpcode = fetchCodeByte(memory, state, 2).opcode;
        if (overriddenOpcode === 0xf7) {
          executeDwordF7(memory, state, 3, 32, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        if (overriddenOpcode === 0x69 || overriddenOpcode === 0x6b) {
          executeDwordImmediateImul(memory, state, overriddenOpcode, 3, 32);
          return { halted: false, fetched };
        }
        if (overriddenOpcode === 0xc7) {
          executeMovImmediateDwordModRm(memory, state, 3, 32);
          return { halted: false, fetched };
        }
        if (overriddenOpcode === 0x0f) {
          const extension = fetchCodeByte(memory, state, 3).opcode;
          if (
            extension === 0xb6 ||
            extension === 0xb7 ||
            extension === 0xbe ||
            extension === 0xbf
          ) {
            executeMovExtendDwordModRm(memory, state, extension, 4, 32);
            return { halted: false, fetched };
          }
          if (extension === 0xaf) {
            executeDwordImul(memory, state, 4, 32);
            return { halted: false, fetched };
          }
        }
        if (overriddenOpcode === 0x8d) {
          executeLeaDwordModRm(memory, state, 3, 32);
          return { halted: false, fetched };
        }
        if (overriddenOpcode === 0x81 || overriddenOpcode === 0x83) {
          executeDwordGroupOneImmediate(memory, state, 3, 32, overriddenOpcode === 0x81 ? 4 : 1);
          return { halted: false, fetched };
        }
        if (
          overriddenOpcode === 0x01 ||
          overriddenOpcode === 0x03 ||
          overriddenOpcode === 0x09 ||
          overriddenOpcode === 0x0b ||
          overriddenOpcode === 0x11 ||
          overriddenOpcode === 0x13 ||
          overriddenOpcode === 0x21 ||
          overriddenOpcode === 0x23 ||
          overriddenOpcode === 0x19 ||
          overriddenOpcode === 0x1b ||
          overriddenOpcode === 0x29 ||
          overriddenOpcode === 0x2b ||
          overriddenOpcode === 0x31 ||
          overriddenOpcode === 0x33 ||
          overriddenOpcode === 0x39 ||
          overriddenOpcode === 0x3b ||
          overriddenOpcode === 0x85
        ) {
          executeDwordAluModRm(
            memory,
            state,
            overriddenOpcode === 0x01 || overriddenOpcode === 0x03
              ? "add"
              : overriddenOpcode === 0x09 || overriddenOpcode === 0x0b
                ? "or"
                : overriddenOpcode === 0x11 || overriddenOpcode === 0x13
                  ? "adc"
                  : overriddenOpcode === 0x21 || overriddenOpcode === 0x23
                    ? "and"
                    : overriddenOpcode === 0x19 || overriddenOpcode === 0x1b
                      ? "sbb"
                      : overriddenOpcode === 0x31 || overriddenOpcode === 0x33
                        ? "xor"
                        : overriddenOpcode === 0x39 || overriddenOpcode === 0x3b
                          ? "cmp"
                          : overriddenOpcode === 0x85
                            ? "test"
                            : "sub",
            overriddenOpcode === 0x03 ||
              overriddenOpcode === 0x0b ||
              overriddenOpcode === 0x13 ||
              overriddenOpcode === 0x23 ||
              overriddenOpcode === 0x1b ||
              overriddenOpcode === 0x2b ||
              overriddenOpcode === 0x33 ||
              overriddenOpcode === 0x3b,
            3,
            32
          );
          return { halted: false, fetched };
        }
        if (overriddenOpcode === 0x62) {
          executeBound32(memory, state, 3, 32, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        if (overriddenOpcode !== 0x89 && overriddenOpcode !== 0x8b)
          throw new UnsupportedOpcodeError("Unsupported operand and address-size override");
        executeMov32ModRm(memory, state, overriddenOpcode, 3, 32);
        return { halted: false, fetched };
      }
      const accumulator = state.readRegister(0);
      const immediate = fetchCodeUint32(memory, state, 2);
      const carry = state.carryFlag() ? 1 : 0;
      switch (opcode) {
        case 0x05:
          state.writeRegister(0, accumulator + immediate);
          state.writeAddFlags32(accumulator, immediate);
          break;
        case 0x0d:
          state.writeRegister(0, accumulator | immediate);
          state.writeLogicFlags32(accumulator | immediate);
          break;
        case 0x15:
          state.writeRegister(0, accumulator + immediate + carry);
          state.writeAddFlags32(accumulator, immediate, carry);
          break;
        case 0x1d:
          state.writeRegister(0, accumulator - immediate - carry);
          state.writeCompareFlags32(accumulator, immediate, carry);
          break;
        case 0x25:
          state.writeRegister(0, accumulator & immediate);
          state.writeLogicFlags32(accumulator & immediate);
          break;
        case 0x2d:
          state.writeRegister(0, accumulator - immediate);
          state.writeCompareFlags32(accumulator, immediate);
          break;
        case 0x35:
          state.writeRegister(0, accumulator ^ immediate);
          state.writeLogicFlags32(accumulator ^ immediate);
          break;
        case 0x3d:
          state.writeCompareFlags32(accumulator, immediate);
          break;
        default:
          throw new UnsupportedOpcodeError("Unsupported operand-size override");
      }
      state.advanceEip(6);
      return { halted: false, fetched };
    }
    case 0x67: {
      if (fetchCodeByte(memory, state, 1).opcode !== 0x66)
        throw new UnsupportedOpcodeError("Unsupported address-size override");
      const overriddenOpcode = fetchCodeByte(memory, state, 2).opcode;
      if (overriddenOpcode === 0x62) {
        executeBound32(memory, state, 3, 32, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      if (overriddenOpcode !== 0x89 && overriddenOpcode !== 0x8b)
        throw new UnsupportedOpcodeError("Unsupported address and operand-size override");
      executeMov32ModRm(memory, state, overriddenOpcode, 3, 32);
      return { halted: false, fetched };
    }
    case 0xf3: {
      let opcode = fetchCodeByte(memory, state, 1).opcode;
      let sourceSegment: "cs" | "ds" = "ds";
      let instructionLength = 2;
      if (opcode === 0x2e) {
        opcode = fetchCodeByte(memory, state, 2).opcode;
        sourceSegment = "cs";
        instructionLength = 3;
      }
      if (opcode === 0xa6 || opcode === 0xa7 || opcode === 0xae || opcode === 0xaf) {
        if (instructionLength !== 2)
          throw new UnsupportedOpcodeError("Unsupported REP string prefix");
        executeStringComparison(memory, state, opcode, true);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (opcode !== 0xaa && opcode !== 0xab && opcode !== 0xa4 && opcode !== 0xa5)
        throw new UnsupportedOpcodeError("Unsupported REP instruction");
      const word = opcode === 0xab || opcode === 0xa5;
      const copy = opcode === 0xa4 || opcode === 0xa5;
      let count = state.readRegister16(1);
      let source = state.readRegister16(6);
      let destination = state.readRegister16(7);
      const step = state.directionFlag() ? (word ? -2 : -1) : word ? 2 : 1;
      while (count > 0) {
        if (word) {
          const value = copy
            ? readSegmentUint16(memory, state, sourceSegment, source)
            : state.readRegister16(0);
          writeSegmentUint16(memory, state, "es", destination, value);
        } else {
          const value = copy
            ? readSegmentUint8(memory, state, sourceSegment, source)
            : state.readRegister8(0);
          writeSegmentUint8(memory, state, "es", destination, value);
        }
        if (copy) source = (source + step) & 0xffff;
        destination = (destination + step) & 0xffff;
        count -= 1;
      }
      if (copy) state.writeRegister16(6, source);
      state.writeRegister16(7, destination);
      state.writeRegister16(1, count);
      state.advanceEip(instructionLength);
      return { halted: false, fetched };
    }
    case 0xf2: {
      const opcode = fetchCodeByte(memory, state, 1).opcode;
      if (opcode !== 0xa6 && opcode !== 0xa7 && opcode !== 0xae && opcode !== 0xaf)
        throw new UnsupportedOpcodeError("Unsupported REPNE instruction");
      executeStringComparison(memory, state, opcode, false);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x0f: {
      const extension = fetchCodeByte(memory, state, 1).opcode;
      if (extension === 0x06) {
        const snapshot = state.snapshot();
        if (
          addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
          (snapshot.cs.selector & 0x03) !== 0
        ) {
          deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
          return { halted: false, fetched };
        }
        state.clearTaskSwitchedFlag();
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (extension === 0x0b) {
        deliverCpuFault(memory, state, 6, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      if (extension === 0x00) {
        executeSystemSelectorInstruction(memory, state, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      if (extension === 0xa0 || extension === 0xa8) {
        const segment = extension === 0xa0 ? "fs" : "gs";
        pushUint16(memory, state, state.snapshot()[segment].selector);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (extension === 0xa1 || extension === 0xa9) {
        const segment = extension === 0xa1 ? "fs" : "gs";
        const selector = popUint16(memory, state);
        const snapshot = state.snapshot();
        if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
          state.loadRealModeSegment(segment, selector);
        else loadProtectedModeSegment(memory, state, segment, selector);
        state.advanceEip(2);
        return { halted: false, fetched };
      }
      if (extension === 0xa4 || extension === 0xa5 || extension === 0xac || extension === 0xad) {
        const immediateCount = extension === 0xa4 || extension === 0xac;
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const address = modRm.registerDirect
          ? undefined
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
        const count = immediateCount
          ? fetchCodeByte(memory, state, 3 + (address?.displacementBytes ?? 0)).opcode
          : state.readRegister8(1);
        executeDoubleShiftWord(
          memory,
          state,
          extension === 0xa4 || extension === 0xa5,
          count,
          immediateCount
        );
        return { halted: false, fetched };
      }
      if (extension >= 0x80 && extension <= 0x8f) {
        const displacement = fetchCodeUint16(memory, state, 2);
        if (shortJumpCondition(state, extension & 0x0f))
          state.writeEip16(fetched.instructionPointer + 4 + displacement);
        else state.advanceEip(4);
        return { halted: false, fetched };
      }
      if (extension >= 0x90 && extension <= 0x9f) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const value = shortJumpCondition(state, extension & 0x0f) ? 1 : 0;
        if (modRm.registerDirect) {
          state.writeRegister8(modRm.rm, value);
          state.advanceEip(3);
        } else {
          const address = decodeModRm16Address(
            modRm,
            (index) => state.readRegister16(index),
            (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
          );
          writeSegmentUint8(memory, state, address.segment, address.offset, value);
          state.advanceEip(3 + address.displacementBytes);
        }
        return { halted: false, fetched };
      }
      if (extension === 0xb2 || extension === 0xb4 || extension === 0xb5) {
        executeLoadSegmentPointer(
          memory,
          state,
          extension === 0xb2 ? "ss" : extension === 0xb4 ? "fs" : "gs"
        );
        return { halted: false, fetched };
      }
      if (extension === 0xa3 || extension === 0xab || extension === 0xb3 || extension === 0xbb) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        executeBitTest(memory, state, extension, state.readRegister16(modRm.reg), true, 3);
        return { halted: false, fetched };
      }
      if (extension === 0xba) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        if (modRm.reg < 0x04) throw new UnsupportedOpcodeError("Unsupported 0F BA opcode form");
        const address = modRm.registerDirect
          ? undefined
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
        const immediate = fetchCodeByte(
          memory,
          state,
          3 + (address?.displacementBytes ?? 0)
        ).opcode;
        executeBitTest(
          memory,
          state,
          ([0xa3, 0xab, 0xb3, 0xbb] as const)[modRm.reg - 0x04],
          immediate,
          false,
          4
        );
        return { halted: false, fetched };
      }
      if (extension === 0x20 || extension === 0x22) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const snapshot = state.snapshot();
        if (
          addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
          (snapshot.cs.selector & 0x03) !== 0
        ) {
          deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
          return { halted: false, fetched };
        }
        if (modRm.reg !== 0x00 && modRm.reg !== 0x02 && modRm.reg !== 0x03) {
          throw new UnsupportedOpcodeError("Unsupported control-register MOV form");
        }
        if (extension === 0x20) {
          const value =
            modRm.reg === 0x00 ? snapshot.cr0 : modRm.reg === 0x02 ? snapshot.cr2 : snapshot.cr3;
          state.writeRegister(modRm.rm, value);
        } else if (modRm.reg === 0x00) state.writeCr0(state.readRegister(modRm.rm));
        else if (modRm.reg === 0x02) state.writeCr2(state.readRegister(modRm.rm));
        else state.writeCr3(state.readRegister(modRm.rm));
        state.advanceEip(3);
        return { halted: false, fetched };
      }
      if (extension === 0x01) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const snapshot = state.snapshot();
        if (
          (modRm.reg === 0x02 || modRm.reg === 0x03 || modRm.reg === 0x06) &&
          addressMode(snapshot.cr0, snapshot.eflags) === "protected" &&
          (snapshot.cs.selector & 0x03) !== 0
        ) {
          deliverCpuFault(memory, state, 13, fetched.instructionPointer, 0);
          return { halted: false, fetched };
        }
        if (!modRm.registerDirect && (modRm.reg === 0x00 || modRm.reg === 0x01)) {
          executeStoreDescriptorTable(memory, state, 2);
          return { halted: false, fetched };
        }
        if (modRm.reg === 0x04) {
          const machineStatusWord = state.snapshot().cr0 & 0xffff;
          if (modRm.registerDirect) state.writeRegister16(modRm.rm, machineStatusWord);
          else {
            const address = decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
            writeSegmentUint16(memory, state, address.segment, address.offset, machineStatusWord);
            state.advanceEip(3 + address.displacementBytes);
            return { halted: false, fetched };
          }
          state.advanceEip(3);
          return { halted: false, fetched };
        }
        if (modRm.reg === 0x06) {
          const address = modRm.registerDirect
            ? undefined
            : decodeModRm16Address(
                modRm,
                (index) => state.readRegister16(index),
                (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
              );
          const source = modRm.registerDirect
            ? state.readRegister16(modRm.rm)
            : readSegmentUint16(memory, state, address!.segment, address!.offset);
          state.loadMachineStatusWord(source);
          state.advanceEip(3 + (address?.displacementBytes ?? 0));
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
      if (extension === 0xb6 || extension === 0xb7 || extension === 0xbe || extension === 0xbf) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const byteSource = extension === 0xb6 || extension === 0xbe;
        const signedSource = extension === 0xbe || extension === 0xbf;
        const address = modRm.registerDirect
          ? undefined
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
        const source = byteSource
          ? modRm.registerDirect
            ? state.readRegister8(modRm.rm)
            : readSegmentUint8(memory, state, address!.segment, address!.offset)
          : modRm.registerDirect
            ? state.readRegister16(modRm.rm)
            : readSegmentUint16(memory, state, address!.segment, address!.offset);
        const result = signedSource && byteSource && source & 0x80 ? source | 0xff00 : source;
        state.writeRegister16(modRm.reg, result);
        state.advanceEip(3 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (extension === 0xbc || extension === 0xbd) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const address = modRm.registerDirect
          ? undefined
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
        const source = modRm.registerDirect
          ? state.readRegister16(modRm.rm)
          : readSegmentUint16(memory, state, address!.segment, address!.offset);
        if (source !== 0) {
          let index = extension === 0xbc ? 0 : 15;
          if (extension === 0xbc) while (!(source & (1 << index))) index++;
          else while (!(source & (1 << index))) index--;
          state.writeRegister16(modRm.reg, index);
        }
        state.writeBitScanZeroFlag(source === 0);
        state.advanceEip(3 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (extension === 0xaf) {
        const modRm = decodeModRm(fetchCodeByte(memory, state, 2).opcode);
        const address = modRm.registerDirect
          ? undefined
          : decodeModRm16Address(
              modRm,
              (index) => state.readRegister16(index),
              (offset) => fetchCodeByte(memory, state, 1 + offset).opcode
            );
        const source = modRm.registerDirect
          ? state.readRegister16(modRm.rm)
          : readSegmentUint16(memory, state, address!.segment, address!.offset);
        const destination = state.readRegister16(modRm.reg);
        const product = ((destination << 16) >> 16) * ((source << 16) >> 16);
        state.writeRegister16(modRm.reg, product);
        state.writeSignedMultiplyFlags16(product > 0x7fff || product < -0x8000);
        state.advanceEip(3 + (address?.displacementBytes ?? 0));
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
    case 0xa4:
    case 0xa5:
    case 0xaa:
    case 0xab: {
      const word = fetched.opcode === 0xa5 || fetched.opcode === 0xab;
      const copy = fetched.opcode === 0xa4 || fetched.opcode === 0xa5;
      const step = state.directionFlag() ? (word ? -2 : -1) : word ? 2 : 1;
      const source = state.readRegister16(6);
      const destination = state.readRegister16(7);
      if (word) {
        const value = copy
          ? readSegmentUint16(memory, state, "ds", source)
          : state.readRegister16(0);
        writeSegmentUint16(memory, state, "es", destination, value);
      } else {
        const value = copy ? readSegmentUint8(memory, state, "ds", source) : state.readRegister8(0);
        writeSegmentUint8(memory, state, "es", destination, value);
      }
      if (copy) state.writeRegister16(6, (source + step) & 0xffff);
      state.writeRegister16(7, (destination + step) & 0xffff);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xa6:
    case 0xa7:
    case 0xae:
    case 0xaf:
      executeStringComparison(memory, state, fetched.opcode);
      state.advanceEip(1);
      return { halted: false, fetched };
    case 0xac: {
      const source = state.readRegister16(6);
      state.writeRegister8(0, readSegmentUint8(memory, state, "ds", source));
      state.writeRegister16(6, (source + (state.directionFlag() ? -1 : 1)) & 0xffff);
      state.advanceEip(1);
      return { halted: false, fetched };
    }
    case 0xad: {
      const source = state.readRegister16(6);
      state.writeRegister16(0, readSegmentUint16(memory, state, "ds", source));
      state.writeRegister16(6, (source + (state.directionFlag() ? -2 : 2)) & 0xffff);
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
    case 0x20: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = destination & state.readRegister8(modRm.reg);
      if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
      else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x22: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = state.readRegister8(modRm.reg) & source;
      state.writeRegister8(modRm.reg, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x23: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = state.readRegister16(modRm.reg) & source;
      state.writeRegister16(modRm.reg, result);
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
      executeByteAluModRm(memory, state, "add", false);
      return { halted: false, fetched };
    case 0x01:
      executeWordAluModRm(memory, state, "add", false);
      return { halted: false, fetched };
    case 0x02:
      executeByteAluModRm(memory, state, "add", true);
      return { halted: false, fetched };
    case 0x03:
      executeWordAluModRm(memory, state, "add", true);
      return { halted: false, fetched };
    case 0x04: {
      const accumulator = state.readRegister8(0);
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, accumulator + immediate);
      state.writeAddFlags8(accumulator, immediate);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
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
    case 0x15: {
      const accumulator = state.readRegister16(0);
      const immediate = fetchCodeUint16(memory, state, 1);
      const carry = state.carryFlag() ? 1 : 0;
      state.writeRegister16(0, accumulator + immediate + carry);
      state.writeAddFlags16(accumulator, immediate, carry);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x10:
      executeByteAluModRm(memory, state, "adc", false);
      return { halted: false, fetched };
    case 0x12:
      executeByteAluModRm(memory, state, "adc", true);
      return { halted: false, fetched };
    case 0x18:
      executeByteAluModRm(memory, state, "sbb", false);
      return { halted: false, fetched };
    case 0x1a:
      executeByteAluModRm(memory, state, "sbb", true);
      return { halted: false, fetched };
    case 0x14: {
      const accumulator = state.readRegister8(0);
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      const carry = state.carryFlag() ? 1 : 0;
      state.writeRegister8(0, accumulator + immediate + carry);
      state.writeAddFlags8(accumulator, immediate, carry);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x13: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const destination = state.readRegister16(modRm.reg);
      const carry = state.carryFlag() ? 1 : 0;
      state.writeRegister16(modRm.reg, destination + source + carry);
      state.writeAddFlags16(destination, source, carry);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x11: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const source = state.readRegister16(modRm.reg);
      const carry = state.carryFlag() ? 1 : 0;
      const result = destination + source + carry;
      if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
      else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
      state.writeAddFlags16(destination, source, carry);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x1c: {
      const accumulator = state.readRegister8(0);
      const immediate = fetchCodeByte(memory, state, 1).opcode;
      const borrow = state.carryFlag() ? 1 : 0;
      state.writeRegister8(0, accumulator - immediate - borrow);
      state.writeCompareFlags8(accumulator, immediate, borrow);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x1d: {
      const accumulator = state.readRegister16(0);
      const immediate = fetchCodeUint16(memory, state, 1);
      const borrow = state.carryFlag() ? 1 : 0;
      state.writeRegister16(0, accumulator - immediate - borrow);
      state.writeCompareFlags16(accumulator, immediate, borrow);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x2a:
      executeByteAluModRm(memory, state, "sub", true);
      return { halted: false, fetched };
    case 0x28:
      executeByteAluModRm(memory, state, "sub", false);
      return { halted: false, fetched };
    case 0x29:
      executeWordAluModRm(memory, state, "sub", false);
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
    case 0x1b: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const destination = state.readRegister16(modRm.reg);
      const borrow = state.carryFlag() ? 1 : 0;
      state.writeRegister16(modRm.reg, destination - source - borrow);
      state.writeCompareFlags16(destination, source, borrow);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x19: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const source = state.readRegister16(modRm.reg);
      const borrow = state.carryFlag() ? 1 : 0;
      const result = destination - source - borrow;
      if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
      else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
      state.writeCompareFlags16(destination, source, borrow);
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
    case 0x39: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const left = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      state.writeCompareFlags16(left, state.readRegister16(modRm.reg));
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x3a:
      executeCompareRegFromModRm(memory, state, 8);
      return { halted: false, fetched };
    case 0x3b:
      executeCompareRegFromModRm(memory, state, 16);
      return { halted: false, fetched };
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
    case 0x30: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = destination ^ state.readRegister8(modRm.reg);
      if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
      else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x31: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const destination = modRm.registerDirect
        ? state.readRegister16(modRm.rm)
        : readSegmentUint16(memory, state, address!.segment, address!.offset);
      const result = destination ^ state.readRegister16(modRm.reg);
      if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
      else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
      state.writeLogicFlags16(result);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0x34: {
      const result = state.readRegister8(0) ^ fetchCodeByte(memory, state, 1).opcode;
      state.writeRegister8(0, result);
      state.writeLogicFlags8(result);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0x35: {
      const result = state.readRegister16(0) ^ fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, result);
      state.writeLogicFlags16(result);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x80: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (
        modRm.reg !== 0x00 &&
        modRm.reg !== 0x02 &&
        modRm.reg !== 0x03 &&
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
      if (modRm.reg === 0x00 || modRm.reg === 0x02 || modRm.reg === 0x03) {
        const carry = modRm.reg === 0x02 && state.carryFlag() ? 1 : 0;
        const borrow = modRm.reg === 0x03 && state.carryFlag() ? 1 : 0;
        const result =
          modRm.reg === 0x03 ? destination - immediate - borrow : destination + immediate + carry;
        if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
        else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
        if (modRm.reg === 0x03) state.writeCompareFlags8(destination, immediate, borrow);
        else state.writeAddFlags8(destination, immediate, carry);
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
      if (modRm.reg !== 0x00 && modRm.reg !== 0x02 && modRm.reg !== 0x05 && modRm.reg !== 0x07)
        throw new UnsupportedOpcodeError("Unsupported 83 opcode form");
      const immediate = signedByte(fetchCodeByte(memory, state, 2).opcode) & 0xffff;
      if (modRm.registerDirect) {
        const destination = state.readRegister16(modRm.rm);
        if (modRm.reg === 0x00) {
          state.writeRegister16(modRm.rm, destination + immediate);
          state.writeAddFlags16(destination, immediate);
        } else if (modRm.reg === 0x02) {
          const carry = state.carryFlag() ? 1 : 0;
          state.writeRegister16(modRm.rm, destination + immediate + carry);
          state.writeAddFlags16(destination, immediate, carry);
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
      } else if (modRm.reg === 0x02) {
        const carry = state.carryFlag() ? 1 : 0;
        writeSegmentUint16(
          memory,
          state,
          address.segment,
          address.offset,
          destination + memoryImmediate + carry
        );
        state.writeAddFlags16(destination, memoryImmediate, carry);
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
      if (
        !modRm.registerDirect ||
        (modRm.reg !== 0x02 && modRm.reg !== 0x03 && modRm.reg !== 0x04 && modRm.reg !== 0x07)
      )
        throw new UnsupportedOpcodeError("Unsupported D0 opcode form");
      const source = state.readRegister8(modRm.rm);
      const result =
        modRm.reg === 0x02
          ? ((source << 1) | (state.carryFlag() ? 1 : 0)) & 0xff
          : modRm.reg === 0x03
            ? ((source >>> 1) | (state.carryFlag() ? 0x80 : 0)) & 0xff
            : modRm.reg === 0x04
              ? (source << 1) & 0xff
              : ((source >> 1) | (source & 0x80)) & 0xff;
      state.writeRegister8(modRm.rm, result);
      if (modRm.reg === 0x02) state.writeRotateFlags8(result, Boolean(source & 0x80));
      else if (modRm.reg === 0x03) state.writeRotateFlags8(result, Boolean(source & 0x01));
      else if (modRm.reg === 0x04) state.writeShiftLeftFlags8(source);
      else state.writeArithmeticShiftRightFlags8(source);
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xd1:
      executeShiftWord(memory, state, 1);
      return { halted: false, fetched };
    case 0xd2: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect || modRm.reg !== 0x00)
        throw new UnsupportedOpcodeError("Unsupported D2 opcode form");
      const source = state.readRegister8(modRm.rm);
      const count = state.readRegister8(1) & 0x1f;
      if (count) {
        const rotation = count & 0x07;
        const carry = rotation ? Boolean(source & (1 << (8 - rotation))) : Boolean(source & 0x01);
        const result = rotation
          ? ((source << rotation) | (source >>> (8 - rotation))) & 0xff
          : source;
        state.writeRegister8(modRm.rm, result);
        state.writeRotateFlags8(result, carry);
      }
      state.advanceEip(2);
      return { halted: false, fetched };
    }
    case 0xd3: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (!modRm.registerDirect || modRm.reg !== 0x00)
        throw new UnsupportedOpcodeError("Unsupported D3 opcode form");
      const source = state.readRegister16(modRm.rm);
      const count = state.readRegister8(1) & 0x1f;
      if (count) {
        const rotation = count & 0x0f;
        const carry = rotation ? Boolean(source & (1 << (16 - rotation))) : Boolean(source & 0x01);
        const result = rotation
          ? ((source << rotation) | (source >>> (16 - rotation))) & 0xffff
          : source;
        state.writeRegister16(modRm.rm, result);
        state.writeRotateFlags16(result, carry);
      }
      state.advanceEip(2);
      return { halted: false, fetched };
    }
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
      if (
        modRm.reg !== 0x00 &&
        modRm.reg !== 0x02 &&
        modRm.reg !== 0x03 &&
        modRm.reg !== 0x04 &&
        modRm.reg !== 0x05 &&
        modRm.reg !== 0x06 &&
        modRm.reg !== 0x07
      )
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
      if (modRm.reg === 0x02 || modRm.reg === 0x03) {
        const result = modRm.reg === 0x02 ? ~operand : -operand;
        if (modRm.registerDirect) state.writeRegister16(modRm.rm, result);
        else writeSegmentUint16(memory, state, address!.segment, address!.offset, result);
        if (modRm.reg === 0x03) state.writeCompareFlags16(0, operand);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
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
      if (modRm.reg === 0x05) {
        const product =
          BigInt.asIntN(16, BigInt(state.readRegister16(0))) * BigInt.asIntN(16, BigInt(operand));
        state.writeRegister16(0, Number(BigInt.asUintN(16, product)));
        state.writeRegister16(2, Number(BigInt.asUintN(16, product >> 16n)));
        state.writeSignedMultiplyFlags16(product < -0x8000n || product > 0x7fffn);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x07) {
        const divisor = BigInt.asIntN(16, BigInt(operand));
        const dividend = BigInt.asIntN(
          32,
          (BigInt(state.readRegister16(2)) << 16n) | BigInt(state.readRegister16(0))
        );
        if (divisor === 0n) {
          deliverCpuFault(memory, state, 0, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        const quotient = dividend / divisor;
        if (quotient < -0x8000n || quotient > 0x7fffn) {
          deliverCpuFault(memory, state, 0, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        state.writeRegister16(0, Number(BigInt.asUintN(16, quotient)));
        state.writeRegister16(2, Number(BigInt.asUintN(16, dividend % divisor)));
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      const divisor = operand;
      const dividend = ((state.readRegister16(2) << 16) | state.readRegister16(0)) >>> 0;
      const quotient = Math.floor(dividend / divisor);
      if (divisor === 0 || quotient > 0xffff) {
        deliverCpuFault(memory, state, 0, fetched.instructionPointer);
        return { halted: false, fetched };
      }
      state.writeRegister16(0, quotient);
      state.writeRegister16(2, dividend % divisor);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0xf6: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (
        modRm.reg !== 0x00 &&
        modRm.reg !== 0x02 &&
        modRm.reg !== 0x03 &&
        modRm.reg !== 0x04 &&
        modRm.reg !== 0x05 &&
        modRm.reg !== 0x06 &&
        modRm.reg !== 0x07
      )
        throw new UnsupportedOpcodeError("Unsupported F6 opcode form");
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const operand = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      if (modRm.reg === 0x02 || modRm.reg === 0x03) {
        const result = modRm.reg === 0x02 ? ~operand : -operand;
        if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
        else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
        if (modRm.reg === 0x03) state.writeCompareFlags8(0, operand);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x04) {
        const product = state.readRegister8(0) * operand;
        state.writeRegister16(0, product);
        state.writeMultiplyFlags16(product >>> 8);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x05) {
        const product =
          BigInt.asIntN(8, BigInt(state.readRegister8(0))) * BigInt.asIntN(8, BigInt(operand));
        state.writeRegister16(0, Number(BigInt.asUintN(16, product)));
        state.writeSignedMultiplyFlags16(product < -0x80n || product > 0x7fn);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x06) {
        const divisor = operand;
        const dividend = state.readRegister16(0);
        const quotient = Math.floor(dividend / divisor);
        if (divisor === 0 || quotient > 0xff) {
          deliverCpuFault(memory, state, 0, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        state.writeRegister8(0, quotient);
        state.writeRegister8(4, dividend % divisor);
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      if (modRm.reg === 0x07) {
        const divisor = BigInt.asIntN(8, BigInt(operand));
        const dividend = BigInt.asIntN(16, BigInt(state.readRegister16(0)));
        if (divisor === 0n) {
          deliverCpuFault(memory, state, 0, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        const quotient = dividend / divisor;
        if (quotient < -0x80n || quotient > 0x7fn) {
          deliverCpuFault(memory, state, 0, fetched.instructionPointer);
          return { halted: false, fetched };
        }
        state.writeRegister8(0, Number(BigInt.asUintN(8, quotient)));
        state.writeRegister8(4, Number(BigInt.asUintN(8, dividend % divisor)));
        state.advanceEip(2 + (address?.displacementBytes ?? 0));
        return { halted: false, fetched };
      }
      const immediate = fetchCodeByte(memory, state, 2 + (address?.displacementBytes ?? 0)).opcode;
      state.writeLogicFlags8(operand & immediate);
      state.advanceEip(3 + (address?.displacementBytes ?? 0));
      return { halted: false, fetched };
    }
    case 0xfe: {
      const modRm = decodeModRm(fetchCodeByte(memory, state, 1).opcode);
      if (modRm.reg !== 0x00 && modRm.reg !== 0x01)
        throw new UnsupportedOpcodeError("Unsupported FE opcode form");
      const address = modRm.registerDirect ? undefined : decodeMemoryAddress(memory, state, modRm);
      const source = modRm.registerDirect
        ? state.readRegister8(modRm.rm)
        : readSegmentUint8(memory, state, address!.segment, address!.offset);
      const result = modRm.reg === 0x00 ? source + 1 : source - 1;
      if (modRm.registerDirect) state.writeRegister8(modRm.rm, result);
      else writeSegmentUint8(memory, state, address!.segment, address!.offset, result);
      if (modRm.reg === 0x00) state.writeIncrementFlags8(source);
      else state.writeDecrementFlags8(source);
      state.advanceEip(2 + (address?.displacementBytes ?? 0));
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
      const stackAdjustment = fetched.opcode === 0xca ? fetchCodeUint16(memory, state, 1) : 0;
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
        const instructionPointer = popUint16(memory, state);
        const selector = popUint16(memory, state);
        if (stackAdjustment) state.writeRegister16(4, state.readRegister16(4) + stackAdjustment);
        state.loadRealModeCodeSegment(selector, instructionPointer);
      } else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected") {
        const stackPointer = state.readRegister16(4);
        const selector = readSegmentUint16(memory, state, "ss", (stackPointer + 2) & 0xffff);
        if ((selector & 0x03) !== (snapshot.cs.selector & 0x03))
          throw new UnsupportedOpcodeError(
            "Protected-mode far RET privilege return is not implemented"
          );
        const loaded = resolveProtectedModeCodeSegment(memory, state, selector);
        const instructionPointer = popUint16(memory, state);
        popUint16(memory, state);
        if (stackAdjustment) state.writeRegister16(4, state.readRegister16(4) + stackAdjustment);
        applyProtectedModeCodeSegment(state, loaded, instructionPointer);
      } else {
        throw new UnsupportedOpcodeError("Virtual-8086 far RET is not implemented");
      }
      return { halted: false, fetched };
    }
    case 0xcd: {
      const snapshot = state.snapshot();
      const vector = fetchCodeByte(memory, state, 1).opcode;
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
        deliverRealModeInterrupt(memory, state, vector, fetched.instructionPointer + 2);
      else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected")
        deliverProtectedModeInterrupt(memory, state, vector, fetched.instructionPointer + 2, true);
      else throw new UnsupportedOpcodeError("Virtual-8086 INT is not implemented");
      return { halted: false, fetched };
    }
    case 0xcc: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
        deliverRealModeInterrupt(memory, state, 3, fetched.instructionPointer + 1);
      else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected")
        deliverProtectedModeInterrupt(memory, state, 3, fetched.instructionPointer + 1, true);
      else throw new UnsupportedOpcodeError("Virtual-8086 INT3 is not implemented");
      return { halted: false, fetched };
    }
    case 0xce: {
      const snapshot = state.snapshot();
      if (!state.overflowFlag()) {
        state.advanceEip(1);
        return { halted: false, fetched };
      }
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real")
        deliverRealModeInterrupt(memory, state, 4, fetched.instructionPointer + 1);
      else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected")
        deliverProtectedModeInterrupt(memory, state, 4, fetched.instructionPointer + 1, true);
      else throw new UnsupportedOpcodeError("Virtual-8086 INTO is not implemented");
      return { halted: false, fetched };
    }
    case 0xcf: {
      const snapshot = state.snapshot();
      if (addressMode(snapshot.cr0, snapshot.eflags) === "real") {
        const instructionPointer = popUint16(memory, state);
        const selector = popUint16(memory, state);
        const flags = popUint16(memory, state);
        state.writeEflags(flags);
        state.loadRealModeCodeSegment(selector, instructionPointer);
      } else if (addressMode(snapshot.cr0, snapshot.eflags) === "protected") {
        const instructionPointer = snapshot.ss.default32
          ? popUint32(memory, state)
          : popUint16(memory, state);
        const selector =
          (snapshot.ss.default32 ? popUint32(memory, state) : popUint16(memory, state)) & 0xffff;
        const flags = snapshot.ss.default32 ? popUint32(memory, state) : popUint16(memory, state);
        const currentPrivilege = snapshot.cs.selector & 0x03;
        const returnPrivilege = selector & 0x03;
        if (returnPrivilege < currentPrivilege)
          throw new UnsupportedOpcodeError("Protected-mode IRET cannot return to higher privilege");
        if (returnPrivilege === currentPrivilege) {
          state.writeEflags(flags);
          loadProtectedModeCodeSegment(memory, state, selector, instructionPointer);
        } else {
          if (!snapshot.ss.default32)
            throw new UnsupportedOpcodeError(
              "16-bit protected-mode privilege return is not implemented"
            );
          const descriptorMemory = {
            readUint32: (address: number) =>
              (memory.readUint8(address) & 0xff) |
              ((memory.readUint8((address + 1) >>> 0) & 0xff) << 8) |
              ((memory.readUint8((address + 2) >>> 0) & 0xff) << 16) |
              ((memory.readUint8((address + 3) >>> 0) & 0xff) << 24)
          };
          const codeDescriptor = loadDescriptor(descriptorMemory, snapshot.gdtr, selector);
          if (
            !codeDescriptor.system ||
            !(codeDescriptor.type & 0x08) ||
            Boolean(codeDescriptor.type & 0x04) ||
            !codeDescriptor.present ||
            codeDescriptor.dpl !== returnPrivilege
          )
            throw new UnsupportedOpcodeError(
              "Protected-mode IRET return selector is not a valid code segment"
            );
          const stackPointer = popUint32(memory, state);
          const stackSelector = popUint32(memory, state) & 0xffff;
          const stackDescriptor = loadDescriptor(descriptorMemory, snapshot.gdtr, stackSelector);
          if (
            !stackDescriptor.system ||
            Boolean(stackDescriptor.type & 0x08) ||
            !(stackDescriptor.type & 0x02) ||
            !stackDescriptor.present ||
            stackDescriptor.dpl !== returnPrivilege ||
            (stackSelector & 0x03) !== returnPrivilege ||
            !stackDescriptor.default32
          )
            throw new UnsupportedOpcodeError(
              "Protected-mode IRET return selector is not a valid stack segment"
            );
          state.writeEflags(flags);
          state.loadProtectedModeCodeSegment(
            selector,
            codeDescriptor.base,
            codeDescriptor.limit,
            instructionPointer,
            codeDescriptor.default32
          );
          state.loadProtectedModeSegment(
            "ss",
            stackSelector,
            stackDescriptor.base,
            stackDescriptor.limit,
            true
          );
          state.writeRegister(4, stackPointer);
        }
      } else throw new UnsupportedOpcodeError("Virtual-8086 IRET is not implemented");
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
    case 0xe0:
    case 0xe1:
    case 0xe2: {
      const displacement = signedByte(fetchCodeByte(memory, state, 1).opcode);
      const count = (state.readRegister16(1) - 1) & 0xffff;
      state.writeRegister16(1, count);
      const continueLoop =
        fetched.opcode === 0xe0
          ? !state.zeroFlag()
          : fetched.opcode === 0xe1
            ? state.zeroFlag()
            : true;
      if (count === 0 || !continueLoop) state.advanceEip(2);
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
    case 0xa9: {
      const immediate = fetchCodeUint16(memory, state, 1);
      state.writeLogicFlags16(state.readRegister16(0) & immediate);
      state.advanceEip(3);
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
    case 0x25: {
      const result = state.readRegister16(0) & fetchCodeUint16(memory, state, 1);
      state.writeRegister16(0, result);
      state.writeLogicFlags16(result);
      state.advanceEip(3);
      return { halted: false, fetched };
    }
    case 0x3c:
      state.writeCompareFlags8(state.readRegister8(0), fetchCodeByte(memory, state, 1).opcode);
      state.advanceEip(2);
      return { halted: false, fetched };
    case 0x3d:
      state.writeCompareFlags16(state.readRegister16(0), fetchCodeUint16(memory, state, 1));
      state.advanceEip(3);
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
