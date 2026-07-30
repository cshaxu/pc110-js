import { describe, expect, it } from "vitest";
import { Pit8254 } from "./pit8254.js";

function program(pit: Pit8254, counter: number, mode: number, count: number): void {
  pit.writeControl((counter << 6) | 0x30 | (mode << 1));
  pit.writeCounter(counter, count & 0xff);
  pit.writeCounter(counter, count >>> 8);
}

describe("project-native 8254 PIT", () => {
  it("loads binary counter zero as 65536 and supports low/high reads", () => {
    const pit = new Pit8254();
    program(pit, 0, 0, 0);
    expect(pit.snapshot(0)).toMatchObject({ reload: 0x10000, count: 0x10000, output: false });
    pit.writeControl(0x00);
    expect(pit.readCounter(0)).toBe(0);
    expect(pit.readCounter(0)).toBe(0);
  });

  it("implements mode 0 terminal count and rising output", () => {
    const pit = new Pit8254();
    program(pit, 0, 0, 2);
    expect(pit.advance(1).risingEdges).toEqual([]);
    expect(pit.advance(1).risingEdges).toEqual([0]);
    expect(pit.snapshot(0)).toMatchObject({ count: 0, output: true });
  });

  it("implements mode 1 as a gate-rising triggered one-shot", () => {
    const pit = new Pit8254();
    program(pit, 0, 1, 2);
    pit.setGate(0, false);
    pit.setGate(0, true);
    expect(pit.snapshot(0).output).toBe(false);
    pit.advance(2);
    expect(pit.snapshot(0).output).toBe(true);
  });

  it("implements mode 5 as a gate-rising triggered hardware strobe", () => {
    const pit = new Pit8254();
    program(pit, 0, 5, 2);
    pit.setGate(0, false);
    pit.setGate(0, true);
    pit.advance(2);
    expect(pit.snapshot(0).output).toBe(false);
    expect(pit.advance(1).risingEdges).toEqual([0]);
  });

  it("implements mode 2 rate generation and mode 3 square-wave output", () => {
    const rate = new Pit8254();
    program(rate, 0, 2, 3);
    rate.advance(3);
    expect(rate.snapshot(0).output).toBe(false);
    expect(rate.advance(1).risingEdges).toEqual([0]);

    const square = new Pit8254();
    program(square, 0, 3, 5);
    square.advance(3);
    expect(square.snapshot(0).output).toBe(false);
    expect(square.advance(2).risingEdges).toEqual([0]);
  });

  it("implements mode 4 software strobe output", () => {
    const pit = new Pit8254();
    program(pit, 0, 4, 2);
    pit.advance(2);
    expect(pit.snapshot(0).output).toBe(false);
    expect(pit.advance(1).risingEdges).toEqual([0]);
  });

  it("latches count and status through 8254 read-back commands", () => {
    const pit = new Pit8254();
    program(pit, 1, 2, 0x1234);
    pit.advance(1);
    pit.writeControl(0xc0);
    const status = pit.readCounter(1);
    expect(status & 0x0e).toBe(0x04);
    expect(pit.readCounter(1)).toBe(0x33);
    expect(pit.readCounter(1)).toBe(0x12);
  });

  it("rejects BCD control and invalid counter access", () => {
    const pit = new Pit8254();
    expect(() => pit.writeControl(0x31)).toThrow("BCD");
    expect(() => pit.readCounter(3)).toThrow("outside 0-2");
    expect(() => pit.advance(-1)).toThrow("non-negative");
  });
});
