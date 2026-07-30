# M2 T2 完成后：CPU 架构整理 Steer Guide

## 触发时机

本指南必须在 M2 T2 的全部完成门槛通过后、M2 T3 开始前执行一次。
它不是新的硬件任务，也不授权 M3、PC110、固件、DOS、BIOS 或 guest-service
行为。完成本指南后，继续原定的 M2 T3 及其后续已授权任务。

## 目标

保持已经验证的 TypeScript CPU 行为不变，将当前 CPU 执行层整理为适合长期维护、
opcode 审计和后续 PC110 硬件接入的结构。保留当前项目的显式状态、执行上下文、
分段和 ModR/M 边界；只吸收 NXVM 的“opcode 表可审计”优点，不复制其全局状态、
宏、设备覆写 opcode 或 QDX/BIOS/POST hack。

## 必做步骤

1. 冻结并记录 T2 的已验证基线：完整测试门、ROM trace、覆盖矩阵、PCjs 对照证据
   和当前 commit。
2. 审查 `src/cpu/x86/execution.ts` 的职责；按指令族逐步拆出执行模块，例如 ALU、
   control transfer、string、system 和 I/O。不要为目录美观而重写已经工作的语义。
3. 引入项目自有的、类型化的 opcode dispatch/coverage 表。它必须能够表达 primary、
   `0F`、group/ModR/M 子形式、前缀尺寸和实现状态；设备不得覆写 CPU 指令分派。
4. 保持 `state`、segmentation、execution context、ModR/M、memory 和 device bus 的
   显式接口边界。UI 和设备实现不得重新耦合进 CPU 核心。
5. 每个小的结构变更必须保持行为不变，运行完整门，并更新覆盖矩阵、provenance 和
   `docs/tracking/M2-T2.md` 的相应记录。提交使用既有 M/T/S/P 格式并推送。
6. 完成后，用同一组 T2 证据重新验证：测试全绿、ROM trace 不退化、NXVM 覆盖矩阵
   没有回退、PCjs 对照没有新的偏差。

## 决策边界

- 优先使用当前 TypeScript 的模块化结构；不要回退成 NXVM 风格的大型全局执行文件。
- opcode 表用于分派和覆盖审计，不是允许设备注入特殊指令的机制。
- 若拆分暴露了真正的 CPU 语义缺口，先记录并完成 T2 所需修复；不要把缺口伪装成
  纯重构，也不要借机开始 T3。
- 若结构整理需要改变已经验证的 CPU 行为、内存契约或设备接口，停止并请求 owner
  授权；这不属于本指南的自动授权范围。

## 完成标准

只有在以下条件同时满足时，才可开始 M2 T3：

- CPU 核心不再依赖单一不断增长的执行文件作为唯一维护入口；
- opcode 覆盖可由项目内类型化表和矩阵审计；
- 所有 T2 验证重新通过，且无覆盖或行为回退；
- 结构变更有简短的 tracking、provenance 和验证记录；
- T3 的入口条件仍然成立。
