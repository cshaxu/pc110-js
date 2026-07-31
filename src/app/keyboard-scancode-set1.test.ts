import { describe, expect, it } from "vitest";
import { KeyboardByteQueue, set1ScancodeBytes } from "./keyboard-scancode-set1.js";

describe("Set-1 browser keyboard boundary", () => {
  it("maps make and break bytes for normal and extended keys", () => {
    expect(set1ScancodeBytes("KeyA", true)).toEqual([0x1e]);
    expect(set1ScancodeBytes("KeyA", false)).toEqual([0x9e]);
    expect(set1ScancodeBytes("ArrowUp", true)).toEqual([0xe0, 0x48]);
    expect(set1ScancodeBytes("ArrowUp", false)).toEqual([0xe0, 0xc8]);
    expect(set1ScancodeBytes("Unidentified", true)).toBeUndefined();
  });

  it("retains bytes until the native controller accepts them", () => {
    const queue = new KeyboardByteQueue();
    queue.enqueue([0xe0, 0x48]);
    expect(queue.drain(() => false)).toBe(0);
    expect(queue.size()).toBe(2);
    const delivered: number[] = [];
    expect(
      queue.drain((byte) => {
        delivered.push(byte);
        return true;
      })
    ).toBe(2);
    expect(delivered).toEqual([0xe0, 0x48]);
    expect(queue.size()).toBe(0);
  });

  it("restores queued browser input without delivering it early", () => {
    const queue = new KeyboardByteQueue();
    queue.enqueue([0xe0, 0x48]);
    const checkpoint = queue.capture();

    queue.drain(() => true);
    queue.restore(checkpoint);

    expect(queue.capture()).toEqual(checkpoint);
    expect(queue.drain(() => false)).toBe(0);
    expect(queue.size()).toBe(2);
  });
});
