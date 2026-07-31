import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PINNED_PCJS_COMMIT = "c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70";
export const PCJS_REFERENCE_MACHINE = "/_pc110js-reference/machine.xml";
export const PCJS_REFERENCE_FLOPPY = "/_pc110js-reference/media/fdd.img";

const FLOPPY_SHA256 = "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5";
const FLOPPY_SIZE = 1_474_560;
const SOURCE_MACHINE = "machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml";
const PC110_PROBE_RELEASE = "2.25";
const PCJS_RESOURCE_ROOTS = ["/machines/", "/assets/"];
const CPU_CONTROLS = [
  '<cpu id="cpu386" model="80386">',
  '<control type="button" binding="run">Run</control>',
  '<control type="button" binding="reset">Reset</control>',
  "</cpu>"
].join("");

export class PcjsReferenceAssets {
  private readonly projectRoot: string;
  private readonly pcjsRoot: string;
  private readonly floppyPath: string;
  private readonly resourceCache = new Map<string, Buffer>();
  private floppy: Buffer | undefined;

  public constructor(private readonly diagnosticProbe: boolean) {
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    this.projectRoot = resolve(moduleDirectory, "../..");
    this.pcjsRoot = resolve(this.projectRoot, "..", "pcjs");
    this.floppyPath = resolve(this.projectRoot, "..", "fdd.img");
  }

  public verify(): void {
    const sourceRoot = statSync(this.pcjsRoot, { throwIfNoEntry: false });
    if (!sourceRoot?.isDirectory())
      throw new Error(`Missing sibling PCjs checkout: ${this.pcjsRoot}`);

    if (this.diagnosticProbe) {
      const branch = this.runGit(["branch", "--show-current"]).toString("utf8").trim();
      if (branch !== "pc110")
        throw new Error("PCjs diagnostic mode requires the sibling PCjs pc110 branch");
      if (!this.readWorkingResource(SOURCE_MACHINE).toString("utf8").includes("deskpro386"))
        throw new Error("PCjs pc110 branch is missing the selected DeskPro machine");
      if (
        !this.readWorkingResource("machines/pcx86/modules/v2/chipset.js")
          .toString("utf8")
          .includes("pc110ProbeEvents")
      )
        throw new Error("PCjs pc110 branch is missing the opt-in 8042 probe");
      if (
        !this.readWorkingResource(
          `machines/pcx86/releases/${PC110_PROBE_RELEASE}/pcx86-uncompiled.js`
        )
          .toString("utf8")
          .includes("pc110ProbeEvents")
      )
        throw new Error("PCjs pc110 branch is missing the diagnostic uncompiled bundle");
    } else {
      try {
        this.runGit(["cat-file", "-e", `${PINNED_PCJS_COMMIT}:${SOURCE_MACHINE}`]);
      } catch {
        throw new Error(
          `Pinned PCjs baseline ${PINNED_PCJS_COMMIT} or selected machine is unavailable`
        );
      }
    }

    const floppy = readFileSync(this.floppyPath);
    if (floppy.length !== FLOPPY_SIZE)
      throw new Error(`Unexpected fdd.img size: ${floppy.length} bytes`);
    const actualHash = createHash("sha256").update(floppy).digest("hex");
    if (actualHash !== FLOPPY_SHA256) throw new Error(`Unexpected fdd.img SHA-256: ${actualHash}`);
    this.floppy = floppy;
  }

  public readResource(pathname: string): Buffer {
    const normalized = normalizeResourcePath(pathname);
    const cached = this.resourceCache.get(normalized);
    if (cached) return cached;
    const content = this.diagnosticProbe
      ? this.readWorkingResource(normalized)
      : this.runGit(["show", `${PINNED_PCJS_COMMIT}:${normalized}`]);
    const selected =
      normalized === "machines/pcx86/xsl/components.xsl" && this.diagnosticProbe
        ? Buffer.from(this.replaceDiagnosticVersion(content.toString("utf8")), "utf8")
        : content;
    this.resourceCache.set(normalized, selected);
    return selected;
  }

  public machineXml(): Buffer {
    const source = this.readResource(SOURCE_MACHINE).toString("utf8");
    const originalMount = /autoMount='[^']*'/;
    if (!originalMount.test(source))
      throw new Error("Selected PCjs machine has no autoMount definition");
    const withLocalMedia = source.replace(
      originalMount,
      `autoMount='{A:{name:"Local DOS floppy",path:"${PCJS_REFERENCE_FLOPPY}"}}'`
    );
    const originalCpu = '<cpu id="cpu386" model="80386"/>';
    if (!withLocalMedia.includes(originalCpu))
      throw new Error("Selected PCjs machine has no expected CPU definition");
    const machine = withLocalMedia.replace(originalCpu, CPU_CONTROLS);
    if (!this.diagnosticProbe) return Buffer.from(machine, "utf8");
    const root = '<machine id="deskpro386" type="pcx86"';
    const chipset =
      '<chipset id="chipset" model="deskpro386" floppies="[1440,1440]" monitor="vga"/>';
    if (!machine.includes(root) || !machine.includes(chipset))
      throw new Error("Selected PCjs machine has an unexpected diagnostic configuration");
    return Buffer.from(
      machine
        .replace(root, `${root} uncompiled="true"`)
        .replace(chipset, `${chipset.slice(0, -2)} pc110Probe="true"/>`),
      "utf8"
    );
  }

  public floppyBytes(): Buffer {
    if (!this.floppy) throw new Error("PCjs reference assets have not been verified");
    return this.floppy;
  }

  public servesResource(pathname: string): boolean {
    return PCJS_RESOURCE_ROOTS.some((root) => pathname.startsWith(root));
  }

  public contentType(pathname: string): string {
    switch (extname(pathname).toLowerCase()) {
      case ".css":
        return "text/css; charset=utf-8";
      case ".html":
        return "text/html; charset=utf-8";
      case ".js":
        return "text/javascript; charset=utf-8";
      case ".json":
      case ".json5":
        return "application/json; charset=utf-8";
      case ".svg":
        return "image/svg+xml";
      case ".xml":
      case ".xsl":
        return "application/xml; charset=utf-8";
      default:
        return "application/octet-stream";
    }
  }

  private runGit(args: string[]): Buffer {
    return execFileSync(
      "git",
      ["-c", `safe.directory=${this.pcjsRoot.replace(/\\/g, "/")}`, "-C", this.pcjsRoot, ...args],
      {
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
  }

  private readWorkingResource(pathname: string): Buffer {
    return readFileSync(resolve(this.pcjsRoot, normalizeResourcePath(pathname)));
  }

  private replaceDiagnosticVersion(source: string): string {
    const originalVersion = '<xsl:variable name="APPVERSION">2.23</xsl:variable>';
    if (!source.includes(originalVersion))
      throw new Error("PCjs components XSL has an unexpected release version");
    return source.replace(
      originalVersion,
      `<xsl:variable name="APPVERSION">${PC110_PROBE_RELEASE}</xsl:variable>`
    );
  }
}

function normalizeResourcePath(pathname: string): string {
  const normalized = pathname.replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\\") ||
    normalized.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error("Invalid PCjs resource path");
  return normalized;
}
