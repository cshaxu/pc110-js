import type { RebuiltExecutionContext } from "../execution.js";
import { normalizePort, type PortWidth } from "../io/port-bus.js";
import { assertIoPermission } from "../protection/io-permission.js";
import type { SegmentName } from "../state/segments.js";

const EFLAGS_DIRECTION = 0x00000400;

export function executeStringIo(context: RebuiltExecutionContext): void {
  if (!context.io) throw new Error("Rebuilt I/O bus is unavailable");
  const opcode = context.instruction.opcode;
  const input = opcode === 0x6c || opcode === 0x6d;
  const width: PortWidth =
    opcode === 0x6c || opcode === 0x6e ? 8 : context.instruction.prefixes.operandSize;
  const addressSize = context.instruction.prefixes.addressSize;
  const repeated = context.instruction.prefixes.repeat !== undefined;
  if (repeated && readCounter(context, addressSize) === 0)
    return context.state.advanceEip(context.instruction.length);
  const index = input ? 7 : 6;
  const offset = readIndex(context, index, addressSize);
  const port = normalizePort(context.state.registers.read16(2));
  assertIoPermission(context.memory, context.state, port, width);
  if (input) writeMemory(context, "es", offset, addressSize, width, context.io.read(port, width));
  else
    readMemory(
      context,
      context.instruction.prefixes.segmentOverride ?? "ds",
      offset,
      addressSize,
      width,
      context.io.write.bind(context.io, port)
    );
  writeIndex(
    context,
    index,
    addressSize,
    offset + (context.state.flags.read() & EFLAGS_DIRECTION ? -width / 8 : width / 8)
  );
  if (repeated) {
    const next = (readCounter(context, addressSize) - 1) >>> 0;
    writeCounter(context, addressSize, next);
    if (next !== 0) return;
  }
  context.state.advanceEip(context.instruction.length);
}

function readCounter(c: RebuiltExecutionContext, size: 16 | 32) {
  return size === 16 ? c.state.registers.read16(1) : c.state.registers.read32(1);
}
function writeCounter(c: RebuiltExecutionContext, size: 16 | 32, value: number) {
  if (size === 16) c.state.registers.write16(1, value);
  else c.state.registers.write32(1, value);
}
function readIndex(c: RebuiltExecutionContext, i: number, size: 16 | 32) {
  return size === 16 ? c.state.registers.read16(i) : c.state.registers.read32(i);
}
function writeIndex(c: RebuiltExecutionContext, i: number, size: 16 | 32, value: number) {
  if (size === 16) c.state.registers.write16(i, value);
  else c.state.registers.write32(i, value);
}
function writeMemory(
  c: RebuiltExecutionContext,
  s: SegmentName,
  o: number,
  a: 16 | 32,
  w: PortWidth,
  v: number
) {
  if (w === 8) c.memory.write8(s, o, v, a);
  else if (w === 16) c.memory.write16(s, o, v, a);
  else c.memory.write32(s, o, v, a);
}
function readMemory(
  c: RebuiltExecutionContext,
  s: SegmentName,
  o: number,
  a: 16 | 32,
  w: PortWidth,
  write: (value: number, width: PortWidth) => void
) {
  const v =
    w === 8
      ? c.memory.read8(s, o, a)
      : w === 16
        ? c.memory.read16(s, o, a)
        : c.memory.read32(s, o, a);
  write(v, w);
}
