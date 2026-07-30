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

function loadRom(): Uint8Array {
  const source = execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${pcjsRoot.replace(/\\/g, "/")}`,
      "-C",
      pcjsRoot,
      "show",
      `${PINNED_PCJS_COMMIT}:${SOURCE_ROM}`
    ],
    { encoding: "utf8" }
  );
  const start = source.indexOf('"values": [');
  const end = source.indexOf("\n  ]", start);
  if (start < 0 || end < 0) throw new Error("Pinned PCjs ROM values array is unavailable");
  const values = [...source.slice(start, end).matchAll(/0x([0-9a-f]{2})(?=,|\s)/gi)].map((match) =>
    Number.parseInt(match[1], 16)
  );
  if (values.length !== 0x8000) throw new Error(`Unexpected selected ROM size: ${values.length}`);
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

function main(): void {
  const budget = instructionBudget();
  const tailLength = traceTailLength();
  const eventTailLengthValue = eventTailLength();
  const transfers = process.env.PC110JS_ROM_TRACE_TRANSFERS === "1";
  const memory = new PhysicalMemory({
    ramBytes: 0xa0000,
    a20Enabled: true,
    unmappedReadValue: 0xff,
    ignoreUnmappedWrites: true
  });
  memory.mapRom(
    createRomImage("deskpro386", loadRom()),
    0xffff8000,
    [0xf8000, 0xf0000, 0xffff0000]
  );
  const trace: RebuiltMachineTraceEvent[] = [];
  const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event), {
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
    if (transfers) writeSegmentTransfers(trace);
    writePitState(core);
  } catch (error) {
    const stop = trace.at(-1);
    const detail = stop?.kind === "stop" && stop.error ? stop.error : String(error);
    const executed = stop?.kind === "stop" ? stop.executed : 0;
    process.stdout.write(
      `Rebuilt selected-ROM trace stopped after ${executed} instructions at ${formatAddress(core)}: ${detail}\n`
    );
    writeDiagnosticTail(trace, tailLength);
    writeEventTail(trace, eventTailLengthValue);
    if (transfers) writeSegmentTransfers(trace);
    writePitState(core);
  }
}

main();
