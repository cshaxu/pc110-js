import { describe, expect, it } from "vitest";
import { assertDifferentialMatch, runPcjsDifferentialCase } from "./differential-harness.js";

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
});
