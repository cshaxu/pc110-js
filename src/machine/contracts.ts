export type DeviceKind = "cpu" | "memory" | "chipset" | "storage" | "video" | "input" | "serial";

export interface MachineDevice {
  readonly id: string;
  readonly kind: DeviceKind;
  reset(): void;
}

export interface DeviceFactory<TDevice extends MachineDevice = MachineDevice> {
  readonly kind: DeviceKind;
  readonly variant: string;
  create(): TDevice;
}

export interface DeviceSelection {
  readonly kind: DeviceKind;
  readonly variant: string;
}

export interface MachineProfile {
  readonly id: string;
  readonly displayName: string;
  readonly devices: readonly DeviceSelection[];
}
