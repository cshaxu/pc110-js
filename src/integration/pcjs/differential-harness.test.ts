import { describe, expect, it } from "vitest";
import {
  assertDifferentialMatch,
  assertDifferentialTraceMatch,
  runPcjsDifferentialCase,
  runPcjsDifferentialTrace
} from "./differential-harness.js";

describe("PCjs differential CPU harness", () => {
  it.each([
    { name: "NOP", bytes: [0x90] },
    { name: "MOV AX, immediate", bytes: [0xb8, 0x34, 0x12] },
    { name: "MOV AL, immediate", bytes: [0xb0, 0x5a], registers: { eax: 0x12340000 } },
    { name: "ADD AX, immediate", bytes: [0x05, 0x01, 0x00], registers: { eax: 0xffff } },
    { name: "DEC CX", bytes: [0x49], registers: { ecx: 0 } },
    {
      name: "MOV moffs, AL",
      bytes: [0xa2, 0x00, 0x02],
      registers: { eax: 0x5a },
      memory: [{ address: 0x200, value: 0 }]
    }
  ])("matches isolated PCjs state after one instruction: $name", async (differentialCase) => {
    const result = await runPcjsDifferentialCase(differentialCase);
    expect(() => assertDifferentialMatch(result)).not.toThrow();
  });

  it("compares every instruction in a program through the shared dispatcher boundary", async () => {
    const trace = await runPcjsDifferentialTrace({
      name: "mixed real-mode program",
      bytes: [0xb0, 0x5a, 0xa2, 0x00, 0x02, 0x49, 0x90],
      registers: { ecx: 1 },
      memory: [{ address: 0x200, value: 0 }],
      instructionCount: 4
    });
    expect(trace.steps).toHaveLength(4);
    expect(() => assertDifferentialTraceMatch(trace)).not.toThrow();
    expect(trace.steps[1]?.memoryWrites.rebuilt).toEqual([{ address: 0x200, value: 0x5a }]);
  });

  it("compares configured input and output port journals at each instruction boundary", async () => {
    const trace = await runPcjsDifferentialTrace({
      name: "real-mode byte port program",
      bytes: [0xe4, 0x80, 0xe6, 0x80],
      instructionCount: 2,
      io: { ports: [{ port: 0x80, inputValue: 0x5a, width: 8 }] }
    });
    expect(() => assertDifferentialTraceMatch(trace)).not.toThrow();
    expect(trace.steps.map((step) => step.io.rebuilt)).toEqual([
      [{ direction: "read", port: 0x80, value: 0x5a, width: 8 }],
      [{ direction: "write", port: 0x80, value: 0x5a, width: 8 }]
    ]);
  });

  it("compares word DX I/O through a declared port", async () => {
    const trace = await runPcjsDifferentialTrace({
      name: "real-mode word DX port program",
      bytes: [0xed, 0xef],
      registers: { edx: 0x81 },
      instructionCount: 2,
      io: {
        ports: [{ port: 0x81, inputValue: 0xbeef, width: 16 }]
      }
    });
    expect(() => assertDifferentialTraceMatch(trace)).not.toThrow();
    expect(trace.steps[0]?.io.rebuilt).toEqual([
      { direction: "read", port: 0x81, value: 0xbeef, width: 16 }
    ]);
  });

  it("groups PCjs prefix steps into one operand-size-prefixed instruction", async () => {
    const trace = await runPcjsDifferentialTrace({
      name: "real-mode dword DX port program",
      bytes: [0x66, 0xed, 0x66, 0xef],
      registers: { edx: 0x82 },
      instructionCount: 2,
      io: { ports: [{ port: 0x82, inputValue: 0x12345678, width: 32 }] }
    });
    expect(() => assertDifferentialTraceMatch(trace)).not.toThrow();
  });

  it.each([
    {
      name: "00-3F accumulator arithmetic slice",
      bytes: [
        0x05, 0x01, 0x00, 0x15, 0x01, 0x00, 0x1d, 0x01, 0x00, 0x2d, 0x01, 0x00, 0x3d, 0x00, 0x00
      ],
      registers: { eax: 0xfffe },
      eflags: 0x00000002,
      instructionCount: 5
    },
    {
      name: "40-4F register increment and decrement interval",
      bytes: [
        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e,
        0x4f
      ],
      registers: {
        eax: 0xffff,
        ecx: 0x7fff,
        edx: 0,
        ebx: 0x8000,
        esp: 0x800,
        ebp: 0xffff,
        esi: 0x7fff,
        edi: 0
      },
      eflags: 0x00000003,
      instructionCount: 16
    },
    {
      name: "50-5F register stack interval",
      bytes: [
        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e,
        0x5f
      ],
      registers: {
        eax: 0x1001,
        ecx: 0x1002,
        edx: 0x1003,
        ebx: 0x1004,
        esp: 0x800,
        ebp: 0x1006,
        esi: 0x1007,
        edi: 0x1008
      },
      instructionCount: 16
    },
    {
      name: "60-61 PUSHA and POPA frame pair",
      bytes: [0x60, 0x61],
      registers: {
        eax: 0x1001,
        ecx: 0x1002,
        edx: 0x1003,
        ebx: 0x1004,
        esp: 0x800,
        ebp: 0x1006,
        esi: 0x1007,
        edi: 0x1008
      },
      instructionCount: 2
    },
    {
      name: "68-6B immediate stack and IMUL forms",
      bytes: [0x68, 0x34, 0x12, 0x58, 0x6a, 0x80, 0x59, 0x69, 0xc1, 0x03, 0x00, 0x6b, 0xc2, 0xfe],
      registers: { ecx: 3, edx: 5, esp: 0x800 },
      instructionCount: 5
    },
    {
      name: "6C-6E byte string I/O pair",
      bytes: [0x6c, 0x6e],
      registers: { edx: 0x80, esi: 0x201, edi: 0x200 },
      memory: [{ address: 0x201, value: 0x5a }],
      io: { ports: [{ port: 0x80, inputValue: 0x5a, width: 8 as const }] },
      instructionCount: 2
    },
    {
      name: "70-7F short conditional interval",
      bytes: [
        0x70, 0x00, 0x71, 0x00, 0x72, 0x00, 0x73, 0x00, 0x74, 0x00, 0x75, 0x00, 0x76, 0x00, 0x77,
        0x00, 0x78, 0x00, 0x79, 0x00, 0x7a, 0x00, 0x7b, 0x00, 0x7c, 0x00, 0x7d, 0x00, 0x7e, 0x00,
        0x7f, 0x00
      ],
      eflags: 0x00000002,
      instructionCount: 16
    },
    {
      name: "80-83 arithmetic immediate register slice",
      bytes: [
        0x80, 0xc0, 0x01, 0x81, 0xd0, 0x01, 0x00, 0x83, 0xd8, 0x01, 0x81, 0xe8, 0x01, 0x00, 0x81,
        0xf8, 0x00, 0x00
      ],
      registers: { eax: 0xfffe },
      eflags: 0x00000002,
      instructionCount: 5
    },
    {
      name: "84-8D register and effective-address slice",
      bytes: [0x84, 0xc0, 0x86, 0xc1, 0x88, 0xd8, 0x8a, 0xc3, 0x8d, 0x06, 0x00, 0x02],
      registers: { eax: 0x10, ecx: 0x20, ebx: 0x30 },
      instructionCount: 5
    },
    {
      name: "90-99 and 9E-9F accumulator slice",
      bytes: [0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9e, 0x9f],
      registers: { eax: 0x00001280, ecx: 1, edx: 2, ebx: 3, esp: 0x800, ebp: 5, esi: 6, edi: 7 },
      eflags: 0x00000003,
      instructionCount: 12
    },
    {
      name: "A0-A3 moffs move interval",
      bytes: [0xa0, 0x00, 0x02, 0xa2, 0x01, 0x02, 0xa1, 0x02, 0x02, 0xa3, 0x04, 0x02],
      memory: [
        { address: 0x200, value: 0x5a },
        { address: 0x202, value: 0x34 },
        { address: 0x203, value: 0x12 }
      ],
      instructionCount: 4
    },
    {
      name: "A4-AE byte string interval",
      bytes: [0xa4, 0xa6, 0xaa, 0xac, 0xae],
      registers: { eax: 0x5a, esi: 0x200, edi: 0x300 },
      memory: [
        { address: 0x200, value: 0x5a },
        { address: 0x201, value: 0x5a }
      ],
      instructionCount: 5
    },
    {
      name: "B0-BF immediate register interval",
      bytes: [
        0xb0, 0x10, 0xb1, 0x11, 0xb2, 0x12, 0xb3, 0x13, 0xb4, 0x14, 0xb5, 0x15, 0xb6, 0x16, 0xb7,
        0x17, 0xb8, 0x18, 0x00, 0xb9, 0x19, 0x00, 0xba, 0x1a, 0x00, 0xbb, 0x1b, 0x00, 0xbc, 0x1c,
        0x00, 0xbd, 0x1d, 0x00, 0xbe, 0x1e, 0x00, 0xbf, 0x1f, 0x00
      ],
      registers: {
        eax: 0xaaaa0000,
        ecx: 0xbbbb0000,
        edx: 0xcccc0000,
        ebx: 0xdddd0000,
        esp: 0x800,
        ebp: 0xeeee0000,
        esi: 0xffff0000,
        edi: 0x11110000
      },
      instructionCount: 16
    },
    {
      name: "C0-C7 immediate shift and move slice",
      bytes: [0xc0, 0xe0, 0x01, 0xc1, 0xe1, 0x01, 0xc6, 0xc0, 0x5a, 0xc7, 0xc1, 0x34, 0x12],
      registers: { eax: 0x0001, ecx: 0x0001 },
      instructionCount: 4
    },
    {
      name: "C2-C3 near return slice",
      bytes: [0xc2, 0x04, 0x00],
      registers: { esp: 0x800 },
      memory: [
        { address: 0x200, value: 0xc3 },
        { address: 0x800, value: 0x00 },
        { address: 0x801, value: 0x02 },
        { address: 0x806, value: 0x04 },
        { address: 0x807, value: 0x02 }
      ],
      instructionCount: 2
    },
    {
      name: "C4-C5 far pointer load slice",
      bytes: [0xc4, 0x06, 0x00, 0x02, 0xc5, 0x0e, 0x04, 0x02],
      memory: [
        { address: 0x200, value: 0x34 },
        { address: 0x201, value: 0x12 },
        { address: 0x202, value: 0x00 },
        { address: 0x203, value: 0x20 },
        { address: 0x204, value: 0x78 },
        { address: 0x205, value: 0x56 },
        { address: 0x206, value: 0x00 },
        { address: 0x207, value: 0x30 }
      ],
      instructionCount: 2
    }
  ])("matches PCjs through numeric program interval: $name", async (differentialCase) => {
    const trace = await runPcjsDifferentialTrace(differentialCase);
    expect(trace.steps).toHaveLength(differentialCase.instructionCount);
    expect(() => assertDifferentialTraceMatch(trace)).not.toThrow();
  });
});
