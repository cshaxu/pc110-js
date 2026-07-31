import { describe, expect, it } from "vitest";
import { Pic8259 } from "./pic8259.js";

function initialize(pic: Pic8259, vectorBase = 0x20): void {
  pic.writeCommand(0x11);
  pic.writeData(vectorBase);
  pic.writeData(0x04);
  pic.writeData(0x01);
}

describe("project-native 8259A PIC", () => {
  it("preserves PCjs's observable pre-ICW reset register state", () => {
    const pic = new Pic8259();
    pic.reset();

    expect(pic.snapshot()).toMatchObject({
      mask: undefined,
      request: undefined,
      inService: undefined
    });
  });

  it("accepts ICW1-4 and exposes its vector base and mask", () => {
    const pic = new Pic8259();
    initialize(pic);
    expect(pic.snapshot()).toMatchObject({ vectorBase: 0x20, mask: 0, initialized: true });
    pic.writeData(0xf9);
    expect(pic.readData()).toBe(0xf9);
  });

  it("arbitrates unmasked requests by fixed priority and moves them to ISR", () => {
    const pic = new Pic8259();
    initialize(pic);
    pic.raise(5);
    pic.raise(1);
    expect(pic.acknowledge()).toBe(0x21);
    expect(pic.snapshot()).toMatchObject({ request: 0x20, inService: 0x02 });
    expect(pic.acknowledge()).toBeUndefined();
    pic.writeCommand(0x20);
    expect(pic.acknowledge()).toBe(0x25);
  });

  it("honors masks and OCW3 IRR/ISR read selection", () => {
    const pic = new Pic8259();
    initialize(pic);
    pic.writeData(0x04);
    pic.raise(2);
    pic.raise(3);
    pic.writeCommand(0x0a);
    expect(pic.readCommand()).toBe(0x0c);
    expect(pic.acknowledge()).toBe(0x23);
    pic.writeCommand(0x0b);
    expect(pic.readCommand()).toBe(0x08);
  });

  it("supports specific EOI, automatic EOI, and explicit priority rotation", () => {
    const pic = new Pic8259();
    initialize(pic);
    pic.raise(4);
    expect(pic.acknowledge()).toBe(0x24);
    pic.writeCommand(0x64);
    expect(pic.snapshot().inService).toBe(0);
    pic.writeCommand(0xc3);
    pic.raise(4);
    pic.raise(2);
    expect(pic.acknowledge()).toBe(0x24);

    const auto = new Pic8259();
    auto.writeCommand(0x11);
    auto.writeData(0x20);
    auto.writeData(0x04);
    auto.writeData(0x03);
    auto.raise(0);
    expect(auto.acknowledge()).toBe(0x20);
    expect(auto.snapshot().inService).toBe(0);
  });

  it("restores initialization and arbitration state exactly", () => {
    const pic = new Pic8259();
    pic.writeCommand(0x11);
    pic.writeData(0x20);
    const captured = pic.capture();
    pic.writeData(0x04);
    pic.writeData(0x01);
    pic.raise(1);

    pic.restore(captured);

    expect(pic.capture()).toEqual(captured);
    pic.writeData(0x04);
    pic.writeData(0x01);
    pic.raise(1);
    expect(pic.acknowledge()).toBe(0x21);
  });
});
