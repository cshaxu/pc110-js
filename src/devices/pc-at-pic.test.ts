import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import {
  MASTER_PIC_COMMAND_PORT,
  MASTER_PIC_DATA_PORT,
  PcAtPic,
  SLAVE_PIC_COMMAND_PORT,
  SLAVE_PIC_DATA_PORT
} from "./pc-at-pic.js";

function initialize(pic: PcAtPic): void {
  pic.write(MASTER_PIC_COMMAND_PORT, 0x11, 8);
  pic.write(MASTER_PIC_DATA_PORT, 0x20, 8);
  pic.write(MASTER_PIC_DATA_PORT, 0x04, 8);
  pic.write(MASTER_PIC_DATA_PORT, 0x01, 8);
  pic.write(SLAVE_PIC_COMMAND_PORT, 0x11, 8);
  pic.write(SLAVE_PIC_DATA_PORT, 0x28, 8);
  pic.write(SLAVE_PIC_DATA_PORT, 0x02, 8);
  pic.write(SLAVE_PIC_DATA_PORT, 0x01, 8);
}

describe("project-native PC/AT PIC cascade", () => {
  it("routes master and slave IRQs through the initialized cascade", () => {
    const pic = new PcAtPic();
    initialize(pic);
    pic.raiseIrq(1);
    pic.raiseIrq(10);

    expect(pic.acknowledge()).toBe(0x21);
    pic.write(MASTER_PIC_COMMAND_PORT, 0x20, 8);
    expect(pic.acknowledge()).toBe(0x2a);
    expect(pic.snapshot()).toMatchObject({
      master: { inService: 0x04 },
      slave: { inService: 0x04 }
    });
  });

  it("reports a pending vector without acknowledging the IRQ", () => {
    const pic = new PcAtPic();
    initialize(pic);
    pic.raiseIrq(10);
    expect(pic.pendingVector()).toBe(0x2a);
    expect(pic.snapshot()).toMatchObject({ master: { request: 0x04 }, slave: { request: 0x04 } });
    expect(pic.acknowledge()).toBe(0x2a);
  });

  it("requires both slave and master EOIs before another slave IRQ can proceed", () => {
    const pic = new PcAtPic();
    initialize(pic);
    pic.raiseIrq(9);
    expect(pic.acknowledge()).toBe(0x29);
    pic.raiseIrq(10);
    pic.write(SLAVE_PIC_COMMAND_PORT, 0x20, 8);
    expect(pic.acknowledge()).toBeUndefined();
    pic.write(MASTER_PIC_COMMAND_PORT, 0x20, 8);
    expect(pic.acknowledge()).toBe(0x2a);
  });

  it("propagates slave masking and exposes command-register reads via ports", () => {
    const pic = new PcAtPic();
    initialize(pic);
    pic.write(SLAVE_PIC_DATA_PORT, 0x04, 8);
    pic.raiseIrq(10);
    expect(pic.acknowledge()).toBeUndefined();
    pic.write(SLAVE_PIC_DATA_PORT, 0x00, 8);
    pic.write(SLAVE_PIC_COMMAND_PORT, 0x0a, 8);
    expect(pic.read(SLAVE_PIC_COMMAND_PORT, 8)).toBe(0x04);
    expect(pic.acknowledge()).toBe(0x2a);
  });

  it("exports the four PIC ports for the rebuilt machine port bus", () => {
    const pic = new PcAtPic();
    const bus = new RebuiltMachinePortBus();
    for (const range of pic.portRanges()) bus.register(range);
    bus.write(MASTER_PIC_COMMAND_PORT, 0x11, 8);
    bus.write(MASTER_PIC_DATA_PORT, 0x20, 8);
    bus.write(MASTER_PIC_DATA_PORT, 0x04, 8);
    bus.write(MASTER_PIC_DATA_PORT, 0x01, 8);
    expect(bus.read(MASTER_PIC_DATA_PORT, 8)).toBe(0);
  });

  it("rejects unowned ports, non-byte access, and invalid IRQ lines", () => {
    const pic = new PcAtPic();
    expect(() => pic.read(0x22, 8)).toThrow("not mapped");
    expect(() => pic.write(MASTER_PIC_DATA_PORT, 0, 16)).toThrow("8-bit");
    expect(() => pic.raiseIrq(16)).toThrow("outside 0-15");
  });

  it("restores both cascade controllers without acknowledging pending IRQs", () => {
    const pic = new PcAtPic();
    initialize(pic);
    pic.raiseIrq(10);
    const captured = pic.capture();
    pic.acknowledge();

    pic.restore(captured);

    expect(pic.capture()).toEqual(captured);
    expect(pic.acknowledge()).toBe(0x2a);
  });
});
