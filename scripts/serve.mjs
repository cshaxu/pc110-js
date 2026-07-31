import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
const MEDIA = [
  {
    name: "deskpro386-rom.bin",
    source: "machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5",
    expectedBytes: 32_768,
    sha256: "fe25babe6bc7281f19a90c5bd8d958d35b2c2c98c6897da7773fb20b790e234a"
  },
  {
    name: "ibm-vga-rom.bin",
    source: "machines/pcx86/ibm/video/vga/1986-10-27/IBM-VGA.json5",
    expectedBytes: 24_576,
    sha256: "14b8506381837caa7b1b99be671fa5fac650cc74cf1de28b2d13ad1101f51a3d"
  }
];
const FLOPPY_SHA256 = "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5";
const FLOPPY_BYTES = 1_474_560;
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDirectory, "..");
const pcjsRoot = resolve(projectRoot, "..", "pcjs");
const floppyPath = resolve(projectRoot, "..", "fdd.img");
const generatedMediaRoot = resolve(projectRoot, ".cache", "developer-media");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireAsset(name, bytes, expectedBytes, expectedHash) {
  if (bytes.byteLength !== expectedBytes) throw new Error(`${name} has an unexpected size`);
  if (sha256(bytes) !== expectedHash) throw new Error(`${name} has an unexpected SHA-256`);
}

function exportRom(media) {
  const source = execFileSync(
    "git",
    ["-c", `safe.directory=${pcjsRoot.replace(/\\/g, "/")}`, "-C", pcjsRoot, "show", `${PINNED_PCJS_COMMIT}:${media.source}`],
    { encoding: "utf8" }
  );
  const values = [...source.matchAll(/0x([0-9a-f]{2})(?=,|\s)/gi)].map((match) => Number.parseInt(match[1], 16));
  const bytes = Uint8Array.from(values);
  requireAsset(media.name, bytes, media.expectedBytes, media.sha256);
  const destination = resolve(generatedMediaRoot, media.name);
  writeFileSync(destination, bytes);
  return destination;
}

mkdirSync(generatedMediaRoot, { recursive: true });
const [systemRom, vgaRom] = MEDIA.map(exportRom);
const floppy = readFileSync(floppyPath);
requireAsset("fdd.img", floppy, FLOPPY_BYTES, FLOPPY_SHA256);

const child = spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PC110JS_DEV_SYSTEM_ROM: systemRom,
    PC110JS_DEV_VGA_ROM: vgaRom,
    PC110JS_DEV_FLOPPY: floppyPath
  },
  stdio: "inherit"
});
child.on("exit", (code) => process.exitCode = code ?? 1);
