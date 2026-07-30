import type { RebuiltExecutionContext } from "./execution.js";
import { decodeModRm } from "./addressing/modrm.js";
import { deliverFault } from "./events/interrupt-delivery.js";
import { executeAccumulatorExchange } from "./instructions/accumulator-exchange.js";
import { executeAccumulatorTest } from "./instructions/accumulator-test.js";
import { executeAsciiAdjust } from "./instructions/ascii-adjust.js";
import { executeFlagControl } from "./instructions/flag-control.js";
import { executeFlagTransfer } from "./instructions/flag-transfer.js";
import { executeExchangeModRm } from "./instructions/exchange.js";
import { executeFirstIntervalArithmetic } from "./instructions/first-interval.js";
import { executeFrameImmediateSlice } from "./instructions/frame-immediate.js";
import { executeGroupFourFive } from "./instructions/group-four-five.js";
import { executeGroupOne } from "./instructions/group-one.js";
import { executeGroupThree } from "./instructions/group-three.js";
import { executeImmediateModRmMove } from "./instructions/immediate-modrm-move.js";
import { executeImmediateMove } from "./instructions/immediate-move.js";
import { executeInterrupt } from "./instructions/interrupt.js";
import { executeLea } from "./instructions/lea.js";
import { executeLoop } from "./instructions/loop.js";
import { executeMoffsMove } from "./instructions/moffs-move.js";
import { executeMoveModRm } from "./instructions/move.js";
import { executeNearConditionalJump } from "./instructions/near-conditional-control.js";
import { executeNearControl } from "./instructions/near-control.js";
import { executePortIo } from "./instructions/port-io.js";
import { executePopModRm } from "./instructions/pop-modrm.js";
import { executeProcessorControl } from "./instructions/processor-control.js";
import { executeRegisterStackInterval } from "./instructions/register-stack.js";
import { executeSetCondition } from "./instructions/set-condition.js";
import { executeLoadFarPointer, executeSegmentMove } from "./instructions/segment-move.js";
import { executeShiftRotate } from "./instructions/shift-rotate.js";
import { executeSignExtension } from "./instructions/sign-extension.js";
import { executeShortConditionalJump } from "./instructions/control.js";
import { executeStackFrameControl } from "./instructions/stack-frame-control.js";
import { executeTestModRm } from "./instructions/test.js";
import { executeUndefinedOpcode } from "./instructions/undefined.js";
import { executeWait } from "./instructions/wait.js";
import { executeXlat } from "./instructions/xlat.js";

export function dispatchRebuiltInstruction(context: RebuiltExecutionContext): void {
  if (context.instruction.prefixes.lock) return dispatchLocked(context);
  return dispatchUnlocked(context);
}

function dispatchLocked(context: RebuiltExecutionContext): void {
  const modRm = decodeModRm(
    context.reader,
    context.instruction.opcodeOffset + 1,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (!lockable(context.instruction.opcode, modRm.reg, modRm.registerDirect)) {
    deliverFault(context.memory, context.state, 6, context.state.readEip());
    return;
  }
  context.memory.runAtomically(() => dispatchUnlocked(context));
}

function lockable(opcode: number, extension: number, registerDirect: boolean): boolean {
  if (registerDirect) return false;
  if (
    [0x00, 0x01, 0x08, 0x09, 0x10, 0x11, 0x18, 0x19, 0x20, 0x21, 0x28, 0x29, 0x30, 0x31].includes(
      opcode
    )
  )
    return true;
  if ([0x80, 0x81, 0x83].includes(opcode)) return extension !== 7;
  if ([0x86, 0x87].includes(opcode)) return true;
  if ([0xc0, 0xc1, 0xd0, 0xd1, 0xd2, 0xd3].includes(opcode)) return extension !== 6;
  if ([0xf6, 0xf7].includes(opcode)) return extension === 2 || extension === 3;
  if (opcode === 0xfe) return extension === 0 || extension === 1;
  if (opcode === 0xff) return extension === 0 || extension === 1;
  return false;
}

function dispatchUnlocked(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode === 0x0f) return dispatchExtended(context);
  if (opcode <= 0x3f) return executeFirstIntervalArithmetic(context);
  if (opcode >= 0x40 && opcode <= 0x5f) return executeRegisterStackInterval(context);
  if ([0x60, 0x61, 0x68, 0x69, 0x6a, 0x6b].includes(opcode))
    return executeFrameImmediateSlice(context);
  if (opcode >= 0x70 && opcode <= 0x7f) return executeShortConditionalJump(context);
  if ([0x80, 0x81, 0x83].includes(opcode)) return executeGroupOne(context);
  if (opcode === 0x84 || opcode === 0x85) return executeTestModRm(context);
  if (opcode === 0x86 || opcode === 0x87) return executeExchangeModRm(context);
  if (opcode >= 0x88 && opcode <= 0x8b) return executeMoveModRm(context);
  if (opcode === 0x8c || opcode === 0x8e) return executeSegmentMove(context);
  if (opcode === 0x8d) return executeLea(context);
  if (opcode === 0x8f) return executePopModRm(context);
  if (opcode >= 0x90 && opcode <= 0x97) return executeAccumulatorExchange(context);
  if (opcode === 0x98 || opcode === 0x99) return executeSignExtension(context);
  if (opcode === 0x9b) return executeWait(context);
  if (opcode === 0x9e || opcode === 0x9f) return executeFlagTransfer(context);
  if (opcode >= 0xa0 && opcode <= 0xa3) return executeMoffsMove(context);
  if (opcode === 0xa8 || opcode === 0xa9) return executeAccumulatorTest(context);
  if (opcode >= 0xb0 && opcode <= 0xbf) return executeImmediateMove(context);
  if ([0xc2, 0xc3, 0xc8, 0xc9, 0xca, 0xcb].includes(opcode))
    return executeStackFrameControl(context);
  if ([0xcc, 0xcd, 0xce, 0xcf].includes(opcode)) return executeInterrupt(context);
  if (opcode === 0xd6 || opcode === 0xf1 || (opcode >= 0xd8 && opcode <= 0xdf))
    return executeUndefinedOpcode(context);
  if (opcode === 0xc6 || opcode === 0xc7) return executeImmediateModRmMove(context);
  if (opcode === 0xc4 || opcode === 0xc5) return executeLoadFarPointer(context);
  if (opcode === 0xd4 || opcode === 0xd5) return executeAsciiAdjust(context);
  if (opcode === 0xd7) return executeXlat(context);
  if ([0xe0, 0xe1, 0xe2, 0xe3].includes(opcode)) return executeLoop(context);
  if ([0xe4, 0xe5, 0xe6, 0xe7, 0xec, 0xed, 0xee, 0xef].includes(opcode))
    return executePortIo(context);
  if ([0x9a, 0xe8, 0xe9, 0xea, 0xeb].includes(opcode)) return executeNearControl(context);
  if ([0xf5, 0xf8, 0xf9, 0xfc, 0xfd].includes(opcode)) return executeFlagControl(context);
  if ([0xf4, 0xfa, 0xfb].includes(opcode)) return executeProcessorControl(context);
  if (opcode === 0xf6 || opcode === 0xf7) return executeGroupThree(context);
  if (opcode === 0xfe || opcode === 0xff) return executeGroupFourFive(context);
  if ([0xc0, 0xc1, 0xd0, 0xd1, 0xd2, 0xd3].includes(opcode)) return executeShiftRotate(context);
  throw new Error(`Unsupported rebuilt opcode 0x${opcode.toString(16)}`);
}

function dispatchExtended(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.secondaryOpcode;
  if (opcode !== undefined && opcode >= 0x80 && opcode <= 0x8f)
    return executeNearConditionalJump(context);
  if (opcode !== undefined && opcode >= 0x90 && opcode <= 0x9f) return executeSetCondition(context);
  throw new Error(`Unsupported rebuilt 0F opcode 0x${opcode?.toString(16) ?? "??"}`);
}
