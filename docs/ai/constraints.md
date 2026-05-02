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

## Promise 行为语义（usePromiseOverlay / usePromiseModal / usePromiseDrawer）

### 解析规则

- `customOk(value)` 同步返回 → 外层 Promise resolve **value（入参，非 customOk 返回值）**
- `customOk(value)` 异步 resolve → 在 customOk 的 Promise 完成后 resolve(value)
- 任何其他关闭路径（`customClose` / 蒙层 / antd 取消按钮 / 组件卸载 / 同实例再次 `openPromise` 抢占）→ resolve `undefined`
- `customOk` 抛错或 Promise reject → Promise 以同一错误 **reject**，覆盖层 **保持打开**
- 单次 `openPromise` 的 Promise 仅结算一次（幂等）
- 解析时机为决策时刻，不等待关闭动画

### 错误语义码

- `PROMISE_RESOLVES_WITH_INPUT` — 解析值为 customOk 入参，不是返回值
- `PROMISE_RESOLVED_ON_CLOSE` — 任意非 OK 关闭 → resolve(undefined)，不 reject
- `PROMISE_PREEMPTED_BY_REOPEN` — 再次 open 抢占式 resolve 前一个 Promise
- `CUSTOM_OK_REJECTED` — customOk 抛错 / reject 透传，覆盖层不关闭

### AI 易错点

- 不要假设关闭等同于 reject —— 取消应该用 `if (result === undefined) return;` 判断
- 不要把 `customOk` 的返回值当成 Promise 的解析值 —— 解析值始终是入参 `value`
- 不要为了 “等动画完成再继续” 把 `await` 之后的代码放进 `setTimeout` —— Promise 已经在决策时刻 resolve

## AI 生成代码建议

- 优先生成 `useModal` 或 `useDrawer`，仅在通用组件时使用 `useOverlay`
- 业务流程中需要 `await` 用户结果时优先生成 `usePromiseModal` / `usePromiseDrawer`
- 使用全局 Hook 时必须同时输出 Provider 包裹代码
- 避免在 `customOk` 内重复手动 `close`，除非明确要覆盖默认关闭时机
