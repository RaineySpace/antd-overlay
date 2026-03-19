# antd-overlay

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
