export type PortWidth = 8 | 16 | 32;

export interface RebuiltPortBus {
  read(port: number, width: PortWidth): number;
  write(port: number, value: number, width: PortWidth): void;
}

export class RebuiltPortAccessError extends Error {}

export function normalizePort(port: number): number {
  if (!Number.isInteger(port) || port < 0 || port > 0xffff) {
    throw new RebuiltPortAccessError(`I/O port is outside the 16-bit address space: ${port}`);
  }
  return port;
}
