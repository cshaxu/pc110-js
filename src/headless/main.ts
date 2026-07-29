import { MachineRuntime } from "../core/machine-runtime.js";
import { pcAt386Profile } from "../profiles/pc-at-386.js";

const machine = new MachineRuntime(pcAt386Profile);
machine.start();
process.stdout.write(`${JSON.stringify(machine.snapshot())}\n`);
