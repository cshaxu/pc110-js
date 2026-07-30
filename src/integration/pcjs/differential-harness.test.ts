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
});
