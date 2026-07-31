import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import {
  PCJS_REFERENCE_FLOPPY,
  PCJS_REFERENCE_MACHINE,
  PcjsReferenceAssets
} from "./src/reference/pcjs-reference-assets.js";

function developerMediaPlugin(): Plugin {
  const media = new Map<string, string>([
    ["/_pc110js-dev-media/deskpro-rom", process.env.PC110JS_DEV_SYSTEM_ROM ?? ""],
    ["/_pc110js-dev-media/vga-rom", process.env.PC110JS_DEV_VGA_ROM ?? ""],
    ["/_pc110js-dev-media/floppy", process.env.PC110JS_DEV_FLOPPY ?? ""]
  ]);

  return {
    name: "pc110js-developer-media",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request: IncomingMessage, response: ServerResponse, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        const source = media.get(pathname);
        if (source === undefined) return next();
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405).end();
          return;
        }
        if (!source) {
          response.writeHead(404).end();
          return;
        }
        try {
          const body = readFileSync(resolve(source));
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Length": body.byteLength,
            "Content-Type": "application/octet-stream"
          });
          if (request.method === "HEAD") response.end();
          else response.end(body);
        } catch {
          response.writeHead(404).end();
        }
      });
    }
  };
}

function pcjsReferencePlugin(): Plugin {
  const enabled = process.env.PC110JS_REFERENCE_PC110_PROBE === "1";
  const assets = new PcjsReferenceAssets(true);

  return {
    name: "pc110js-pcjs-reference",
    apply: "serve",
    configureServer(server) {
      if (!enabled) return;
      assets.verify();
      server.middlewares.use((request: IncomingMessage, response: ServerResponse, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        const machine = pathname === PCJS_REFERENCE_MACHINE;
        const floppy = pathname === PCJS_REFERENCE_FLOPPY;
        if (!machine && !floppy && !assets.servesResource(pathname)) return next();
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405).end();
          return;
        }
        try {
          const body = machine ? assets.machineXml() : floppy ? assets.floppyBytes() : assets.readResource(pathname);
          const type = machine ? "application/xml; charset=utf-8" : floppy ? "application/octet-stream" : assets.contentType(pathname);
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Length": body.byteLength,
            "Content-Type": type,
            "Cross-Origin-Resource-Policy": "same-origin"
          });
          if (request.method === "HEAD") response.end();
          else response.end(body);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end(`${detail}\n`);
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [developerMediaPlugin(), pcjsReferencePlugin()],
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true
  }
});
