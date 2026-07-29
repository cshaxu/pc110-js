import { describe, expect, it } from "vitest";
import {
  fetchOpcode,
  serviceExternalInterrupt,
  stepInstruction,
  stepInstructionTraced,
  type InstructionTraceEvent,
  UnsupportedOpcodeError
} from "./execution.js";
import { Cpu386State } from "./state.js";

function resetAliasMemory(values: Map<number, number>) {
  return {
    readUint8: (address: number) =>
      values.get(address >= 0xffff0000 ? address & 0xfffff : address) ?? 0,
    writeUint8: (address: number, value: number) =>
      values.set(address >= 0xffff0000 ? address & 0xfffff : address, value & 0xff)
  };
}

describe("80386 instruction fetch", () => {
  it("fetches the reset-vector opcode through the current CS:EIP state", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xea]]);
    const memory = resetAliasMemory(values);

    expect(fetchOpcode(memory, new Cpu386State())).toEqual({
      linearAddress: 0xfffffff0,
      instructionPointer: 0x0000fff0,
      opcode: 0xea
    });
  });

  it("executes NOP and advances EIP only after a supported opcode commits", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x90]]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    expect(stepInstruction(memory, state)).toEqual({
      halted: false,
      fetched: { linearAddress: 0xfffffff0, instructionPointer: 0x0000fff0, opcode: 0x90 }
    });
    expect(state.snapshot().eip).toBe(0x0000fff1);
  });

  it("emits an instruction trace with the before and after CPU states", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x90]]);
    const state = new Cpu386State();
    const events: InstructionTraceEvent[] = [];

    stepInstructionTraced(resetAliasMemory(values), state, undefined, (event) =>
      events.push(event)
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      before: { eip: 0x0000fff0 },
      after: { eip: 0x0000fff1 },
      result: { halted: false, fetched: { opcode: 0x90 } }
    });
  });

  it("halts after HLT and does not fetch again until resumed", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xf4]]);
    const memory = resetAliasMemory(values);
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
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    expect(stepInstruction(memory, state).halted).toBe(false);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });

  it("jumps to a 16-bit register through FF /4", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0xe5]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(5, 0x1234);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot().eip).toBe(0x1234);
  });

  it("loads a checked GDT code descriptor through a protected-mode far jump", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xea],
      [0x000ffff1, 0x34],
      [0x000ffff2, 0x12],
      [0x000ffff3, 0x08],
      [0x000ffff4, 0x00],
      [0x00001008, 0xff],
      [0x00001009, 0xff],
      [0x0000100a, 0x00],
      [0x0000100b, 0x00],
      [0x0000100c, 0x00],
      [0x0000100d, 0x9a],
      [0x0000100e, 0x00],
      [0x0000100f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x00001000, 0x0000000f);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00001234,
      cs: { selector: 0x0008, base: 0, limit: 0x0000ffff }
    });
  });

  it("loads a checked GDT code descriptor through a protected-mode memory far jump", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x2e],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0x20],
      [0x000f2000, 0x78],
      [0x000f2001, 0x56],
      [0x000f2002, 0x08],
      [0x000f2003, 0x00],
      [0x00001008, 0xff],
      [0x00001009, 0xff],
      [0x0000100a, 0x00],
      [0x0000100b, 0x00],
      [0x0000100c, 0x00],
      [0x0000100d, 0x9a],
      [0x0000100e, 0x00],
      [0x0000100f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x00001000, 0x0000000f);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00005678,
      cs: { selector: 0x0008, base: 0, limit: 0x0000ffff }
    });
  });

  it("loads a 32-bit protected-mode far jump through an operand-size override", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x66],
      [0x00000001, 0xea],
      [0x00000002, 0x78],
      [0x00000003, 0x56],
      [0x00000004, 0x34],
      [0x00000005, 0x12],
      [0x00000006, 0x10],
      [0x00000007, 0x00],
      [0x00001010, 0xff],
      [0x00001011, 0xff],
      [0x00001012, 0x00],
      [0x00001013, 0x00],
      [0x00001014, 0x00],
      [0x00001015, 0x9a],
      [0x00001016, 0xcf],
      [0x00001017, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x00001000, 0x00000017);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x12345678,
      cs: { selector: 0x0010, base: 0, limit: 0xffffffff, default32: true }
    });
  });

  it("loads the DeskPro-style protected data descriptor into ES", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8e],
      [0x000ffff1, 0xc0],
      [0x00001008, 0xff],
      [0x00001009, 0xff],
      [0x0000100a, 0x00],
      [0x0000100b, 0x00],
      [0x0000100c, 0xc0],
      [0x0000100d, 0x92],
      [0x0000100e, 0x00],
      [0x0000100f, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x00001000, 0x0000000f);
    state.writeRegister16(0, 0x0008);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff2,
      es: { selector: 0x0008, base: 0x80c00000, limit: 0x0000ffff }
    });
  });

  it("writes through the protected ES cache with the observed byte MOV form", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0x88],
      [0x000ffff2, 0x1d]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeSegment("es", 0x0008, 0x00100000, 0x0000ffff);
    state.writeRegister16(7, 0x0020);
    state.writeRegister8(3, 0xa5);

    stepInstruction(resetAliasMemory(values), state);

    expect(values.get(0x00100020)).toBe(0xa5);
    expect(state.snapshot().eip).toBe(0x0000fff3);
  });

  it("follows the reset-ROM CS-overridden far jump table entry", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x2e],
      [0x000ffff3, 0xfd],
      [0x000ffff4, 0xf8],
      [0x000ff8fd, 0x34],
      [0x000ff8fe, 0x12],
      [0x000ff8ff, 0x00],
      [0x000ff900, 0xf0]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });

  it("traces the PCjs reset path through the E000 option-ROM dispatch", () => {
    const values = new Map<number, number>();
    const load = (address: number, bytes: number[]) => {
      for (const [offset, value] of bytes.entries()) values.set(address + offset, value);
    };
    load(0x000ffff0, [0xea, 0x05, 0xf9, 0x00, 0xf0]);
    load(
      0x000ff905,
      [
        0xb0, 0x00, 0xe6, 0x84, 0xb0, 0x00, 0xe6, 0x85, 0xb4, 0x02, 0x9e, 0xfa, 0xb8, 0xf0, 0xff,
        0x0f, 0x01, 0xf0, 0xb8, 0x40, 0x00, 0x8e, 0xd8, 0xe4, 0x64, 0xa8, 0x04, 0x75, 0x62, 0x8e,
        0xea, 0xb0, 0x01, 0xe6, 0x84, 0xb0, 0xaa, 0xe6, 0x64, 0xb9, 0xff, 0xff, 0xe4, 0x64, 0xa8,
        0x01, 0x75, 0x05
      ]
    );
    load(
      0x000ff93a,
      [
        0xb0, 0x02, 0xe6, 0x84, 0xe4, 0x60, 0xb0, 0x03, 0xe6, 0x84, 0xb0, 0x04, 0xe6, 0x84, 0xb8,
        0x00, 0xe0, 0x8e, 0xd8, 0x33, 0xdb, 0x81, 0x3f, 0xaa, 0x55, 0x75, 0x08, 0xbd, 0x76, 0xf9,
        0x2e, 0xff, 0x2e, 0xfd, 0xf8
      ]
    );
    load(0x000e0000, [0xaa, 0x55]);
    load(0x000ff8fd, [0x03, 0x00, 0x00, 0xe0]);
    const responses = [0x00, 0x01, 0x00];
    const state = new Cpu386State();
    const memory = resetAliasMemory(values);
    let reachedOptionRom = false;

    for (let index = 0; index < 38; index += 1) {
      stepInstruction(memory, state, {
        readPort8: () => responses.shift() ?? 0,
        writePort8: () => undefined
      });
      if (state.snapshot().cs.selector === 0xe000 && state.snapshot().eip === 0x0003) {
        reachedOptionRom = true;
        break;
      }
    }

    expect(reachedOptionRom).toBe(true);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0xe000, base: 0x000e0000, limit: 0xffff },
      eip: 0x0003
    });
  });

  it("traces the PCjs descriptor-initialization prefix through its first descriptor", () => {
    const values = new Map<number, number>();
    const bytes = [
      0x60, 0x1e, 0x06, 0xb8, 0x00, 0x1c, 0x8e, 0xd8, 0x8e, 0xc0, 0xfc, 0x33, 0xc0, 0xbf, 0x00,
      0x00, 0xb9, 0x04, 0x00, 0xf3, 0xab, 0xbe, 0x08, 0x00, 0xb8, 0x00, 0x1c, 0xbb, 0x10, 0x00,
      0xf7, 0xe3, 0x05, 0x00, 0x00, 0x80, 0xd2, 0x00, 0x89, 0x44, 0x02, 0x88, 0x54, 0x04, 0xc6,
      0x44, 0x05, 0x92, 0xc7, 0x04, 0x5f, 0x00
    ];
    for (const [offset, value] of bytes.entries()) {
      values.set(0x000f0000 + ((0x0000fff0 + offset) & 0xffff), value);
    }
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);

    for (let index = 0; index < 21; index += 1) stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      ds: { selector: 0x1c00, base: 0x0001c000 },
      es: { selector: 0x1c00, base: 0x0001c000 },
      registers: { esi: 0x0008 }
    });
    expect([
      values.get(0x0001c008),
      values.get(0x0001c009),
      values.get(0x0001c00a),
      values.get(0x0001c00b),
      values.get(0x0001c00c),
      values.get(0x0001c00d)
    ]).toEqual([0x5f, 0x00, 0x00, 0xc0, 0x01, 0x92]);
  });

  it("follows a default-data-segment far pointer through FF /5", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0x2e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x00001234, 0x78],
      [0x00001235, 0x56],
      [0x00001236, 0x00],
      [0x00001237, 0xf0]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x5678,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });

  it("calls a real-mode far pointer through FF /3 and saves CS:IP", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0x1e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x00001234, 0x78],
      [0x00001235, 0x56],
      [0x00001236, 0x00],
      [0x00001237, 0xf0]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x5678,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff },
      registers: { esp: 0x0ffc }
    });
    expect([
      values.get(0x0ffc),
      values.get(0x0ffd),
      values.get(0x0ffe),
      values.get(0x0fff)
    ]).toEqual([0xf4, 0xff, 0x00, 0xf0]);
  });

  it("calls near register and CS-overridden memory targets through FF /2", () => {
    const registerValues = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0xd3]
    ]);
    const registerState = new Cpu386State();
    registerState.loadRealModeSegment("ss", 0);
    registerState.writeRegister16(4, 0x1000);
    registerState.writeRegister16(3, 0x1234);
    const registerMemory = resetAliasMemory(registerValues);

    stepInstruction(registerMemory, registerState);
    expect(registerState.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0x0ffe } });
    expect([registerValues.get(0x0ffe), registerValues.get(0x0fff)]).toEqual([0xf2, 0xff]);

    const memoryValues = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x94],
      [0x000ffff3, 0x34],
      [0x000ffff4, 0x12],
      [0x000f1234, 0x78],
      [0x000f1235, 0x56]
    ]);
    const memoryState = new Cpu386State();
    memoryState.loadRealModeSegment("ss", 0);
    memoryState.writeRegister16(4, 0x1000);
    memoryState.writeRegister16(6, 0x0000);
    const memory = resetAliasMemory(memoryValues);

    stepInstruction(memory, memoryState);
    expect(memoryState.snapshot()).toMatchObject({ eip: 0x5678, registers: { esp: 0x0ffe } });
    expect([memoryValues.get(0x0ffe), memoryValues.get(0x0fff)]).toEqual([0xf5, 0xff]);
  });

  it("pushes register and default-segment memory words through FF /6", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0xf3],
      [0x000ffff2, 0xff],
      [0x000ffff3, 0x76],
      [0x000ffff4, 0x00],
      [0x00001000, 0x78],
      [0x00001001, 0x56]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x2000);
    state.writeRegister16(3, 0x1234);
    state.writeRegister16(5, 0x1000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x1ffc }, eip: 0x0000fff5 });
    expect([
      values.get(0x1ffc),
      values.get(0x1ffd),
      values.get(0x1ffe),
      values.get(0x1fff)
    ]).toEqual([0x78, 0x56, 0x34, 0x12]);
  });

  it("loads 16-bit immediate values into the selected register", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xbb],
      [0x000ffff1, 0x78],
      [0x000ffff2, 0x56]
    ]);
    const memory = resetAliasMemory(values);
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
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    const ports = { writePort8: (port: number, value: number) => writes.push([port, value]) };

    stepInstruction(memory, state, ports);
    stepInstruction(memory, state, ports);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xa5 }, eip: 0x0000fff4 });
    expect(writes).toEqual([[0x84, 0xa5]]);
  });

  it("reads and writes AL through DX-addressed ports", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xec],
      [0x000ffff1, 0xee]
    ]);
    const writes: Array<[number, number]> = [];
    const state = new Cpu386State();
    state.writeRegister16(2, 0x0064);
    const ports = {
      readPort8: (port: number) => (port === 0x64 ? 0xa5 : 0),
      writePort8: (port: number, value: number) => writes.push([port, value])
    };

    stepInstruction(resetAliasMemory(values), state, ports);
    stepInstruction(resetAliasMemory(values), state, ports);
    expect(state.snapshot().registers.eax).toBe(0xa5);
    expect(writes).toEqual([[0x64, 0xa5]]);
  });

  it("executes SAHF and real-mode CLI with the expected EFLAGS changes", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x9e],
      [0x000ffff1, 0xfa]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister(0, 0x0000d500);
    state.writeEflags(0x00000202);

    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x000002d7);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eflags: 0x000000d7, eip: 0x0000fff2 });
  });

  it("loads the low EFLAGS byte into AH through LAHF", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x9f]]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x1200);
    state.writeEflags(0x00000ad7);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0xd700 },
      eflags: 0x00000ad7,
      eip: 0x0000fff1
    });
  });

  it("sign-extends AX into DX through CWD without changing EFLAGS", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x99],
      [0x000ffff1, 0x99]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8001);
    state.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x8001, edx: 0xffff },
      eflags: 0x000008d7,
      eip: 0x0000fff1
    });

    state.writeRegister16(0, 0x7fff);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0 }, eip: 0x0000fff2 });
  });

  it("advances through WAIT when no FPU device is attached", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x9b]]);
    const state = new Cpu386State();
    state.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff1, eflags: 0x000008d7 });
  });

  it("performs AAM with PCjs-compatible result flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd4],
      [0x000ffff1, 0x0a]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x2f);
    state.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x0407 },
      eflags: 0x00000002,
      eip: 0x0000fff2
    });
  });

  it("translates AL through the DS:BX table with 16-bit offset wrapping", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd7],
      [0x00000000, 0x5a]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0xffff);
    state.writeRegister8(0, 0x01);
    state.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x5a, ebx: 0xffff },
      eflags: 0x000008d7,
      eip: 0x0000fff1
    });
  });

  it("pushes 16-bit and sign-extended byte immediates", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x68],
      [0x000ffff1, 0x34],
      [0x000ffff2, 0x12],
      [0x000ffff3, 0x6a],
      [0x000ffff4, 0x80]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x0ffc }, eip: 0x0000fff5 });
    expect([
      values.get(0x0ffc),
      values.get(0x0ffd),
      values.get(0x0ffe),
      values.get(0x0fff)
    ]).toEqual([0x80, 0xff, 0x34, 0x12]);
  });

  it("performs AAA and AAS while preserving non-adjust flags", () => {
    const aaaValues = new Map<number, number>([[0x000ffff0, 0x37]]);
    const aaaState = new Cpu386State();
    aaaState.writeRegister16(0, 0x12ff);
    aaaState.writeEflags(0x000008c6);

    stepInstruction(resetAliasMemory(aaaValues), aaaState);

    expect(aaaState.snapshot()).toMatchObject({
      registers: { eax: 0x1505 },
      eflags: 0x000008d7,
      eip: 0x0000fff1
    });

    const aasValues = new Map<number, number>([[0x000ffff0, 0x3f]]);
    const aasState = new Cpu386State();
    aasState.writeRegister16(0, 0x120b);
    aasState.writeEflags(0x000008c6);

    stepInstruction(resetAliasMemory(aasValues), aasState);

    expect(aasState.snapshot()).toMatchObject({
      registers: { eax: 0x1105 },
      eflags: 0x000008d7,
      eip: 0x0000fff1
    });
  });

  it("pushes, restores, and enables real-mode flags through SS:SP", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x9c],
      [0x000ffff1, 0xfa],
      [0x000ffff2, 0x9d],
      [0x000ffff3, 0xfb]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x000002d7);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ eflags: 0x000002d7, registers: { esp: 0x1000 } });
    state.clearInterruptFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().eflags).toBe(0x000002d7);
  });

  it("executes the reset-ROM register form of LMSW", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0xf0]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister16(0, 0xfff0);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ cr0: 0x7ffffff0, eip: 0x0000fff3 });
  });

  it("clears CR0 task-switched through CLTS", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x06]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x80000009);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ cr0: 0x80000001, eip: 0x0000fff2 });
  });

  it("loads the machine-status word from a ModR/M memory operand", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x36],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0x20],
      [0x00002000, 0x01],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ cr0: 0x7ffffff1, eip: 0x0000fff5 });
  });

  it("stores the CR0 machine-status word through SMSW register and memory forms", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0x01],
      [0x00000002, 0xe0],
      [0x00000003, 0x0f],
      [0x00000004, 0x01],
      [0x00000005, 0x26],
      [0x00000006, 0x00],
      [0x00000007, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeCr0(0x12345678);
    state.writeEflags(0x000008d7);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x5678 },
      cr0: 0x12345678,
      eflags: 0x000008d7,
      eip: 8
    });
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0x78, 0x56]);
  });

  it("adds carry into register and memory destinations through ADC r/m16, r16", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x11],
      [0x00000001, 0xd8],
      [0x00000002, 0x11],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00002000, 0xff],
      [0x00002001, 0xff]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 0xffff);
    state.writeRegister16(3, 1);
    state.writeEflags(0x00000003);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1 }, eflags: 0x00000013 });
    state.setCarryFlag();
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0x01, 0x00]);
    expect(state.snapshot().eflags).toBe(0x00000013);
  });

  it("subtracts borrow from register and memory destinations through SBB r/m16, r16", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x19],
      [0x00000001, 0xd8],
      [0x00000002, 0x19],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00002000, 0x00],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 1);
    state.writeRegister16(3, 1);
    state.writeEflags(0x00000003);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffff }, eflags: 0x00000097 });
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0xfe, 0xff]);
    expect(state.snapshot().eflags).toBe(0x00000093);
  });

  it("applies carry and borrow across all byte ADC and SBB ModR/M directions", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x10],
      [0x00000001, 0xd8],
      [0x00000002, 0x12],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00000006, 0x18],
      [0x00000007, 0xd8],
      [0x00000008, 0x1a],
      [0x00000009, 0x1e],
      [0x0000000a, 0x02],
      [0x0000000b, 0x20],
      [0x00002000, 0xff],
      [0x00002002, 0x00]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister8(0, 0xff);
    state.writeRegister8(3, 1);
    state.writeEflags(0x00000003);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1 }, eflags: 0x00000013 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 1 }, eflags: 0x00000013 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xff }, eflags: 0x00000097 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0 }, eflags: 0x00000046 });
  });

  it("subtracts register sources through byte and word r/m destinations", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x28],
      [0x00000001, 0xd8],
      [0x00000002, 0x29],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00002000, 0x05],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister8(0, 3);
    state.writeRegister16(3, 2);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1 }, eflags: 0x00000002 });
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0x03, 0x00]);
    expect(state.snapshot().eflags).toBe(0x00000006);
  });

  it("ands 16-bit register destinations from register and memory sources", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x23],
      [0x00000001, 0xc3],
      [0x00000002, 0x23],
      [0x00000003, 0x06],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00002000, 0xff],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 0xf0f0);
    state.writeRegister16(3, 0x0ff0);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00f0 }, eflags: 0x00000006 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00f0 }, eflags: 0x00000006 });
  });

  it("xors 16-bit register, memory, and accumulator destinations", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x31],
      [0x00000001, 0xd8],
      [0x00000002, 0x31],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00000006, 0x35],
      [0x00000007, 0x00],
      [0x00000008, 0xff],
      [0x00002000, 0xff],
      [0x00002001, 0xff]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 0xffff);
    state.writeRegister16(3, 0x0f0f);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf0f0 }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0xf0, 0xf0]);
    expect(state.snapshot().eflags).toBe(0x00000086);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0ff0 }, eflags: 0x00000006 });
  });

  it("compares 16-bit register and memory destinations without modifying operands", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x39],
      [0x00000001, 0xd8],
      [0x00000002, 0x39],
      [0x00000003, 0x1e],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00002000, 0x04],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 1);
    state.writeRegister16(3, 2);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1, ebx: 2 }, eflags: 0x00000097 });
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0x04, 0x00]);
    expect(state.snapshot().eflags).toBe(0x00000002);
  });

  it("moves CR0 through register-direct MOV forms", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x20],
      [0x000ffff2, 0xc0],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0x22],
      [0x000ffff5, 0xc0]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff3,
      registers: { eax: 0x7ffffff0 }
    });

    state.writeRegister(0, 0x80000001);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ cr0: 0x80000001, eip: 0x0000fff6 });
  });

  it("executes CLI and STI at protected-mode privilege level zero", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xfa],
      [0x000ffff1, 0xfb]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeEflags(0x00000202);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().eflags).toBe(0x00000002);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ eflags: 0x00000202, eip: 0x0000fff2 });
  });

  it("leaves nonzero protected-mode CLI privilege faults explicit", () => {
    const values = new Map<number, number>([[0x0000fff0, 0xfa]]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x000b, 0, 0xffffffff, 0x0000fff0);

    expect(() => stepInstruction(resetAliasMemory(values), state)).toThrow(
      "requires exception delivery"
    );
  });

  it("ORs AX with an immediate value for the protected-mode transition", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0d],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff3,
      registers: { eax: 0x00000001 },
      eflags: 0x00000002
    });
  });

  it("ANDs EAX with an immediate value through the observed operand-size override", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x66],
      [0x000ffff1, 0x25],
      [0x000ffff2, 0xfe],
      [0x000ffff3, 0xff],
      [0x000ffff4, 0xff],
      [0x000ffff5, 0x7f]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeRegister(0, 0xffffffff);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff6,
      registers: { eax: 0x7ffffffe },
      eflags: 0x00000002
    });
  });

  it("executes the 32-bit accumulator ALU family through operand-size overrides", () => {
    const bytes = [
      0x66, 0x05, 0x01, 0x00, 0x00, 0x00, 0x66, 0x15, 0x00, 0x00, 0x00, 0x00, 0x66, 0x0d, 0x00,
      0x00, 0x00, 0xf0, 0x66, 0x1d, 0x01, 0x00, 0x00, 0x00, 0x66, 0x2d, 0x00, 0x00, 0x00, 0xf0,
      0x66, 0x35, 0xff, 0xff, 0xff, 0xff, 0x66, 0x3d, 0xff, 0xff, 0xff, 0xff
    ];
    const values = new Map<number, number>(bytes.map((value, offset) => [offset, value]));
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister(0, 0xffffffff);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0 }, eflags: 0x00000057 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1 }, eflags: 0x00000002 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf0000001 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf0000000 }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0 }, eflags: 0x00000046 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffffffff }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffffffff }, eflags: 0x00000046 });
  });

  it("loads complete 32-bit values through operand-size-overridden MOV immediates", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x66],
      [0x00000001, 0xb8],
      [0x00000002, 0x78],
      [0x00000003, 0x56],
      [0x00000004, 0x34],
      [0x00000005, 0x12],
      [0x00000006, 0x66],
      [0x00000007, 0xbf],
      [0x00000008, 0xef],
      [0x00000009, 0xcd],
      [0x0000000a, 0xab],
      [0x0000000b, 0x89]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x12345678, edi: 0x89abcdef },
      eip: 0x0000000c
    });
  });

  it("moves 32-bit ModR/M operands through default 16-bit addresses", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x66],
      [0x00000001, 0x89],
      [0x00000002, 0x1e],
      [0x00000003, 0x00],
      [0x00000004, 0x20],
      [0x00000005, 0x66],
      [0x00000006, 0x8b],
      [0x00000007, 0x0e],
      [0x00000008, 0x00],
      [0x00000009, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister(3, 0x12345678);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect([
      values.get(0x2000),
      values.get(0x2001),
      values.get(0x2002),
      values.get(0x2003)
    ]).toEqual([0x78, 0x56, 0x34, 0x12]);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x12345678, ecx: 0x12345678 },
      eip: 0x0000000a
    });
  });

  it("moves 32-bit operands through address-size overrides in protected mode", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x67],
      [0x00000001, 0x66],
      [0x00000002, 0x89],
      [0x00000003, 0x1d],
      [0x00000004, 0x00],
      [0x00000005, 0x20],
      [0x00000006, 0x01],
      [0x00000007, 0x00],
      [0x00000008, 0x66],
      [0x00000009, 0x67],
      [0x0000000a, 0x8b],
      [0x0000000b, 0x0d],
      [0x0000000c, 0x00],
      [0x0000000d, 0x20],
      [0x0000000e, 0x01],
      [0x0000000f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff);
    state.writeRegister(3, 0x12345678);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect([
      values.get(0x12000),
      values.get(0x12001),
      values.get(0x12002),
      values.get(0x12003)
    ]).toEqual([0x78, 0x56, 0x34, 0x12]);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x12345678, ecx: 0x12345678 },
      eip: 0x00000010
    });
  });

  it("returns from the observed protected-mode sequence through a real-mode far jump", () => {
    const values = new Map<number, number>([
      [0x00002000, 0xb8],
      [0x00002001, 0x10],
      [0x00002002, 0x00],
      [0x00002003, 0x8e],
      [0x00002004, 0xc0],
      [0x00002005, 0x0f],
      [0x00002006, 0x20],
      [0x00002007, 0xc0],
      [0x00002008, 0x66],
      [0x00002009, 0x25],
      [0x0000200a, 0xfe],
      [0x0000200b, 0xff],
      [0x0000200c, 0xff],
      [0x0000200d, 0x7f],
      [0x0000200e, 0x0f],
      [0x0000200f, 0x22],
      [0x00002010, 0xc0],
      [0x00002011, 0xea],
      [0x00002012, 0xdc],
      [0x00002013, 0x87],
      [0x00002014, 0x00],
      [0x00002015, 0xf0],
      [0x00001010, 0xff],
      [0x00001011, 0xff],
      [0x00001012, 0x00],
      [0x00001013, 0x00],
      [0x00001014, 0x00],
      [0x00001015, 0x92],
      [0x00001016, 0x00],
      [0x00001017, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x80000001);
    state.writeGdtr(0x00001000, 0x00000017);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0x00002000);

    for (let step = 0; step < 6; step += 1) stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      cr0: 0x00000000,
      eip: 0x000087dc,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });

  it("loads GDTR and IDTR through real-mode LGDT and LIDT memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x16],
      [0x000ffff3, 0x34],
      [0x000ffff4, 0x12],
      [0x000ffff5, 0x0f],
      [0x000ffff6, 0x01],
      [0x000ffff7, 0x1e],
      [0x000ffff8, 0x3a],
      [0x000ffff9, 0x12],
      [0x00001234, 0x67],
      [0x00001235, 0x45],
      [0x00001236, 0x23],
      [0x00001237, 0x01],
      [0x00001238, 0x00],
      [0x0000123a, 0xab],
      [0x0000123b, 0x89],
      [0x0000123c, 0x56],
      [0x0000123d, 0x34],
      [0x0000123e, 0x12]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      gdtr: { limit: 0x4567, base: 0x000123 },
      idtr: { limit: 0x89ab, base: 0x123456 }
    });
  });

  it("loads full descriptor-table bases through operand-size-overridden LGDT and LIDT", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x66],
      [0x000ffff1, 0x0f],
      [0x000ffff2, 0x01],
      [0x000ffff3, 0x16],
      [0x000ffff4, 0x34],
      [0x000ffff5, 0x12],
      [0x000ffff6, 0x66],
      [0x000ffff7, 0x0f],
      [0x000ffff8, 0x01],
      [0x000ffff9, 0x1e],
      [0x000ffffa, 0x3a],
      [0x000ffffb, 0x12],
      [0x00001234, 0x67],
      [0x00001235, 0x45],
      [0x00001236, 0x23],
      [0x00001237, 0x01],
      [0x00001238, 0x56],
      [0x00001239, 0x8a],
      [0x0000123a, 0xab],
      [0x0000123b, 0x89],
      [0x0000123c, 0x56],
      [0x0000123d, 0x34],
      [0x0000123e, 0x12],
      [0x0000123f, 0xcd],
      [0x00001240, 0xef]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      gdtr: { limit: 0x4567, base: 0x8a560123 },
      idtr: { limit: 0x89ab, base: 0xcd123456 }
    });
  });

  it("stores full 80386 descriptor-table bases through SGDT and SIDT", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x06],
      [0x000ffff3, 0x34],
      [0x000ffff4, 0x12],
      [0x000ffff5, 0x66],
      [0x000ffff6, 0x0f],
      [0x000ffff7, 0x01],
      [0x000ffff8, 0x0e],
      [0x000ffff9, 0x3a],
      [0x000ffffa, 0x12]
    ]);
    const state = new Cpu386State();
    state.writeGdtr(0x8a560123, 0x4567);
    state.writeIdtr(0xcd123456, 0x89ab);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(Array.from({ length: 6 }, (_, index) => values.get(0x00001234 + index))).toEqual([
      0x67, 0x45, 0x23, 0x01, 0x56, 0x8a
    ]);
    expect(Array.from({ length: 6 }, (_, index) => values.get(0x0000123a + index))).toEqual([
      0xab, 0x89, 0x56, 0x34, 0x12, 0xcd
    ]);
  });

  it("moves CR0, CR2, and CR3 through 80386 control-register forms", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x20],
      [0x000ffff2, 0xd0],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0x20],
      [0x000ffff5, 0x18],
      [0x000ffff6, 0x0f],
      [0x000ffff7, 0x22],
      [0x000ffff8, 0xd9],
      [0x000ffff9, 0x0f],
      [0x000ffffa, 0x22],
      [0x000ffffb, 0xc2]
    ]);
    const state = new Cpu386State();
    state.writeCr2(0xcafebabe);
    state.writeCr3(0x12345abc);
    state.writeRegister(1, 0x45678def);
    state.writeRegister(2, 0x00000001);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().registers.eax).toBe(0xcafebabe);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().registers.eax).toBe(0x12345000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().cr3).toBe(0x45678000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().cr0).toBe(0x00000001);
  });

  it("loads a real-mode data segment from a general register", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xb8],
      [0x000ffff1, 0x40],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x8e],
      [0x000ffff4, 0xd8]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      ds: { selector: 0x0040, base: 0x0400, limit: 0xffff },
      eip: 0x0000fff5
    });
  });

  it("pops protected data segments through the existing descriptor loader", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x1f],
      [0x00001008, 0xff],
      [0x00001009, 0xff],
      [0x0000100a, 0x00],
      [0x0000100b, 0x00],
      [0x0000100c, 0xc0],
      [0x0000100d, 0x92],
      [0x0000100e, 0x00],
      [0x0000100f, 0x80],
      [0x00002000, 0x08],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x00001000, 0x0000000f);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff);
    state.writeRegister16(4, 0x2000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff1,
      ds: { selector: 0x0008, base: 0x80c00000, limit: 0x0000ffff },
      registers: { esp: 0x00002002 }
    });
  });

  it("pops the low protected-mode EFLAGS word through the current stack", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x9d],
      [0x00002000, 0x57],
      [0x00002001, 0x04]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff);
    state.writeRegister16(4, 0x2000);
    state.writeEflags(0x00100002);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000001,
      eflags: 0x00100457,
      registers: { esp: 0x00002002 }
    });
  });

  it("loads a real-mode data segment from a direct memory operand", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8e],
      [0x000ffff1, 0x1e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x00001234, 0x40],
      [0x00001235, 0x00]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      ds: { selector: 0x0040, base: 0x0400, limit: 0xffff },
      eip: 0x0000fff4
    });
  });

  it("stores real-mode segment selectors into registers and memory", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8c],
      [0x000ffff1, 0xc8],
      [0x000ffff2, 0x8c],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x34],
      [0x000ffff5, 0x12]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ds", 0x0040);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf000 }, eip: 0x0000fff6 });
    expect([values.get(0x00001634), values.get(0x00001635)]).toEqual([0x40, 0x00]);
  });

  it("pushes and pops real-mode segment selectors through SS:SP", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x06],
      [0x000ffff1, 0x1f]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0040);
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);

    stepInstruction(resetAliasMemory(values), state);
    state.loadRealModeSegment("ds", 0);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      ds: { selector: 0x0040, base: 0x0400, limit: 0xffff },
      registers: { esp: 0x1000 }
    });
  });

  it("reads a port, tests AL, and follows JNZ from the reset-ROM path", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xe4],
      [0x000ffff1, 0x64],
      [0x000ffff2, 0xa8],
      [0x000ffff3, 0x04],
      [0x000ffff4, 0x75],
      [0x000ffff5, 0x02]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    const ports = { readPort8: (port: number) => (port === 0x64 ? 0x04 : 0) };

    stepInstruction(memory, state, ports);
    stepInstruction(memory, state, ports);
    stepInstruction(memory, state, ports);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x04 }, eip: 0x0000fff8 });
  });

  it("does not take JNZ when TEST produces a zero result", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa8],
      [0x000ffff1, 0x04],
      [0x000ffff2, 0x75],
      [0x000ffff3, 0x02]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff4);
  });

  it("tests AX against an immediate word without changing AX", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa9],
      [0x000ffff1, 0x00],
      [0x000ffff2, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8001);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x8001 },
      eip: 0x0000fff3,
      eflags: 0x0086
    });
  });

  it("sign-extends AL into AX with CBW without changing flags", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x98]]);
    const state = new Cpu386State();
    state.writeRegister(0, 0x12340080);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x1234ff80 },
      eip: 0x0000fff1,
      eflags: 0x0002
    });
  });

  it("arithmetically shifts an 8-bit register right by one", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd0],
      [0x000ffff1, 0xfc]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(4, 0x81);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0xc000 },
      eip: 0x0000fff2,
      eflags: 0x0087
    });
  });

  it("takes JZ when TEST produces a zero result", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa8],
      [0x000ffff1, 0x04],
      [0x000ffff2, 0x74],
      [0x000ffff3, 0x02]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().eip).toBe(0x0000fff6);
  });

  it("executes every short conditional jump for taken and not-taken flags", () => {
    const conditions = [
      [0x70, 0x0800, 0x0000],
      [0x71, 0x0000, 0x0800],
      [0x72, 0x0001, 0x0000],
      [0x73, 0x0000, 0x0001],
      [0x74, 0x0040, 0x0000],
      [0x75, 0x0000, 0x0040],
      [0x76, 0x0001, 0x0000],
      [0x77, 0x0000, 0x0001],
      [0x78, 0x0080, 0x0000],
      [0x79, 0x0000, 0x0080],
      [0x7a, 0x0004, 0x0000],
      [0x7b, 0x0000, 0x0004],
      [0x7c, 0x0080, 0x0000],
      [0x7d, 0x0000, 0x0080],
      [0x7e, 0x0040, 0x0000],
      [0x7f, 0x0000, 0x0040]
    ];

    for (const [opcode, takenFlags, notTakenFlags] of conditions) {
      const values = new Map<number, number>([
        [0x000ffff0, opcode],
        [0x000ffff1, 0x03]
      ]);
      const takenState = new Cpu386State();
      takenState.writeEflags(takenFlags);
      stepInstruction(resetAliasMemory(values), takenState);
      expect(takenState.snapshot().eip).toBe(0x0000fff5);

      const notTakenState = new Cpu386State();
      notTakenState.writeEflags(notTakenFlags);
      stepInstruction(resetAliasMemory(values), notTakenState);
      expect(notTakenState.snapshot().eip).toBe(0x0000fff2);
    }
  });

  it("executes every 0F near conditional jump for taken and not-taken flags", () => {
    const conditions = [
      [0x80, 0x0800, 0x0000],
      [0x81, 0x0000, 0x0800],
      [0x82, 0x0001, 0x0000],
      [0x83, 0x0000, 0x0001],
      [0x84, 0x0040, 0x0000],
      [0x85, 0x0000, 0x0040],
      [0x86, 0x0001, 0x0000],
      [0x87, 0x0000, 0x0001],
      [0x88, 0x0080, 0x0000],
      [0x89, 0x0000, 0x0080],
      [0x8a, 0x0004, 0x0000],
      [0x8b, 0x0000, 0x0004],
      [0x8c, 0x0080, 0x0000],
      [0x8d, 0x0000, 0x0080],
      [0x8e, 0x0040, 0x0000],
      [0x8f, 0x0000, 0x0040]
    ];

    for (const [extension, takenFlags, notTakenFlags] of conditions) {
      for (const [flags, expectedEip] of [
        [takenFlags, 7],
        [notTakenFlags, 4]
      ]) {
        const state = new Cpu386State();
        state.loadRealModeCodeSegment(0, 0);
        state.writeEflags(flags);
        stepInstruction(
          resetAliasMemory(
            new Map<number, number>([
              [0, 0x0f],
              [1, extension],
              [2, 0x03],
              [3, 0x00]
            ])
          ),
          state
        );
        expect(state.snapshot()).toMatchObject({ eip: expectedEip, eflags: flags | 0x0002 });
      }
    }
  });

  it("tests immediate byte operands without changing the register or memory source", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf6],
      [0x000ffff1, 0xc4],
      [0x000ffff2, 0xc0],
      [0x000ffff3, 0xf6],
      [0x000ffff4, 0x06],
      [0x000ffff5, 0x00],
      [0x000ffff6, 0x20],
      [0x000ffff7, 0x0f],
      [0x00002000, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(4, 0xa5);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000a500 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000a500 }, eflags: 0x00000046 });
    expect(values.get(0x00002000)).toBe(0xf0);
  });

  it("tests immediate word operands without changing the register or memory source", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf7],
      [0x000ffff1, 0xc6],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0xf0],
      [0x000ffff4, 0xf7],
      [0x000ffff5, 0x06],
      [0x000ffff6, 0x00],
      [0x000ffff7, 0x20],
      [0x000ffff8, 0x0f],
      [0x000ffff9, 0x00],
      [0x00002000, 0xf0],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x8001);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esi: 0x8001 }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esi: 0x8001 }, eflags: 0x00000046 });
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0xf0, 0x00]);
  });

  it("tests byte register and memory operands without changing either source", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x84],
      [0x000ffff1, 0xfc],
      [0x000ffff2, 0x84],
      [0x000ffff3, 0x26],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(4, 0xa5);
    state.writeRegister8(7, 0xc0);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x0000a500, ebx: 0x0000c000 },
      eflags: 0x00000082
    });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x0000a500, ebx: 0x0000c000 },
      eflags: 0x00000086
    });
    expect(values.get(0x00002000)).toBe(0xf0);
  });

  it("tests word register and memory operands without changing either source", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x85],
      [0x000ffff1, 0xdb],
      [0x000ffff2, 0x85],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xf0],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x8001);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x8001 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x8001 }, eflags: 0x00000046 });
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0xf0, 0x00]);
  });

  it("controls carry and takes JC", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf9],
      [0x000ffff1, 0x72],
      [0x000ffff2, 0x02],
      [0x000ffff5, 0xf8]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().eip).toBe(0x0000fff5);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.carryFlag()).toBe(false);
  });

  it("updates AL and status flags through immediate AND, OR, and CMP", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x24],
      [0x000ffff1, 0xf3],
      [0x000ffff2, 0x0c],
      [0x000ffff3, 0x08],
      [0x000ffff4, 0x3c],
      [0x000ffff5, 0x0b]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x1f);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x1b }, eflags: 0x00000002 });
  });

  it("ANDs byte registers and direct memory through 80 /4", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x80],
      [0x000ffff1, 0xe4],
      [0x000ffff2, 0xc0],
      [0x000ffff3, 0x80],
      [0x000ffff4, 0x26],
      [0x000ffff5, 0x34],
      [0x000ffff6, 0x12],
      [0x000ffff7, 0x0f],
      [0x00001234, 0xf3]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(4, 0xa5);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00008000 } });
    expect(values.get(0x00001234)).toBe(0x03);
  });

  it("decrements CX and loops while the 16-bit count remains nonzero", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xb9],
      [0x000ffff1, 0x02],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0xe2],
      [0x000ffff4, 0xfe]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 1 }, eip: 0x0000fff3 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0 }, eip: 0x0000fff5 });
  });

  it("executes register-direct MOV and XOR forms from the reset-ROM path", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8b],
      [0x000ffff1, 0xd8],
      [0x000ffff2, 0x33],
      [0x000ffff3, 0xdb]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x1234);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.ebx).toBe(0x1234);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0 },
      eflags: 0x00000046,
      eip: 0x0000fff4
    });
  });

  it("ORs word registers with register and memory sources", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0b],
      [0x000ffff1, 0xc3],
      [0x000ffff2, 0x0b],
      [0x000ffff3, 0x0e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x00],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8000);
    state.writeRegister16(3, 0x0001);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0 }, eflags: 0x00000046 });
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x00, 0x00]);
  });

  it("ORs immediate words into register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x81],
      [0x000ffff1, 0xc8],
      [0x000ffff2, 0x01],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0x81],
      [0x000ffff5, 0x0e],
      [0x000ffff6, 0x64],
      [0x000ffff7, 0x00],
      [0x000ffff8, 0x41],
      [0x000ffff9, 0x00],
      [0x00000064, 0x00],
      [0x00000065, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000006);
    expect([values.get(0x00000064), values.get(0x00000065)]).toEqual([0x41, 0x00]);
  });

  it("ANDs immediate words into register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x81],
      [0x000ffff1, 0xe0],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0xf8],
      [0x000ffff4, 0x81],
      [0x000ffff5, 0x26],
      [0x000ffff6, 0x00],
      [0x000ffff7, 0x20],
      [0x000ffff8, 0xfe],
      [0x000ffff9, 0xff],
      [0x00002000, 0x01],
      [0x00002001, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8fff);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8800 }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000086);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x00, 0x80]);
  });

  it("ANDs word registers into register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x21],
      [0x000ffff1, 0xd8],
      [0x000ffff2, 0x21],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xff],
      [0x00002001, 0x8f]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8fff);
    state.writeRegister16(3, 0xf800);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8800 }, eflags: 0x00000086 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000086);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x00, 0x8800 >>> 8]);
  });

  it("subtracts word register and memory sources from registers", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2b],
      [0x000ffff1, 0xcb],
      [0x000ffff2, 0x2b],
      [0x000ffff3, 0x16],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x01],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 0x0001);
    state.writeRegister16(3, 0x0002);
    state.writeRegister16(2, 0x0000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0xffff }, eflags: 0x00000097 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0xffff }, eflags: 0x00000097 });
  });

  it("subtracts signed immediate bytes from word register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x83],
      [0x000ffff1, 0xec],
      [0x000ffff2, 0x0d],
      [0x000ffff3, 0x83],
      [0x000ffff4, 0x2e],
      [0x000ffff5, 0x00],
      [0x000ffff6, 0x20],
      [0x000ffff7, 0x01],
      [0x00002000, 0x00],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(4, 0x0010);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x0003 }, eflags: 0x00000016 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000097);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0xff, 0xff]);
  });

  it("adds signed immediate bytes to word register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x83],
      [0x000ffff1, 0xc4],
      [0x000ffff2, 0x0d],
      [0x000ffff3, 0x83],
      [0x000ffff4, 0x06],
      [0x000ffff5, 0x00],
      [0x000ffff6, 0x20],
      [0x000ffff7, 0x01],
      [0x00002000, 0xff],
      [0x00002001, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(4, 0xfff3);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0 }, eflags: 0x00000057 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000057);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x00, 0x00]);
  });

  it("ORs word registers into register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x09],
      [0x000ffff1, 0xd8],
      [0x000ffff2, 0x09],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x00],
      [0x00002001, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8000);
    state.writeRegister16(3, 0x0001);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x00000082 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000082);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x01, 0xf0]);
  });

  it("ORs byte registers into register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x08],
      [0x000ffff1, 0xc8],
      [0x000ffff2, 0x08],
      [0x000ffff3, 0x2e],
      [0x000ffff4, 0x10],
      [0x000ffff5, 0x00],
      [0x00000010, 0x01]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x80);
    state.writeRegister8(1, 0x01);
    state.writeRegister8(5, 0x40);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x00000081, ecx: 0x00004001 },
      eflags: 0x00000086
    });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000006);
    expect(values.get(0x00000010)).toBe(0x41);
  });

  it("XORs byte and word registers with direct memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x32],
      [0x000ffff1, 0x06],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x000ffff4, 0x33],
      [0x000ffff5, 0x1e],
      [0x000ffff6, 0x36],
      [0x000ffff7, 0x12],
      [0x00001234, 0xf0],
      [0x00001236, 0x0f],
      [0x00001237, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister(0, 0x0000aa55);
    state.writeRegister16(3, 0xaaaa);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x0000aaa5, ebx: 0x5aa5 },
      eip: 0x0000fff8
    });
  });

  it("loads a 16-bit register from direct and BP-based memory operands", () => {
    const directValues = new Map<number, number>([
      [0x000ffff0, 0x8b],
      [0x000ffff1, 0x06],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x00001234, 0x78],
      [0x00001235, 0x56]
    ]);
    const directState = new Cpu386State();
    stepInstruction(resetAliasMemory(directValues), directState);
    expect(directState.snapshot()).toMatchObject({ registers: { eax: 0x5678 }, eip: 0x0000fff4 });

    const stackValues = new Map<number, number>([
      [0x000ffff0, 0x8b],
      [0x000ffff1, 0x46],
      [0x000ffff2, 0x02],
      [0x00002002, 0xbc],
      [0x00002003, 0x9a]
    ]);
    const stackState = new Cpu386State();
    stackState.writeRegister16(5, 0x2000);
    stepInstruction(resetAliasMemory(stackValues), stackState);
    expect(stackState.snapshot()).toMatchObject({ registers: { eax: 0x9abc }, eip: 0x0000fff3 });
  });

  it("loads a 16-bit effective address without reading memory", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8d],
      [0x000ffff1, 0x5c],
      [0x000ffff2, 0x08]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x1000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x1008 }, eip: 0x0000fff3 });
  });

  it("moves accumulator values through DS direct offsets", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa0],
      [0x000ffff1, 0x34],
      [0x000ffff2, 0x12],
      [0x000ffff3, 0xa1],
      [0x000ffff4, 0x36],
      [0x000ffff5, 0x12],
      [0x000ffff6, 0xa2],
      [0x000ffff7, 0x38],
      [0x000ffff8, 0x12],
      [0x000ffff9, 0xa3],
      [0x000ffffa, 0x3a],
      [0x000ffffb, 0x12],
      [0x00001634, 0xa5],
      [0x00001636, 0x78],
      [0x00001637, 0x56]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ds", 0x0040);

    for (let index = 0; index < 4; index += 1) stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x5678 }, eip: 0x0000fffc });
    expect([values.get(0x00001638), values.get(0x0000163a), values.get(0x0000163b)]).toEqual([
      0x78, 0x78, 0x56
    ]);
  });

  it("restores BP and SP through LEAVE without changing EFLAGS", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xc9],
      [0x00002000, 0x34],
      [0x00002001, 0x12]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(5, 0x2000);
    state.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { ebp: 0x1234, esp: 0x2002 },
      eflags: 0x000008d7,
      eip: 0x0000fff1
    });
  });

  it("performs a real-mode immediate far call with RETF-compatible stack order", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x9a],
      [0x000ffff1, 0x34],
      [0x000ffff2, 0x12],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x2000, base: 0x20000 },
      eip: 0x1234,
      registers: { esp: 0x0ffc }
    });
    expect([
      values.get(0x0ffc),
      values.get(0x0ffd),
      values.get(0x0ffe),
      values.get(0x0fff)
    ]).toEqual([0xf5, 0xff, 0x00, 0xf0]);
  });

  it("uses ZF after decrementing CX for LOOPE and LOOPNE", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xe1],
      [0x000ffff1, 0x02],
      [0x000ffff4, 0xe0],
      [0x000ffff5, 0x02]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 2);
    state.writeEflags(0x00000042);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 1 }, eip: 0x0000fff4 });

    state.writeEflags(0x00000002);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0 }, eip: 0x0000fff6 });
  });

  it("delivers real-mode overflow interrupts through INTO only when OF is set", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xce],
      [0x00000010, 0x34],
      [0x00000011, 0x12],
      [0x00000012, 0x00],
      [0x00000013, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff1, registers: { esp: 0x1000 } });

    state.reset();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x00000802);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x2000 },
      eip: 0x1234,
      registers: { esp: 0x0ffa },
      eflags: 0x00000802
    });
  });

  it("zero- and sign-extends 8-bit sources through 0F MOVZX and MOVSX", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0xb6],
      [0x000ffff2, 0xd8],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0xbe],
      [0x000ffff5, 0x06],
      [0x000ffff6, 0x00],
      [0x000ffff7, 0x20],
      [0x00002000, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xff);
    const memory = resetAliasMemory(values);
    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x00ff, eax: 0xff80 },
      eip: 0x0000fff8
    });
  });

  it("loads real-mode SS, FS, and GS with m16:16 segment pointers", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xb2],
      [0x00000002, 0x06],
      [0x00000003, 0x00],
      [0x00000004, 0x20],
      [0x00000005, 0x0f],
      [0x00000006, 0xb4],
      [0x00000007, 0x1e],
      [0x00000008, 0x10],
      [0x00000009, 0x20],
      [0x0000000a, 0x0f],
      [0x0000000b, 0xb5],
      [0x0000000c, 0x16],
      [0x0000000d, 0x20],
      [0x0000000e, 0x20],
      [0x00002000, 0x34],
      [0x00002001, 0x12],
      [0x00002002, 0x00],
      [0x00002003, 0x30],
      [0x00002010, 0x78],
      [0x00002011, 0x56],
      [0x00002012, 0x00],
      [0x00002013, 0x40],
      [0x00002020, 0xbc],
      [0x00002021, 0x9a],
      [0x00002022, 0x00],
      [0x00002023, 0x50]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x1234, ebx: 0x5678, edx: 0x9abc },
      ss: { selector: 0x3000, base: 0x30000 },
      fs: { selector: 0x4000, base: 0x40000 },
      gs: { selector: 0x5000, base: 0x50000 },
      eip: 15
    });
  });

  it("pushes and pops real-mode FS and GS selectors through SS:SP", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xa0],
      [0x00000002, 0x0f],
      [0x00000003, 0xa8],
      [0x00000004, 0x0f],
      [0x00000005, 0xa9],
      [0x00000006, 0x0f],
      [0x00000007, 0xa1]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.loadRealModeSegment("ss", 0);
    state.loadRealModeSegment("fs", 0x1234);
    state.loadRealModeSegment("gs", 0x5678);
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x000008d7);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect([
      values.get(0x0ffc),
      values.get(0x0ffd),
      values.get(0x0ffe),
      values.get(0x0fff)
    ]).toEqual([0x78, 0x56, 0x34, 0x12]);
    state.loadRealModeSegment("fs", 0);
    state.loadRealModeSegment("gs", 0);
    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      fs: { selector: 0x1234, base: 0x12340 },
      gs: { selector: 0x5678, base: 0x56780 },
      registers: { esp: 0x1000 },
      eflags: 0x000008d7,
      eip: 8
    });
  });

  it("performs immediate and CL-controlled 16-bit SHLD and SHRD", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xa4],
      [0x00000002, 0xd8],
      [0x00000003, 0x04],
      [0x00000004, 0x0f],
      [0x00000005, 0xad],
      [0x00000006, 0xd8]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 0x1234);
    state.writeRegister16(3, 0xabcd);
    state.writeRegister8(1, 4);
    state.writeEflags(0x00000012);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x234a }, eflags: 0x00000013 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xd234 }, eflags: 0x00000093 });
  });

  it("extends 16-bit double shifts across the source word for memory operands", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xac],
      [0x00000002, 0x1e],
      [0x00000003, 0x00],
      [0x00000004, 0x20],
      [0x00000005, 0x14],
      [0x00002000, 0x34],
      [0x00002001, 0x12]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(3, 0xabcd);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0xbc, 0xda]);
  });

  it("scans the lowest and highest set bit while preserving the destination for zero", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0xbc],
      [0x000ffff2, 0xd8],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0xbd],
      [0x000ffff5, 0xd8],
      [0x000ffff6, 0x0f],
      [0x000ffff7, 0xbc],
      [0x000ffff8, 0xd8]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x8010);
    state.writeRegister16(3, 0x1234);
    const memory = resetAliasMemory(values);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 4 }, eflags: 0x00000002 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 15 }, eflags: 0x00000002 });
    state.writeRegister16(0, 0);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 15 }, eflags: 0x00000042 });
  });

  it("complements CF through CMC without changing other EFLAGS", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xf5]]);
    const state = new Cpu386State();
    state.writeEflags(0x000008d7);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ eflags: 0x000008d6, eip: 0x0000fff1 });
  });

  it("delivers real-mode INT3 through vector three", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xcc],
      [0x0000000c, 0x34],
      [0x0000000d, 0x12],
      [0x0000000e, 0x00],
      [0x0000000f, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x2000 },
      eip: 0x1234,
      registers: { esp: 0x0ffa }
    });
  });

  it("delivers real-mode UD2 through vector six with the faulting instruction pointer", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0x0b],
      [0x00000018, 0x34],
      [0x00000019, 0x12],
      [0x0000001a, 0x00],
      [0x0000001b, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x00000ad7);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x2000 },
      eip: 0x1234,
      registers: { esp: 0x0ffa },
      eflags: 0x000008d7
    });
    expect([values.get(0x0ffa), values.get(0x0ffb)]).toEqual([0xf0, 0xff]);
  });

  it("creates local and nested ENTER stack frames", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xc8],
      [0x000ffff1, 0x04],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0xc8],
      [0x000ffff5, 0x02],
      [0x000ffff6, 0x00],
      [0x000ffff7, 0x02],
      [0x00001ffe, 0xaa],
      [0x00001fff, 0xbb]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x2000);
    state.writeRegister16(5, 0x3000);
    const memory = resetAliasMemory(values);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebp: 0x1ffe, esp: 0x1ffa },
      eip: 0x0000fff4
    });
    state.writeRegister16(5, 0x2000);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebp: 0x1ff8, esp: 0x1ff2 },
      eip: 0x0000fff8
    });
  });

  it("delivers protected-mode UD2 through a 32-bit IDT gate with the faulting EIP", () => {
    const values = new Map<number, number>([
      [0x0000, 0x0f],
      [0x0001, 0x0b],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x2030, 0x34],
      [0x2031, 0x00],
      [0x2032, 0x08],
      [0x2033, 0x00],
      [0x2034, 0x00],
      [0x2035, 0x8e],
      [0x2036, 0x00],
      [0x2037, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x2000, 0x0037);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    state.writeEflags(0x00000302);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000034,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x2ff4 },
      eflags: 0x00000002
    });
    expect(Array.from({ length: 12 }, (_, offset) => values.get(0x2ff4 + offset))).toEqual([
      0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00
    ]);
  });

  it("delivers a protected-mode divide error through vector zero with the faulting EIP", () => {
    const values = new Map<number, number>([
      [0x0000, 0xf6],
      [0x0001, 0xf0],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x2000, 0x56],
      [0x2001, 0x00],
      [0x2002, 0x08],
      [0x2003, 0x00],
      [0x2004, 0x00],
      [0x2005, 0x8e],
      [0x2006, 0x00],
      [0x2007, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x2000, 0x0007);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    state.writeRegister8(0, 0);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000056,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x2ff4 }
    });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2ff4 + offset))).toEqual([
      0x00, 0x00, 0x00, 0x00
    ]);
  });

  it("checks signed BOUND memory limits and faults through vector five", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x62],
      [0x000ffff1, 0x06],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x20],
      [0x00002000, 0xfe],
      [0x00002001, 0xff],
      [0x00002002, 0x03],
      [0x00002003, 0x00],
      [0x00000014, 0x34],
      [0x00000015, 0x12],
      [0x00000016, 0x00],
      [0x00000017, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(0, 0xffff);
    const memory = resetAliasMemory(values);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff4, registers: { esp: 0x1000 } });
    state.reset();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(0, 4);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x2000 },
      eip: 0x1234,
      registers: { esp: 0x0ffa }
    });
  });

  it("delivers a protected-mode BOUND fault through vector five", () => {
    const values = new Map<number, number>([
      [0x0000, 0x62],
      [0x0001, 0x06],
      [0x0002, 0x00],
      [0x0003, 0x20],
      [0x2000, 0xfe],
      [0x2001, 0xff],
      [0x2002, 0x03],
      [0x2003, 0x00],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x3028, 0x78],
      [0x3029, 0x00],
      [0x302a, 0x08],
      [0x302b, 0x00],
      [0x302c, 0x00],
      [0x302d, 0x8e],
      [0x302e, 0x00],
      [0x302f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x3000, 0x002f);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 4);
    state.writeRegister(4, 0x4000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000078,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x3ff4 }
    });
  });

  it("checks 32-bit BOUND limits through an operand-size override", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x62],
      [0x0002, 0x06],
      [0x0003, 0x00],
      [0x0004, 0x20],
      [0x2000, 0xfe],
      [0x2001, 0xff],
      [0x2002, 0xff],
      [0x2003, 0xff],
      [0x2004, 0x03],
      [0x2005, 0x00],
      [0x2006, 0x00],
      [0x2007, 0x00],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x3028, 0x78],
      [0x3029, 0x00],
      [0x302a, 0x08],
      [0x302b, 0x00],
      [0x302c, 0x00],
      [0x302d, 0x8e],
      [0x302e, 0x00],
      [0x302f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x3000, 0x002f);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 4);
    state.writeRegister(4, 0x4000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000078,
      registers: { esp: 0x3ff4 }
    });
  });

  it("sign-extends EAX into EDX through operand-size-overridden CDQ", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x66],
      [0x000ffff1, 0x99],
      [0x000ffff2, 0x66],
      [0x000ffff3, 0x99]
    ]);
    const state = new Cpu386State();
    state.writeRegister(0, 0x80000000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0xffffffff }, eip: 0x0000fff2 });
    state.writeRegister(0, 0x7fffffff);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0 }, eip: 0x0000fff4 });
  });

  it("sign-extends AX into EAX through operand-size-overridden CWDE", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x66],
      [0x000ffff1, 0x98],
      [0x000ffff2, 0x66],
      [0x000ffff3, 0x98]
    ]);
    const state = new Cpu386State();
    state.writeRegister(0, 0x12348000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffff8000 }, eip: 0x0000fff2 });
    state.writeRegister(0, 0xabcd7fff);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00007fff }, eip: 0x0000fff4 });
  });

  it("calls and returns through a 32-bit protected-mode near-call frame", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0xe8],
      [0x0002, 0x00],
      [0x0003, 0x00],
      [0x0004, 0x00],
      [0x0005, 0x00],
      [0x0006, 0x66],
      [0x0007, 0xc3]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x00000006, registers: { esp: 0x2ffc } });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2ffc + offset))).toEqual([
      0x06, 0x00, 0x00, 0x00
    ]);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x00000006, registers: { esp: 0x3000 } });
  });

  it("cleans caller arguments through a 32-bit protected-mode near return", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0xe8],
      [0x0002, 0x00],
      [0x0003, 0x00],
      [0x0004, 0x00],
      [0x0005, 0x00],
      [0x0006, 0x66],
      [0x0007, 0xc2],
      [0x0008, 0x04],
      [0x0009, 0x00],
      [0x3000, 0xef],
      [0x3001, 0xbe],
      [0x3002, 0xad],
      [0x3003, 0xde]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({ eip: 0x00000006, registers: { esp: 0x3004 } });
  });

  it("saves and restores 32-bit registers through PUSHAD and POPAD", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x60],
      [0x0002, 0x66],
      [0x0003, 0x61]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    for (const [register, value] of [
      [0, 0x11111111],
      [1, 0x22222222],
      [2, 0x33333333],
      [3, 0x44444444],
      [5, 0x55555555],
      [6, 0x66666666],
      [7, 0x77777777]
    ])
      state.writeRegister(register, value);
    state.writeRegister(4, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x2fe0 } });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2fe0 + offset))).toEqual([
      0x77, 0x77, 0x77, 0x77
    ]);
    for (const register of [0, 1, 2, 3, 5, 6, 7]) state.writeRegister(register, 0);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: {
        eax: 0x11111111,
        ecx: 0x22222222,
        edx: 0x33333333,
        ebx: 0x44444444,
        esp: 0x3000,
        ebp: 0x55555555,
        esi: 0x66666666,
        edi: 0x77777777
      }
    });
  });

  it("pushes and pops 32-bit registers including ESP through operand-size overrides", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x50],
      [0x0002, 0x66],
      [0x0003, 0x54],
      [0x0004, 0x66],
      [0x0005, 0x5c],
      [0x0006, 0x66],
      [0x0007, 0x5b]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 0x12345678);
    state.writeRegister(4, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x2ff8 } });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2ff8 + offset))).toEqual([
      0xfc, 0x2f, 0x00, 0x00
    ]);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x2ffc } });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x12345678, esp: 0x3000 } });
  });

  it("increments and decrements 32-bit registers while preserving carry", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x66],
      [0x000ffff1, 0x40],
      [0x000ffff2, 0x66],
      [0x000ffff3, 0x48]
    ]);
    const state = new Cpu386State();
    state.writeRegister(0, 0x7fffffff);
    state.writeEflags(0x00000003);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80000000 }, eflags: 0x00000897 });
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x7fffffff }, eflags: 0x00000817 });
  });

  it("takes and skips 32-bit near conditional jumps through operand-size overrides", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x0f],
      [0x0002, 0x84],
      [0x0003, 0x01],
      [0x0004, 0x00],
      [0x0005, 0x00],
      [0x0006, 0x00]
    ]);
    const takenState = new Cpu386State();
    takenState.writeCr0(0x00000001);
    takenState.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    takenState.writeEflags(0x00000042);

    stepInstruction(resetAliasMemory(values), takenState);
    expect(takenState.snapshot().eip).toBe(0x00000008);

    const notTakenState = new Cpu386State();
    notTakenState.writeCr0(0x00000001);
    notTakenState.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    notTakenState.writeEflags(0x00000002);
    stepInstruction(resetAliasMemory(values), notTakenState);
    expect(notTakenState.snapshot().eip).toBe(0x00000007);
  });

  it("follows signed 32-bit near jumps through operand-size overrides", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0xe9],
      [0x0002, 0x02],
      [0x0003, 0x00],
      [0x0004, 0x00],
      [0x0005, 0x00],
      [0x0008, 0x66],
      [0x0009, 0xe9],
      [0x000a, 0xf8],
      [0x000b, 0xff],
      [0x000c, 0xff],
      [0x000d, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x00000008);
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x00000006);
  });

  it("adds and subtracts 32-bit ModR/M operands through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x03],
      [0x0002, 0xc3],
      [0x0003, 0x66],
      [0x0004, 0x29],
      [0x0005, 0x06],
      [0x0006, 0x00],
      [0x0007, 0x20],
      [0x0008, 0x66],
      [0x0009, 0x67],
      [0x000a, 0x01],
      [0x000b, 0x06],
      [0x2000, 0x10],
      [0x2001, 0x00],
      [0x2002, 0x00],
      [0x2003, 0x00],
      [0x12000, 0x01],
      [0x12001, 0x00],
      [0x12002, 0x00],
      [0x12003, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 3);
    state.writeRegister(3, 4);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(7);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2000 + offset))).toEqual([
      0x09, 0x00, 0x00, 0x00
    ]);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x08, 0x00, 0x00, 0x00
    ]);
  });

  it("adds and subtracts 32-bit ModR/M operands with carry through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x13],
      [0x0002, 0xc3],
      [0x0003, 0x66],
      [0x0004, 0x1b],
      [0x0005, 0xd8],
      [0x0006, 0x66],
      [0x0007, 0x19],
      [0x0008, 0x06],
      [0x0009, 0x00],
      [0x000a, 0x20],
      [0x000b, 0x66],
      [0x000c, 0x67],
      [0x000d, 0x11],
      [0x000e, 0x06],
      [0x2000, 0x00],
      [0x2001, 0x00],
      [0x2002, 0x00],
      [0x2003, 0x00],
      [0x12000, 0x01],
      [0x12001, 0x00],
      [0x12002, 0x00],
      [0x12003, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeEflags(0x00000003);
    state.writeRegister(0, 7);
    state.writeRegister(3, 4);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(12);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.ebx).toBe(0xfffffff8);
    expect(state.carryFlag()).toBe(true);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2000 + offset))).toEqual([
      0xf3, 0xff, 0xff, 0xff
    ]);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x0e, 0x00, 0x00, 0x00
    ]);
  });

  it("applies 32-bit ModR/M logical and compare operations through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x0b],
      [0x0002, 0xc3],
      [0x0003, 0x66],
      [0x0004, 0x21],
      [0x0005, 0x06],
      [0x0006, 0x00],
      [0x0007, 0x20],
      [0x0008, 0x66],
      [0x0009, 0x33],
      [0x000a, 0xc3],
      [0x000b, 0x66],
      [0x000c, 0x3b],
      [0x000d, 0xc3],
      [0x000e, 0x66],
      [0x000f, 0x67],
      [0x0010, 0x31],
      [0x0011, 0x06],
      [0x2000, 0xff],
      [0x2001, 0xff],
      [0x2002, 0xff],
      [0x2003, 0xff],
      [0x12000, 0x0f],
      [0x12001, 0x0f],
      [0x12002, 0x0f],
      [0x12003, 0x0f]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 0x0000ff00);
    state.writeRegister(3, 0x0f0f000f);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x0f0fff0f);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2000 + offset))).toEqual([
      0x0f, 0xff, 0x0f, 0x0f
    ]);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x0000ff00);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000ff00 }, eflags: 0x00000093 });
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x0f, 0xf0, 0x0f, 0x0f
    ]);
  });

  it("tests 32-bit ModR/M operands without modifying them through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x85],
      [0x0002, 0xc3],
      [0x0003, 0x66],
      [0x0004, 0x67],
      [0x0005, 0x85],
      [0x0006, 0x06],
      [0x12000, 0x00],
      [0x12001, 0x00],
      [0x12002, 0x00],
      [0x12003, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 0x80000000);
    state.writeRegister(3, 0x00000001);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x80000000, ebx: 0x00000001 },
      eflags: 0x00000046
    });
    state.writeRegister(3, 0x80000000);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x80000000 },
      eflags: 0x00000086
    });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x00, 0x00, 0x00, 0x80
    ]);
  });

  it("tests 32-bit immediate operands without modifying them through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0xf7],
      [0x0002, 0xc0],
      [0x0003, 0xff],
      [0x0004, 0xff],
      [0x0005, 0xff],
      [0x0006, 0x7f],
      [0x0007, 0x66],
      [0x0008, 0x67],
      [0x0009, 0xf7],
      [0x000a, 0x06],
      [0x000b, 0x00],
      [0x000c, 0x00],
      [0x000d, 0x00],
      [0x000e, 0x80],
      [0x12000, 0x00],
      [0x12001, 0x00],
      [0x12002, 0x00],
      [0x12003, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 0x80000000);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80000000 }, eflags: 0x00000046 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80000000 }, eflags: 0x00000086 });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x00, 0x00, 0x00, 0x80
    ]);
  });

  it("moves 32-bit immediates through ModR/M operands and both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0xc7],
      [0x0002, 0xc0],
      [0x0003, 0x78],
      [0x0004, 0x56],
      [0x0005, 0x34],
      [0x0006, 0x12],
      [0x0007, 0x66],
      [0x0008, 0x67],
      [0x0009, 0xc7],
      [0x000a, 0x06],
      [0x000b, 0xef],
      [0x000c, 0xcd],
      [0x000d, 0xab],
      [0x000e, 0x89]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x12345678);
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0xef, 0xcd, 0xab, 0x89
    ]);
  });

  it("zero- and sign-extends byte and word operands into 32-bit registers", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x0f],
      [0x0002, 0xb6],
      [0x0003, 0xc3],
      [0x0004, 0x66],
      [0x0005, 0x0f],
      [0x0006, 0xbe],
      [0x0007, 0xcb],
      [0x0008, 0x66],
      [0x0009, 0x0f],
      [0x000a, 0xb7],
      [0x000b, 0xc3],
      [0x000c, 0x66],
      [0x000d, 0x0f],
      [0x000e, 0xbf],
      [0x000f, 0xd3]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.writeRegister(3, 0x1234ff80);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x00000080);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.ecx).toBe(0xffffff80);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x0000ff80);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.edx).toBe(0xffffff80);
  });

  it("scans lowest and highest 32-bit set bits while preserving zero-source destinations", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x0f],
      [0x0002, 0xbc],
      [0x0003, 0xc3],
      [0x0004, 0x66],
      [0x0005, 0x0f],
      [0x0006, 0xbd],
      [0x0007, 0xc3],
      [0x0008, 0x66],
      [0x0009, 0x0f],
      [0x000a, 0xbc],
      [0x000b, 0xc3]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.writeRegister(3, 0x80000010);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 4 }, eflags: 0x00000002 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 31 }, eflags: 0x00000002 });
    state.writeRegister(3, 0);
    state.writeRegister(0, 0x12345678);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x12345678 }, eflags: 0x00000042 });
  });

  it("sign-extends memory bytes into 32-bit registers through address-size override", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x67],
      [0x0002, 0x0f],
      [0x0003, 0xbe],
      [0x0004, 0x06],
      [0x12000, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(6, 0x12000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot().registers.eax).toBe(0xffffff80);
  });

  it("pushes 32-bit immediate operands through the protected stack path", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x68],
      [0x0002, 0x78],
      [0x0003, 0x56],
      [0x0004, 0x34],
      [0x0005, 0x12],
      [0x0006, 0x66],
      [0x0007, 0x6a],
      [0x0008, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x200);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.esp).toBe(0x1fc);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x1fc + offset))).toEqual([
      0x78, 0x56, 0x34, 0x12
    ]);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.esp).toBe(0x1f8);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x1f8 + offset))).toEqual([
      0x80, 0xff, 0xff, 0xff
    ]);
  });

  it("loads 32-bit effective addresses without reading memory through both address sizes", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x8d],
      [0x0002, 0x40],
      [0x0003, 0x10],
      [0x0004, 0x66],
      [0x0005, 0x67],
      [0x0006, 0x8d],
      [0x0007, 0x46],
      [0x0008, 0x20]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.writeRegister16(3, 0x1000);
    state.writeRegister(6, 0x12340000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x1010);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(0x12340020);
  });

  it("loads and stores the task-register selector through protected-mode system instructions", () => {
    const values = new Map<number, number>([
      [0x0000, 0x0f],
      [0x0001, 0x00],
      [0x0002, 0xd8],
      [0x0003, 0x0f],
      [0x0004, 0x00],
      [0x0005, 0xc8],
      [0x1008, 0x67],
      [0x1009, 0x00],
      [0x100a, 0x00],
      [0x100b, 0x30],
      [0x100c, 0x12],
      [0x100d, 0x89],
      [0x100e, 0x00],
      [0x100f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.writeGdtr(0x1000, 0x0017);
    state.writeRegister16(0, 0x0008);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().tr).toEqual({
      selector: 0x0008,
      base: 0x00123000,
      limit: 0x00000067,
      default32: true
    });
    expect(values.get(0x100d)).toBe(0x8b);
    state.writeRegister16(0, 0);
    stepInstruction(memory, state);
    expect(state.snapshot().registers.eax & 0xffff).toBe(0x0008);
  });

  it("executes every 32-bit Group 1 immediate operation through both address sizes", () => {
    const code = [
      0x66, 0x81, 0xc0, 0x01, 0x00, 0x00, 0x00, 0x66, 0x81, 0xc8, 0x02, 0x00, 0x00, 0x00, 0x66,
      0x83, 0xd0, 0xff, 0x66, 0x83, 0xd8, 0x00, 0x66, 0x81, 0xe0, 0xff, 0xff, 0xff, 0xff, 0x66,
      0x83, 0xe8, 0x01, 0x66, 0x83, 0xf0, 0x01, 0x66, 0x83, 0xf8, 0x02, 0x66, 0x67, 0x83, 0x2e, 0xff
    ];
    const values = new Map<number, number>(code.map((value, address) => [address, value]));
    values.set(0x12000, 0x03);
    values.set(0x12001, 0x00);
    values.set(0x12002, 0x00);
    values.set(0x12003, 0x00);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.writeEflags(0x00000003);
    state.writeRegister(6, 0x12000);
    const memory = resetAliasMemory(values);

    for (let index = 0; index < 7; index += 1) stepInstruction(memory, state);
    expect(state.snapshot().registers.eax).toBe(1);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 1 }, eflags: 0x00000097 });
    stepInstruction(memory, state);
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x12000 + offset))).toEqual([
      0x04, 0x00, 0x00, 0x00
    ]);
  });

  it("checks 32-bit BOUND limits through operand and address-size overrides", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x67],
      [0x0002, 0x62],
      [0x0003, 0x06],
      [0x12000, 0xfe],
      [0x12001, 0xff],
      [0x12002, 0xff],
      [0x12003, 0xff],
      [0x12004, 0x03],
      [0x12005, 0x00],
      [0x12006, 0x00],
      [0x12007, 0x00],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x3028, 0x78],
      [0x3029, 0x00],
      [0x302a, 0x08],
      [0x302b, 0x00],
      [0x302c, 0x00],
      [0x302d, 0x8e],
      [0x302e, 0x00],
      [0x302f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x3000, 0x002f);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ds", 0x0010, 0, 0xffffffff, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(0, 4);
    state.writeRegister(6, 0x00012000);
    state.writeRegister(4, 0x4000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000078,
      registers: { esp: 0x3ff4 }
    });
  });

  it("multiplies signed register and memory operands through IMUL", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0xaf],
      [0x000ffff2, 0xd8],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0xaf],
      [0x000ffff5, 0x06],
      [0x000ffff6, 0x00],
      [0x000ffff7, 0x20],
      [0x00002000, 0x00],
      [0x00002001, 0x40]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 3);
    state.writeRegister16(0, 0xfffe);
    const memory = resetAliasMemory(values);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0xfffa }, eflags: 0x00000002 });
    state.writeRegister16(0, 2);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000803 });
  });

  it("tests, sets, resets, and complements register bits through 0F bit operations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0f],
      [0x000ffff1, 0xa3],
      [0x000ffff2, 0xd8],
      [0x000ffff3, 0x0f],
      [0x000ffff4, 0xab],
      [0x000ffff5, 0xd8],
      [0x000ffff6, 0x0f],
      [0x000ffff7, 0xb3],
      [0x000ffff8, 0xd8],
      [0x000ffff9, 0x0f],
      [0x000ffffa, 0xbb],
      [0x000ffffb, 0xd8]
    ]);
    const state = new Cpu386State();
    state.writeEflags(0x000008d7);
    state.writeRegister16(0, 0x8001);
    state.writeRegister16(3, 1);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x000008d6 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8003 }, eflags: 0x000008d6 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x000008d7 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8003 }, eflags: 0x000008d6 });
  });

  it("uses full signed register bit indexes for memory bit operations", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xa3],
      [0x00000002, 0x0e],
      [0x00000003, 0x00],
      [0x00000004, 0x20],
      [0x00000005, 0x0f],
      [0x00000006, 0xab],
      [0x00000007, 0x0e],
      [0x00000008, 0x00],
      [0x00000009, 0x20],
      [0x0000000a, 0x0f],
      [0x0000000b, 0xb3],
      [0x0000000c, 0x0e],
      [0x0000000d, 0x00],
      [0x0000000e, 0x20],
      [0x0000000f, 0x0f],
      [0x00000010, 0xbb],
      [0x00000011, 0x0e],
      [0x00000012, 0x00],
      [0x00000013, 0x20],
      [0x00002002, 0x02],
      [0x00002003, 0x00],
      [0x00001ffe, 0x00],
      [0x00001fff, 0x80]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(1, 17);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000003);
    stepInstruction(memory, state);
    expect([values.get(0x2002), values.get(0x2003)]).toEqual([0x02, 0x00]);
    stepInstruction(memory, state);
    expect([values.get(0x2002), values.get(0x2003)]).toEqual([0x00, 0x00]);
    stepInstruction(memory, state);
    expect([values.get(0x2002), values.get(0x2003)]).toEqual([0x02, 0x00]);

    state.writeRegister16(1, 0xffff);
    values.set(0x00000000, 0x0f);
    values.set(0x00000001, 0xb3);
    values.set(0x00000002, 0x0e);
    values.set(0x00000003, 0x00);
    values.set(0x00000004, 0x20);
    state.writeEip16(0);
    stepInstruction(memory, state);
    expect([values.get(0x1ffe), values.get(0x1fff)]).toEqual([0x00, 0x00]);
    expect(state.snapshot().eflags).toBe(0x00000003);
  });

  it("masks immediate Group 8 bit indexes without extending memory operands", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0xba],
      [0x00000002, 0xe0],
      [0x00000003, 0x1f],
      [0x00000004, 0x0f],
      [0x00000005, 0xba],
      [0x00000006, 0x2e],
      [0x00000007, 0x00],
      [0x00000008, 0x20],
      [0x00000009, 0x11],
      [0x0000000a, 0x0f],
      [0x0000000b, 0xba],
      [0x0000000c, 0xf0],
      [0x0000000d, 0x1f],
      [0x0000000e, 0x0f],
      [0x0000000f, 0xba],
      [0x00000010, 0xf8],
      [0x00000011, 0x1f],
      [0x00002000, 0x00],
      [0x00002001, 0x00],
      [0x00002002, 0x00],
      [0x00002003, 0x80]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeRegister16(0, 0x8000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000003 });
    stepInstruction(memory, state);
    expect([values.get(0x2000), values.get(0x2001)]).toEqual([0x02, 0x00]);
    expect([values.get(0x2002), values.get(0x2003)]).toEqual([0x00, 0x80]);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0 }, eflags: 0x00000003 });
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000002 });
  });

  it("writes every SETcc condition result without changing EFLAGS", () => {
    const conditions = [
      [0x90, 0x0800, 0x0000],
      [0x91, 0x0000, 0x0800],
      [0x92, 0x0001, 0x0000],
      [0x93, 0x0000, 0x0001],
      [0x94, 0x0040, 0x0000],
      [0x95, 0x0000, 0x0040],
      [0x96, 0x0001, 0x0000],
      [0x97, 0x0000, 0x0001],
      [0x98, 0x0080, 0x0000],
      [0x99, 0x0000, 0x0080],
      [0x9a, 0x0004, 0x0000],
      [0x9b, 0x0000, 0x0004],
      [0x9c, 0x0080, 0x0000],
      [0x9d, 0x0000, 0x0080],
      [0x9e, 0x0040, 0x0000],
      [0x9f, 0x0000, 0x0040]
    ];

    for (const [extension, trueFlags, falseFlags] of conditions) {
      for (const [flags, expected] of [
        [trueFlags, 1],
        [falseFlags, 0]
      ]) {
        const state = new Cpu386State();
        state.loadRealModeCodeSegment(0, 0);
        state.writeEflags(flags);
        stepInstruction(
          resetAliasMemory(
            new Map<number, number>([
              [0x00000000, 0x0f],
              [0x00000001, extension],
              [0x00000002, 0xc0]
            ])
          ),
          state
        );
        expect(state.snapshot()).toMatchObject({
          registers: { eax: expected },
          eflags: flags | 0x0002
        });
      }
    }
  });

  it("writes SETcc results through ModR/M memory operands", () => {
    const values = new Map<number, number>([
      [0x00000000, 0x0f],
      [0x00000001, 0x9f],
      [0x00000002, 0x06],
      [0x00000003, 0x00],
      [0x00000004, 0x20]
    ]);
    const state = new Cpu386State();
    state.loadRealModeCodeSegment(0, 0);
    state.writeEflags(0x00000002);

    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x2000)).toBe(1);
    expect(state.snapshot()).toMatchObject({ eflags: 0x00000002, eip: 5 });
  });

  it("pushes ES-overridden memory words through FF /6", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x35],
      [0x00002010, 0xef],
      [0x00002011, 0xbe]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0200);
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(7, 0x0010);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x0ffe }, eip: 0x0000fff3 });
    expect([values.get(0x0ffe), values.get(0x0fff)]).toEqual([0xef, 0xbe]);
  });

  it("pops stack words into default-segment ModR/M destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x8f],
      [0x000ffff1, 0x46],
      [0x000ffff2, 0x00],
      [0x00001000, 0x34],
      [0x00001001, 0x12]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(5, 0x2000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x1002 }, eip: 0x0000fff3 });
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x34, 0x12]);
  });

  it("pops stack words into ES-overridden ModR/M destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0x8f],
      [0x000ffff2, 0x05],
      [0x00001000, 0xef],
      [0x00001001, 0xbe]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0200);
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(7, 0x0010);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { esp: 0x1002 }, eip: 0x0000fff3 });
    expect([values.get(0x00002010), values.get(0x00002011)]).toEqual([0xef, 0xbe]);
  });

  it("adds word register and memory operands in both ModR/M directions", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x03],
      [0x000ffff1, 0xc3],
      [0x000ffff2, 0x01],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xff],
      [0x00002001, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x7fff);
    state.writeRegister16(3, 0x0001);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000896 });
    stepInstruction(memory, state);
    expect(state.snapshot().eflags).toBe(0x00000057);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0x00, 0x00]);
  });

  it("returns from real-mode far calls with optional stack cleanup", () => {
    const plainValues = new Map<number, number>([
      [0x000ffff0, 0xff],
      [0x000ffff1, 0x1e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x00001234, 0x78],
      [0x00001235, 0x56],
      [0x00001236, 0x00],
      [0x00001237, 0xf0],
      [0x000f5678, 0xcb]
    ]);
    const plainState = new Cpu386State();
    plainState.loadRealModeSegment("ss", 0);
    plainState.writeRegister16(4, 0x1000);
    const plainMemory = resetAliasMemory(plainValues);

    stepInstruction(plainMemory, plainState);
    stepInstruction(plainMemory, plainState);
    expect(plainState.snapshot()).toMatchObject({
      eip: 0xfff4,
      cs: { selector: 0xf000, base: 0x000f0000 },
      registers: { esp: 0x1000 }
    });

    const cleanupValues = new Map(plainValues);
    cleanupValues.set(0x000f5678, 0xca);
    cleanupValues.set(0x000f5679, 0x02);
    cleanupValues.set(0x000f567a, 0x00);
    const cleanupState = new Cpu386State();
    cleanupState.loadRealModeSegment("ss", 0);
    cleanupState.writeRegister16(4, 0x1000);
    const cleanupMemory = resetAliasMemory(cleanupValues);

    stepInstruction(cleanupMemory, cleanupState);
    stepInstruction(cleanupMemory, cleanupState);
    expect(cleanupState.snapshot()).toMatchObject({ eip: 0xfff4, registers: { esp: 0x1002 } });
  });

  it("loads AL from DS:SI and respects the direction flag", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xfd],
      [0x000ffff1, 0xac],
      [0x000ffff2, 0xfc],
      [0x000ffff3, 0xac],
      [0x00001600, 0xa5],
      [0x000015ff, 0x5a]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ds", 0x0040);
    state.writeRegister16(6, 0x1200);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x5a, esi: 0x1200 } });
  });

  it("ORs byte registers and memory sources while updating logic flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x0a],
      [0x000ffff1, 0xc0],
      [0x000ffff2, 0x0a],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x34],
      [0x000ffff5, 0x12],
      [0x00001234, 0x80]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80 }, eflags: 0x00000082 });
  });

  it("adds a 16-bit immediate value to AX with arithmetic flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x05],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x7fff);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000896 });
  });

  it("adds immediate byte values to AL with arithmetic flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x04],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x04],
      [0x000ffff3, 0x01]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x7f);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80 }, eflags: 0x00000892 });

    state.writeRegister8(0, 0xff);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00 }, eflags: 0x00000057 });
  });

  it("adds carry and an immediate word to AX", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x15],
      [0x000ffff1, 0x00],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x15],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0xffff);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000 }, eflags: 0x00000057 });

    state.writeRegister16(0, 0x7fff);
    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000 }, eflags: 0x00000896 });
  });

  it("subtracts immediate byte and word values from accumulator registers", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2c],
      [0x000ffff1, 0x03],
      [0x000ffff2, 0x2d],
      [0x000ffff3, 0x01],
      [0x000ffff4, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x0003);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000 }, eflags: 0x00000046 });

    state.writeRegister16(0, 0x0000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffff }, eflags: 0x00000097 });
  });

  it("ANDs AX with an immediate word using 16-bit logic flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x25],
      [0x000ffff1, 0x0f],
      [0x000ffff2, 0x0f],
      [0x000ffff3, 0x25],
      [0x000ffff4, 0xff],
      [0x000ffff5, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0xf0f0);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000 }, eflags: 0x00000046 });

    state.writeRegister16(0, 0x8001);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8001 }, eflags: 0x00000082 });
  });

  it("compares AX with immediate words without modifying the accumulator", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x3d],
      [0x000ffff1, 0x01],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0x3d],
      [0x000ffff4, 0x01],
      [0x000ffff5, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0xffff);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffff }, eflags: 0x00000082 });

    state.writeRegister16(0, 0x0000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000 }, eflags: 0x00000097 });
  });

  it("XORs AL with immediate bytes using logic flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x34],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xf0);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0f }, eflags: 0x00000006 });

    state.writeRegister8(0, 0x80);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80 }, eflags: 0x00000082 });
  });

  it("ANDs byte register destinations with register and memory sources", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x22],
      [0x000ffff1, 0xc3],
      [0x000ffff2, 0x22],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xf3);
    state.writeRegister8(3, 0x0f);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x03 }, eflags: 0x00000006 });

    state.writeRegister8(0, 0xf3);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x80 }, eflags: 0x00000082 });
  });

  it("ANDs byte register and memory destinations with register sources", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x20],
      [0x000ffff1, 0xc8],
      [0x000ffff2, 0x20],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xff);
    state.writeRegister8(1, 0x0f);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0f }, eflags: 0x00000006 });

    state.writeRegister8(0, 0xf0);
    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x00002000)).toBe(0xf0);
    expect(state.snapshot().eflags).toBe(0x00000086);
  });

  it("XORs byte register and memory destinations with register sources", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x30],
      [0x000ffff1, 0xc8],
      [0x000ffff2, 0x30],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xff);
    state.writeRegister8(1, 0x0f);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf0 }, eflags: 0x00000086 });

    state.writeRegister8(0, 0xf0);
    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x00002000)).toBe(0x00);
    expect(state.snapshot().eflags).toBe(0x00000046);
  });

  it("subtracts immediate bytes and carry from byte register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x80],
      [0x000ffff1, 0xdf],
      [0x000ffff2, 0x02],
      [0x000ffff3, 0x80],
      [0x000ffff4, 0x1e],
      [0x000ffff5, 0x00],
      [0x000ffff6, 0x20],
      [0x000ffff7, 0x00],
      [0x00002000, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(7, 0x05);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x00000200 }, eflags: 0x00000002 });

    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x00002000)).toBe(0xff);
    expect(state.snapshot().eflags).toBe(0x00000097);
  });

  it("subtracts ModR/M word sources and carry from word registers", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x1b],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x1b],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x01],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(7, 0x0000);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edi: 0x0000ffff }, eflags: 0x00000097 });

    state.writeRegister16(0, 0x0003);
    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00000001 }, eflags: 0x00000002 });
  });

  it("subtracts immediate values and carry from AL and AX", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x1c],
      [0x000ffff1, 0x27],
      [0x000ffff2, 0x1d],
      [0x000ffff3, 0x00],
      [0x000ffff4, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x30);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x08 }, eflags: 0x00000012 });

    state.writeRegister16(0, 0x0000);
    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xffff }, eflags: 0x00000097 });
  });

  it("adds ModR/M byte and word sources plus carry to registers", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x12],
      [0x000ffff1, 0x4f],
      [0x000ffff2, 0x3c],
      [0x000ffff3, 0x13],
      [0x000ffff4, 0xd1],
      [0x0000013c, 0x01]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x0100);
    state.writeRegister8(1, 0xfe);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0x00000000 }, eflags: 0x00000057 });

    state.writeRegister16(2, 0xffff);
    state.writeRegister16(1, 0x0000);
    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0x00000000 }, eflags: 0x00000057 });
  });

  it("adds immediate values and carry to AL and word register destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x14],
      [0x000ffff1, 0x40],
      [0x000ffff2, 0x83],
      [0x000ffff3, 0xd2],
      [0x000ffff4, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0xbf);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00 }, eflags: 0x00000057 });

    state.writeRegister16(2, 0xffff);
    state.setCarryFlag();
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0x00000000 }, eflags: 0x00000057 });
  });

  it("multiplies and divides byte operands through AX", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf6],
      [0x000ffff1, 0xe3],
      [0x000ffff2, 0xf6],
      [0x000ffff3, 0xf1]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x10);
    state.writeRegister8(3, 0x10);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00000100 }, eflags: 0x00000803 });

    state.writeRegister16(0, 0x0101);
    state.writeRegister8(1, 0x10);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot().registers.eax).toBe(0x00000110);
  });

  it("ANDs byte register destinations through an ES override", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0x22],
      [0x000ffff2, 0x3d],
      [0x00002010, 0xf0]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0200);
    state.writeRegister16(7, 0x0010);
    state.writeRegister8(7, 0x3f);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x00003000, edi: 0x00000010 },
      eip: 0x0000fff3
    });
    expect(state.snapshot().eflags).toBe(0x00000006);
  });

  it("XORs byte memory destinations through an ES override", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0x30],
      [0x000ffff2, 0x05],
      [0x00002010, 0x0f]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0200);
    state.writeRegister16(7, 0x0010);
    state.writeRegister8(0, 0xf0);

    stepInstruction(resetAliasMemory(values), state);

    expect(values.get(0x00002010)).toBe(0xff);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x000000f0 }, eip: 0x0000fff3 });
    expect(state.snapshot().eflags).toBe(0x00000086);
  });

  it("NOTs and NEGates byte register and memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf6],
      [0x000ffff1, 0xd0],
      [0x000ffff2, 0xf6],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x0f);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0xf0 }, eflags: 0x00000003 });

    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x00002000)).toBe(0x80);
    expect(state.snapshot().eflags).toBe(0x00000883);
  });

  it("NOTs and NEGates word register and memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf7],
      [0x000ffff1, 0xd3],
      [0x000ffff2, 0xf7],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x01],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x0f0f);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0xf0f0 }, eflags: 0x00000003 });

    stepInstruction(resetAliasMemory(values), state);
    expect([values.get(0x00002000), values.get(0x00002001)]).toEqual([0xff, 0xff]);
    expect(state.snapshot().eflags).toBe(0x00000097);
  });

  it("compares byte and word register destinations with ModR/M sources", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x3a],
      [0x000ffff1, 0xc3],
      [0x000ffff2, 0x3b],
      [0x000ffff3, 0x06],
      [0x000ffff4, 0x00],
      [0x000ffff5, 0x20],
      [0x00002000, 0x01],
      [0x00002001, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x03);
    state.writeRegister8(3, 0x02);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x03 }, eflags: 0x00000002 });

    state.writeRegister16(0, 0x0000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0000 }, eflags: 0x00000097 });
  });

  it("compares byte and word register destinations through CS overrides", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0x3a],
      [0x000ffff2, 0x24],
      [0x000ffff3, 0x2e],
      [0x000ffff4, 0x3b],
      [0x000ffff5, 0x54],
      [0x000ffff6, 0x01],
      [0x000f0010, 0x10],
      [0x000f0011, 0x01],
      [0x000f0012, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x0010);
    state.writeRegister8(4, 0x20);
    state.writeRegister16(2, 0x0000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x00002000 }, eflags: 0x00000002 });

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0x00000000 }, eflags: 0x00000097 });
  });

  it("executes byte add and subtract forms through registers, memory, and 80 groups", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x00],
      [0x000ffff1, 0x16],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x000ffff4, 0x02],
      [0x000ffff5, 0xc1],
      [0x000ffff6, 0x2a],
      [0x000ffff7, 0xc1],
      [0x000ffff8, 0x80],
      [0x000ffff9, 0xc2],
      [0x000ffffa, 0x30],
      [0x00001234, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x01);
    state.writeRegister8(1, 0x02);
    state.writeRegister8(2, 0x01);

    stepInstruction(resetAliasMemory(values), state);
    expect(values.get(0x00001234)).toBe(0x00);
    expect(state.snapshot().eflags).toBe(0x00000057);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x01, edx: 0x331 } });
  });

  it("executes immediate ADC and unsigned word multiply through accumulator registers", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x80],
      [0x000ffff1, 0xd2],
      [0x000ffff2, 0x00],
      [0x000ffff3, 0xf7],
      [0x000ffff4, 0xe3]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(2, 0xff);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0x0300 }, eflags: 0x00000057 });
    state.writeRegister16(0, 0x1000);
    state.writeRegister16(3, 0x0010);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x0000, edx: 0x0001 },
      eflags: 0x00000857
    });
  });

  it("rotates 8-bit registers through carry by one", () => {
    const rclValues = new Map<number, number>([
      [0x000ffff0, 0xd0],
      [0x000ffff1, 0xd0]
    ]);
    const rclState = new Cpu386State();
    rclState.writeRegister8(0, 0x80);
    rclState.setCarryFlag();

    stepInstruction(resetAliasMemory(rclValues), rclState);

    expect(rclState.snapshot()).toMatchObject({ registers: { eax: 0x01 }, eflags: 0x0803 });

    const rcrValues = new Map<number, number>([
      [0x000ffff0, 0xd0],
      [0x000ffff1, 0xdc]
    ]);
    const rcrState = new Cpu386State();
    rcrState.writeRegister8(4, 0x01);

    stepInstruction(resetAliasMemory(rcrValues), rcrState);

    expect(rcrState.snapshot()).toMatchObject({ registers: { eax: 0 }, eflags: 0x0803 });
  });

  it("rotates observed byte and word registers left through CL", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd2],
      [0x000ffff1, 0xc7],
      [0x000ffff2, 0xd3],
      [0x000ffff3, 0xc3]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(1, 1);
    state.writeRegister8(7, 0x80);
    state.writeRegister16(3, 0x8000);

    stepInstruction(resetAliasMemory(values), state);
    state.writeRegister16(3, 0x8000);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x0001 },
      eflags: 0x0803,
      eip: 0x0000fff4
    });
  });

  it("compares byte register sources with register and memory destinations", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x38],
      [0x000ffff1, 0xe9],
      [0x000ffff2, 0x38],
      [0x000ffff3, 0x2e],
      [0x000ffff4, 0x34],
      [0x000ffff5, 0x12],
      [0x00001234, 0x20]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(5, 0x20);
    state.writeRegister8(1, 0x20);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.zeroFlag()).toBe(true);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.zeroFlag()).toBe(true);
  });

  it("shifts 16-bit register and memory operands by one or an immediate count", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd1],
      [0x000ffff1, 0xe3],
      [0x000ffff2, 0xc1],
      [0x000ffff3, 0xe0],
      [0x000ffff4, 0x06],
      [0x000ffff5, 0xc1],
      [0x000ffff6, 0x26],
      [0x000ffff7, 0x34],
      [0x000ffff8, 0x12],
      [0x000ffff9, 0x01],
      [0x00001234, 0x01],
      [0x00001235, 0x80]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x8001);
    state.writeRegister16(0, 0x0001);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x0002 }, eflags: 0x00000803 });
    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x0040 } });
    expect([values.get(0x00001234), values.get(0x00001235)]).toEqual([0x02, 0x00]);
  });

  it("logically shifts 16-bit and 8-bit register operands right", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd1],
      [0x000ffff1, 0xe9],
      [0x000ffff2, 0xc0],
      [0x000ffff3, 0xef],
      [0x000ffff4, 0x04]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 0x8001);
    state.writeRegister8(7, 0x80);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0x4000 }, eflags: 0x00000007 });
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x0800 }, eflags: 0x00000002 });
  });

  it("divides DX:AX by word register operands and delivers real-mode divide faults", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf7],
      [0x000ffff1, 0xf3],
      [0x00000000, 0x34],
      [0x00000001, 0x12],
      [0x00000002, 0x00],
      [0x00000003, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(2, 0x0001);
    state.writeRegister16(0, 0x0000);
    state.writeRegister16(3, 0x0002);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x8000, edx: 0x0000 } });

    state.reset();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x00000302);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      registers: { esp: 0x0ffa },
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000 },
      eflags: 0x00000002
    });
    expect([values.get(0x0ffa), values.get(0x0ffb)]).toEqual([0xf0, 0xff]);

    state.reset();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    state.writeRegister16(3, 0x0001);
    state.writeRegister16(2, 0x0001);
    state.writeRegister16(0, 0x0000);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0x0ffa } });
  });

  it("accepts maskable external interrupts only when IF is set and wakes HLT", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf4],
      [0x00000020, 0x78],
      [0x00000021, 0x56],
      [0x00000022, 0x00],
      [0x00000023, 0xf0]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("ss", 0);
    state.writeRegister16(4, 0x1000);
    const memory = resetAliasMemory(values);

    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(false);
    expect(state.snapshot().eip).toBe(0x0000fff0);
    stepInstruction(memory, state);
    expect(state.snapshot().halted).toBe(true);
    state.setInterruptFlag();
    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(true);
    expect(state.snapshot()).toMatchObject({
      eip: 0x5678,
      cs: { selector: 0xf000, base: 0x000f0000 },
      registers: { esp: 0x0ffa },
      halted: false,
      eflags: 0x00000002
    });
    expect([values.get(0x0ffa), values.get(0x0ffb)]).toEqual([0xf1, 0xff]);
  });

  it("delivers a protected-mode external interrupt through a 32-bit IDT gate", () => {
    const values = new Map<number, number>([
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x2040, 0x34],
      [0x2041, 0x00],
      [0x2042, 0x08],
      [0x2043, 0x00],
      [0x2044, 0x00],
      [0x2045, 0x8e],
      [0x2046, 0x00],
      [0x2047, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x2000, 0x0047);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0x12345678, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    state.writeEflags(0x00000302);
    state.halt();
    const memory = resetAliasMemory(values);

    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(true);
    expect(state.snapshot()).toMatchObject({
      eip: 0x00000034,
      cs: { selector: 0x0008, base: 0, limit: 0xffffffff, default32: true },
      registers: { esp: 0x2ff4 },
      eflags: 0x00000002,
      halted: false
    });
    expect(Array.from({ length: 12 }, (_, offset) => values.get(0x2ff4 + offset))).toEqual([
      0x78, 0x56, 0x34, 0x12, 0x08, 0x00, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00
    ]);
  });

  it("switches to the TSS privilege stack for a higher-privilege 32-bit interrupt gate", () => {
    const values = new Map<number, number>([
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x1010, 0xff],
      [0x1011, 0xff],
      [0x1012, 0x00],
      [0x1013, 0x00],
      [0x1014, 0x00],
      [0x1015, 0x92],
      [0x1016, 0xcf],
      [0x1017, 0x00],
      [0x1018, 0xff],
      [0x1019, 0xff],
      [0x101a, 0x00],
      [0x101b, 0x00],
      [0x101c, 0x00],
      [0x101d, 0xfa],
      [0x101e, 0xcf],
      [0x101f, 0x00],
      [0x1020, 0xff],
      [0x1021, 0xff],
      [0x1022, 0x00],
      [0x1023, 0x00],
      [0x1024, 0x00],
      [0x1025, 0xf2],
      [0x1026, 0xcf],
      [0x1027, 0x00],
      [0x2040, 0x34],
      [0x2041, 0x00],
      [0x2042, 0x08],
      [0x2043, 0x00],
      [0x2044, 0x00],
      [0x2045, 0x8e],
      [0x2046, 0x00],
      [0x2047, 0x00],
      [0x3004, 0x00],
      [0x3005, 0x40],
      [0x3006, 0x00],
      [0x3007, 0x00],
      [0x3008, 0x10],
      [0x3009, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x0027);
    state.writeIdtr(0x2000, 0x0047);
    state.loadProtectedModeCodeSegment(0x001b, 0, 0xffffffff, 0x12345678, true);
    state.loadProtectedModeSegment("ss", 0x0023, 0, 0xffffffff, true);
    state.loadTaskRegister(0x0028, 0x3000, 0x67, true);
    state.writeRegister(4, 0x2000);
    state.writeEflags(0x00000302);

    expect(serviceExternalInterrupt(resetAliasMemory(values), state, 0x08)).toBe(true);
    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x0008 },
      ss: { selector: 0x0010 },
      eip: 0x34,
      registers: { esp: 0x3fec },
      eflags: 0x00000002
    });
    expect(Array.from({ length: 20 }, (_, offset) => values.get(0x3fec + offset))).toEqual([
      0x78, 0x56, 0x34, 0x12, 0x1b, 0x00, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00, 0x20, 0x00,
      0x00, 0x23, 0x00, 0x00, 0x00
    ]);
  });

  it("round-trips a higher-privilege 32-bit interrupt through its TSS stack frame", () => {
    const values = new Map<number, number>([
      [0x0034, 0xcf],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x1010, 0xff],
      [0x1011, 0xff],
      [0x1012, 0x00],
      [0x1013, 0x00],
      [0x1014, 0x00],
      [0x1015, 0x92],
      [0x1016, 0xcf],
      [0x1017, 0x00],
      [0x1018, 0xff],
      [0x1019, 0xff],
      [0x101a, 0x00],
      [0x101b, 0x00],
      [0x101c, 0x00],
      [0x101d, 0xfa],
      [0x101e, 0xcf],
      [0x101f, 0x00],
      [0x1020, 0xff],
      [0x1021, 0xff],
      [0x1022, 0x00],
      [0x1023, 0x00],
      [0x1024, 0x00],
      [0x1025, 0xf2],
      [0x1026, 0xcf],
      [0x1027, 0x00],
      [0x2040, 0x34],
      [0x2041, 0x00],
      [0x2042, 0x08],
      [0x2043, 0x00],
      [0x2044, 0x00],
      [0x2045, 0x8e],
      [0x2046, 0x00],
      [0x2047, 0x00],
      [0x3004, 0x00],
      [0x3005, 0x40],
      [0x3006, 0x00],
      [0x3007, 0x00],
      [0x3008, 0x10],
      [0x3009, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x0027);
    state.writeIdtr(0x2000, 0x0047);
    state.loadProtectedModeCodeSegment(0x001b, 0, 0xffffffff, 0x12345678, true);
    state.loadProtectedModeSegment("ss", 0x0023, 0, 0xffffffff, true);
    state.loadTaskRegister(0x0028, 0x3000, 0x67, true);
    state.writeRegister(4, 0x2000);
    state.writeEflags(0x00000302);
    const memory = resetAliasMemory(values);

    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(true);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x001b },
      ss: { selector: 0x0023 },
      eip: 0x12345678,
      registers: { esp: 0x2000 },
      eflags: 0x00000302
    });
  });

  it("delivers and returns through a same-privilege 16-bit protected-mode interrupt gate", () => {
    const values = new Map<number, number>([
      [0x0034, 0xcf],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0x8f],
      [0x100f, 0x00],
      [0x2040, 0x34],
      [0x2041, 0x00],
      [0x2042, 0x08],
      [0x2043, 0x00],
      [0x2044, 0x00],
      [0x2045, 0x86],
      [0x2046, 0x00],
      [0x2047, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x2000, 0x0047);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0x1234, false);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, false);
    state.writeRegister16(4, 0x3000);
    state.writeEflags(0x00000302);
    const memory = resetAliasMemory(values);

    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(true);
    expect(state.snapshot()).toMatchObject({
      eip: 0x0034,
      cs: { selector: 0x0008, default32: false },
      registers: { esp: 0x2ffa },
      eflags: 0x00000002
    });
    expect(Array.from({ length: 6 }, (_, offset) => values.get(0x2ffa + offset))).toEqual([
      0x34, 0x12, 0x08, 0x00, 0x02, 0x03
    ]);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0x0008, default32: false },
      registers: { esp: 0x3000 },
      eflags: 0x00000302
    });
  });

  it("delivers a ring-three software interrupt through an eligible 32-bit gate", () => {
    const values = new Map<number, number>([
      [0x0000, 0xcd],
      [0x0001, 0x80],
      [0x1018, 0xff],
      [0x1019, 0xff],
      [0x101a, 0x00],
      [0x101b, 0x00],
      [0x101c, 0x00],
      [0x101d, 0xfa],
      [0x101e, 0xcf],
      [0x101f, 0x00],
      [0x2400, 0x34],
      [0x2401, 0x00],
      [0x2402, 0x1b],
      [0x2403, 0x00],
      [0x2404, 0x00],
      [0x2405, 0xee],
      [0x2406, 0x00],
      [0x2407, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x001f);
    state.writeIdtr(0x2000, 0x0407);
    state.loadProtectedModeCodeSegment(0x001b, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0023, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    state.writeEflags(0x00000302);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x00000034,
      cs: { selector: 0x001b, default32: true },
      registers: { esp: 0x2ff4 },
      eflags: 0x00000002
    });
    expect(Array.from({ length: 12 }, (_, offset) => values.get(0x2ff4 + offset))).toEqual([
      0x02, 0x00, 0x00, 0x00, 0x1b, 0x00, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00
    ]);
  });

  it("preserves IF while clearing TF through a protected-mode trap gate", () => {
    const values = new Map<number, number>([
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x2040, 0x34],
      [0x2041, 0x00],
      [0x2042, 0x08],
      [0x2043, 0x00],
      [0x2044, 0x00],
      [0x2045, 0x8f],
      [0x2046, 0x00],
      [0x2047, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.writeIdtr(0x2000, 0x0047);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0x12345678, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);
    state.writeEflags(0x00000302);
    const memory = resetAliasMemory(values);

    expect(serviceExternalInterrupt(memory, state, 0x08)).toBe(true);
    expect(state.snapshot()).toMatchObject({
      eip: 0x00000034,
      registers: { esp: 0x2ff4 },
      eflags: 0x00000202
    });
    expect(Array.from({ length: 4 }, (_, offset) => values.get(0x2ffc + offset))).toEqual([
      0x02, 0x03, 0x00, 0x00
    ]);
  });

  it("returns from a same-privilege 32-bit protected-mode interrupt frame", () => {
    const values = new Map<number, number>([
      [0x0000, 0xcf],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x2ff4, 0x78],
      [0x2ff5, 0x56],
      [0x2ff6, 0x34],
      [0x2ff7, 0x12],
      [0x2ff8, 0x08],
      [0x2ff9, 0x00],
      [0x2ffa, 0x00],
      [0x2ffb, 0x00],
      [0x2ffc, 0x02],
      [0x2ffd, 0x03],
      [0x2ffe, 0x00],
      [0x2fff, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x2ff4);
    state.writeEflags(0x00000002);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      eip: 0x12345678,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x3000 },
      eflags: 0x00000302
    });
  });

  it("returns from a higher-privilege 32-bit interrupt frame to its prior stack", () => {
    const values = new Map<number, number>([
      [0x0000, 0xcf],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00],
      [0x1010, 0xff],
      [0x1011, 0xff],
      [0x1012, 0x00],
      [0x1013, 0x00],
      [0x1014, 0x00],
      [0x1015, 0x92],
      [0x1016, 0xcf],
      [0x1017, 0x00],
      [0x1018, 0xff],
      [0x1019, 0xff],
      [0x101a, 0x00],
      [0x101b, 0x00],
      [0x101c, 0x00],
      [0x101d, 0xfa],
      [0x101e, 0xcf],
      [0x101f, 0x00],
      [0x1020, 0xff],
      [0x1021, 0xff],
      [0x1022, 0x00],
      [0x1023, 0x00],
      [0x1024, 0x00],
      [0x1025, 0xf2],
      [0x1026, 0xcf],
      [0x1027, 0x00],
      [0x3fec, 0x78],
      [0x3fed, 0x56],
      [0x3fee, 0x34],
      [0x3fef, 0x12],
      [0x3ff0, 0x1b],
      [0x3ff1, 0x00],
      [0x3ff2, 0x00],
      [0x3ff3, 0x00],
      [0x3ff4, 0x02],
      [0x3ff5, 0x03],
      [0x3ff6, 0x00],
      [0x3ff7, 0x00],
      [0x3ff8, 0x00],
      [0x3ff9, 0x20],
      [0x3ffa, 0x00],
      [0x3ffb, 0x00],
      [0x3ffc, 0x23],
      [0x3ffd, 0x00],
      [0x3ffe, 0x00],
      [0x3fff, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x0027);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3fec);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      cs: { selector: 0x001b },
      ss: { selector: 0x0023 },
      eip: 0x12345678,
      registers: { esp: 0x2000 },
      eflags: 0x00000302
    });
  });

  it("calls and returns within a same-privilege 32-bit protected-mode code segment", () => {
    const values = new Map<number, number>([
      [0x0000, 0x66],
      [0x0001, 0x9a],
      [0x0002, 0x00],
      [0x0003, 0x02],
      [0x0004, 0x00],
      [0x0005, 0x00],
      [0x0006, 0x08],
      [0x0007, 0x00],
      [0x0200, 0x66],
      [0x0201, 0xcb],
      [0x1008, 0xff],
      [0x1009, 0xff],
      [0x100a, 0x00],
      [0x100b, 0x00],
      [0x100c, 0x00],
      [0x100d, 0x9a],
      [0x100e, 0xcf],
      [0x100f, 0x00]
    ]);
    const state = new Cpu386State();
    state.writeCr0(0x00000001);
    state.writeGdtr(0x1000, 0x000f);
    state.loadProtectedModeCodeSegment(0x0008, 0, 0xffffffff, 0, true);
    state.loadProtectedModeSegment("ss", 0x0010, 0, 0xffffffff, true);
    state.writeRegister(4, 0x3000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x00000200,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x2ff8 }
    });
    expect(Array.from({ length: 8 }, (_, offset) => values.get(0x2ff8 + offset))).toEqual([
      0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00
    ]);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x00000008,
      cs: { selector: 0x0008, default32: true },
      registers: { esp: 0x3000 }
    });
  });

  it("exchanges 8-bit and 16-bit register or memory operands without changing flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x86],
      [0x000ffff1, 0xfb],
      [0x000ffff2, 0x87],
      [0x000ffff3, 0x1e],
      [0x000ffff4, 0x34],
      [0x000ffff5, 0x12],
      [0x00001234, 0xef],
      [0x00001235, 0xbe]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x1234);
    state.writeEflags(0x00000ad7);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x3412 }, eflags: 0x00000ad7 });
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0xbeef }, eflags: 0x00000ad7 });
    expect([values.get(0x00001234), values.get(0x00001235)]).toEqual([0x12, 0x34]);
  });

  it("exchanges AX with short-encoded general registers without changing flags", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x93],
      [0x000ffff1, 0x97]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x1234);
    state.writeRegister16(3, 0x5678);
    state.writeRegister16(7, 0x9abc);
    state.writeEflags(0x00000ad7);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x9abc, ebx: 0x1234, edi: 0x5678 },
      eflags: 0x00000ad7,
      eip: 0x0000fff2
    });
  });

  it("compares 16-bit register and memory operands with sign-extended bytes", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x83],
      [0x000ffff1, 0xfa],
      [0x000ffff2, 0x20],
      [0x000ffff3, 0x83],
      [0x000ffff4, 0x3e],
      [0x000ffff5, 0x34],
      [0x000ffff6, 0x12],
      [0x000ffff7, 0xff],
      [0x00001234, 0xff],
      [0x00001235, 0xff]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(2, 0x0020);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.zeroFlag()).toBe(true);
    stepInstruction(resetAliasMemory(values), state);
    expect(state.zeroFlag()).toBe(true);
  });

  it("writes immediate byte and word values through ModR/M memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xc6],
      [0x000ffff1, 0x06],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12],
      [0x000ffff4, 0xa5],
      [0x000ffff5, 0xc7],
      [0x000ffff6, 0x46],
      [0x000ffff7, 0x02],
      [0x000ffff8, 0x78],
      [0x000ffff9, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(5, 0x2000);
    state.loadRealModeSegment("ss", 0);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect([values.get(0x00001234), values.get(0x00002002), values.get(0x00002003)]).toEqual([
      0xa5, 0x78, 0x56
    ]);
    expect(state.snapshot().eip).toBe(0x0000fffa);
  });

  it("writes immediate values through ES-overridden ModR/M memory operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0xc6],
      [0x000ffff2, 0x07],
      [0x000ffff3, 0xa5],
      [0x000ffff4, 0x26],
      [0x000ffff5, 0xc7],
      [0x000ffff6, 0x47],
      [0x000ffff7, 0x02],
      [0x000ffff8, 0x78],
      [0x000ffff9, 0x56]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0040);
    state.writeRegister16(3, 0x1200);

    stepInstruction(resetAliasMemory(values), state);
    stepInstruction(resetAliasMemory(values), state);

    expect([values.get(0x00001600), values.get(0x00001602), values.get(0x00001603)]).toEqual([
      0xa5, 0x78, 0x56
    ]);
    expect(state.snapshot().eip).toBe(0x0000fffa);
  });

  it("loads a 16-bit register through an ES-overridden memory operand", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x26],
      [0x000ffff1, 0x8b],
      [0x000ffff2, 0x1f],
      [0x00001600, 0x78],
      [0x00001601, 0x56]
    ]);
    const state = new Cpu386State();
    state.loadRealModeSegment("es", 0x0040);
    state.writeRegister16(3, 0x1200);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0x5678 }, eip: 0x0000fff3 });
  });

  it("stores a 16-bit register through direct and BP-based memory operands", () => {
    const directValues = new Map<number, number>([
      [0x000ffff0, 0x89],
      [0x000ffff1, 0x1e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12]
    ]);
    const directState = new Cpu386State();
    directState.writeRegister16(3, 0x5678);
    stepInstruction(resetAliasMemory(directValues), directState);
    expect([directValues.get(0x1234), directValues.get(0x1235)]).toEqual([0x78, 0x56]);

    const stackValues = new Map<number, number>([
      [0x000ffff0, 0x89],
      [0x000ffff1, 0x4e],
      [0x000ffff2, 0x02]
    ]);
    const stackState = new Cpu386State();
    stackState.writeRegister16(1, 0x9abc);
    stackState.writeRegister16(5, 0x2000);
    stepInstruction(resetAliasMemory(stackValues), stackState);
    expect([stackValues.get(0x2002), stackValues.get(0x2003)]).toEqual([0xbc, 0x9a]);
  });

  it("moves 8-bit values between registers and direct memory operands", () => {
    const registerValues = new Map<number, number>([
      [0x000ffff0, 0x8a],
      [0x000ffff1, 0xe0]
    ]);
    const registerState = new Cpu386State();
    registerState.writeRegister8(0, 0x5a);
    stepInstruction(resetAliasMemory(registerValues), registerState);
    expect(registerState.snapshot().registers.eax).toBe(0x5a5a);

    const memoryValues = new Map<number, number>([
      [0x000ffff0, 0x88],
      [0x000ffff1, 0x0e],
      [0x000ffff2, 0x34],
      [0x000ffff3, 0x12]
    ]);
    const memoryState = new Cpu386State();
    memoryState.writeRegister8(1, 0xa5);
    stepInstruction(resetAliasMemory(memoryValues), memoryState);
    expect(memoryValues.get(0x1234)).toBe(0xa5);
  });

  it("loads a 16-bit register through the observed CS-overridden ROM address", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0x8b],
      [0x000ffff2, 0xb7],
      [0x000ffff3, 0xe7],
      [0x000ffff4, 0xf8],
      [0x000ff8e7, 0x95],
      [0x000ff8e8, 0xba]
    ]);
    const state = new Cpu386State();

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { esi: 0xba95 }, eip: 0x0000fff5 });
  });

  it("compares a register byte with an immediate value through 80 /7", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x80],
      [0x000ffff1, 0xfb],
      [0x000ffff2, 0x09]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister8(3, 0x09);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: { ebx: 0x09 },
      eflags: 0x00000046,
      eip: 0x0000fff3
    });
  });

  it("compares a 16-bit memory operand with an immediate through 81 /7", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x81],
      [0x000ffff1, 0x3f],
      [0x000ffff2, 0xaa],
      [0x000ffff3, 0x55],
      [0x00001000, 0xaa],
      [0x00001001, 0x55]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x1000);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff4, eflags: 0x00000046 });
  });

  it("executes register-direct byte XOR and follows JBE on carry", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x32],
      [0x000ffff1, 0xff],
      [0x000ffff2, 0x76],
      [0x000ffff3, 0x02]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister8(7, 0x55);
    state.writeCompareFlags8(0x08, 0x09);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { edi: 0 }, eip: 0x0000fff2 });
    state.writeCompareFlags8(0x08, 0x09);
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff6);
  });

  it("executes SHL r8, 1 and branches with JCXZ", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd0],
      [0x000ffff1, 0xe3],
      [0x000ffff2, 0xe3],
      [0x000ffff3, 0x02]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();
    state.writeRegister8(3, 0x80);
    state.writeRegister16(1, 0);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ebx: 0 }, eflags: 0x00000847 });
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff6);
  });

  it("follows signed short and near real-mode jumps", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xeb],
      [0x000ffff1, 0x04],
      [0x000ffff6, 0xe9],
      [0x000ffff7, 0xf7],
      [0x000ffff8, 0xff]
    ]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff6);
    stepInstruction(memory, state);
    expect(state.snapshot().eip).toBe(0x0000fff0);
  });

  it("uses SS:SP for near CALL and RET", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xe8],
      [0x000ffff1, 0x03],
      [0x000ffff2, 0x00],
      [0x000ffff6, 0xc3]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(4, 0x1000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff6, registers: { esp: 0x0ffe } });
    expect([values.get(0x0ffe), values.get(0x0fff)]).toEqual([0xf3, 0xff]);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ eip: 0x0000fff3, registers: { esp: 0x1000 } });
  });

  it("delivers a real-mode software interrupt through the IVT and stack", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xcd],
      [0x000ffff1, 0x10],
      [0x00000040, 0x34],
      [0x00000041, 0x12],
      [0x00000042, 0x00],
      [0x00000043, 0xf0]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(4, 0x1000);
    state.writeEflags(0x00000202);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      eflags: 0x00000002,
      cs: { selector: 0xf000, base: 0x000f0000 },
      registers: { esp: 0x0ffa }
    });
    expect([values.get(0x0ffa), values.get(0x0ffb)]).toEqual([0xf2, 0xff]);
    expect([values.get(0x0ffc), values.get(0x0ffd)]).toEqual([0x00, 0xf0]);
    expect([values.get(0x0ffe), values.get(0x0fff)]).toEqual([0x02, 0x02]);
  });

  it("returns from a real-mode interrupt through IRET", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xcf]]);
    const state = new Cpu386State();
    state.writeRegister16(4, 0x0ffa);
    const memory = resetAliasMemory(values);
    memory.writeUint8(0x0ffa, 0x34);
    memory.writeUint8(0x0ffb, 0x12);
    memory.writeUint8(0x0ffc, 0x00);
    memory.writeUint8(0x0ffd, 0xf0);
    memory.writeUint8(0x0ffe, 0x02);
    memory.writeUint8(0x0fff, 0x02);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      eflags: 0x00000202,
      cs: { selector: 0xf000, base: 0x000f0000 },
      registers: { esp: 0x1000 }
    });
  });

  it("pushes and pops 16-bit general registers through SS:SP", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x53],
      [0x000ffff1, 0x59]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0xbeef);
    state.writeRegister16(4, 0x1000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect([values.get(0x0ffe), values.get(0x0fff)]).toEqual([0xef, 0xbe]);
    state.writeRegister16(3, 0);
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0xbeef, esp: 0x1000 } });
  });

  it("increments and decrements 16-bit registers without changing carry", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x42],
      [0x000ffff1, 0x4a]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(2, 0xffff);
    state.writeEflags(0x00000003);

    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0 }, eflags: 0x00000057 });
    stepInstruction(resetAliasMemory(values), state);
    expect(state.snapshot()).toMatchObject({ registers: { edx: 0xffff }, eflags: 0x00000097 });
  });

  it("preserves general registers through PUSHA and POPA", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x60],
      [0x000ffff1, 0x61]
    ]);
    const state = new Cpu386State();
    for (let register = 0; register < 8; register += 1)
      state.writeRegister16(register, 0x1000 + register);
    state.writeRegister16(4, 0x2000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    for (let register = 0; register < 8; register += 1) {
      if (register !== 4) state.writeRegister16(register, 0);
    }
    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({
      registers: {
        eax: 0x1000,
        ecx: 0x1001,
        edx: 0x1002,
        ebx: 0x1003,
        esp: 0x2000,
        ebp: 0x1005,
        esi: 0x1006,
        edi: 0x1007
      }
    });
  });

  it("clears direction and repeats STOSW through ES:DI", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xfc],
      [0x000ffff1, 0xf3],
      [0x000ffff2, 0xab]
    ]);
    const state = new Cpu386State();
    state.setDirectionFlag();
    state.writeRegister16(0, 0x1234);
    state.writeRegister16(1, 2);
    state.writeRegister16(7, 0x0100);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    expect([values.get(0x100), values.get(0x101), values.get(0x102), values.get(0x103)]).toEqual([
      0x34, 0x12, 0x34, 0x12
    ]);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0, edi: 0x0104 } });
  });

  it("repeats MOVSW from DS:SI to ES:DI", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf3],
      [0x000ffff1, 0xa5],
      [0x00002000, 0x34],
      [0x00002001, 0x12],
      [0x00002002, 0x78],
      [0x00002003, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 2);
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);

    stepInstruction(resetAliasMemory(values), state);
    expect([
      values.get(0x3000),
      values.get(0x3001),
      values.get(0x3002),
      values.get(0x3003)
    ]).toEqual([0x34, 0x12, 0x78, 0x56]);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0, esi: 0x2004, edi: 0x3004 } });
  });

  it("repeats MOVSB and STOSB through their byte operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf3],
      [0x000ffff1, 0xa4],
      [0x000ffff2, 0xf3],
      [0x000ffff3, 0xaa],
      [0x00002000, 0x34],
      [0x00002001, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 2);
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    state.writeRegister16(0, 0x0078);
    state.writeRegister16(1, 2);
    stepInstruction(memory, state);

    expect([
      values.get(0x3000),
      values.get(0x3001),
      values.get(0x3002),
      values.get(0x3003)
    ]).toEqual([0x34, 0x56, 0x78, 0x78]);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0, esi: 0x2002, edi: 0x3004 } });
  });

  it("moves and stores byte and word string operands once", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa4],
      [0x000ffff1, 0xa5],
      [0x000ffff2, 0xaa],
      [0x000ffff3, 0xab],
      [0x00002000, 0x34],
      [0x00002001, 0x78],
      [0x00002002, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    stepInstruction(memory, state);
    state.writeRegister16(0, 0x9abc);
    stepInstruction(memory, state);
    stepInstruction(memory, state);

    expect([
      values.get(0x3000),
      values.get(0x3001),
      values.get(0x3002),
      values.get(0x3003),
      values.get(0x3004),
      values.get(0x3005)
    ]).toEqual([0x34, 0x78, 0x56, 0xbc, 0xbc, 0x9a]);
    expect(state.snapshot()).toMatchObject({ registers: { esi: 0x2003, edi: 0x3006 } });
  });

  it("compares and scans unprefixed byte and word string operands", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xa6],
      [0x000ffff1, 0xaf],
      [0x00002000, 0x12],
      [0x00003000, 0x12],
      [0x00003001, 0x34],
      [0x00003002, 0x12]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    state.writeRegister16(0, 0x1234);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({
      registers: { esi: 0x2001, edi: 0x3003 },
      eflags: 0x0046
    });
  });

  it("repeats CMPSW while equal and SCASB while not equal", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf3],
      [0x000ffff1, 0xa7],
      [0x000ffff2, 0xf2],
      [0x000ffff3, 0xae],
      [0x00002000, 0x01],
      [0x00002001, 0x00],
      [0x00002002, 0x02],
      [0x00002003, 0x00],
      [0x00003000, 0x01],
      [0x00003001, 0x00],
      [0x00003002, 0x03],
      [0x00003003, 0x00],
      [0x00004000, 0x01],
      [0x00004001, 0x02]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 2);
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    expect(state.snapshot()).toMatchObject({ registers: { ecx: 0, esi: 0x2004, edi: 0x3004 } });

    state.writeRegister8(0, 0x02);
    state.writeRegister16(1, 3);
    state.writeRegister16(7, 0x4000);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({ registers: { ecx: 1, edi: 0x4002 }, eflags: 0x0046 });
  });

  it("uses CS as the observed source segment for REP MOVSW", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xf3],
      [0x000ffff1, 0x2e],
      [0x000ffff2, 0xa5],
      [0x000f2000, 0x34],
      [0x000f2001, 0x12],
      [0x000f2002, 0x78],
      [0x000f2003, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(1, 2);
    state.writeRegister16(6, 0x2000);
    state.writeRegister16(7, 0x3000);

    stepInstruction(resetAliasMemory(values), state);

    expect([
      values.get(0x3000),
      values.get(0x3001),
      values.get(0x3002),
      values.get(0x3003)
    ]).toEqual([0x34, 0x12, 0x78, 0x56]);
    expect(state.snapshot()).toMatchObject({
      eip: 0x0000fff3,
      registers: { ecx: 0, esi: 0x2004, edi: 0x3004 }
    });
  });

  it("loads a word through CS:SI for the observed CS LODSW form", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0xad],
      [0x000f2000, 0x34],
      [0x000f2001, 0x12]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(6, 0x2000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x1234, esi: 0x2002 } });
  });

  it("loads and stores AL through the observed CS moffs byte forms", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0xa0],
      [0x000ffff2, 0xfe],
      [0x000ffff3, 0xff],
      [0x000ffff4, 0x2e],
      [0x000ffff5, 0xa2],
      [0x000ffff6, 0xfe],
      [0x000ffff7, 0xff],
      [0x000ffffe, 0x34]
    ]);
    const state = new Cpu386State();
    const memory = resetAliasMemory(values);

    stepInstruction(memory, state);
    state.writeRegister8(0, 0x56);
    stepInstruction(memory, state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x56 }, eip: 0x0000fff8 });
    expect(values.get(0x000ffffe)).toBe(0x56);
  });

  it("loads an 8-bit register through the observed CS ModR/M form", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x2e],
      [0x000ffff1, 0x8a],
      [0x000ffff2, 0x07],
      [0x000f2000, 0x56]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(3, 0x2000);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x56 }, eip: 0x0000fff3 });
  });

  it("performs DAA and DAS with PCjs-compatible arithmetic flags", () => {
    const daaValues = new Map<number, number>([[0x000ffff0, 0x27]]);
    const daaState = new Cpu386State();
    daaState.writeRegister8(0, 0x9b);

    stepInstruction(resetAliasMemory(daaValues), daaState);

    expect(daaState.snapshot()).toMatchObject({
      registers: { eax: 0x01 },
      eip: 0x0000fff1,
      eflags: 0x0013
    });

    const dasValues = new Map<number, number>([[0x000ffff0, 0x2f]]);
    const dasState = new Cpu386State();
    dasState.writeRegister8(0, 0x0b);

    stepInstruction(resetAliasMemory(dasValues), dasState);

    expect(dasState.snapshot()).toMatchObject({
      registers: { eax: 0x05 },
      eip: 0x0000fff1,
      eflags: 0x0016
    });
  });

  it("uses incoming carry for DAA high-digit adjustment", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x27]]);
    const state = new Cpu386State();
    state.writeRegister8(0, 0x15);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({ registers: { eax: 0x75 }, eflags: 0x0003 });
  });

  it("performs the observed AAD immediate conversion", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xd5],
      [0x000ffff1, 0x0a]
    ]);
    const state = new Cpu386State();
    state.writeRegister16(0, 0x1234);

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0xe8 },
      eip: 0x0000fff2,
      eflags: 0x0086
    });
  });

  it("preserves operands and flags for zero-count immediate shifts", () => {
    const byteValues = new Map<number, number>([
      [0x000ffff0, 0xc0],
      [0x000ffff1, 0xed],
      [0x000ffff2, 0x00]
    ]);
    const byteState = new Cpu386State();
    byteState.writeRegister8(5, 0x81);
    byteState.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(byteValues), byteState);

    expect(byteState.snapshot()).toMatchObject({
      registers: { ecx: 0x8100 },
      eip: 0x0000fff3,
      eflags: 0x000008d7
    });

    const wordValues = new Map<number, number>([
      [0x000ffff0, 0xc1],
      [0x000ffff1, 0xe3],
      [0x000ffff2, 0x00]
    ]);
    const wordState = new Cpu386State();
    wordState.writeRegister16(3, 0x8001);
    wordState.writeEflags(0x000008d7);

    stepInstruction(resetAliasMemory(wordValues), wordState);

    expect(wordState.snapshot()).toMatchObject({
      registers: { ebx: 0x8001 },
      eip: 0x0000fff3,
      eflags: 0x000008d7
    });
  });

  it("increments AH through the observed FE /0 form while preserving carry", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0xfe],
      [0x000ffff1, 0xc4]
    ]);
    const state = new Cpu386State();
    state.writeRegister8(4, 0xff);
    state.setCarryFlag();

    stepInstruction(resetAliasMemory(values), state);

    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0 },
      eip: 0x0000fff2,
      eflags: 0x0057
    });
  });

  it("decrements byte register and BP-based memory through FE /1", () => {
    const registerValues = new Map<number, number>([
      [0x000ffff0, 0xfe],
      [0x000ffff1, 0xcc]
    ]);
    const registerState = new Cpu386State();
    registerState.writeRegister8(4, 0);
    registerState.setCarryFlag();

    stepInstruction(resetAliasMemory(registerValues), registerState);

    expect(registerState.snapshot()).toMatchObject({ registers: { eax: 0xff00 }, eflags: 0x0097 });

    const memoryValues = new Map<number, number>([
      [0x000ffff0, 0xfe],
      [0x000ffff1, 0x4e],
      [0x000ffff2, 0x05],
      [0x00002005, 0]
    ]);
    const memoryState = new Cpu386State();
    memoryState.loadRealModeSegment("ss", 0);
    memoryState.writeRegister16(5, 0x2000);

    stepInstruction(resetAliasMemory(memoryValues), memoryState);

    expect(memoryValues.get(0x00002005)).toBe(0xff);
    expect(memoryState.snapshot().eip).toBe(0x0000fff3);
  });

  it("leaves EIP at the faulting opcode until exception delivery exists", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x0f]]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    expect(() => stepInstruction(memory, state)).toThrow(UnsupportedOpcodeError);
    expect(state.snapshot().eip).toBe(0x0000fff0);
  });
});
