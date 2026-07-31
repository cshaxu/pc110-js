import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename } from "node:path";
import process from "node:process";
import {
  PCJS_REFERENCE_FLOPPY,
  PCJS_REFERENCE_MACHINE,
  PINNED_PCJS_COMMIT,
  PcjsReferenceAssets
} from "./pcjs-reference-assets.js";

const LEGACY_MACHINE = "/_pc110js/machine.xml";
const LEGACY_FLOPPY = "/_pc110js/media/fdd.img";
const port = parsePort(process.env.PORT ?? "5173");
const shouldOpen = process.argv.includes("--open");
const diagnosticProbe = process.env.PC110JS_REFERENCE_PC110_PROBE === "1";
const assets = new PcjsReferenceAssets(diagnosticProbe);

function parsePort(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535)
    throw new Error(`Invalid PORT value: ${value}`);
  return parsed;
}

function send(response: ServerResponse, status: number, body: Buffer | string, type: string): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": type,
    "Cross-Origin-Resource-Policy": "same-origin"
  });
  response.end(body);
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed\n", "text/plain; charset=utf-8");
    return;
  }
  if (pathname === "/") {
    response.writeHead(302, { Location: PCJS_REFERENCE_MACHINE });
    response.end();
    return;
  }
  if (pathname === "/_pc110js/health") {
    send(response, 200, "ok\n", "text/plain; charset=utf-8");
    return;
  }
  try {
    const machine = pathname === PCJS_REFERENCE_MACHINE || pathname === LEGACY_MACHINE;
    const floppy = pathname === PCJS_REFERENCE_FLOPPY || pathname === LEGACY_FLOPPY;
    const body = machine
      ? assets.machineXml()
      : floppy
        ? assets.floppyBytes()
        : assets.readResource(pathname);
    const type = machine
      ? "application/xml; charset=utf-8"
      : floppy
        ? "application/octet-stream"
        : assets.contentType(pathname);
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

assets.verify();
const server = createServer(handleRequest);
server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}${PCJS_REFERENCE_MACHINE}`;
  process.stdout.write(`PCjs reference runner listening at ${url}\n`);
  process.stdout.write(
    diagnosticProbe
      ? "PCjs diagnostic source: local pc110 branch with opt-in 8042 probe\n"
      : `Pinned PCjs commit: ${PINNED_PCJS_COMMIT}\n`
  );
  process.stdout.write(`Read-only floppy: ${basename(PCJS_REFERENCE_FLOPPY)}\n`);
  if (shouldOpen) openBrowser(url);
});
