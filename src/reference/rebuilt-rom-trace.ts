import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import {
  RebuiltPcAt386Core,
  type RebuiltMachineTraceEvent
} from "../machine/rebuilt-pc-at-386-core.js";

const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
const SOURCE_ROM = "machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5";
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDirectory, "../..");
const pcjsRoot = resolve(projectRoot, "..", "pcjs");
const DEFAULT_INSTRUCTION_BUDGET = 1_000;
const DEFAULT_TRACE_TAIL = 0;

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

function formatAddress(core: RebuiltPcAt386Core): string {
  const cs = core.runner.state.readSegment("cs").selector.toString(16).padStart(4, "0");
  const eip = core.runner.state.readEip().toString(16).padStart(4, "0");
  return `${cs}:${eip}`;
}

function writeDiagnosticTail(trace: readonly RebuiltMachineTraceEvent[], length: number): void {
  if (length === 0) return;
  const instructions = trace.filter((event) => event.kind === "instruction").slice(-length);
  for (const entry of instructions) {
    if (entry.kind !== "instruction") continue;
    const { before, opcode } = entry.event;
    const address = `${before.segments.cs.selector.toString(16).padStart(4, "0")}:${before.eip
      .toString(16)
      .padStart(4, "0")}`;
    const byte = opcode === undefined ? "??" : opcode.toString(16).padStart(2, "0");
    process.stdout.write(`  ${address} ${byte}\n`);
  }
}

function main(): void {
  const budget = instructionBudget();
  const tailLength = traceTailLength();
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
    deskProSecondaryPit: true
  });
  try {
    const result = core.run(budget);
    process.stdout.write(
      `Rebuilt selected-ROM trace completed ${result.executed} instructions at ${formatAddress(core)}\n`
    );
    writeDiagnosticTail(trace, tailLength);
  } catch (error) {
    const stop = trace.at(-1);
    const detail = stop?.kind === "stop" && stop.error ? stop.error : String(error);
    const executed = stop?.kind === "stop" ? stop.executed : 0;
    process.stdout.write(
      `Rebuilt selected-ROM trace stopped after ${executed} instructions at ${formatAddress(core)}: ${detail}\n`
    );
    writeDiagnosticTail(trace, tailLength);
  }
}

main();
