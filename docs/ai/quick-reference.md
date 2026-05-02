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

## 6) Promise 模式（await customOk 入参）

适用场景：业务方希望在调用处直接 `await` 拿到用户的确认结果。

```tsx
import { usePromiseModal, CustomModalProps } from 'antd-overlay';
import { Modal } from 'antd';

interface ConfirmModalProps extends CustomModalProps<{ value: string }> {
  initialValue?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, customClose, customOk, initialValue }) => (
  <Modal open={open} onCancel={customClose} onOk={() => customOk?.({ value: initialValue ?? '' })}>
    confirm
  </Modal>
);

function Page() {
  const [openConfirm, holder] = usePromiseModal(ConfirmModal);

  const handle = async () => {
    const result = await openConfirm({ initialValue: 'hello' });
    if (result === undefined) return; // 用户取消 / 关闭
    console.log(result.value);         // customOk 入参
  };

  return <>{holder}<button onClick={handle}>open</button></>;
}
```

行为契约（同样适用于 `usePromiseDrawer` / `usePromiseOverlay` 与对应的 `useGlobalPromise*` / `generateUsePromise*Hook`）：

- `customOk(value)` 同步成功 → Promise resolve **value（入参）**；异步 resolve 同理
- 任意非 OK 关闭路径（`customClose` / 蒙层 / 取消按钮 / 组件卸载 / 同实例再次 open 抢占）→ Promise resolve `undefined`
- `customOk` 抛错或 Promise reject → Promise 以同一错误 reject，覆盖层保持打开
- Promise 仅结算一次（幂等）；解析时机为决策时刻，不等待关闭动画
