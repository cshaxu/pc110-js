const SET1_CODES: Readonly<Record<string, number | readonly [number, number]>> = {
  Escape: 0x01,
  Digit1: 0x02,
  Digit2: 0x03,
  Digit3: 0x04,
  Digit4: 0x05,
  Digit5: 0x06,
  Digit6: 0x07,
  Digit7: 0x08,
  Digit8: 0x09,
  Digit9: 0x0a,
  Digit0: 0x0b,
  Minus: 0x0c,
  Equal: 0x0d,
  Backspace: 0x0e,
  Tab: 0x0f,
  KeyQ: 0x10,
  KeyW: 0x11,
  KeyE: 0x12,
  KeyR: 0x13,
  KeyT: 0x14,
  KeyY: 0x15,
  KeyU: 0x16,
  KeyI: 0x17,
  KeyO: 0x18,
  KeyP: 0x19,
  BracketLeft: 0x1a,
  BracketRight: 0x1b,
  Enter: 0x1c,
  ControlLeft: 0x1d,
  KeyA: 0x1e,
  KeyS: 0x1f,
  KeyD: 0x20,
  KeyF: 0x21,
  KeyG: 0x22,
  KeyH: 0x23,
  KeyJ: 0x24,
  KeyK: 0x25,
  KeyL: 0x26,
  Semicolon: 0x27,
  Quote: 0x28,
  Backquote: 0x29,
  ShiftLeft: 0x2a,
  Backslash: 0x2b,
  KeyZ: 0x2c,
  KeyX: 0x2d,
  KeyC: 0x2e,
  KeyV: 0x2f,
  KeyB: 0x30,
  KeyN: 0x31,
  KeyM: 0x32,
  Comma: 0x33,
  Period: 0x34,
  Slash: 0x35,
  ShiftRight: 0x36,
  AltLeft: 0x38,
  Space: 0x39,
  CapsLock: 0x3a,
  F1: 0x3b,
  F2: 0x3c,
  F3: 0x3d,
  F4: 0x3e,
  F5: 0x3f,
  F6: 0x40,
  F7: 0x41,
  F8: 0x42,
  F9: 0x43,
  F10: 0x44,
  NumLock: 0x45,
  ScrollLock: 0x46,
  Home: [0xe0, 0x47],
  ArrowUp: [0xe0, 0x48],
  PageUp: [0xe0, 0x49],
  ArrowLeft: [0xe0, 0x4b],
  ArrowRight: [0xe0, 0x4d],
  End: [0xe0, 0x4f],
  ArrowDown: [0xe0, 0x50],
  PageDown: [0xe0, 0x51],
  Insert: [0xe0, 0x52],
  Delete: [0xe0, 0x53]
};

export function set1ScancodeBytes(code: string, pressed: boolean): readonly number[] | undefined {
  const value = SET1_CODES[code];
  if (value === undefined) return undefined;
  if (typeof value === "number") return [pressed ? value : value | 0x80];
  return [value[0], pressed ? value[1] : value[1] | 0x80];
}

export class KeyboardByteQueue {
  private readonly bytes: number[] = [];

  public enqueue(bytes: readonly number[]): void {
    this.bytes.push(...bytes);
  }

  public drain(deliver: (byte: number) => boolean): number {
    let delivered = 0;
    while (this.bytes.length > 0 && deliver(this.bytes[0])) {
      this.bytes.shift();
      delivered += 1;
    }
    return delivered;
  }

  public clear(): void {
    this.bytes.length = 0;
  }

  public size(): number {
    return this.bytes.length;
  }
}
