import type { RebuiltMemoryBus } from "../memory/segmented-memory.js";
import type { DescriptorTable } from "../state/cpu-state.js";

export interface InterruptGateDescriptor {
  readonly vector: number;
  readonly selector: number;
  readonly offset: number;
  readonly dpl: number;
  readonly present: boolean;
  readonly operandSize: 16 | 32;
  readonly trap: boolean;
}

export class InterruptGateLookupError extends Error {}

export function readInterruptGate(
  memory: RebuiltMemoryBus,
  idtr: DescriptorTable,
  vector: number
): InterruptGateDescriptor {
  const normalizedVector = vector & 0xff;
  const entryOffset = normalizedVector << 3;
  if (entryOffset + 7 > idtr.limit)
    throw new InterruptGateLookupError("Interrupt vector exceeds descriptor table limit");
  const address = (idtr.base + entryOffset) >>> 0;
  const low = read32(memory, address);
  const high = read32(memory, address + 4);
  const access = (high >>> 8) & 0xff;
  const type = access & 0x0f;
  // TODO(High): Match NXVM's explicit TODO boundary for IDT task gates and
  // the task-switch state transition they require.
  if (access & 0x10 || ![0x06, 0x07, 0x0e, 0x0f].includes(type))
    throw new InterruptGateLookupError("IDT entry is not an interrupt or trap gate");
  return {
    vector: normalizedVector,
    selector: (low >>> 16) & 0xffff,
    offset: ((low & 0xffff) | (high & 0xffff0000)) >>> 0,
    dpl: (access >>> 5) & 3,
    present: Boolean(access & 0x80),
    operandSize: type === 0x06 || type === 0x07 ? 16 : 32,
    trap: type === 0x07 || type === 0x0f
  };
}

function read32(memory: RebuiltMemoryBus, address: number): number {
  return (
    (memory.readUint8(address) |
      (memory.readUint8(address + 1) << 8) |
      (memory.readUint8(address + 2) << 16) |
      (memory.readUint8(address + 3) << 24)) >>>
    0
  );
}
