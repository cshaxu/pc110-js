import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, extname, resolve, sep } from "node:path";

const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
const FLOPPY_SHA256 = "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5";
const FLOPPY_SIZE = 1_474_560;
const SOURCE_MACHINE = "machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml";
const LOCAL_MACHINE = "/_pc110js/machine.xml";
const LOCAL_FLOPPY = "/_pc110js/media/fdd.img";
const LOCAL_AUTOMOUNT = '{A:{name:"Local DOS floppy",path:"/_pc110js/media/fdd.img"}}';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDirectory, "../..");
const pcjsRoot = resolve(projectRoot, "..", "pcjs");
const floppyPath = resolve(projectRoot, "..", "fdd.img");
const port = parsePort(process.env.PORT ?? "5173");
const shouldOpen = process.argv.includes("--open");
const resourceCache = new Map<string, Buffer>();

function parsePort(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
}

function runGit(args: string[]): Buffer {
  try {
    return execFileSync(
      "git",
      ["-c", `safe.directory=${pcjsRoot.replace(/\\/g, "/")}`, "-C", pcjsRoot, ...args],
      { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read the pinned PCjs source: ${detail}`);
  }
}

function verifyInputs(): Buffer {
  const sourceRoot = statSync(pcjsRoot, { throwIfNoEntry: false });
  if (!sourceRoot?.isDirectory()) {
    throw new Error(`Missing sibling PCjs checkout: ${pcjsRoot}`);
  }

  runGit(["cat-file", "-e", `${PINNED_PCJS_COMMIT}:${SOURCE_MACHINE}`]);

  const floppy = readFileSync(floppyPath);
  if (floppy.length !== FLOPPY_SIZE) {
    throw new Error(`Unexpected fdd.img size: ${floppy.length} bytes`);
  }
  const actualHash = createHash("sha256").update(floppy).digest("hex");
  if (actualHash !== FLOPPY_SHA256) {
    throw new Error(`Unexpected fdd.img SHA-256: ${actualHash}`);
  }
  return floppy;
}

function readPinnedResource(pathname: string): Buffer {
  const normalized = pathname.replace(/^\/+/, "");
  if (!normalized || normalized.includes("\\") || normalized.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Invalid PCjs resource path");
  }
  const cached = resourceCache.get(normalized);
  if (cached) return cached;

  const content = runGit(["show", `${PINNED_PCJS_COMMIT}:${normalized}`]);
  resourceCache.set(normalized, content);
  return content;
}

function makeMachineXml(): Buffer {
  const source = readPinnedResource(SOURCE_MACHINE).toString("utf8");
  const originalMount = /autoMount='[^']*'/;
  if (!originalMount.test(source)) {
    throw new Error("Selected PCjs machine no longer has an autoMount definition");
  }
  return Buffer.from(source.replace(originalMount, `autoMount='${LOCAL_AUTOMOUNT}'`), "utf8");
}

function contentType(pathname: string): string {
  switch (extname(pathname).toLowerCase()) {
    case ".css": return "text/css; charset=utf-8";
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".json":
    case ".json5": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".xml":
    case ".xsl": return "application/xml; charset=utf-8";
    default: return "application/octet-stream";
  }
}

function send(response: ServerResponse, status: number, body: Buffer | string, type: string): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": type,
    "Cross-Origin-Resource-Policy": "same-origin"
  });
  response.end(body);
}

function handleRequest(floppy: Buffer, request: IncomingMessage, response: ServerResponse): void {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed\n", "text/plain; charset=utf-8");
    return;
  }
  if (pathname === "/") {
    response.writeHead(302, { Location: LOCAL_MACHINE });
    response.end();
    return;
  }
  if (pathname === "/_pc110js/health") {
    send(response, 200, "ok\n", "text/plain; charset=utf-8");
    return;
  }
  try {
    let body: Buffer;
    let type: string;
    if (pathname === LOCAL_MACHINE) {
      body = makeMachineXml();
      type = "application/xml; charset=utf-8";
    } else if (pathname === LOCAL_FLOPPY) {
      body = floppy;
      type = "application/octet-stream";
    } else {
      body = readPinnedResource(pathname);
      type = contentType(pathname);
    }
    if (request.method === "HEAD") {
      response.writeHead(200, { "Content-Type": type, "Content-Length": body.length });
      response.end();
      return;
    }
    send(response, 200, body, type);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    send(response, 404, `${detail}\n`, "text/plain; charset=utf-8");
  }
}

function openBrowser(url: string): void {
  if (process.platform !== "win32") return;
  const child = spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
  child.unref();
}

function main(): void {
  const floppy = verifyInputs();
  const server = createServer((request, response) => handleRequest(floppy, request, response));
  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}${LOCAL_MACHINE}`;
    process.stdout.write(`PCjs reference runner listening at ${url}\n`);
    process.stdout.write(`Pinned PCjs commit: ${PINNED_PCJS_COMMIT}\n`);
    process.stdout.write(`Read-only floppy: ${basename(floppyPath)} (${FLOPPY_SHA256})\n`);
    if (shouldOpen) openBrowser(url);
  });
}

main();
