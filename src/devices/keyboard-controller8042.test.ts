import { describe, expect, it } from "vitest";
import { KeyboardController8042 } from "./keyboard-controller8042.js";

describe("project-native selected PC/AT 8042 state", () => {
  it("starts with the keyboard clock disabled and no output byte", () => {
    const controller = new KeyboardController8042();
    expect(controller.snapshot()).toMatchObject({
      commandByte: 0x10,
      inputPort: 0xa0,
      outputPort: 0x03,
      outputBuffer: undefined,
      keyboardEnabled: false,
      status: 0
    });
  });

  it("reads and writes the command byte through the selected command family", () => {
    const controller = new KeyboardController8042();
    expect(controller.writeCommand(0x60)).toMatchObject({ accepted: true });
    expect(controller.snapshot().expectingDataFor).toBe(0x60);
    controller.writeData(0x0d);
    expect(controller.snapshot()).toMatchObject({
      commandByte: 0x0d,
      keyboardEnabled: true,
      status: 0x14
    });
    controller.writeCommand(0x20);
    expect(controller.readStatus() & 0x01).toBe(0x01);
    expect(controller.readData()).toBe(0x0d);
    expect(controller.readStatus() & 0x01).toBe(0);
  });

  it("reports selected controller test, input-port, test-port, and output-port responses", () => {
    const controller = new KeyboardController8042();
    controller.writeCommand(0xaa);
    expect(controller.readData()).toBe(0x55);
    expect(controller.snapshot()).toMatchObject({ outputPort: 0x03, keyboardEnabled: false });
    controller.writeCommand(0xab);
    expect(controller.readData()).toBe(0x00);
    controller.writeCommand(0xc0);
    expect(controller.readData()).toBe(0xa0);
    controller.writeCommand(0xe0);
    expect(controller.readData()).toBe(0x00);
    controller.writeCommand(0xd0);
    expect(controller.readData()).toBe(0x03);
  });

  it("keeps the generic interface-test result configurable per selected machine", () => {
    const controller = new KeyboardController8042({ interfaceTestResult: 0x05 });

    controller.writeCommand(0xab);

    expect(controller.readData()).toBe(0x05);
  });

  it("controls keyboard ingress and requests IRQ1 only for enabled interrupt input", () => {
    const controller = new KeyboardController8042();
    expect(controller.receiveKeyboardByte(0x1c)).toMatchObject({ accepted: false });
    controller.writeCommand(0x60);
    controller.writeData(0x01);
    expect(controller.receiveKeyboardByte(0x1c)).toEqual({
      accepted: true,
      irq1Requested: true,
      outputPortUpdated: false,
      resetPulseRequested: false
    });
    expect(controller.snapshot().outputSource).toBe("keyboard");
    expect(controller.receiveKeyboardByte(0x9c)).toMatchObject({ accepted: false });
    expect(controller.readData()).toBe(0x1c);
    controller.writeCommand(0xad);
    expect(controller.receiveKeyboardByte(0x1c)).toMatchObject({ accepted: false });
  });

  it("sequences output-port writes and reports processor reset pulses", () => {
    const controller = new KeyboardController8042();
    controller.writeCommand(0xd1);
    expect(controller.writeData(0x01)).toMatchObject({ accepted: true, outputPortUpdated: true });
    expect(controller.snapshot().outputPort).toBe(0x01);
    expect(controller.writeCommand(0xfe)).toMatchObject({
      accepted: true,
      resetPulseRequested: true
    });
    expect(controller.writeCommand(0xff)).toMatchObject({ resetPulseRequested: false });
  });

  it("does not overwrite a pending output byte with another controller response", () => {
    const controller = new KeyboardController8042();
    controller.writeCommand(0x20);
    expect(controller.writeCommand(0xc0)).toMatchObject({ accepted: false });
    expect(controller.readData()).toBe(0x10);
  });
});
