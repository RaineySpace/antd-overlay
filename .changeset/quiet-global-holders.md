---
'antd-overlay': minor
---

全局覆盖层按需注册 holder，避免长列表中未打开的实例注册空节点。Context 仅共享稳定的注册方法和默认配置，使 holder 更新不再强制重渲染其他调用方；保持关闭动画和 Promise 语义。

破坏性变更：删除公开的 `useAntdOverlayContext`，不再提供 holder 查询或手动注册接口。默认属性通过 `AntdOverlayProvider` 配置，覆盖层通过 `useGlobal*` 等公开 Hook 管理。
