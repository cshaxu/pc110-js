import type { RebuiltExecutionContext } from "./execution.js";
import { decodeModRm } from "./addressing/modrm.js";
import { extendedOpcodeFamily, primaryOpcodeFamily } from "./decode/opcode-table.js";
import { deliverFault } from "./events/interrupt-delivery.js";
import { executeAccumulatorExchange } from "./instructions/accumulator-exchange.js";
import { executeAccumulatorTest } from "./instructions/accumulator-test.js";
import { executeAsciiAdjust } from "./instructions/ascii-adjust.js";
import { executeArpl } from "./instructions/arpl.js";
import { executeFlagControl } from "./instructions/flag-control.js";
import { executeFlagTransfer } from "./instructions/flag-transfer.js";
import { executeFlagStack } from "./instructions/flag-stack.js";
import { executeExchangeModRm } from "./instructions/exchange.js";
import { executeExtended } from "./instructions/extended.js";
import { executeSystemGroup } from "./instructions/system.js";
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
import { executeStringIo } from "./instructions/string-io.js";
import { executeShortConditionalJump } from "./instructions/control.js";
import { executeStackFrameControl } from "./instructions/stack-frame-control.js";
import { executeString } from "./instructions/string.js";
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
  switch (primaryOpcodeFamily(opcode)) {
    case "first-interval":
      return executeFirstIntervalArithmetic(context);
    case "register-stack":
      return executeRegisterStackInterval(context);
    case "frame-immediate":
      return executeFrameImmediateSlice(context);
    case "string-io":
      return executeStringIo(context);
    case "arpl":
      return executeArpl(context);
    case "short-conditional":
      return executeShortConditionalJump(context);
    case "group-one":
      return executeGroupOne(context);
    case "test-modrm":
      return executeTestModRm(context);
    case "exchange-modrm":
      return executeExchangeModRm(context);
    case "move-modrm":
      return executeMoveModRm(context);
    case "segment-move":
      return executeSegmentMove(context);
    case "lea":
      return executeLea(context);
    case "pop-modrm":
      return executePopModRm(context);
    case "accumulator-exchange":
      return executeAccumulatorExchange(context);
    case "sign-extension":
      return executeSignExtension(context);
    case "flag-stack":
      return executeFlagStack(context);
    case "wait":
      return executeWait(context);
    case "flag-transfer":
      return executeFlagTransfer(context);
    case "moffs-move":
      return executeMoffsMove(context);
    case "string":
      return executeString(context);
    case "accumulator-test":
      return executeAccumulatorTest(context);
    case "immediate-move":
      return executeImmediateMove(context);
    case "stack-frame-control":
      return executeStackFrameControl(context);
    case "interrupt":
      return executeInterrupt(context);
    case "undefined":
      return executeUndefinedOpcode(context);
    case "immediate-modrm-move":
      return executeImmediateModRmMove(context);
    case "load-far-pointer":
      return executeLoadFarPointer(context);
    case "ascii-adjust":
      return executeAsciiAdjust(context);
    case "xlat":
      return executeXlat(context);
    case "loop":
      return executeLoop(context);
    case "port-io":
      return executePortIo(context);
    case "near-control":
      return executeNearControl(context);
    case "flag-control":
      return executeFlagControl(context);
    case "processor-control":
      return executeProcessorControl(context);
    case "group-three":
      return executeGroupThree(context);
    case "group-four-five":
      return executeGroupFourFive(context);
    case "shift-rotate":
      return executeShiftRotate(context);
    case "unsupported":
      throw new Error(`Unsupported rebuilt opcode 0x${opcode.toString(16)}`);
  }
}

function dispatchExtended(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.secondaryOpcode;
  if (opcode === undefined) throw new Error("Rebuilt 0F opcode is missing");
  switch (extendedOpcodeFamily(opcode)) {
    case "undefined":
      return executeUndefinedOpcode(context);
    case "near-conditional":
      return executeNearConditionalJump(context);
    case "set-condition":
      return executeSetCondition(context);
    case "system":
      return executeSystemGroup(context);
    case "extended":
      return executeExtended(context);
    case "unsupported":
      throw new Error(`Unsupported rebuilt 0F opcode 0x${opcode.toString(16)}`);
  }
}
