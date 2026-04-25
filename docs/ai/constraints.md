# antd-overlay Constraints and Error Semantics

本文件定义 AI 调用时应优先遵守的约束，避免生成“看起来正确但运行失败”的代码。

## Provider 约束

### 约束

- `useGlobalOverlay`
- `useGlobalModal`
- `useGlobalDrawer`

以上 Hook 必须在 `AntdOverlayProvider` 作用域内调用。

### 失败语义

- 错误语义码：`PROVIDER_REQUIRED`
- 触发条件：在 Provider 外调用任一全局 Hook
- 建议修复：将应用入口包裹 `AntdOverlayProvider`

## 组件契约约束

### 最小必需字段

自定义覆盖层组件必须实现 `CustomOverlayProps` 的关键字段：

- `open?: boolean`
- `customClose: () => void`
- `customOk?: (value) => any | Promise<any>`

### 失败语义

- 错误语义码：`INVALID_OVERLAY_CONTRACT`
- 触发条件：组件不消费 `open/customClose`，导致显示或关闭行为异常
- 建议修复：将 UI 组件的显隐/关闭事件绑定到 `open/customClose`

## 行为语义约束

### customOk

- 同步成功返回：自动关闭
- Promise resolve：异步完成后自动关闭
- throw / Promise reject：保持打开并透传错误

错误语义码：`CUSTOM_OK_REJECTED`

### update

- `controller.update(next)` 是浅合并更新，不是深合并
- 合并优先级：`defaultProps` < 之前 props < 本次 `update`

错误语义码：`UPDATE_SHALLOW_MERGE`

## AI 生成代码建议

- 优先生成 `useModal` 或 `useDrawer`，仅在通用组件时使用 `useOverlay`
- 使用全局 Hook 时必须同时输出 Provider 包裹代码
- 避免在 `customOk` 内重复手动 `close`，除非明确要覆盖默认关闭时机
