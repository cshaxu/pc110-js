import { RebuiltCpuRunner } from "../../cpu/rebuilt/runner.js";
import type { PortWidth, RebuiltPortBus } from "../../cpu/rebuilt/io/port-bus.js";
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
  readonly instructionCount?: number;
  readonly registers?: DifferentialRegisterState;
  readonly eflags?: number;
  readonly memory?: readonly DifferentialMemoryByte[];
  readonly io?: DifferentialIoConfiguration;
}

export interface DifferentialMemoryByte {
  readonly address: number;
  readonly value: number;
}

export interface DifferentialIoConfiguration {
  readonly inputs?: readonly DifferentialIoInput[];
}

export interface DifferentialIoInput {
  readonly port: number;
  readonly value: number;
  readonly width: PortWidth;
}

export interface DifferentialIoAccess {
  readonly direction: "read" | "write";
  readonly port: number;
  readonly value: number;
  readonly width: PortWidth;
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
  readonly before: {
    readonly rebuilt: DifferentialCpuSnapshot;
    readonly pcjs: DifferentialCpuSnapshot;
  };
  readonly rebuilt: DifferentialCpuSnapshot;
  readonly pcjs: DifferentialCpuSnapshot;
  readonly memoryWrites: {
    readonly rebuilt: readonly DifferentialMemoryByte[];
    readonly pcjs: readonly DifferentialMemoryByte[];
  };
  readonly io: {
    readonly rebuilt: readonly DifferentialIoAccess[];
    readonly pcjs: readonly DifferentialIoAccess[];
  };
}

export interface DifferentialTraceResult {
  readonly steps: readonly DifferentialStepResult[];
}

interface PcjsBus {
  addMemory(address: number, size: number, type: number): boolean;
  addPortInputNotify(start: number, end: number, handler: (port: number) => number): void;
  addPortInputWidth(port: number, size: number): void;
  addPortOutputNotify(
    start: number,
    end: number,
    handler: (port: number, value: number) => void
  ): void;
  addPortOutputWidth(port: number, size: number): void;
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
  const trace = await runPcjsDifferentialTrace({ ...differentialCase, instructionCount: 1 });
  return trace.steps[0]!;
}

export async function runPcjsDifferentialTrace(
  differentialCase: DifferentialCase
): Promise<DifferentialTraceResult> {
  validateCase(differentialCase);
  const rebuilt = createRebuiltCpu(differentialCase);
  const pcjs = await createPcjsCpu(differentialCase);
  const steps: DifferentialStepResult[] = [];
  const instructionCount = differentialCase.instructionCount ?? 1;
  for (let instruction = 0; instruction < instructionCount; instruction += 1) {
    const before = { rebuilt: snapshotRebuilt(rebuilt.runner), pcjs: snapshotPcjs(pcjs.cpu) };
    rebuilt.memory.clearWrites();
    rebuilt.io.clear();
    pcjs.io.clear();
    const pcjsMemory = snapshotPcjsMemory(pcjs.bus);
    rebuilt.runner.step();
    pcjs.cpu.stepCPU(0);
    steps.push({
      before,
      rebuilt: snapshotRebuilt(rebuilt.runner),
      pcjs: snapshotPcjs(pcjs.cpu),
      memoryWrites: {
        rebuilt: rebuilt.memory.writes(),
        pcjs: diffPcjsMemory(pcjs.bus, pcjsMemory)
      },
      io: {
        rebuilt: rebuilt.io.accesses(),
        pcjs: pcjs.io.accesses()
      }
    });
  }
  return { steps };
}

export function assertDifferentialMatch(result: DifferentialStepResult): void {
  const left = JSON.stringify({
    state: result.rebuilt,
    memoryWrites: result.memoryWrites.rebuilt,
    io: result.io.rebuilt
  });
  const right = JSON.stringify({
    state: result.pcjs,
    memoryWrites: result.memoryWrites.pcjs,
    io: result.io.pcjs
  });
  if (left !== right) {
    throw new Error(`PCjs differential mismatch\nrebuilt=${left}\npcjs=${right}`);
  }
}

export function assertDifferentialTraceMatch(trace: DifferentialTraceResult): void {
  trace.steps.forEach((step, index) => {
    try {
      assertDifferentialMatch(step);
    } catch (error) {
      throw new Error(`PCjs differential mismatch at instruction ${index}: ${String(error)}`);
    }
  });
}

function createRebuiltCpu(differentialCase: DifferentialCase): {
  readonly runner: RebuiltCpuRunner;
  readonly memory: RecordingMemory;
  readonly io: RecordingRebuiltIo;
} {
  const memory = new PhysicalMemory({ ramBytes: ORACLE_RAM_BYTES, a20Enabled: true });
  differentialCase.bytes.forEach((value, index) => memory.writeUint8(index, value));
  differentialCase.memory?.forEach(({ address, value }) => memory.writeUint8(address, value));
  const recordingMemory = new RecordingMemory(memory);
  const io = new RecordingRebuiltIo(differentialCase.io);
  const runner = new RebuiltCpuRunner(recordingMemory, io);
  initializeRebuiltState(runner, differentialCase);
  return { runner, memory: recordingMemory, io };
}

async function createPcjsCpu(differentialCase: DifferentialCase): Promise<{
  readonly cpu: PcjsCpu;
  readonly bus: PcjsBus;
  readonly io: RecordingPcjsIo;
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
  const io = new RecordingPcjsIo(differentialCase.io);
  io.attach(bus);
  return { cpu, bus, io };
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
  if (differentialCase.bytes.length === 0 || differentialCase.bytes.length > ORACLE_RAM_BYTES)
    throw new RangeError("Differential program must fit inside oracle RAM");
  differentialCase.bytes.forEach((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 0xff)
      throw new RangeError("Differential instruction bytes must be unsigned bytes");
  });
  differentialCase.memory?.forEach(({ address, value }) => validateMemoryByte(address, value));
  differentialCase.io?.inputs?.forEach(({ port, value, width }) => {
    if (!Number.isInteger(port) || port < 0 || port > 0xffff)
      throw new RangeError("Differential I/O port must be 16-bit");
    if (![8, 16, 32].includes(width)) throw new RangeError("Differential I/O width is invalid");
    const mask = width === 8 ? 0xff : width === 16 ? 0xffff : 0xffffffff;
    if (!Number.isInteger(value) || value < 0 || value > mask)
      throw new RangeError("Differential I/O value exceeds its width");
  });
  if (
    differentialCase.instructionCount !== undefined &&
    (!Number.isInteger(differentialCase.instructionCount) || differentialCase.instructionCount <= 0)
  ) {
    throw new RangeError("Differential instruction count must be a positive integer");
  }
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

  public clearWrites(): void {
    this.recordedWrites.clear();
  }
}

class RecordingRebuiltIo implements RebuiltPortBus {
  private readonly recorded: DifferentialIoAccess[] = [];
  private readonly inputs = new Map<number, DifferentialIoInput>();

  public constructor(configuration: DifferentialIoConfiguration | undefined) {
    configuration?.inputs?.forEach((input) => this.inputs.set(input.port, input));
  }

  public read(port: number, width: PortWidth): number {
    const input = this.inputs.get(port);
    const value = input?.value ?? 0xff;
    this.recorded.push({ direction: "read", port, value, width });
    return value;
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.recorded.push({ direction: "write", port, value, width });
  }

  public accesses(): readonly DifferentialIoAccess[] {
    return [...this.recorded];
  }

  public clear(): void {
    this.recorded.length = 0;
  }
}

class RecordingPcjsIo {
  private readonly recorded: DifferentialIoAccess[] = [];
  private readonly inputs = new Map<number, DifferentialIoInput>();

  public constructor(configuration: DifferentialIoConfiguration | undefined) {
    configuration?.inputs?.forEach((input) => this.inputs.set(input.port, input));
  }

  public attach(bus: PcjsBus): void {
    this.inputs.forEach((input, port) => {
      bus.addPortInputWidth(port, input.width / 8);
      bus.addPortInputNotify(port, port, () => {
        this.recorded.push({ direction: "read", port, value: input.value, width: input.width });
        return input.value;
      });
      bus.addPortOutputWidth(port, input.width / 8);
      bus.addPortOutputNotify(port, port, (_port, value) => {
        this.recorded.push({ direction: "write", port, value, width: input.width });
      });
    });
  }

  public accesses(): readonly DifferentialIoAccess[] {
    return [...this.recorded];
  }

  public clear(): void {
    this.recorded.length = 0;
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
