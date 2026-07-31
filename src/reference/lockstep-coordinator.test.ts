import { describe, expect, it } from "vitest";
import {
  compareLockstepCpu,
  stepControlledLockstep,
  type PcjsLockstepSnapshot
} from "./lockstep-coordinator.js";
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
      },
      devices: {
        pic: {
          master: { mask: 0xff, request: 0, inService: 0 },
          slave: { mask: 0xff, request: 0, inService: 0 }
        },
        pit: [
          { reload: 0, count: 0, output: false },
          { reload: 0, count: 0, output: false },
          { reload: 0, count: 0, output: false }
        ],
        dma: Array.from({ length: 8 }, () => ({ masked: true, requested: false })),
        keyboardController: {
          status: 0x10,
          commandByte: 0x10,
          outputBuffer: undefined,
          outputDataLatch: 0
        },
        rtc: { address: 0, statusA: 0x26, statusB: 2, statusC: 0, statusD: 0x80 }
      }
    },
    pcjs: {
      version: 2,
      cycles: 0,
      paused: true,
      cpu: { registers, eip: 0, eflags: 2, cr0: 0x10, cr2: 0, cr3: 0, segments },
      devices: {
        pic: [
          { mask: 0xff, request: 0, inService: 0 },
          { mask: 0xff, request: 0, inService: 0 }
        ],
        pit: [
          { reload: 0, count: 0, output: false },
          { reload: 0, count: 0, output: false },
          { reload: 0, count: 0, output: false }
        ],
        dma: Array.from({ length: 8 }, () => ({ masked: true, requested: false })),
        keyboardController: {
          status: 0x10,
          commandByte: 0x10,
          outputBuffer: null,
          outputDataLatch: 0
        },
        rtc: { address: 0, statusA: 0x26, statusB: 2, statusC: 0, statusD: 0x80 }
      }
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

  it("reports the first selected-device difference after equal CPU state", () => {
    const { native, pcjs } = snapshots();
    const changed = {
      ...pcjs,
      devices: { ...pcjs.devices, rtc: { ...pcjs.devices.rtc, statusC: 0x40 } }
    };
    expect(compareLockstepCpu(native, changed)).toEqual({
      equal: false,
      difference: { path: "devices.rtc.statusC", native: 0, pcjs: 0x40 }
    });
  });

  it("does not step either endpoint when the entry boundary differs", () => {
    const { native, pcjs } = snapshots();
    let nativeSteps = 0;
    let pcjsSteps = 0;
    const changed = { ...pcjs, cpu: { ...pcjs.cpu, eip: 1 } };

    expect(
      stepControlledLockstep(
        {
          snapshot: () => native,
          stepInstruction: () => ((nativeSteps += 1), { kind: "instruction", cycles: 1 })
        },
        {
          snapshot: () => changed,
          stepInstruction: () => (
            (pcjsSteps += 1),
            {
              accepted: true,
              reason: "executed",
              cyclesConsumed: 1,
              before: changed,
              after: changed
            }
          )
        }
      )
    ).toMatchObject({
      kind: "precondition-difference",
      comparison: { difference: { path: "cpu.eip" } }
    });
    expect(nativeSteps).toBe(0);
    expect(pcjsSteps).toBe(0);
  });
});
