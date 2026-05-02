# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库简介

`antd-overlay` 是一个小型库，提供命令式 API 用于打开 Ant Design 的 `Modal` / `Drawer`（以及任意自定义覆盖层），无需在业务里手动维护 `open` 状态。已发布到 npm；源码为 TypeScript + React，由 `tsup` 打包。

## 常用命令

包管理器为 **pnpm**（lockfile 为 `pnpm-lock.yaml`）。

- `pnpm dev:demo` — 启动 `demo/main.tsx` 下的 Vite 演示（涵盖 Modal / Drawer / useOverlay / 异步 customOk 场景），用于在浏览器中手动验证行为。
- `pnpm build` — 用 `tsup` 构建库（CJS + ESM + d.ts 输出到 `dist/`），`react` 与 `antd` 作为 external。
- `pnpm dev` — 库开发用的 `tsup --watch`。
- `pnpm typecheck` — `tsc --noEmit`。
- `pnpm lint` / `pnpm lint:fix` — 对 `src/` 执行 ESLint。
- `pnpm format` / `pnpm format:check` — Prettier。
- `pnpm validate:ai-docs` — 执行 `scripts/validate-ai-docs.mjs`。修改任何 `docs/ai/*` 或新增/删除导出符号时**必须通过**（详见下文 “AI 文档契约”）。
- `pnpm changeset` → `pnpm version-packages` → `pnpm release` — 通过 Changesets 走发版流程；`prepublishOnly` 会执行 `pnpm build`。

仓库未配置测试运行器；验证手段为 `typecheck` + `lint` + 手动跑 demo。

## 架构

自下而上分三层：

1. **`src/AntdOverlayContext.tsx`** — `AntdOverlayProvider` 持有 `holders: ReactNode[]` 数组以及 `addHolder` / `removeHolder`。先渲染 children，再统一渲染所有 holders。同时存放 `defaultModalProps` / `defaultDrawerProps`，供 Modal/Drawer 适配器消费。`useAntdOverlayContext()` 在 Provider 外部返回 `null`，全局 Hook 在此情况下抛出 `PROVIDER_REQUIRED` 错误。

2. **`src/useOverlay.tsx`** — 核心状态机。两个相互独立的状态位：`open`（驱动显隐动画）与 `renderEnable`（组件是否挂载）。`animation: true` 时关闭流程为先把 `open=false`，等适配器回调 `onAnimationEnd` 后再卸载；`animation: false` 时直接卸载。该 Hook 与具体 UI 组件解耦，依赖 `propsAdapter(props, state)` 把内部状态桥接到实际组件 API。`wrapCustomOk`（已导出的辅助函数）实现“仅成功时关闭”的语义：同步 return → 关闭；Promise resolve → resolve 后关闭；throw / reject → 保持打开并将错误透传。

3. **`src/useModal.tsx` / `src/useDrawer.tsx`** — 在 `useOverlay` 上的薄封装，固化对应的 `propsAdapter`：
   - Modal 适配器把 `afterClose` → `onAnimationEnd`。
   - Drawer 适配器把 `afterOpenChange(open)` → 当 `!open` 时调用 `onAnimationEnd`。
   - 二者都会按顺序合并 Provider 的 `defaultModalProps` / `defaultDrawerProps`、用户传入的 props、再注入 `open` / `customClose` / 动画回调。
   - `createModalPropsAdapter` / `createDrawerPropsAdapter` 在源文件内 `export`（不进 `src/index.tsx`），供 `usePromiseModal` / `usePromiseDrawer` 复用。

4. **`src/usePromiseOverlay.tsx` / `src/usePromiseModal.tsx` / `src/usePromiseDrawer.tsx`** — 在对应非 Promise 版 hook 之上叠加 Promise 语义。Promise 版 opener 返回 `Promise<V | undefined>`（不暴露 `update`/`close`）；通过包装 `propsAdapter` 拦截 `customOk` 与 `state.onClose`，**不二次包装** `wrapCustomOk`（关闭链路仍由内层适配器负责）。

每一层对外都遵循同一组三件套：`useX`（返回 `[opener, holder]`）、`useGlobalX`（仅返回 `opener`，holder 通过 context 自动挂载）、`generateUseXHook(Component)`（工厂，绑定组件，调用方无需重复传入）。Promise 版本同样保持这套三件套形态（`usePromiseX` / `useGlobalPromiseX` / `generateUsePromiseXHook`）。

### 编辑时的关键不变量

- **Holder 引用必须稳定。** `removeHolder` 用引用相等（`h !== holder`）来过滤。不要破坏 `useOverlay.contextHolder` 的 `useMemo` 依赖列表 —— 每次渲染都换新引用会导致 holders 不停被重复注册。
- **`open` 与 `renderEnable` 是有意分离的。** 不要合并它们，否则会破坏关闭动画。
- **Props 合并规则是浅合并且顺序固定**：`defaultProps`（或 `options` 顶层字段，顶层优先）< 之前已存的 props < 本次 `open()` / `update()` 的入参。这是文档化行为（`UPDATE_SHALLOW_MERGE`），不要改成深合并。
- **`wrapCustomOk` 的关闭时机是文档化行为。** Promise reject 与同步 throw 必须保持覆盖层打开并把错误重新抛出 —— README、AI 文档以及 `AsyncCustomOkDemo` 都依赖该行为。
- **`UseOverlayOptions<T>` 是 `& Partial<InternalOverlayProps<T>>`。** 用户可以把覆盖层属性（如 `customOk`）写在 `options` 顶层；它们与 `defaultProps` 合并时顶层优先。`useModal` / `useDrawer` 仅 `Omit` 掉 `propsAdapter` 和 `keyPrefix`，请保留这一点。
- **`usePromise*` 系列的 Promise 语义是文档化行为。** 解析值为 `customOk` **入参**（不是 customOk 返回值）；任意非 OK 关闭路径（`customClose` / 蒙层 / antd 取消按钮 / 组件卸载 / 同实例再次 `openPromise` 抢占）→ `resolve(undefined)`；`customOk` 抛错 / reject → `reject` 透传且覆盖层保持打开；Promise 仅结算一次（幂等）；解析时机为决策时刻，不等待关闭动画。这些行为在 README、`docs/ai/quick-reference.md`、`docs/ai/constraints.md`、`docs/ai/contracts.json`（错误码 `PROMISE_RESOLVES_WITH_INPUT` / `PROMISE_RESOLVED_ON_CLOSE` / `PROMISE_PREEMPTED_BY_REOPEN` / `CUSTOM_OK_REJECTED`）以及 `PromiseOverlayDemo` 中均有依赖，修改任一处需同步更新。

## AI 文档契约

`docs/ai/` 是发布包的一部分（通过 `package.json#exports` 暴露为 `./ai/*`），供 Cursor / Copilot / Claude Code 子代理消费。`scripts/validate-ai-docs.mjs` 强制要求：

- 四个文件齐全：`quick-reference.md`、`constraints.md`、`api-manifest.json`、`contracts.json`。
- `api-manifest.json#symbols` 包含全部公共 Hook（`useModal`、`useGlobalModal`、`useDrawer`、`useGlobalDrawer`、`useOverlay`、`useGlobalOverlay`、`usePromiseOverlay`、`useGlobalPromiseOverlay`、`usePromiseModal`、`useGlobalPromiseModal`、`usePromiseDrawer`、`useGlobalPromiseDrawer`、`generateUseModalHook`、`generateUseDrawerHook`、`generateUseOverlayHook`、`generateUsePromiseOverlayHook`、`generateUsePromiseModalHook`、`generateUsePromiseDrawerHook`）以及 `AntdOverlayProvider`。
- `contracts.json#constraints` 包含 `PROVIDER_REQUIRED` 错误码，且 `contracts.json#docs` 中的路径与三份配套文件一致。

新增/删除/重命名 `src/index.tsx` 中的公共导出时，请同步更新 `docs/ai/api-manifest.json` 与 `scripts/validate-ai-docs.mjs#requiredSymbols` 并执行 `pnpm validate:ai-docs`。修改任何带错误码的语义（`PROVIDER_REQUIRED`、`INVALID_OVERLAY_CONTRACT`、`CUSTOM_OK_REJECTED`、`UPDATE_SHALLOW_MERGE`、`PROMISE_RESOLVES_WITH_INPUT`、`PROMISE_RESOLVED_ON_CLOSE`、`PROMISE_PREEMPTED_BY_REOPEN`）时，需同步更新 `docs/ai/constraints.md` 与 `contracts.json`。

## 约定

- 源码注释与 README 使用**中文**；扩展 `src/` 或 `README.md` 内的文档时请保持一致。`docs/ai/` 是中文叙述与英文错误码混用，沿用该形式。
- Peer 依赖：`antd >=5.0.0`、`react >=18.0.0`。不要从 `antd` 深路径导入 —— 库代码仅使用 `ModalProps` / `DrawerProps` 类型；具体的 `Modal` / `Drawer` 组件在用户代码与 demo 中使用。
- 发版走 Changesets（`.changeset/`），不要手动改 `package.json#version`。
