import { MachineRuntime } from "../core/machine-runtime.js";

const machine = new MachineRuntime("pc-at-386");
machine.start();
process.stdout.write(`${JSON.stringify(machine.snapshot())}\n`);
