import { pcAt386Profile } from "../machine/configurations/pc-at-386.js";
import { MachineRuntime, type MachineSnapshot } from "../machine/machine-runtime.js";
import { NativeCoreCheckpoint } from "./native-core-checkpoint.js";
import { NativeLockstepAdapter } from "../reference/native-lockstep-adapter.js";
import {
  resetControlledLockstep,
  stepControlledLockstep,
  type PcjsLockstepEndpoint,
  type PcjsLockstepReset,
  type PcjsLockstepSnapshot,
  type PcjsLockstepStep
} from "../reference/lockstep-coordinator.js";
import { LocalAssetLoader } from "./local-asset-loader.js";
import {
  selectedDeskProRom,
  selectedDosFloppy,
  selectedIbmVgaRom
} from "./selected-media-profile.js";
import { KeyboardByteQueue, set1ScancodeBytes } from "./keyboard-scancode-set1.js";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing application root");

const machine = new MachineRuntime(pcAt386Profile);
const checkpoint = new NativeCoreCheckpoint();
const nativeLockstep = new NativeLockstepAdapter(checkpoint);
const parameters = new URLSearchParams(window.location.search);
const developerMediaEnabled = parameters.has("dev-media");
const pcjsReferenceEnabled = developerMediaEnabled && parameters.has("pcjs-reference");
root.innerHTML = `
  <section class="machine-shell" aria-label="pc110-js machine">
    <header>
      <strong>pc110-js</strong>
      <span id="state" role="status"></span>
    </header>
    <div class="machine-workbench">
      <div class="display" aria-label="Machine display">
        <canvas id="screen" width="720" height="400" tabindex="0" aria-label="Native VGA text display"></canvas>
        <div class="native-status" id="native-status" aria-live="polite"></div>
      </div>
      ${
        pcjsReferenceEnabled
          ? `
        <section class="reference-panel" aria-label="PCjs reference machine">
          <header><strong>PCjs reference</strong></header>
          <iframe id="pcjs-reference" title="PCjs reference machine" src="/_pc110js-reference/index.html"></iframe>
        </section>
      `
          : ""
      }
    </div>
    <footer>
      <button id="run" type="button">Run</button>
      <button id="pause" type="button">Pause</button>
      <button id="reset" type="button">Reset</button>
      <label>System ROM <input id="rom" type="file" /></label>
      <label>VGA ROM <input id="vga-rom" type="file" /></label>
      <label>Floppy <input id="floppy" type="file" /></label>
      <button id="mount" type="button">Mount</button>
      ${developerMediaEnabled ? '<button id="dev-media" type="button">Load local media</button>' : ""}
      ${developerMediaEnabled ? '<button id="dev-key-a" type="button">Send A</button>' : ""}
      ${pcjsReferenceEnabled ? '<button id="lockstep" type="button">Compare boundary</button>' : ""}
      ${pcjsReferenceEnabled ? '<button id="lockstep-reset" type="button">Reset boundary</button>' : ""}
    </footer>
  </section>
`;

const state = root.querySelector<HTMLElement>("#state");
const run = root.querySelector<HTMLButtonElement>("#run");
const pause = root.querySelector<HTMLButtonElement>("#pause");
const reset = root.querySelector<HTMLButtonElement>("#reset");
const nativeStatus = root.querySelector<HTMLElement>("#native-status");
const screen = root.querySelector<HTMLCanvasElement>("#screen");
const rom = root.querySelector<HTMLInputElement>("#rom");
const vgaRom = root.querySelector<HTMLInputElement>("#vga-rom");
const floppy = root.querySelector<HTMLInputElement>("#floppy");
const mount = root.querySelector<HTMLButtonElement>("#mount");
const developerMedia = root.querySelector<HTMLButtonElement>("#dev-media");
const developerKeyA = root.querySelector<HTMLButtonElement>("#dev-key-a");
const lockstep = root.querySelector<HTMLButtonElement>("#lockstep");
const lockstepReset = root.querySelector<HTMLButtonElement>("#lockstep-reset");
const referenceFrame = root.querySelector<HTMLIFrameElement>("#pcjs-reference");
if (
  !state ||
  !run ||
  !pause ||
  !reset ||
  !nativeStatus ||
  !screen ||
  !rom ||
  !vgaRom ||
  !floppy ||
  !mount
)
  throw new Error("Missing machine controls");
const context = screen.getContext("2d");
if (!context) throw new Error("Canvas 2D context is unavailable");
const controls = { state, run, pause, reset, nativeStatus, screen, context };
const loader = new LocalAssetLoader();
const keyboardQueue = new KeyboardByteQueue();
let mediaMounted = false;
let animationFrame: number | undefined;
let lastNativeRenderAt = 0;
const NATIVE_INSTRUCTION_SLICE = 25_000;
const NATIVE_RENDER_INTERVAL_MS = 100;

function color(component: readonly [number, number, number]): string {
  return `rgb(${component[0] * 4}, ${component[1] * 4}, ${component[2] * 4})`;
}

function renderDisplay(): void {
  const { context } = controls;
  context.font = "16px monospace";
  context.textBaseline = "top";
  for (let row = 0; row < 25; row += 1) {
    for (let column = 0; column < 80; column += 1) {
      const cell = checkpoint.textFramebuffer.cell(column, row);
      const x = column * 9;
      const y = row * 16;
      context.fillStyle = color(cell.background);
      context.fillRect(x, y, 9, 16);
      context.fillStyle = color(cell.foreground);
      context.fillText(String.fromCharCode(cell.character), x, y);
    }
  }
}

function render(snapshot: MachineSnapshot): void {
  renderDisplay();
  controls.state.textContent = `${snapshot.profileId}: ${snapshot.runState}`;
  const native = checkpoint.snapshot();
  controls.nativeStatus.textContent = [
    `CPU ${native.codeAddress}`,
    `PIC M IRR ${native.masterRequest} ISR ${native.masterInService} IMR ${native.masterMask}`,
    `PIC S IRR ${native.slaveRequest} ISR ${native.slaveInService} IMR ${native.slaveMask}`,
    `PIT 0 OUT ${native.timer0Output} 2 OUT ${native.timer2Output}`,
    `DMA0 MASK ${native.dma0Masks} DMA1 MASK ${native.dma1Masks}`,
    `FDC ${native.fdcPhase} MSR ${native.fdcMainStatus} IRQ ${native.fdcInterruptPending} DMA ${native.fdcDmaBytesPending} D0 ${native.fdcDrive0Ready}:${native.fdcDrive0Cylinder}`,
    `RTC A ${native.rtcStatusA} B ${native.rtcStatusB} C ${native.rtcStatusC} D ${native.rtcStatusD} NMI ${native.rtcNmiDisabled}`,
    `SYS61 ${native.systemPortControl} PIT2 GATE ${native.systemTimer2Gate} SPK ${native.systemSpeakerOutput} A20 ${native.a20Enabled}`,
    `8042 STAT ${native.keyboardControllerStatus} CMD ${native.keyboardControllerCommandByte} OBF ${native.keyboardControllerOutputBuffer} KBD ${native.keyboardControllerKeyboardEnabled} SCAN ${native.keyboardScanningEnabled}`,
    `BDA KBD HEAD ${native.bdaKeyboardHead} TAIL ${native.bdaKeyboardTail}`,
    `8042 WRITES ${native.recentKeyboardControllerWrites}`,
    `8042 PORTS ${native.recentKeyboardControllerPortEvents}`,
    `PORTS ${native.recentPortEvents}`
  ].join(" | ");
  controls.run.disabled = snapshot.runState === "running";
  controls.pause.disabled = snapshot.runState !== "running";
}

controls.run.addEventListener("click", () => {
  if (!mediaMounted) return;
  machine.start();
  scheduleNativeRun();
});
controls.pause.addEventListener("click", () => {
  machine.pause();
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
});
controls.reset.addEventListener("click", () => {
  keyboardQueue.clear();
  checkpoint.reset();
  machine.reset();
});
screen.addEventListener("click", () => screen.focus());
window.addEventListener("keydown", (event) => enqueueKeyboardEvent(event, true));
window.addEventListener("keyup", (event) => enqueueKeyboardEvent(event, false));
mount.addEventListener("click", async () => {
  if (!rom.files?.[0] || !vgaRom.files?.[0] || !floppy.files?.[0]) return;
  try {
    const [romBytes, vgaRomBytes, floppyBytes] = await Promise.all([
      loader.load(rom.files[0], selectedDeskProRom),
      loader.load(vgaRom.files[0], selectedIbmVgaRom),
      loader.load(floppy.files[0], selectedDosFloppy)
    ]);
    checkpoint.mapSystemRom(romBytes);
    checkpoint.mapVgaRom(vgaRomBytes);
    checkpoint.attachFloppy(floppyBytes);
    checkpoint.reset();
    keyboardQueue.clear();
    mediaMounted = true;
    render(machine.snapshot());
  } catch (error) {
    controls.nativeStatus.textContent = error instanceof Error ? error.message : String(error);
  }
});
developerMedia?.addEventListener("click", () => void mountDeveloperMedia());
developerKeyA?.addEventListener("click", () => {
  enqueueKeyboardCode("KeyA", true);
  enqueueKeyboardCode("KeyA", false);
});
lockstep?.addEventListener("click", () => compareBrowserLockstep());
lockstepReset?.addEventListener("click", () => resetBrowserLockstep());

async function mountDeveloperMedia(): Promise<void> {
  try {
    const [romBytes, vgaRomBytes, floppyBytes] = await Promise.all([
      loader.loadUrl("/_pc110js-dev-media/deskpro-rom", selectedDeskProRom),
      loader.loadUrl("/_pc110js-dev-media/vga-rom", selectedIbmVgaRom),
      loader.loadUrl("/_pc110js-dev-media/floppy", selectedDosFloppy)
    ]);
    checkpoint.mapSystemRom(romBytes);
    checkpoint.mapVgaRom(vgaRomBytes);
    checkpoint.attachFloppy(floppyBytes);
    checkpoint.reset();
    keyboardQueue.clear();
    mediaMounted = true;
    render(machine.snapshot());
  } catch (error) {
    controls.nativeStatus.textContent = error instanceof Error ? error.message : String(error);
  }
}

function scheduleNativeRun(timestamp = 0): void {
  if (machine.snapshot().runState !== "running") return;
  try {
    checkpoint.core.run(NATIVE_INSTRUCTION_SLICE);
    keyboardQueue.drain((byte) => checkpoint.core.receiveKeyboardByte(byte));
  } catch (error) {
    machine.pause();
    animationFrame = undefined;
    controls.nativeStatus.textContent = error instanceof Error ? error.message : String(error);
    return;
  }
  if (timestamp - lastNativeRenderAt >= NATIVE_RENDER_INTERVAL_MS) {
    lastNativeRenderAt = timestamp;
    render(machine.snapshot());
  }
  animationFrame = requestAnimationFrame(scheduleNativeRun);
}

function enqueueKeyboardEvent(event: KeyboardEvent, pressed: boolean): void {
  if (pressed && event.repeat) return;
  if (!enqueueKeyboardCode(event.code, pressed)) return;
  event.preventDefault();
}

function enqueueKeyboardCode(code: string, pressed: boolean): boolean {
  if (machine.snapshot().runState !== "running") return false;
  const bytes = set1ScancodeBytes(code, pressed);
  if (!bytes) return false;
  keyboardQueue.enqueue(bytes);
  return true;
}

function compareBrowserLockstep(): void {
  if (!mediaMounted) {
    controls.nativeStatus.textContent =
      "Load verified local media before comparing an instruction boundary";
    return;
  }
  if (machine.snapshot().runState === "running") {
    controls.nativeStatus.textContent = "Pause the native machine before comparing a boundary";
    return;
  }
  const pcjs = pcjsLockstepEndpoint(referenceFrame);
  if (!pcjs) {
    controls.nativeStatus.textContent = "PCjs lockstep control is not ready";
    return;
  }
  const result = stepControlledLockstep(nativeLockstep, pcjs);
  switch (result.kind) {
    case "precondition-difference":
      controls.nativeStatus.textContent = `Lockstep entry mismatch at ${formatBoundary(result.before)}: ${formatDifference(result.comparison)}`;
      return;
    case "pcjs-not-paused":
      controls.nativeStatus.textContent = "Pause the PCjs machine before comparing a boundary";
      return;
    case "pcjs-rejected":
      controls.nativeStatus.textContent = `PCjs rejected boundary step: ${result.step.reason}`;
      return;
    case "stepped":
      controls.nativeStatus.textContent = result.comparison.equal
        ? `Lockstep boundary matched: native ${result.nativeStep.kind} ${result.timing.nativeCycles} cycles, PCjs ${result.timing.pcjsCycles} cycles${result.timing.equal ? "" : " (timing difference)"}`
        : `Lockstep boundary mismatch at ${formatBoundary(result.before)}: ${formatDifference(result.comparison)}`;
  }
}

function formatBoundary(boundary: {
  readonly native: { readonly cs: number; readonly eip: number; readonly virtualCycles: string };
  readonly pcjs: { readonly cs: number; readonly eip: number; readonly virtualCycles: number };
}): string {
  return `native ${hex16(boundary.native.cs)}:${hex32(boundary.native.eip)}@${boundary.native.virtualCycles} PCjs ${hex16(boundary.pcjs.cs)}:${hex32(boundary.pcjs.eip)}@${boundary.pcjs.virtualCycles}`;
}

function hex16(value: number): string {
  return (value & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

function hex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function resetBrowserLockstep(): void {
  if (machine.snapshot().runState === "running") {
    controls.nativeStatus.textContent = "Pause the native machine before resetting a boundary";
    return;
  }
  const pcjs = pcjsLockstepEndpoint(referenceFrame);
  if (!pcjs) {
    controls.nativeStatus.textContent = "PCjs lockstep control is not ready";
    return;
  }
  const result = resetControlledLockstep(nativeLockstep, pcjs);
  switch (result.kind) {
    case "pcjs-not-paused":
      controls.nativeStatus.textContent = "Pause the PCjs machine before resetting a boundary";
      return;
    case "pcjs-reset-rejected":
      controls.nativeStatus.textContent = `PCjs rejected boundary reset: ${result.reset.reason}`;
      return;
    case "reset":
      machine.reset();
      controls.nativeStatus.textContent = result.comparison.equal
        ? "Lockstep reset boundary matched"
        : `Lockstep reset boundary mismatch: ${formatDifference(result.comparison)}`;
  }
}

function pcjsLockstepEndpoint(frame: HTMLIFrameElement | null): PcjsLockstepEndpoint | undefined {
  const referenceWindow = frame?.contentWindow as
    | (Window & {
        readonly PCjs?: {
          readonly components?: readonly {
            readonly id?: unknown;
            readonly pc110Lockstep?: unknown;
          }[];
        };
      })
    | null;
  const components = referenceWindow?.PCjs?.components;
  const chipset = components?.find((component: { id?: unknown }) =>
    String(component?.id ?? "").endsWith(".chipset")
  );
  const control = chipset?.pc110Lockstep as
    | {
        readonly snapshot?: () => PcjsLockstepSnapshot;
        readonly resetMachine?: () => PcjsLockstepReset;
        readonly stepInstruction?: () => PcjsLockstepStep;
      }
    | undefined;
  const snapshot = control?.snapshot;
  const resetMachine = control?.resetMachine;
  const stepInstruction = control?.stepInstruction;
  if (!snapshot || !resetMachine || !stepInstruction) return undefined;
  return {
    snapshot,
    resetMachine,
    stepInstruction
  };
}

function formatDifference(comparison: {
  readonly difference:
    | { readonly path: string; readonly native: unknown; readonly pcjs: unknown }
    | undefined;
}): string {
  const difference = comparison.difference;
  return difference
    ? `${difference.path} native=${String(difference.native)} pcjs=${String(difference.pcjs)}`
    : "unknown";
}
machine.subscribe(render);
