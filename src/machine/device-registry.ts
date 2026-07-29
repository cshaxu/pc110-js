import type { DeviceFactory, DeviceKind, MachineDevice } from "./contracts.js";

function keyFor(kind: DeviceKind, variant: string): string {
  return `${kind}:${variant}`;
}

export class DeviceRegistry {
  private readonly factories = new Map<string, DeviceFactory>();

  public register(factory: DeviceFactory): void {
    const key = keyFor(factory.kind, factory.variant);
    if (this.factories.has(key)) throw new Error(`Device variant already registered: ${key}`);
    this.factories.set(key, factory);
  }

  public create(kind: DeviceKind, variant: string): MachineDevice {
    const factory = this.factories.get(keyFor(kind, variant));
    if (!factory) throw new Error(`Unknown device variant: ${keyFor(kind, variant)}`);
    return factory.create();
  }
}
