import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { KeyboardByteQueue } from "../app/keyboard-scancode-set1.js";
import { createRomImage } from "../firmware/rom-image.js";
import { createDeskPro386Memory } from "../machine/configurations/deskpro386-memory.js";
import {
  RebuiltPcAt386Core,
  type RebuiltMachineTrace,
  type RebuiltMachineTraceEvent
} from "../machine/rebuilt-pc-at-386-core.js";
import { FLOPPY_1440K_GEOMETRY, FloppyDrive } from "../devices/floppy-drive.js";
import type { RebuiltTracePoint } from "../cpu/rebuilt/debug/trace.js";
import { DiagnosticReplaySession } from "./diagnostic-replay-session.js";

const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
const SOURCE_ROM = "machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5";
const SOURCE_VGA_ROM = "machines/pcx86/ibm/video/vga/1986-10-27/IBM-VGA.json5";
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDirectory, "../..");
const pcjsRoot = resolve(projectRoot, "..", "pcjs");
const DEFAULT_INSTRUCTION_BUDGET = 1_000;
const DEFAULT_TRACE_TAIL = 0;
const DEFAULT_EVENT_TAIL = 0;
const DEFAULT_REPLAY_TAIL = 128;
const MAX_REPLAY_INSTRUCTIONS = 10_000;
const MAX_REPLAY_EVENTS_PER_INSTRUCTION = 32;
const FLOPPY_BYTES = 1_474_560;
const FLOPPY_SHA256 = "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5";
let diagnosticLogDestination: string | undefined;

interface TraceAssets {
  readonly systemRom: Uint8Array;
  readonly vgaRom: Uint8Array;
  readonly floppy: Uint8Array | undefined;
}

interface CheckpointAddress {
  readonly selector: number;
  readonly eip: number;
}

function emit(text: string): void {
  if (diagnosticLogDestination !== undefined)
    appendFileSync(diagnosticLogDestination, text, "utf8");
  process.stdout.write(text);
}

function prepareDiagnosticLog(): void {
  const raw = process.env.PC110JS_ROM_TRACE_LOG;
  if (raw === undefined) return;
  const destination = resolve(projectRoot, raw);
  const pathFromRoot = relative(projectRoot, destination);
  if (pathFromRoot === "" || pathFromRoot.startsWith("..") || pathFromRoot.includes(":"))
    throw new Error("PC110JS_ROM_TRACE_LOG must be a project-relative file path");
  writeFileSync(destination, "", "utf8");
  diagnosticLogDestination = destination;
}

function instructionBudget(): number {
  const raw = process.env.PC110JS_ROM_TRACE_INSTRUCTIONS;
  if (raw === undefined) return DEFAULT_INSTRUCTION_BUDGET;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error("PC110JS_ROM_TRACE_INSTRUCTIONS must be a positive safe integer");
  return value;
}

function checkpointAddress(): CheckpointAddress | undefined {
  const raw = process.env.PC110JS_ROM_TRACE_CHECKPOINT;
  if (raw === undefined) return undefined;
  const match = /^([0-9a-f]{1,4}):([0-9a-f]{1,8})$/i.exec(raw);
  if (!match) throw new Error("PC110JS_ROM_TRACE_CHECKPOINT must be a CS:EIP hexadecimal address");
  return {
    selector: Number.parseInt(match[1]!, 16),
    eip: Number.parseInt(match[2]!, 16)
  };
}

function replayInstructionBudget(checkpoint: CheckpointAddress | undefined): number | undefined {
  const raw = process.env.PC110JS_ROM_TRACE_REPLAY_INSTRUCTIONS;
  if (raw === undefined) return undefined;
  if (checkpoint === undefined)
    throw new Error("PC110JS_ROM_TRACE_REPLAY_INSTRUCTIONS requires PC110JS_ROM_TRACE_CHECKPOINT");
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_REPLAY_INSTRUCTIONS)
    throw new Error(
      `PC110JS_ROM_TRACE_REPLAY_INSTRUCTIONS must be a positive safe integer up to ${MAX_REPLAY_INSTRUCTIONS}`
    );
  return value;
}

function replayTailLength(replayBudget: number | undefined): number {
  const raw = process.env.PC110JS_ROM_TRACE_REPLAY_TAIL;
  if (raw === undefined)
    return replayBudget === undefined ? 0 : Math.min(DEFAULT_REPLAY_TAIL, replayBudget);
  if (replayBudget === undefined)
    throw new Error("PC110JS_ROM_TRACE_REPLAY_TAIL requires PC110JS_ROM_TRACE_REPLAY_INSTRUCTIONS");
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0 || value > replayBudget)
    throw new Error(
      "PC110JS_ROM_TRACE_REPLAY_TAIL must be a non-negative safe integer within replay budget"
    );
  return value;
}

function traceTailLength(): number {
  const raw = process.env.PC110JS_ROM_TRACE_TAIL;
  if (raw === undefined) return DEFAULT_TRACE_TAIL;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("PC110JS_ROM_TRACE_TAIL must be a non-negative safe integer");
  return value;
}

function eventTailLength(): number {
  const raw = process.env.PC110JS_ROM_TRACE_EVENT_TAIL;
  if (raw === undefined) return DEFAULT_EVENT_TAIL;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("PC110JS_ROM_TRACE_EVENT_TAIL must be a non-negative safe integer");
  return value;
}

function portTailLength(): number {
  const raw = process.env.PC110JS_ROM_TRACE_PORT_TAIL;
  if (raw === undefined) return 0;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("PC110JS_ROM_TRACE_PORT_TAIL must be a non-negative safe integer");
  return value;
}

function watchedAddresses(): ReadonlySet<string> {
  const raw = process.env.PC110JS_ROM_TRACE_WATCH;
  if (raw === undefined || raw.trim() === "") return new Set();
  const values = raw.split(",").map((value) => value.trim().toLowerCase());
  if (values.some((value) => !/^([0-9a-f]{1,4}):([0-9a-f]{1,8})$/.test(value)))
    throw new Error(
      "PC110JS_ROM_TRACE_WATCH must contain comma-separated CS:EIP hexadecimal addresses"
    );
  return new Set(values);
}

function projectCommit(): string {
  return execFileSync("git", ["-C", projectRoot, "rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim();
}

function loadRom(sourceRom: string, expectedBytes: number): Uint8Array {
  const source = execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${pcjsRoot.replace(/\\/g, "/")}`,
      "-C",
      pcjsRoot,
      "show",
      `${PINNED_PCJS_COMMIT}:${sourceRom}`
    ],
    { encoding: "utf8" }
  );
  const start = source.indexOf('"values": [');
  const end = source.indexOf("\n  ]", start);
  if (start < 0 || end < 0) throw new Error("Pinned PCjs ROM values array is unavailable");
  const values = [...source.slice(start, end).matchAll(/0x([0-9a-f]{2})(?=,|\s)/gi)].map((match) =>
    Number.parseInt(match[1], 16)
  );
  if (values.length !== expectedBytes)
    throw new Error(`Unexpected selected ROM size: ${values.length}`);
  return Uint8Array.from(values);
}

function loadLocalFloppy(): Uint8Array | undefined {
  if (process.env.PC110JS_ROM_TRACE_FLOPPY !== "1") return undefined;
  const bytes = new Uint8Array(readFileSync(resolve(projectRoot, "..", "fdd.img")));
  if (bytes.byteLength !== FLOPPY_BYTES) throw new Error("Unexpected local floppy size");
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== FLOPPY_SHA256) throw new Error("Unexpected local floppy SHA-256");
  return bytes;
}

function attachLocalFloppy(core: RebuiltPcAt386Core, bytes: Uint8Array | undefined): void {
  if (bytes === undefined) return;
  const drive = new FloppyDrive(FLOPPY_1440K_GEOMETRY);
  drive.attach(bytes);
  core.fdc.controller.attachDrive(0, drive);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function createTraceCore(
  assets: TraceAssets,
  trace: RebuiltMachineTrace | undefined,
  instructionTrace: boolean,
  instructionTraceSelector?: (point: RebuiltTracePoint) => boolean
): RebuiltPcAt386Core {
  const memory = createDeskPro386Memory();
  memory.mapRom(
    createRomImage("deskpro386", assets.systemRom),
    0xffff8000,
    [0xf8000, 0xf0000, 0xffff0000]
  );
  memory.mapRom(createRomImage("ibm-vga", assets.vgaRom), 0xc0000);
  const core = new RebuiltPcAt386Core(memory, trace, {
    deskProSecondaryPit: true,
    keyboardInterfaceTestResult: 0x05,
    unpopulatedIo: "floating",
    instructionTrace,
    instructionTraceSelector
  });
  attachLocalFloppy(core, assets.floppy);
  return core;
}

function formatAddress(core: RebuiltPcAt386Core): string {
  const cs = core.runner.state.readSegment("cs").selector.toString(16).padStart(4, "0");
  const eip = core.runner.state.readEip().toString(16).padStart(4, "0");
  return `${cs}:${eip}`;
}

function writeDiagnosticTail(trace: readonly RebuiltMachineTraceEvent[], length: number): void {
  if (length === 0) return;
  const registers = process.env.PC110JS_ROM_TRACE_REGISTERS === "1";
  const instructions = trace.filter((event) => event.kind === "instruction").slice(-length);
  for (const entry of instructions) {
    if (entry.kind !== "instruction") continue;
    const { before, opcode } = entry.event;
    const address = `${before.segments.cs.selector.toString(16).padStart(4, "0")}:${before.eip
      .toString(16)
      .padStart(4, "0")}`;
    const byte = opcode === undefined ? "??" : opcode.toString(16).padStart(2, "0");
    const registerTail = registers
      ? ` ax=${before.registers.eax.toString(16).padStart(8, "0")} bx=${before.registers.ebx.toString(16).padStart(8, "0")} sp=${before.registers.esp.toString(16).padStart(8, "0")}`
      : "";
    emit(`  ${address} ${byte}${registerTail}\n`);
  }
}

function writeEventTail(trace: readonly RebuiltMachineTraceEvent[], length: number): void {
  if (length === 0) return;
  for (const event of trace.filter((item) => item.kind !== "instruction").slice(-length)) {
    if (event.kind === "interrupt") emit(`  interrupt ${event.vector.toString(16)}\n`);
    else if (event.kind === "port")
      emit(`  port ${event.event.direction} ${event.event.port.toString(16)}\n`);
  }
}

function writePortTail(trace: readonly RebuiltMachineTraceEvent[], length: number): void {
  if (length === 0) return;
  for (const event of trace.slice(-length)) {
    if (event.kind !== "port") continue;
    const width = event.event.width / 4;
    const value = event.event.value.toString(16).padStart(width, "0");
    emit(
      `  port ${event.event.direction} ${event.event.port.toString(16).padStart(4, "0")}/${event.event.width} ${value}\n`
    );
  }
}

function writeSegmentTransfers(trace: readonly RebuiltMachineTraceEvent[]): void {
  for (const entry of trace) {
    if (entry.kind !== "instruction") continue;
    const { before, after, opcode } = entry.event;
    if (before.segments.cs.selector === after.segments.cs.selector) continue;
    const from = `${before.segments.cs.selector.toString(16).padStart(4, "0")}:${before.eip
      .toString(16)
      .padStart(4, "0")}`;
    const to = `${after.segments.cs.selector.toString(16).padStart(4, "0")}:${after.eip
      .toString(16)
      .padStart(4, "0")}`;
    emit(`  transfer ${from} -> ${to} opcode ${opcode?.toString(16) ?? "??"}\n`);
  }
}

function writePitState(core: RebuiltPcAt386Core): void {
  if (process.env.PC110JS_ROM_TRACE_PIT !== "1") return;
  for (let index = 0; index < 3; index += 1) {
    const counter = core.pit.snapshot(index);
    emit(
      `  pit${index} reload=${counter.reload} count=${counter.count} mode=${counter.mode} output=${Number(counter.output)} null=${Number(counter.nullCount)}\n`
    );
  }
}

interface WatchHit {
  readonly count: number;
  readonly lastEcx: number;
  readonly lastNextAddress: string;
}

function writeWatchCounts(hits: ReadonlyMap<string, WatchHit>): void {
  for (const [address, hit] of hits)
    emit(
      `  watch ${address} hits=${hit.count} last-cx=${hit.lastEcx.toString(16)} next=${hit.lastNextAddress}\n`
    );
}

function retainTraceEvent(
  events: RebuiltMachineTraceEvent[],
  event: RebuiltMachineTraceEvent,
  capacity: number
): void {
  if (events.length === capacity) events.shift();
  events.push(event);
}

function main(): void {
  prepareDiagnosticLog();
  const budget = instructionBudget();
  const tailLength = traceTailLength();
  const eventTailLengthValue = eventTailLength();
  const portTailLengthValue = portTailLength();
  const transfers = process.env.PC110JS_ROM_TRACE_TRANSFERS === "1";
  const watches = watchedAddresses();
  const checkpointAddressValue = checkpointAddress();
  const replayBudget = replayInstructionBudget(checkpointAddressValue);
  const replayTail = replayTailLength(replayBudget);
  const needsTrace =
    tailLength > 0 ||
    eventTailLengthValue > 0 ||
    portTailLengthValue > 0 ||
    transfers ||
    watches.size > 0;
  if (checkpointAddressValue !== undefined && needsTrace)
    throw new Error(
      "PC110JS_ROM_TRACE_CHECKPOINT requires Fast execution without trace tail options"
    );
  const fullDebug = tailLength > 0 || transfers;
  const traceMode = !needsTrace
    ? "fast"
    : fullDebug
      ? "full-debug"
      : watches.size > 0
        ? "selective"
        : "fast-machine-events";
  const watchHits = new Map<string, WatchHit>(
    [...watches].map((address) => [address, { count: 0, lastEcx: 0, lastNextAddress: "none" }])
  );
  const assets: TraceAssets = {
    systemRom: loadRom(SOURCE_ROM, 0x8000),
    vgaRom: loadRom(SOURCE_VGA_ROM, 0x6000),
    floppy: loadLocalFloppy()
  };
  const trace: RebuiltMachineTraceEvent[] = [];
  const portTrace: RebuiltMachineTraceEvent[] = [];
  const transferTrace: RebuiltMachineTraceEvent[] = [];
  const traceCapacity = Math.max(1, tailLength, eventTailLengthValue);
  const recordTrace = (event: RebuiltMachineTraceEvent): void => {
    if (tailLength > 0 || eventTailLengthValue > 0) retainTraceEvent(trace, event, traceCapacity);
    if (event.kind === "port" && portTailLengthValue > 0)
      retainTraceEvent(portTrace, event, portTailLengthValue);
    if (
      transfers &&
      event.kind === "instruction" &&
      event.event.before.segments.cs.selector !== event.event.after.segments.cs.selector
    )
      transferTrace.push(event);
    if (event.kind === "instruction") {
      const address = `${event.event.before.segments.cs.selector.toString(16)}:${event.event.before.eip.toString(16)}`;
      const prior = watchHits.get(address);
      if (prior)
        watchHits.set(address, {
          count: prior.count + 1,
          lastEcx: event.event.before.registers.ecx,
          lastNextAddress: `${event.event.after.segments.cs.selector.toString(16)}:${event.event.after.eip.toString(16)}`
        });
    }
  };
  const core = createTraceCore(
    assets,
    needsTrace ? recordTrace : undefined,
    fullDebug || watches.size > 0,
    fullDebug
      ? undefined
      : (point) => watches.has(`${point.cs.toString(16)}:${point.eip.toString(16)}`)
  );
  emit(
    `Trace identity mode=${checkpointAddressValue === undefined ? traceMode : "fast-checkpoint"} project=${projectCommit()} pcjs=${PINNED_PCJS_COMMIT} budget=${budget} floppy=${assets.floppy === undefined ? "none" : FLOPPY_SHA256}\n`
  );
  try {
    if (checkpointAddressValue !== undefined) {
      const reached = core.runUntil(
        budget,
        () =>
          core.runner.state.readCodeSelector() === checkpointAddressValue.selector &&
          core.runner.state.readEip() === checkpointAddressValue.eip
      );
      const address = `${checkpointAddressValue.selector.toString(16).padStart(4, "0")}:${checkpointAddressValue.eip
        .toString(16)
        .padStart(4, "0")}`;
      emit(
        `Fast checkpoint ${reached.reached ? "reached" : "not reached"} after ${reached.executed} instructions at ${formatAddress(core)} target=${address}\n`
      );
      if (!reached.reached || replayBudget === undefined) return;

      const session = new DiagnosticReplaySession(core, new KeyboardByteQueue(), {
        projectCommit: projectCommit(),
        pcjsCommit: PINNED_PCJS_COMMIT,
        systemRomSha256: sha256(assets.systemRom),
        vgaRomSha256: sha256(assets.vgaRom),
        floppySha256: assets.floppy === undefined ? "none" : FLOPPY_SHA256,
        configuration: "deskpro386-native-floating-io"
      });
      const checkpoint = session.capture(reached.executed);
      const replayTrace: RebuiltMachineTraceEvent[] = [];
      const replayTraceCapacity = replayBudget * MAX_REPLAY_EVENTS_PER_INSTRUCTION + 1;
      const debugCore = createTraceCore(
        assets,
        (event) => retainTraceEvent(replayTrace, event, replayTraceCapacity),
        true
      );
      debugCore.restore(checkpoint.core);
      const first = debugCore.run(replayBudget);
      const firstState = debugCore.capture();
      const firstTrace = [...replayTrace];
      debugCore.restore(checkpoint.core);
      replayTrace.length = 0;
      const second = debugCore.run(replayBudget);
      const secondState = debugCore.capture();
      if (!isDeepStrictEqual(first, second) || !isDeepStrictEqual(firstState, secondState))
        throw new Error("Diagnostic checkpoint replay is not deterministic");
      emit(
        `Full debug replay completed ${first.executed} instructions from ${address}; deterministic=true\n`
      );
      writeDiagnosticTail(firstTrace, replayTail);
      writeEventTail(firstTrace, replayTail);
      writePortTail(firstTrace, replayTail);
      return;
    }
    const result = core.run(budget);
    emit(
      `Rebuilt selected-ROM trace completed ${result.executed} instructions at ${formatAddress(core)}\n`
    );
    writeDiagnosticTail(trace, tailLength);
    writeEventTail(trace, eventTailLengthValue);
    writePortTail(portTrace, portTailLengthValue);
    if (transfers) writeSegmentTransfers(transferTrace);
    writePitState(core);
    writeWatchCounts(watchHits);
  } catch (error) {
    const stop = trace.at(-1);
    const detail = stop?.kind === "stop" && stop.error ? stop.error : String(error);
    const executed = stop?.kind === "stop" ? stop.executed : 0;
    emit(
      `Rebuilt selected-ROM trace stopped after ${executed} instructions at ${formatAddress(core)}: ${detail}\n`
    );
    writeDiagnosticTail(trace, tailLength);
    writeEventTail(trace, eventTailLengthValue);
    writePortTail(portTrace, portTailLengthValue);
    if (transfers) writeSegmentTransfers(transferTrace);
    writePitState(core);
    writeWatchCounts(watchHits);
  }
}

main();
