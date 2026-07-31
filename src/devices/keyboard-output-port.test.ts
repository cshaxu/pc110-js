import { describe, expect, it } from "vitest";
import { KeyboardOutputPort } from "./keyboard-output-port.js";

describe("project-native 8042 output-port contract", () => {
  it("defaults to A20 enabled without a reset request", () => {
    expect(new KeyboardOutputPort().snapshot()).toEqual({
      value: 0x03,
      a20Enabled: true,
      resetRequested: false
    });
  });

  it("reports A20 and reset signals independently", () => {
    const port = new KeyboardOutputPort();
    expect(port.write(0x01)).toMatchObject({ a20Enabled: false, resetRequested: false });
    expect(port.write(0x02)).toMatchObject({ a20Enabled: true, resetRequested: true });
    port.reset();
    expect(port.snapshot()).toMatchObject({ a20Enabled: true, resetRequested: false });
  });

  it("restores the raw output byte without emitting a new update", () => {
    const port = new KeyboardOutputPort();
    port.write(0x01);
    const captured = port.capture();
    port.write(0x02);
    port.restore(captured);
    expect(port.snapshot()).toMatchObject({
      value: 0x01,
      a20Enabled: false,
      resetRequested: false
    });
  });
});
