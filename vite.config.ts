import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

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

export default defineConfig({
  plugins: [developerMediaPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true
  }
});
