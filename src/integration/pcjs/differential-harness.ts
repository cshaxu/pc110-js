import { RebuiltCpuRunner } from "../../cpu/rebuilt/runner.js";
import type { SegmentCache } from "../../cpu/rebuilt/state/segments.js";
import { PhysicalMemory } from "../../memory/physical-memory.js";

const ORACLE_RAM_BYTES = 0x10_0000;

export interface DifferentialRegisterState {
  readonly eax?: number;
  readonly ecx?: number;
  readonly edx?: number;
  readonly ebx?: number;
  readonly esp?: number;
  readonly ebp?: number;
  readonly esi?: number;
  readonly edi?: number;
}

export interface DifferentialCase {
  readonly name: string;
  readonly bytes: readonly number[];
  readonly registers?: DifferentialRegisterState;
  readonly eflags?: number;
  readonly memory?: readonly DifferentialMemoryByte[];
}

export interface DifferentialMemoryByte {
  readonly address: number;
  readonly value: number;
}

export interface DifferentialCpuSnapshot {
  readonly registers: Required<DifferentialRegisterState>;
  readonly eip: number;
  readonly eflags: number;
  readonly segments: Readonly<Record<"cs" | "ds" | "es" | "ss", DifferentialSegmentSnapshot>>;
}

export interface DifferentialSegmentSnapshot {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly default32: boolean;
}

export interface DifferentialStepResult {
  readonly rebuilt: DifferentialCpuSnapshot;
  readonly pcjs: DifferentialCpuSnapshot;
  readonly memoryWrites: {
    readonly rebuilt: readonly DifferentialMemoryByte[];
    readonly pcjs: readonly DifferentialMemoryByte[];
  };
}

interface PcjsBus {
  addMemory(address: number, size: number, type: number): boolean;
  getByte(address: number): number;
  setByte(address: number, value: number): void;
}

interface PcjsSegment {
  readonly sel: number;
  readonly base: number;
  readonly limit: number;
  readonly sizeDefault?: number;
}

interface PcjsCpu {
  regEAX: number;
  regECX: number;
  regEDX: number;
  regEBX: number;
  regEBP: number;
  regESI: number;
  regEDI: number;
  readonly segCS: PcjsSegment;
  readonly segDS: PcjsSegment;
  readonly segES: PcjsSegment;
  readonly segSS: PcjsSegment;
  initBus(machine: PcjsMachine, bus: PcjsBus, cpu: PcjsCpu, debuggerInstance: null): void;
  reset(): void;
  setCSIP(offset: number, selector: number): void;
  setPS(value: number): void;
  getPS(): number;
  getIP(): number;
  getSP(): number;
  setSP(value: number): void;
  stepCPU(minimumCycles: number): number;
}

interface PcjsMachine {
  getMachineParm(name: string): undefined;
  getMachineComponent(name: string, required?: boolean): null;
  getMachineBoolean(name: string, fallback: boolean): boolean;
  setBinding(): void;
}

interface PcjsModules {
  readonly CPUx86: new (parameters: Record<string, unknown>) => PcjsCpu;
  readonly Busx86: new (
    parameters: Record<string, unknown>,
    cpu: PcjsCpu,
    debuggerInstance: null
  ) => PcjsBus;
  readonly ramType: number;
}

/**
 * This is a test-only CPU oracle. It dynamically loads the pinned sibling PCjs
 * modules, so no PCjs source enters the project runtime or browser bundle.
 */
export async function runPcjsDifferentialCase(
  differentialCase: DifferentialCase
): Promise<DifferentialStepResult> {
  validateCase(differentialCase);
  const rebuilt = createRebuiltCpu(differentialCase);
  const pcjs = await createPcjsCpu(differentialCase);

  rebuilt.runner.step();
  pcjs.cpu.stepCPU(0);

  return {
    rebuilt: snapshotRebuilt(rebuilt.runner),
    pcjs: snapshotPcjs(pcjs.cpu),
    memoryWrites: {
      rebuilt: rebuilt.memory.writes(),
      pcjs: pcjs.memoryWrites()
    }
  };
}

export function assertDifferentialMatch(result: DifferentialStepResult): void {
  const left = JSON.stringify({ state: result.rebuilt, memoryWrites: result.memoryWrites.rebuilt });
  const right = JSON.stringify({ state: result.pcjs, memoryWrites: result.memoryWrites.pcjs });
  if (left !== right) {
    throw new Error(`PCjs differential mismatch\nrebuilt=${left}\npcjs=${right}`);
  }
}

function createRebuiltCpu(differentialCase: DifferentialCase): {
  readonly runner: RebuiltCpuRunner;
  readonly memory: RecordingMemory;
} {
  const memory = new PhysicalMemory({ ramBytes: ORACLE_RAM_BYTES, a20Enabled: true });
  differentialCase.bytes.forEach((value, index) => memory.writeUint8(index, value));
  differentialCase.memory?.forEach(({ address, value }) => memory.writeUint8(address, value));
  const recordingMemory = new RecordingMemory(memory);
  const runner = new RebuiltCpuRunner(recordingMemory);
  initializeRebuiltState(runner, differentialCase);
  return { runner, memory: recordingMemory };
}

async function createPcjsCpu(differentialCase: DifferentialCase): Promise<{
  readonly cpu: PcjsCpu;
  readonly memoryWrites: () => readonly DifferentialMemoryByte[];
}> {
  const modules = await loadPcjsModules();
  const cpu = new modules.CPUx86({
    id: "pc110-js.differential.cpu",
    model: 80386,
    autoStart: false
  });
  const bus = new modules.Busx86({ id: "pc110-js.differential.bus", busWidth: 24 }, cpu, null);
  const machine: PcjsMachine = {
    getMachineParm: () => undefined,
    getMachineComponent: () => null,
    getMachineBoolean: (_name, fallback) => fallback,
    setBinding: () => undefined
  };
  cpu.initBus(machine, bus, cpu, null);
  if (!bus.addMemory(0, ORACLE_RAM_BYTES, modules.ramType)) {
    throw new Error("PCjs differential oracle could not allocate RAM");
  }
  cpu.reset();
  differentialCase.bytes.forEach((value, index) => bus.setByte(index, value));
  differentialCase.memory?.forEach(({ address, value }) => bus.setByte(address, value));
  initializePcjsState(cpu, differentialCase);
  const before = snapshotPcjsMemory(bus);
  return {
    cpu,
    memoryWrites: () => diffPcjsMemory(bus, before)
  };
}

async function loadPcjsModules(): Promise<PcjsModules> {
  const base = new URL("../../../../pcjs/machines/pcx86/modules/v2/", import.meta.url);
  await import(new URL("x86func.js", base).href);
  await import(new URL("x86help.js", base).href);
  await import(new URL("x86mods.js", base).href);
  await import(new URL("x86ops.js", base).href);
  await import(new URL("x86op0f.js", base).href);
  const [cpuModule, busModule, memoryModule] = await Promise.all([
    import(new URL("cpux86.js", base).href),
    import(new URL("bus.js", base).href),
    import(new URL("memory.js", base).href)
  ]);
  return {
    CPUx86: cpuModule.default as PcjsModules["CPUx86"],
    Busx86: busModule.default as PcjsModules["Busx86"],
    ramType: (memoryModule.default as { TYPE: { readonly RAM: number } }).TYPE.RAM
  };
}

function initializeRebuiltState(
  runner: RebuiltCpuRunner,
  differentialCase: DifferentialCase
): void {
  const state = runner.state;
  for (let index = 0; index < 8; index += 1) state.registers.write32(index, 0);
  applyRegisters(differentialCase.registers, (index, value) =>
    state.registers.write32(index, value)
  );
  state.flags.write(differentialCase.eflags ?? 0x00000002);
  for (const name of ["cs", "ds", "es", "ss", "fs", "gs"] as const) {
    state.writeSegment(name, {
      selector: 0,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true
    });
  }
  state.writeEip(0);
}

function initializePcjsState(cpu: PcjsCpu, differentialCase: DifferentialCase): void {
  cpu.setCSIP(0, 0);
  cpu.regEAX = 0;
  cpu.regECX = 0;
  cpu.regEDX = 0;
  cpu.regEBX = 0;
  cpu.regEBP = 0;
  cpu.regESI = 0;
  cpu.regEDI = 0;
  applyRegisters(differentialCase.registers, (index, value) =>
    writePcjsRegister(cpu, index, value)
  );
  cpu.setPS(differentialCase.eflags ?? 0x00000002);
}

function applyRegisters(
  registers: DifferentialRegisterState | undefined,
  write: (index: number, value: number) => void
): void {
  if (!registers) return;
  const entries: readonly [keyof DifferentialRegisterState, number][] = [
    ["eax", 0],
    ["ecx", 1],
    ["edx", 2],
    ["ebx", 3],
    ["esp", 4],
    ["ebp", 5],
    ["esi", 6],
    ["edi", 7]
  ];
  entries.forEach(([name, index]) => {
    const value = registers[name];
    if (value !== undefined) write(index, value >>> 0);
  });
}

function writePcjsRegister(cpu: PcjsCpu, index: number, value: number): void {
  switch (index) {
    case 0:
      cpu.regEAX = value;
      return;
    case 1:
      cpu.regECX = value;
      return;
    case 2:
      cpu.regEDX = value;
      return;
    case 3:
      cpu.regEBX = value;
      return;
    case 4:
      cpu.setSP(value);
      return;
    case 5:
      cpu.regEBP = value;
      return;
    case 6:
      cpu.regESI = value;
      return;
    case 7:
      cpu.regEDI = value;
  }
}

function snapshotRebuilt(runner: RebuiltCpuRunner): DifferentialCpuSnapshot {
  const snapshot = runner.state.snapshot();
  return {
    registers: snapshot.registers,
    eip: snapshot.eip,
    eflags: snapshot.eflags,
    segments: {
      cs: normalizeRebuiltSegment(snapshot.segments.cs),
      ds: normalizeRebuiltSegment(snapshot.segments.ds),
      es: normalizeRebuiltSegment(snapshot.segments.es),
      ss: normalizeRebuiltSegment(snapshot.segments.ss)
    }
  };
}

function snapshotPcjs(cpu: PcjsCpu): DifferentialCpuSnapshot {
  return {
    registers: {
      eax: cpu.regEAX >>> 0,
      ecx: cpu.regECX >>> 0,
      edx: cpu.regEDX >>> 0,
      ebx: cpu.regEBX >>> 0,
      esp: cpu.getSP() >>> 0,
      ebp: cpu.regEBP >>> 0,
      esi: cpu.regESI >>> 0,
      edi: cpu.regEDI >>> 0
    },
    eip: cpu.getIP() >>> 0,
    eflags: cpu.getPS() >>> 0,
    segments: {
      cs: normalizePcjsSegment(cpu.segCS),
      ds: normalizePcjsSegment(cpu.segDS),
      es: normalizePcjsSegment(cpu.segES),
      ss: normalizePcjsSegment(cpu.segSS)
    }
  };
}

function normalizeRebuiltSegment(segment: SegmentCache): DifferentialSegmentSnapshot {
  return {
    selector: segment.selector,
    base: segment.base,
    limit: segment.limit,
    default32: segment.default32
  };
}

function normalizePcjsSegment(segment: PcjsSegment): DifferentialSegmentSnapshot {
  return {
    selector: segment.sel & 0xffff,
    base: segment.base >>> 0,
    limit: segment.limit >>> 0,
    default32: segment.sizeDefault === 4
  };
}

function validateCase(differentialCase: DifferentialCase): void {
  if (!differentialCase.name) throw new RangeError("Differential case name is required");
  if (differentialCase.bytes.length === 0 || differentialCase.bytes.length > 15)
    throw new RangeError("Differential case must contain one to fifteen instruction bytes");
  differentialCase.bytes.forEach((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 0xff)
      throw new RangeError("Differential instruction bytes must be unsigned bytes");
  });
  differentialCase.memory?.forEach(({ address, value }) => validateMemoryByte(address, value));
}

class RecordingMemory {
  private readonly recordedWrites = new Map<number, number>();

  public constructor(private readonly memory: PhysicalMemory) {}

  public readUint8(address: number): number {
    return this.memory.readUint8(address);
  }

  public writeUint8(address: number, value: number): void {
    const normalizedAddress = address >>> 0;
    const normalizedValue = value & 0xff;
    this.recordedWrites.set(normalizedAddress, normalizedValue);
    this.memory.writeUint8(normalizedAddress, normalizedValue);
  }

  public writes(): readonly DifferentialMemoryByte[] {
    return normalizeMemoryWrites(this.recordedWrites);
  }
}

function normalizeMemoryWrites(
  writes: ReadonlyMap<number, number>
): readonly DifferentialMemoryByte[] {
  return [...writes.entries()]
    .sort(([left], [right]) => left - right)
    .map(([address, value]) => ({ address, value }));
}

function validateMemoryByte(address: number, value: number): void {
  if (!Number.isInteger(address) || address < 0 || address >= ORACLE_RAM_BYTES)
    throw new RangeError("Differential memory address must be inside oracle RAM");
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError("Differential memory value must be an unsigned byte");
}

function snapshotPcjsMemory(bus: PcjsBus): Uint8Array {
  const bytes = new Uint8Array(ORACLE_RAM_BYTES);
  for (let address = 0; address < bytes.length; address += 1) bytes[address] = bus.getByte(address);
  return bytes;
}

function diffPcjsMemory(bus: PcjsBus, before: Uint8Array): readonly DifferentialMemoryByte[] {
  const writes: DifferentialMemoryByte[] = [];
  for (let address = 0; address < before.length; address += 1) {
    const value = bus.getByte(address);
    if (value !== before[address]) writes.push({ address, value });
  }
  return writes;
}
