# antd-overlay

Ant Design Modal/Drawer 命令式调用方案。

[![npm version](https://img.shields.io/npm/v/antd-overlay.svg)](https://www.npmjs.com/package/antd-overlay)
[![license](https://img.shields.io/npm/l/antd-overlay.svg)](https://github.com/RaineySpace/antd-overlay/blob/main/LICENSE)

## 特性

- 🚀 **命令式调用** - 通过函数调用打开/关闭覆盖层，无需在业务里维护 `open` 状态
- 🎨 **动画支持** - 正确处理打开/关闭动画（Modal 使用 `afterClose`，Drawer 使用 `afterOpenChange`），避免动画未完成就卸载
- 🌍 **全局挂载** - 支持跨组件调用，覆盖层挂载到 `AntdOverlayProvider` 统一容器
- 📦 **类型安全** - 完整的 TypeScript 类型支持
- 🔧 **灵活扩展** - `useOverlay` + `propsAdapter` 可对接自定义覆盖层组件

## 安装

```bash
npm install antd-overlay
# 或
pnpm add antd-overlay
# 或
yarn add antd-overlay
```

### 前置依赖

```json
{
  "peerDependencies": {
    "antd": ">=5.0.0",
    "react": ">=18.0.0"
  }
}
```

## 本地开发与示例

```bash
pnpm install
pnpm dev:demo    # 启动 Vite 演示（demo/：Modal / Drawer / useOverlay）
pnpm build       # 使用 tsup 构建 dist
pnpm typecheck   # TypeScript 检查
```

演示入口将 `ConfigProvider` 与 `AntdOverlayProvider` 组合使用，与线上应用推荐结构一致。

## 快速开始

### 1. 包裹 Provider（可选，仅全局 Hook 需要）

```tsx
import { AntdOverlayProvider } from 'antd-overlay';
import { ConfigProvider } from 'antd';

function App() {
  return (
    <ConfigProvider>
      <AntdOverlayProvider>
        <YourApp />
      </AntdOverlayProvider>
    </ConfigProvider>
  );
}
```

### 2. 创建覆盖层组件

自定义 Modal 需实现 `CustomModalProps`（继承 antd `ModalProps` 与 `CustomOverlayProps`）。请将 antd `Modal` 的 `open` 接到 props 上，由 Hook 注入显示状态。

```tsx
import { Modal, Input } from 'antd';
import { CustomModalProps } from 'antd-overlay';
import { useState } from 'react';

interface MyModalProps extends CustomModalProps<{ result: string }> {
  initialValue?: string;
}

const MyModal: React.FC<MyModalProps> = ({
  open,
  customClose,
  customOk,
  initialValue,
  ...props
}) => {
  const [value, setValue] = useState(initialValue || '');

  return (
    <Modal
      open={open}
      title="输入内容"
      onCancel={customClose}
      onOk={() => customOk?.({ result: value })}
      {...props}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
    </Modal>
  );
};
```

### 3. 使用 Hook 调用

```tsx
import { useModal, useGlobalModal } from 'antd-overlay';

// 局部使用（需要渲染 holder）
function LocalUsage() {
  const [openModal, holder] = useModal(MyModal);

  const handleOpen = () => {
    const controller = openModal({ initialValue: 'hello' });
    // controller.update({ initialValue: 'updated' });
    // controller.close();
  };

  return (
    <>
      <button onClick={handleOpen}>打开 Modal</button>
      {holder}
    </>
  );
}

// 全局使用（无需渲染 holder，但需要 AntdOverlayProvider）
function GlobalUsage() {
  const openModal = useGlobalModal(MyModal);

  return (
    <button onClick={() => openModal({ initialValue: 'world' })}>
      打开全局 Modal
    </button>
  );
}
```

`openModal(...)` 返回 `OverlayController`：可调用 `update` 传入要更新的字段（与当前已保存的 props 及 Hook 的 `defaultProps` **浅合并**，同名键以本次 `update` 入参为准）、`close` 关闭（会尊重动画配置）。

`customOk` 关闭语义（适用于 `useOverlay` / `useModal` / `useDrawer`）：

- 同步回调正常返回：自动关闭覆盖层
- 异步回调 `Promise resolve`：在 Promise 完成后自动关闭覆盖层
- 异步回调 `Promise reject` 或同步抛错：保持覆盖层打开，并将错误透传给调用方

## AI 使用指引

为提高代码助手（Cursor/Copilot/Claude Code 等）对本库的调用正确率，建议优先读取以下文档：

- `docs/ai/quick-reference.md`：最短调用路径与最小示例
- `docs/ai/constraints.md`：前置条件、行为约束与错误语义
- `docs/ai/api-manifest.json`：机器可读 API 清单
- `docs/ai/contracts.json`：能力、约束、错误语义和推荐模板

若 AI 生成的是全局 Hook（`useGlobalModal`、`useGlobalDrawer`、`useGlobalOverlay`）用法，务必同时生成 `AntdOverlayProvider` 包裹代码。

## API

### Provider

#### `AntdOverlayProvider`

全局覆盖层容器；使用 `useGlobalModal`、`useGlobalDrawer`、`useGlobalOverlay` 时需要在应用内包裹。

**属性：**

- `children: React.ReactNode`
- `defaultModalProps?: Partial<ModalProps>` — 默认 Modal 属性，与每次 `open` / `update` 传入的 props 合并（传入方优先）
- `defaultDrawerProps?: Partial<DrawerProps>` — 同上，作用于 Drawer

```tsx
<AntdOverlayProvider
  defaultModalProps={{ centered: true, maskClosable: false }}
  defaultDrawerProps={{ width: 600 }}
>
  <App />
</AntdOverlayProvider>
```

#### `useAntdOverlayContext()`

读取 Context（含 `holders`、`addHolder`、`removeHolder` 及默认 Modal/Drawer 配置）。**必须在 `AntdOverlayProvider` 内使用**；一般供扩展或库内集成，业务侧很少直接使用。

### Modal Hooks

#### `useModal<T>(Component, options?)`

局部 Modal Hook。

**`options`（`UseModalOptions<T>`，`T` 由传入的 Modal 组件推断）** 与底层 `useOverlay` 一致（不含 `propsAdapter` / `keyPrefix`，由内部固定）：

- `animation?: boolean` — 是否等待关闭动画后再卸载，默认 `true`
- `defaultProps?: Partial<Omit<T, 'customClose'>>` — 每次打开/更新时与入参合并的默认属性
- 另可将 Modal 相关字段及**组件自定义扩展属性**写在 `options` 顶层，与 `defaultProps` 合并时**顶层字段优先**

**返回值：** `[openModal, holder]` — `openModal` 为 `OverlayOpener<T>`，返回 `OverlayController<T>`。

#### `useGlobalModal<T>(Component, options?)`

全局 Modal Hook；无需渲染 `holder`。

#### `generateUseModalHook<T>(Component)`

为指定 Modal 组件生成 `{ useModal, useGlobalModal }`，二者均可传入 `options?: UseModalOptions<T>`（`T` 与组件 props 一致）。

```tsx
export const {
  useModal: useMyModal,
  useGlobalModal: useGlobalMyModal,
} = generateUseModalHook(MyModal);
```

### Drawer Hooks

#### `useDrawer<T>(Component, options?)` / `useGlobalDrawer<T>(Component, options?)`

语义与 Modal 侧相同，选项类型为 `UseDrawerOptions<T>`（`T` 由 Drawer 组件推断；同样支持 `animation`、`defaultProps`、顶层 Drawer 属性及组件自定义扩展字段）。

#### `generateUseDrawerHook<T>(Component)`

生成 `{ useDrawer, useGlobalDrawer }`。

### 通用 Overlay Hooks

#### `useOverlay<T>(Component, options?)`

通用覆盖层 Hook；需自行提供 `propsAdapter`，把内部 `state.open` / `state.onClose` / `state.onAnimationEnd` 映射到组件 API。

```tsx
const [openOverlay, holder] = useOverlay(MyOverlay, {
  propsAdapter: (props, state) => ({
    ...props,
    visible: state.open,
    onClose: state.onClose,
    afterVisibleChange: (visible: boolean) => {
      if (!visible) state.onAnimationEnd();
    },
  }),
});
```

#### `useGlobalOverlay<T>(Component, options?)`

全局版本，依赖 `AntdOverlayProvider`。

#### `generateUseOverlayHook<T>(Component, defaultOptions?)`

生成绑定组件的 `useOverlay` / `useGlobalOverlay`；调用时可再传 `options` 与 `defaultOptions` 浅合并。

### Promise Hooks

如果业务流程希望在调用处直接 `await` 用户的确认结果，使用 Promise 版本：

- `usePromiseOverlay<T>(Component, options?) => [openPromise, holder]`
- `useGlobalPromiseOverlay<T>(Component, options?) => openPromise`
- `generateUsePromiseOverlayHook<T>(Component, defaultOptions?) => { usePromiseOverlay, useGlobalPromiseOverlay }`
- `usePromiseModal<T>(Component, options?) => [openPromise, holder]`
- `useGlobalPromiseModal<T>(Component, options?) => openPromise`
- `generateUsePromiseModalHook<T>(Component) => { usePromiseModal, useGlobalPromiseModal }`
- `usePromiseDrawer<T>(Component, options?) => [openPromise, holder]`
- `useGlobalPromiseDrawer<T>(Component, options?) => openPromise`
- `generateUsePromiseDrawerHook<T>(Component) => { usePromiseDrawer, useGlobalPromiseDrawer }`

`openPromise(initialize?)` 返回 `Promise<V | undefined>`，`V` 由组件 `CustomOverlayProps<V>` 的 `customOk` 入参类型推断。

**行为契约：**

| 场景 | 外层 Promise | 覆盖层 |
| --- | --- | --- |
| `customOk(value)` 同步成功 | `resolve(value)` —— 入参，非 customOk 返回值 | 自动关闭 |
| `customOk(value)` 异步 resolve | resolve 后 `resolve(value)` | 自动关闭 |
| `customOk` 同步抛错 / 异步 reject | `reject(error)`，错误透传给 `await` 调用方 | **保持打开** |
| `customClose` / antd 取消按钮 / 蒙层 / esc | `resolve(undefined)` | 自动关闭 |
| 同一 hook 实例再次 `openPromise` | 前一个 Promise 立即 `resolve(undefined)` | 旧覆盖层被新一次打开覆盖 |
| 调用 `usePromise*` 的组件卸载 | `resolve(undefined)` | — |

Promise 仅结算一次（幂等）；解析时机为决策时刻，**不等待关闭动画**。

```tsx
import { usePromiseModal, CustomModalProps } from 'antd-overlay';
import { Modal } from 'antd';

interface ConfirmModalProps extends CustomModalProps<{ value: string }> {
  initialValue?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  customClose,
  customOk,
  initialValue = '',
}) => {
  const [value, setValue] = React.useState(initialValue);
  return (
    <Modal open={open} onCancel={customClose} onOk={() => customOk?.({ value })}>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
    </Modal>
  );
};

function Page() {
  const [openConfirm, holder] = usePromiseModal(ConfirmModal);

  const handleClick = async () => {
    const result = await openConfirm({ initialValue: 'hello' });
    if (result === undefined) return; // 用户取消 / 关闭
    console.log(result.value);
  };

  return (
    <>
      <button onClick={handleClick}>Open</button>
      {holder}
    </>
  );
}
```

如需在 `customOk` 中做异步校验：抛错 / reject 即可让 `await` 进入 `catch`，覆盖层会保持打开供用户修改后重新提交。

### 类型定义

#### `CustomOverlayProps<T, R>`

```typescript
interface CustomOverlayProps<T = any, R = void> {
  open?: boolean;
  customClose: () => void;
  customOk?: (value: T) => R | Promise<R>;
}
```

如需本地验证异步行为，可运行 demo 中的 `AsyncCustomOkDemo`（包含 Overlay / Modal / Drawer 的异步成功与失败场景）。

#### `CustomModalProps<T, R>` / `CustomDrawerProps<T, R>`

分别为 `ModalProps` / `DrawerProps` 与 `CustomOverlayProps` 的交叉类型。

#### `InternalOverlayProps<T>`

`Omit<T, 'customClose'>`，表示打开/更新时可传入的属性（由 Hook 注入 `customClose`）。

#### `OverlayController<T>`

```typescript
interface OverlayController<T extends CustomOverlayProps> {
  /** 与 defaultProps、当前 props 浅合并后更新 */
  readonly update: (props: InternalOverlayProps<T>) => void;
  readonly close: () => void;
}
```

#### `OverlayOpener<T>`

`(initialize?: InternalOverlayProps<T>) => OverlayController<T>`。

## 完整示例

### 确认删除 Modal

```tsx
import React, { useState } from 'react';
import { Modal, message, List, Button } from 'antd';
import { CustomModalProps, useGlobalModal } from 'antd-overlay';

interface ConfirmDeleteModalProps extends CustomModalProps<void> {
  itemName: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  customClose,
  customOk,
  itemName,
  ...props
}) => {
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      message.success('删除成功');
      customOk?.();
    } catch {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="确认删除"
      onCancel={customClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="删除"
      okType="danger"
      {...props}
    >
      确定要删除 &quot;{itemName}&quot; 吗？此操作不可恢复。
    </Modal>
  );
};

// 使用（示例数据与类型请按项目替换）
function ItemList() {
  const openConfirm = useGlobalModal(ConfirmDeleteModal);

  const handleDelete = (item: { id: number; name: string }) => {
    openConfirm({
      itemName: item.name,
      customOk: () => {
        /* deleteItem(item.id) */
      },
    });
  };

  return (
    <List
      dataSource={[]}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key="del" danger onClick={() => handleDelete(item)}>
              删除
            </Button>,
          ]}
        >
          {item.name}
        </List.Item>
      )}
    />
  );
}
```

### 用户详情 Drawer

```tsx
import React, { useEffect, useState } from 'react';
import { Drawer, Descriptions, Spin } from 'antd';
import { CustomDrawerProps, generateUseDrawerHook } from 'antd-overlay';

interface UserDetailDrawerProps extends CustomDrawerProps {
  userId: number;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  open,
  customClose,
  userId,
  ...props
}) => {
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      Promise.resolve(/* fetchUser(userId) */)
        .then(setUser)
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  return (
    <Drawer open={open} title="用户详情" onClose={customClose} width={500} {...props}>
      {loading ? (
        <Spin />
      ) : user ? (
        <Descriptions column={1}>
          <Descriptions.Item label="姓名">{user.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="手机">{user.phone}</Descriptions.Item>
        </Descriptions>
      ) : null}
    </Drawer>
  );
};

export const {
  useDrawer: useUserDetailDrawer,
  useGlobalDrawer: useGlobalUserDetailDrawer,
} = generateUseDrawerHook(UserDetailDrawer);

function UserCard({ userId }: { userId: number }) {
  const openDetail = useGlobalUserDetailDrawer();

  return <div onClick={() => openDetail({ userId })}>查看详情</div>;
}
```

### 动态更新 Modal

```tsx
import { Button } from 'antd';
// UploadModal、delay 由业务自行实现

function ProgressModal() {
  const [openModal, holder] = useModal(UploadModal);

  const handleUpload = async () => {
    const controller = openModal({ progress: 0, status: 'uploading' });

    for (let i = 0; i <= 100; i += 10) {
      await delay(500);
      controller.update({ progress: i, status: 'uploading' });
    }

    controller.update({ progress: 100, status: 'done' });
    await delay(1000);
    controller.close();
  };

  return (
    <>
      <Button onClick={handleUpload}>开始上传</Button>
      {holder}
    </>
  );
}
```

## 架构说明

```
┌─────────────────────────────────────────────────────────┐
│                    useModal / useDrawer                 │  业务层封装
├─────────────────────────────────────────────────────────┤
│              useOverlay / useGlobalOverlay              │  核心逻辑层
├─────────────────────────────────────────────────────────┤
│                  AntdOverlayProvider                    │  全局容器层
└─────────────────────────────────────────────────────────┘
```

## License

MIT © [RaineySpace](https://github.com/RaineySpace)
