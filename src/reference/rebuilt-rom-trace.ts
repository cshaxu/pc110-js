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

function main(): void {
  const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
  memory.mapRom(
    createRomImage("deskpro386", loadRom()),
    0xffff8000,
    [0xf8000, 0xf0000, 0xffff0000]
  );
  const trace: RebuiltMachineTraceEvent[] = [];
  const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
  try {
    const result = core.run(1_000);
    process.stdout.write(
      `Rebuilt selected-ROM trace completed ${result.executed} instructions at ${formatAddress(core)}\n`
    );
  } catch (error) {
    const stop = trace.at(-1);
    const detail = stop?.kind === "stop" && stop.error ? stop.error : String(error);
    const executed = stop?.kind === "stop" ? stop.executed : 0;
    process.stdout.write(
      `Rebuilt selected-ROM trace stopped after ${executed} instructions at ${formatAddress(core)}: ${detail}\n`
    );
  }
}

main();
