import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import {
  DESKPRO386_SECONDARY_PIT_CONTROL_PORT,
  DESKPRO386_SECONDARY_PIT_COUNTER0_PORT,
  DeskPro386SecondaryPit
} from "./deskpro386-secondary-pit.js";

describe("DeskPro 386 secondary PIT", () => {
  it("maps its complete byte-wide counter and control-port group", () => {
    const pit = new DeskPro386SecondaryPit();
    const bus = new RebuiltMachinePortBus();
    for (const range of pit.portRanges()) bus.register(range);

    bus.write(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 0x34, 8);
    bus.write(DESKPRO386_SECONDARY_PIT_COUNTER0_PORT, 2, 8);
    bus.write(DESKPRO386_SECONDARY_PIT_COUNTER0_PORT, 0, 8);
    expect(bus.read(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 8)).toBe(0x34);
    expect(pit.advance(3).risingEdges).toEqual([0]);
  });

  it("does not expose the DeskPro-specific ports at wider widths", () => {
    const pit = new DeskPro386SecondaryPit();
    expect(() => pit.write(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 0x34, 16)).toThrow("8-bit");
    expect(() => pit.read(0x4c, 8)).toThrow("not mapped");
    pit.write(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 0x34, 8);
    pit.reset();
    expect(pit.read(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 8)).toBe(0);
  });

  it("restores counter sequencing and the control register", () => {
    const pit = new DeskPro386SecondaryPit();
    pit.write(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 0x34, 8);
    pit.write(DESKPRO386_SECONDARY_PIT_COUNTER0_PORT, 0x05, 8);
    pit.write(DESKPRO386_SECONDARY_PIT_COUNTER0_PORT, 0x00, 8);
    pit.advance(2);
    const checkpoint = pit.capture();
    const expectedEdges = pit.advance(3).risingEdges;

    pit.reset();
    pit.restore(checkpoint);

    expect(pit.capture()).toEqual(checkpoint);
    expect(pit.advance(3).risingEdges).toEqual(expectedEdges);
    expect(pit.read(DESKPRO386_SECONDARY_PIT_CONTROL_PORT, 8)).toBe(0x34);
  });
});
