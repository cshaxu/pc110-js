import { describe, expect, it } from "vitest";
import { Cpu386State } from "./state.js";

describe("Cpu386State", () => {
  it("models the PCjs-selected generic 80386 reset state", () => {
    const cpu = new Cpu386State();
    cpu.reset();

    expect(cpu.snapshot()).toMatchObject({
      registers: { eax: 0, ebx: 0, ecx: 0, edx: 0x300, esp: 0, ebp: 0, esi: 0, edi: 0 },
      eip: 0xfff0,
      eflags: 0x2,
      cr0: 0x7ffffff0,
      cr2: 0,
      cr3: 0,
      gdtr: { base: 0, limit: 0 },
      idtr: { base: 0, limit: 0x3ff },
      cs: { selector: 0xf000, base: 0xffff0000, limit: 0xffff },
      ds: { selector: 0, base: 0, limit: 0xffff },
      fs: { selector: 0, base: 0, limit: 0xffff },
      gs: { selector: 0, base: 0, limit: 0xffff }
    });
  });

  it("returns independent snapshot values", () => {
    const cpu = new Cpu386State();
    const snapshot = cpu.snapshot();
    const copiedRegisters = snapshot.registers as Record<"eax", number>;
    copiedRegisters.eax = 0x1234;

    expect(cpu.snapshot().registers.eax).toBe(0);
  });

  it("stores 80386 descriptor-table register values independently", () => {
    const cpu = new Cpu386State();
    cpu.writeGdtr(0x12345000, 0x12345);
    cpu.writeIdtr(0xfffff000, 0x56789);

    expect(cpu.snapshot()).toMatchObject({
      gdtr: { base: 0x12345000, limit: 0x2345 },
      idtr: { base: 0xfffff000, limit: 0x6789 }
    });
  });

  it("stores 32-bit CR0 values for later mode-transition handling", () => {
    const cpu = new Cpu386State();
    cpu.writeCr0(0x80000001);

    expect(cpu.snapshot().cr0).toBe(0x80000001);
  });

  it("preserves the required EFLAGS bit while storing mode state", () => {
    const cpu = new Cpu386State();
    cpu.writeEflags(0x00020000);

    expect(cpu.snapshot().eflags).toBe(0x00020002);
  });

  it("writes 16-bit register and instruction-pointer values without high-word loss", () => {
    const cpu = new Cpu386State();
    cpu.writeRegister(0, 0xface0000);
    cpu.writeRegister16(0, 0xbeef);
    cpu.writeEip16(0x12345);

    expect(cpu.snapshot()).toMatchObject({
      registers: { eax: 0xfacebeef },
      eip: 0x2345
    });
  });

  it("writes low and high 8-bit register halves independently", () => {
    const cpu = new Cpu386State();
    cpu.writeRegister(0, 0xface0000);
    cpu.writeRegister8(0, 0x12);
    cpu.writeRegister8(4, 0x34);

    expect(cpu.snapshot().registers.eax).toBe(0xface3412);
  });

  it("updates status flags from AH and clears the interrupt flag", () => {
    const cpu = new Cpu386State();
    cpu.writeEflags(0x00000202);
    cpu.writeStatusFlagsFromAh(0xd5);
    cpu.clearInterruptFlag();

    expect(cpu.snapshot().eflags).toBe(0x000000d7);
  });

  it("loads an MSW while preserving protected mode and fixed status bits", () => {
    const cpu = new Cpu386State();
    cpu.writeCr0(0x7fff0001);
    cpu.loadMachineStatusWord(0);

    expect(cpu.snapshot().cr0).toBe(0x7ffffff1);
  });

  it("loads real-mode data segments while preserving their cached limits", () => {
    const cpu = new Cpu386State();
    cpu.loadRealModeSegment("ds", 0x0040);

    expect(cpu.snapshot().ds).toEqual({ selector: 0x0040, base: 0x0400, limit: 0xffff });
  });

  it("updates logic flags while preserving undefined auxiliary carry state", () => {
    const cpu = new Cpu386State();
    cpu.writeEflags(0x00000012);
    cpu.writeLogicFlags8(0);

    expect(cpu.snapshot().eflags).toBe(0x00000056);
    expect(cpu.zeroFlag()).toBe(true);
  });

  it("reads 8-bit register halves and sets 16-bit logic flags", () => {
    const cpu = new Cpu386State();
    cpu.writeRegister(3, 0xface1234);
    cpu.writeLogicFlags16(0x8001);

    expect(cpu.readRegister8(3)).toBe(0x34);
    expect(cpu.readRegister8(7)).toBe(0x12);
    expect(cpu.snapshot().eflags).toBe(0x00000082);
  });

  it("sets 8-bit comparison flags without modifying operands", () => {
    const cpu = new Cpu386State();
    cpu.writeCompareFlags8(0x08, 0x09);

    expect(cpu.snapshot().eflags).toBe(0x00000097);
    expect(cpu.zeroFlag()).toBe(false);
    expect(cpu.carryFlag()).toBe(true);
  });

  it("sets carry and overflow for a single-bit left shift", () => {
    const cpu = new Cpu386State();
    cpu.writeShiftLeftFlags8(0x80);

    expect(cpu.snapshot().eflags).toBe(0x00000847);
  });
});
