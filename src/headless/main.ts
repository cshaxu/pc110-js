import { pcAt386Profile } from "../machine/configurations/pc-at-386.js";
import { MachineRuntime } from "../machine/machine-runtime.js";

const machine = new MachineRuntime(pcAt386Profile);
machine.start();
process.stdout.write(`${JSON.stringify(machine.snapshot())}\n`);
