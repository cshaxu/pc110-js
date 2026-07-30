import { pcAt386Profile } from "../machine/configurations/pc-at-386.js";
import { MachineRuntime, type MachineSnapshot } from "../machine/machine-runtime.js";
import { NativeCoreCheckpoint } from "./native-core-checkpoint.js";
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
      <div class="native-status" id="native-status" aria-live="polite"></div>
    </div>
    <footer>
      <button id="run" type="button">Run</button>
      <button id="pause" type="button">Pause</button>
      <button id="reset" type="button">Reset</button>
    </footer>
  </section>
`;

const state = root.querySelector<HTMLElement>("#state");
const run = root.querySelector<HTMLButtonElement>("#run");
const pause = root.querySelector<HTMLButtonElement>("#pause");
const reset = root.querySelector<HTMLButtonElement>("#reset");
const nativeStatus = root.querySelector<HTMLElement>("#native-status");
if (!state || !run || !pause || !reset || !nativeStatus)
  throw new Error("Missing machine controls");
const controls = { state, run, pause, reset, nativeStatus };

function render(snapshot: MachineSnapshot): void {
  controls.state.textContent = `${snapshot.profileId}: ${snapshot.runState}`;
  const native = checkpoint.snapshot();
  controls.nativeStatus.textContent = [
    `CPU reset ${native.codeAddress}`,
    `PIC M IRR ${native.masterRequest} ISR ${native.masterInService}`,
    `PIC S IRR ${native.slaveRequest} ISR ${native.slaveInService}`
  ].join(" | ");
  controls.run.disabled = snapshot.runState === "running";
  controls.pause.disabled = snapshot.runState !== "running";
}

controls.run.addEventListener("click", () => machine.start());
controls.pause.addEventListener("click", () => machine.pause());
controls.reset.addEventListener("click", () => {
  checkpoint.reset();
  machine.reset();
});
machine.subscribe(render);
