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

  it("leaves EIP at the faulting opcode until exception delivery exists", () => {
    const values = new Map<number, number>([[0x000ffff0, 0x0f]]);
    const memory = resetAliasMemory(values);
    const state = new Cpu386State();

    expect(() => stepInstruction(memory, state)).toThrow(UnsupportedOpcodeError);
    expect(state.snapshot().eip).toBe(0x0000fff0);
  });
});
