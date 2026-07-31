import { describe, expect, it } from "vitest";
import { compareLockstepCpu, type PcjsLockstepSnapshot } from "./lockstep-coordinator.js";
import type { NativeLockstepSnapshot } from "./native-lockstep-adapter.js";

function snapshots(): { native: NativeLockstepSnapshot; pcjs: PcjsLockstepSnapshot } {
  const registers = { eax: 1, ecx: 2, edx: 3, ebx: 4, esp: 5, ebp: 6, esi: 7, edi: 8 };
  const segment = { selector: 0, base: 0, limit: 0xffff, default32: false };
  const segments = { cs: segment, ds: segment, es: segment, ss: segment, fs: segment, gs: segment };
  return {
    native: {
      version: 1,
      virtualCycles: "0",
      cpu: {
        registers,
        eip: 0,
        eflags: 2,
        halted: false,
        cr0: 0x10,
        cr2: 0,
        cr3: 0,
        debug: [],
        test: [],
        gdtr: { base: 0, limit: 0 },
        idtr: { base: 0, limit: 0x3ff },
        ldtr: { selector: 0, base: 0, limit: 0, default32: false },
        tr: { selector: 0, base: 0, limit: 0, default32: false },
        segments: {
          cs: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          },
          ds: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          },
          es: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          },
          ss: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          },
          fs: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          },
          gs: {
            ...segment,
            valid: true,
            dpl: undefined,
            executable: false,
            readable: false,
            writable: false,
            expandDown: false
          }
        }
      }
    },
    pcjs: {
      version: 2,
      cycles: 0,
      paused: true,
      cpu: { registers, eip: 0, eflags: 2, cr0: 0x10, cr2: 0, cr3: 0, segments }
    }
  };
}

describe("controlled lockstep comparator", () => {
  it("accepts equal established architectural fields", () => {
    const { native, pcjs } = snapshots();
    expect(compareLockstepCpu(native, pcjs)).toEqual({ equal: true, difference: undefined });
  });

  it("reports the first architectural difference deterministically", () => {
    const { native, pcjs } = snapshots();
    const changed = { ...pcjs, cpu: { ...pcjs.cpu, registers: { ...pcjs.cpu.registers, ecx: 9 } } };
    expect(compareLockstepCpu(native, changed)).toEqual({
      equal: false,
      difference: { path: "cpu.registers.ecx", native: 2, pcjs: 9 }
    });
  });
});
