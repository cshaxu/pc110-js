import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { PC_AT_FPU_CLEAR_PORT, PC_AT_FPU_RESET_PORT, PcAtFpuControl } from "./pc-at-fpu-control.js";

describe("PC/AT FPU control ports", () => {
  it("maps the source-established clear-busy and reset signals", () => {
    const control = new PcAtFpuControl();
    const bus = new RebuiltMachinePortBus();
    for (const range of control.portRanges()) bus.register(range);

    bus.write(PC_AT_FPU_CLEAR_PORT, 0, 8);
    bus.write(PC_AT_FPU_RESET_PORT, 0, 8);
    expect(control.snapshot()).toEqual({ clearCount: 1, resetCount: 1 });

    control.reset();
    expect(control.snapshot()).toEqual({ clearCount: 0, resetCount: 0 });
  });

  it("accepts only byte-wide zero output and leaves reads unowned", () => {
    const control = new PcAtFpuControl();
    expect(() => control.write(PC_AT_FPU_RESET_PORT, 1, 8)).toThrow("expects zero");
    expect(() => control.write(PC_AT_FPU_RESET_PORT, 0, 16)).toThrow("8-bit");
    expect(() => control.write(0xf2, 0, 8)).toThrow("not mapped");

    const bus = new RebuiltMachinePortBus();
    for (const range of control.portRanges()) bus.register(range);
    expect(() => bus.read(PC_AT_FPU_RESET_PORT, 8)).toThrow("Unmapped I/O read");
  });

  it("restores control-line observation counters", () => {
    const control = new PcAtFpuControl();
    control.write(PC_AT_FPU_CLEAR_PORT, 0, 8);
    const checkpoint = control.capture();

    control.write(PC_AT_FPU_RESET_PORT, 0, 8);
    control.restore(checkpoint);

    expect(control.capture()).toEqual(checkpoint);
  });
});
