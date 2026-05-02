# antd-overlay

## 0.3.0

### Minor Changes

- 新增 Promise 风格的命令式 Hook 家族：`usePromiseOverlay` / `useGlobalPromiseOverlay` / `generateUsePromiseOverlayHook`，以及对应的 Modal / Drawer 三件套（`usePromiseModal` / `useGlobalPromiseModal` / `generateUsePromiseModalHook`、`usePromiseDrawer` / `useGlobalPromiseDrawer` / `generateUsePromiseDrawerHook`）。

  行为契约：
  - `customOk(value)` 同步成功 → Promise resolve **value（入参，非 customOk 返回值）**
  - `customOk` 异步 resolve → resolve 后 Promise resolve(value)
  - `customOk` 抛错 / Promise reject → Promise 以同一错误 reject，覆盖层保持打开
  - 任意非 OK 关闭路径（customClose / 蒙层 / antd 取消 / 组件卸载 / 同实例再次 open 抢占）→ Promise resolve(undefined)
  - Promise 仅结算一次（幂等）；解析时机为决策时刻，不等待关闭动画

- 新增 Promise 风格的命令式 Hook 家族

## 0.2.0

### Minor Changes

- 新增 AI 友好文档与机器可读契约清单，帮助代码助手更稳定地理解并调用 antd-overlay 能力。

  主要内容：
  - 新增 `docs/ai/quick-reference.md` 与 `docs/ai/constraints.md`
  - 新增 `docs/ai/api-manifest.json` 与 `docs/ai/contracts.json`
  - 在 `package.json` 中暴露 `./ai/*` 文档与清单路径，并将 `docs/ai` 纳入发布文件
  - 新增 `validate:ai-docs` 校验脚本，保证 AI 文档与清单结构完整

### Patch Changes

- 增加 AI 友好文档与机器可读契约清单

## 0.1.2

### Patch Changes

- - 统一 `useOverlay`、`useModal`、`useDrawer` 的 `customOk` 异步关闭语义：同步成功或 Promise resolve 时关闭，reject/throw 时保持覆盖层打开并透传错误。
  - 新增 `AsyncCustomOkDemo`，用于在 demo 中验证 Overlay/Modal/Drawer 的异步成功与失败场景。

## 0.1.1

### Patch Changes

- 兼容自定义 Modal 的额外 props：`useModal` / `useGlobalModal` 的 `options` 在类型层不再收窄，可直接传入自定义字段（例如 `placeholder`）。

## 0.1.0

### Minor Changes

- 为 useOverlay/useModal/useDrawer 增强默认属性能力：支持在 Hook options 顶层或 defaultProps 中传入默认 overlay props（如 customOk），并补充 Vite demo 方便本地验证。

### Patch Changes

- 更新 README 文档以对齐当前导出 API、类型定义及本地开发脚本。

## 0.0.3

### Patch Changes

- 修改模块导出方式

## 0.0.2

### Patch Changes

- 为 AntdOverlayProvider 添加 defaultModalProps 和 defaultDrawerProps 配置项，允许全局设置 Modal 和 Drawer的默认属性。同时移除了 maskClosable: false 的硬编码默认值，改为通过 Provider 配置。

## 0.0.1

### Patch Changes

- 支持命令式调用antd中modal和drawer
