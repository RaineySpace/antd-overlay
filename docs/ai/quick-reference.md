# antd-overlay AI Quick Reference

本文件面向代码助手与自动化 Agent，提供最短可执行调用路径。

## 1) 全局调用（推荐跨组件场景）

前置条件：应用根节点已包裹 `AntdOverlayProvider`。

```tsx
import { AntdOverlayProvider, useGlobalModal, CustomModalProps } from 'antd-overlay';
import { Modal } from 'antd';

interface ConfirmModalProps extends CustomModalProps<void> {
  titleText: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, customClose, customOk, titleText }) => (
  <Modal open={open} title={titleText} onCancel={customClose} onOk={() => customOk?.()}>
    Confirm?
  </Modal>
);

function AppRoot() {
  return (
    <AntdOverlayProvider>
      <Page />
    </AntdOverlayProvider>
  );
}

function Page() {
  const openConfirm = useGlobalModal(ConfirmModal);
  return <button onClick={() => openConfirm({ titleText: 'Delete item' })}>Open</button>;
}
```

## 2) 局部调用（需要 holder）

适用场景：覆盖层只在当前组件内管理，不依赖全局 Provider。

```tsx
import { useModal } from 'antd-overlay';

function LocalPage() {
  const [openConfirm, holder] = useModal(ConfirmModal);

  return (
    <>
      <button onClick={() => openConfirm({ titleText: 'Local confirm' })}>Open</button>
      {holder}
    </>
  );
}
```

## 3) 控制器模式（update / close）

```tsx
const controller = openConfirm({ titleText: 'Step 1' });
controller.update({ titleText: 'Step 2' });
controller.close();
```

## 4) customOk 语义（必须遵守）

- 同步返回（不抛错）：自动关闭覆盖层
- Promise resolve：Promise 完成后自动关闭
- throw 或 Promise reject：保持打开，错误继续抛给调用方

## 5) 最小规则清单

- 使用 `useGlobalModal/useGlobalDrawer/useGlobalOverlay` 时，必须存在 `AntdOverlayProvider`
- 自定义组件需要消费 `open` 与 `customClose`
- 覆盖层确认动作优先通过 `customOk` 触发，避免自行关闭与业务状态不同步
