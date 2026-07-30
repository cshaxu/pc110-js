import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import {
  RebuiltPcAt386Core,
  type RebuiltMachineTraceEvent
} from "../machine/rebuilt-pc-at-386-core.js";
import { FLOPPY_1440K_GEOMETRY, FloppyDrive } from "../devices/floppy-drive.js";

const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
const SOURCE_ROM = "machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5";
const SOURCE_VGA_ROM = "machines/pcx86/ibm/video/vga/1986-10-27/IBM-VGA.json5";
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDirectory, "../..");
const pcjsRoot = resolve(projectRoot, "..", "pcjs");
const DEFAULT_INSTRUCTION_BUDGET = 1_000;
const DEFAULT_TRACE_TAIL = 0;
const DEFAULT_EVENT_TAIL = 0;
const FLOPPY_BYTES = 1_474_560;
const FLOPPY_SHA256 = "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5";

function instructionBudget(): number {
  const raw = process.env.PC110JS_ROM_TRACE_INSTRUCTIONS;
  if (raw === undefined) return DEFAULT_INSTRUCTION_BUDGET;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error("PC110JS_ROM_TRACE_INSTRUCTIONS must be a positive safe integer");
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

function attachLocalFloppy(core: RebuiltPcAt386Core): void {
  if (process.env.PC110JS_ROM_TRACE_FLOPPY !== "1") return;
  const bytes = new Uint8Array(readFileSync(resolve(projectRoot, "..", "fdd.img")));
  if (bytes.byteLength !== FLOPPY_BYTES) throw new Error("Unexpected local floppy size");
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== FLOPPY_SHA256) throw new Error("Unexpected local floppy SHA-256");
  const drive = new FloppyDrive(FLOPPY_1440K_GEOMETRY);
  drive.attach(bytes);
  core.fdc.controller.attachDrive(0, drive);
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
    process.stdout.write(`  ${address} ${byte}${registerTail}\n`);
  }
}

function writeEventTail(trace: readonly RebuiltMachineTraceEvent[], length: number): void {
  if (length === 0) return;
  for (const event of trace.filter((item) => item.kind !== "instruction").slice(-length)) {
    if (event.kind === "interrupt")
      process.stdout.write(`  interrupt ${event.vector.toString(16)}\n`);
    else if (event.kind === "port")
      process.stdout.write(`  port ${event.event.direction} ${event.event.port.toString(16)}\n`);
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
    process.stdout.write(`  transfer ${from} -> ${to} opcode ${opcode?.toString(16) ?? "??"}\n`);
  }
}

function writePitState(core: RebuiltPcAt386Core): void {
  if (process.env.PC110JS_ROM_TRACE_PIT !== "1") return;
  for (let index = 0; index < 3; index += 1) {
    const counter = core.pit.snapshot(index);
    process.stdout.write(
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
    process.stdout.write(
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
  const budget = instructionBudget();
  const tailLength = traceTailLength();
  const eventTailLengthValue = eventTailLength();
  const transfers = process.env.PC110JS_ROM_TRACE_TRANSFERS === "1";
  const watches = watchedAddresses();
  const needsTrace = tailLength > 0 || eventTailLengthValue > 0 || transfers || watches.size > 0;
  const watchHits = new Map<string, WatchHit>(
    [...watches].map((address) => [address, { count: 0, lastEcx: 0, lastNextAddress: "none" }])
  );
  const memory = new PhysicalMemory({
    ramBytes: 0xa0000,
    a20Enabled: true,
    unmappedReadValue: 0xff,
    ignoreUnmappedWrites: true
  });
  memory.mapRom(
    createRomImage("deskpro386", loadRom(SOURCE_ROM, 0x8000)),
    0xffff8000,
    [0xf8000, 0xf0000, 0xffff0000]
  );
  memory.mapRom(createRomImage("ibm-vga", loadRom(SOURCE_VGA_ROM, 0x6000)), 0xc0000);
  const trace: RebuiltMachineTraceEvent[] = [];
  const transferTrace: RebuiltMachineTraceEvent[] = [];
  const traceCapacity = Math.max(1, tailLength, eventTailLengthValue);
  const recordTrace = (event: RebuiltMachineTraceEvent): void => {
    retainTraceEvent(trace, event, traceCapacity);
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
  const core = new RebuiltPcAt386Core(memory, needsTrace ? recordTrace : undefined, {
    deskProSecondaryPit: true,
    unpopulatedIo: "floating"
  });
  attachLocalFloppy(core);
  try {
    const result = core.run(budget);
    process.stdout.write(
      `Rebuilt selected-ROM trace completed ${result.executed} instructions at ${formatAddress(core)}\n`
    );
    writeDiagnosticTail(trace, tailLength);
    writeEventTail(trace, eventTailLengthValue);
    if (transfers) writeSegmentTransfers(transferTrace);
    writePitState(core);
    writeWatchCounts(watchHits);
  } catch (error) {
    const stop = trace.at(-1);
    const detail = stop?.kind === "stop" && stop.error ? stop.error : String(error);
    const executed = stop?.kind === "stop" ? stop.executed : 0;
    process.stdout.write(
      `Rebuilt selected-ROM trace stopped after ${executed} instructions at ${formatAddress(core)}: ${detail}\n`
    );
    writeDiagnosticTail(trace, tailLength);
    writeEventTail(trace, eventTailLengthValue);
    if (transfers) writeSegmentTransfers(transferTrace);
    writePitState(core);
    writeWatchCounts(watchHits);
  }
}

main();
