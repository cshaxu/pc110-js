import { describe, expect, it } from "vitest";
import { SegmentedMemory } from "../memory/segmented-memory.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { assertIoPermission, RebuiltIoPermissionError } from "./io-permission.js";

function machine() {
  const state = new RebuiltCpuState();
  state.writeCr0(1);
  state.writeSegment("cs", {
    selector: 0x1b,
    base: 0,
    limit: 0xffff_ffff,
    default32: true,
    dpl: 3
  });
  const bytes = new Map<number, number>();
  const memory = new SegmentedMemory(
    {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    },
    state
  );
  return { state, bytes, memory };
}

function installIoBitmap(
  result: ReturnType<typeof machine>,
  bitmapOffset: number,
  limit = bitmapOffset + 0x2000
): void {
  result.state.writeTr({ selector: 0x28, base: 0x400, limit, default32: true, type: 11 });
  result.bytes.set(0x466, bitmapOffset & 0xff);
  result.bytes.set(0x467, bitmapOffset >>> 8);
}

describe("rebuilt protected I/O admission", () => {
  it("allows protected I/O when CPL does not exceed IOPL without a TSS", () => {
    const result = machine();
    result.state.flags.write(0x00003002);
    expect(() => assertIoPermission(result.memory, result.state, 0x80, 8)).not.toThrow();
  });

  it("uses every requested port bit in a 32-bit TSS I/O bitmap", () => {
    const allowed = machine();
    installIoBitmap(allowed, 0x68);
    expect(() => assertIoPermission(allowed.memory, allowed.state, 0x80, 32)).not.toThrow();

    const denied = machine();
    installIoBitmap(denied, 0x68);
    denied.bytes.set(0x400 + 0x68 + (0x81 >>> 3), 1 << (0x81 & 7));
    expect(() => assertIoPermission(denied.memory, denied.state, 0x80, 32)).toThrow(
      RebuiltIoPermissionError
    );
  });

  it("denies insufficient TSS layouts and treats virtual-8086 IOPL three as unrestricted", () => {
    const missing = machine();
    expect(() => assertIoPermission(missing.memory, missing.state, 0x80, 8)).toThrow(
      RebuiltIoPermissionError
    );

    const tss16 = machine();
    tss16.state.writeTr({ selector: 0x28, base: 0x400, limit: 0x2b, default32: false, type: 3 });
    expect(() => assertIoPermission(tss16.memory, tss16.state, 0x80, 8)).toThrow(
      RebuiltIoPermissionError
    );

    const virtual8086 = machine();
    virtual8086.state.flags.write(0x00023002);
    expect(() => assertIoPermission(virtual8086.memory, virtual8086.state, 0x80, 8)).not.toThrow();
  });

  it("uses the virtual-8086 bitmap path below IOPL three and rejects truncated maps", () => {
    const virtual8086 = machine();
    virtual8086.state.flags.write(0x00020002);
    installIoBitmap(virtual8086, 0x68);
    expect(() => assertIoPermission(virtual8086.memory, virtual8086.state, 0x80, 16)).not.toThrow();
    virtual8086.bytes.set(0x400 + 0x68 + (0x80 >>> 3), 1);
    expect(() => assertIoPermission(virtual8086.memory, virtual8086.state, 0x80, 16)).toThrow(
      RebuiltIoPermissionError
    );

    const truncated = machine();
    installIoBitmap(truncated, 0x68, 0x68);
    expect(() => assertIoPermission(truncated.memory, truncated.state, 0x80, 8)).toThrow(
      RebuiltIoPermissionError
    );
  });
});
