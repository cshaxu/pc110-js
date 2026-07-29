import { describe, expect, it } from "vitest";
import { MachineRuntime } from "./machine-runtime.js";

describe("MachineRuntime", () => {
  it("shares deterministic lifecycle state with all hosts", () => {
    const machine = new MachineRuntime("pc-at-386");
    const states: string[] = [];
    machine.subscribe((snapshot) => states.push(snapshot.runState));

    machine.start();
    machine.pause();
    machine.reset();

    expect(machine.snapshot()).toEqual({
      profileId: "pc-at-386",
      runState: "stopped",
      resetCount: 1
    });
    expect(states).toEqual(["stopped", "running", "paused", "stopped"]);
  });
});
