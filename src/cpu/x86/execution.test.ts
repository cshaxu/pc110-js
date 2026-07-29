import { describe, expect, it } from "vitest";
import { fetchOpcode, stepInstruction, UnsupportedOpcodeError } from "./execution.js";
import { Cpu386State } from "./state.js";

describe("80386 instruction fetch", () => {
  it("fetches the reset-vector opcode through the current CS:EIP state", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xea]]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };

    expect(fetchOpcode(memory, new Cpu386State())).toEqual({
      linearAddress: 0x000ffff0,
      instructionPointer: 0x0000fff0,
      opcode: 0xea
    });
  });

  it("executes NOP and advances EIP only after a supported opcode commits", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x90]]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    expect(stepInstruction(memory, state)).toEqual({
      halted: false,
      fetched: { linearAddress: 0x000ffff0, instructionPointer: 0x0000fff0, opcode: 0x90 }
    });
    expect(state.snapshot().eip).toBe(0x0000fff1);
  });

  it("halts after HLT and does not fetch again until resumed", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xf4]]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    expect(stepInstruction(memory, state).halted).toBe(true);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff1, halted: true });
    expect(stepInstruction(memory, state)).toEqual({ halted: true });
  });

  it("follows a real-mode far jump from the reset vector", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xea],
      [0x000ffff1, 0x34],
      [0x000ffff2, 0x12],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0xf0]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    expect(stepInstruction(memory, state).halted).toBe(false);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });

  it("loads 16-bit immediate values into the selected register", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xbb],
      [0x000ffff1, 0x78],
      [0x000ffff2, 0x56]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x5678 }, eip: 0x0000fff3 });
  });

  it("loads 8-bit register immediates and writes AL to immediate ports", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xb0],
      [0x000ffff1, 0xa5],
      [0x000ffff2, 0xe6],
      [0x000ffff3, 0x84]
    ]);
    const writes: Array<[number, number]> = [];
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();
    const ports = { writePort8: (port: number, value: number) => writes.push([port, value]) };

    stepInstruction(memory, state, ports);
    stepInstruction(memory, state, ports);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xa5 }, eip: 0x0000fff4 });
    expect(writes).toEqual([[0x84, 0xa5]]);
  });

  it("executes SAHF and real-mode CLI with the expected EFLAGS changes", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x9e],
      [0x000ffff1, 0xfa]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();
    state.writeRegister(0, 0x0000d500);
    state.writeEflags(0x00000202);

    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x000002d7);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eflags: 0x000000d7, eip: 0x0000fff2 });
  });

  it("executes the reset-ROM register form of LMSW", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0xf0]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();
    state.writeRegister16(0, 0xfff0);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ cr0: 0x7ffffff0, eip: 0x0000fff3 });
  });

  it("loads a real-mode data segment from a general register", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xb8],
      [0x000ffff1, 0x40],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x8e],
      [0x000ffff4, 0xd8]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      ds: { selector: 0x0040, base: 0x0400, limit: 0xffff },
      eip: 0x0000fff5
    });
  });

  it("follows signed short and near real-mode jumps", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xeb],
      [0x000ffff1, 0x04],
      [0x000ffff6, 0xe9],
      [0x000ffff7, 0xf7],
      [0x000ffff8, 0xff]
    ]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff6);
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff0);
  });

  it("leaves EIP at the faulting opcode until exception delivery exists", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x0f]]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };
    const state = new Cpu386State();

    expect(() => stepInstruction(memory, state)).toThrow(UnsupportedOpcodeError);
    expect(state.snapshot().eip).toBe(0x0000fff0);
  });
});
