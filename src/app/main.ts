import { pcAt386Profile } from "../machine/configurations/pc-at-386.js";
import { MachineRuntime, type MachineSnapshot } from "../machine/machine-runtime.js";
import { NativeCoreCheckpoint } from "./native-core-checkpoint.js";
import { LocalAssetLoader } from "./local-asset-loader.js";
import { selectedDeskProRom, selectedDosFloppy } from "./selected-media-profile.js";
import { KeyboardByteQueue, set1ScancodeBytes } from "./keyboard-scancode-set1.js";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing application root");

const machine = new MachineRuntime(pcAt386Profile);
const checkpoint = new NativeCoreCheckpoint();
root.innerHTML = `
  <section class="machine-shell" aria-label="pc110-js machine">
    <header>
      <strong>pc110-js</strong>
      <span id="state" role="status"></span>
    </header>
    <div class="display" aria-label="Machine display">
      <canvas id="screen" width="720" height="400" aria-label="Native VGA text display"></canvas>
      <div class="native-status" id="native-status" aria-live="polite"></div>
    </div>
    <footer>
      <button id="run" type="button">Run</button>
      <button id="pause" type="button">Pause</button>
      <button id="reset" type="button">Reset</button>
      <label>ROM <input id="rom" type="file" /></label>
      <label>Floppy <input id="floppy" type="file" /></label>
      <button id="mount" type="button">Mount</button>
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
const floppy = root.querySelector<HTMLInputElement>("#floppy");
const mount = root.querySelector<HTMLButtonElement>("#mount");
if (!state || !run || !pause || !reset || !nativeStatus || !screen || !rom || !floppy || !mount)
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
    `CPU reset ${native.codeAddress}`,
    `PIC M IRR ${native.masterRequest} ISR ${native.masterInService}`,
    `PIC S IRR ${native.slaveRequest} ISR ${native.slaveInService}`,
    `PIT 0 OUT ${native.timer0Output} 2 OUT ${native.timer2Output}`,
    `DMA0 MASK ${native.dma0Masks} DMA1 MASK ${native.dma1Masks}`,
    `RTC A ${native.rtcStatusA} B ${native.rtcStatusB} C ${native.rtcStatusC} D ${native.rtcStatusD} NMI ${native.rtcNmiDisabled}`,
    `SYS61 ${native.systemPortControl} PIT2 GATE ${native.systemTimer2Gate} SPK ${native.systemSpeakerOutput} A20 ${native.a20Enabled}`,
    `8042 STAT ${native.keyboardControllerStatus} CMD ${native.keyboardControllerCommandByte} OBF ${native.keyboardControllerOutputBuffer} KBD ${native.keyboardControllerKeyboardEnabled}`
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
window.addEventListener("keydown", (event) => enqueueKeyboardEvent(event, true));
window.addEventListener("keyup", (event) => enqueueKeyboardEvent(event, false));
mount.addEventListener("click", async () => {
  if (!rom.files?.[0] || !floppy.files?.[0]) return;
  try {
    const [romBytes, floppyBytes] = await Promise.all([
      loader.load(rom.files[0], selectedDeskProRom),
      loader.load(floppy.files[0], selectedDosFloppy)
    ]);
    checkpoint.mapSystemRom(romBytes);
    checkpoint.attachFloppy(floppyBytes);
    checkpoint.reset();
    keyboardQueue.clear();
    mediaMounted = true;
    render(machine.snapshot());
  } catch (error) {
    controls.nativeStatus.textContent = error instanceof Error ? error.message : String(error);
  }
});

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
  if (machine.snapshot().runState !== "running" || (pressed && event.repeat)) return;
  const bytes = set1ScancodeBytes(event.code, pressed);
  if (!bytes) return;
  event.preventDefault();
  keyboardQueue.enqueue(bytes);
}
machine.subscribe(render);
