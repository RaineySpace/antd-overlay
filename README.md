# antd-overlay

Ant Design Modal/Drawer 命令式调用方案。

[![npm version](https://img.shields.io/npm/v/antd-overlay.svg)](https://www.npmjs.com/package/antd-overlay)
[![license](https://img.shields.io/npm/l/antd-overlay.svg)](https://github.com/RaineySpace/antd-overlay/blob/main/LICENSE)

## 特性

- 🚀 **命令式调用** - 通过函数调用打开/关闭覆盖层，无需管理 `open` 状态
- 🎨 **动画支持** - 正确处理打开/关闭动画，避免动画未完成就卸载组件
- 🌍 **全局挂载** - 支持跨组件调用，覆盖层可挂载到全局容器
- 📦 **类型安全** - 完整的 TypeScript 类型支持
- 🔧 **灵活扩展** - 支持自定义覆盖层组件

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

## 快速开始

### 1. 包裹 Provider（可选，仅全局 Hook 需要）

```tsx
import { AntdOverlayProvider } from 'antd-overlay';

function App() {
  return (
    <AntdOverlayProvider>
      <YourApp />
    </AntdOverlayProvider>
  );
}
```

### 2. 创建覆盖层组件

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
}) => {
  const [value, setValue] = useState(initialValue || '');

  return (
    <Modal
      title="输入内容"
      open={open}
      onCancel={customClose}
      onOk={() => customOk?.({ result: value })}
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

  const handleOpen = async () => {
    const controller = openModal({ initialValue: 'hello' });
    // controller.update({ initialValue: 'updated' }); // 可动态更新
    // controller.close(); // 可编程式关闭
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

## API

### Provider

#### `AntdOverlayProvider`

全局覆盖层容器，使用 `useGlobalModal`、`useGlobalDrawer`、`useGlobalOverlay` 时需要在应用外层包裹。

**属性：**
- `children: React.ReactNode` - 子节点
- `defaultModalProps?: Partial<ModalProps>` - 默认 Modal 属性，会应用到所有 Modal
- `defaultDrawerProps?: Partial<DrawerProps>` - 默认 Drawer 属性，会应用到所有 Drawer

```tsx
<AntdOverlayProvider>
  <App />
</AntdOverlayProvider>

// 或设置默认属性
<AntdOverlayProvider
  defaultModalProps={{ centered: true, maskClosable: false }}
  defaultDrawerProps={{ width: 600 }}
>
  <App />
</AntdOverlayProvider>
```

### Modal Hooks

#### `useModal<T>(Component, options?)`

局部 Modal 管理 Hook。

**参数：**
- `Component: React.FC<T>` - Modal 组件，需实现 `CustomModalProps` 接口
- `options?: UseModalOptions` - 配置选项
  - `animation?: boolean` - 是否启用动画，默认 `true`

**返回值：**
- `[openModal, holder]` - 打开函数和需要渲染的 holder 节点

```tsx
const [openModal, holder] = useModal(MyModal);
```

#### `useGlobalModal<T>(Component, options?)`

全局 Modal 管理 Hook，无需手动渲染 holder。

**参数：** 同 `useModal`

**返回值：**
- `openModal` - 打开函数

```tsx
const openModal = useGlobalModal(MyModal);
```

#### `generateUseModalHook<T>(Component)`

为特定 Modal 组件生成专用 Hook 工厂函数。

```tsx
// modal.tsx
export const {
  useModal: useMyModal,
  useGlobalModal: useGlobalMyModal,
} = generateUseModalHook(MyModal);

// usage.tsx
const openModal = useGlobalMyModal();
```

### Drawer Hooks

#### `useDrawer<T>(Component, options?)`

局部 Drawer 管理 Hook。

```tsx
const [openDrawer, holder] = useDrawer(MyDrawer);
```

#### `useGlobalDrawer<T>(Component, options?)`

全局 Drawer 管理 Hook。

```tsx
const openDrawer = useGlobalDrawer(MyDrawer);
```

#### `generateUseDrawerHook<T>(Component)`

为特定 Drawer 组件生成专用 Hook 工厂函数。

```tsx
export const {
  useDrawer: useMyDrawer,
  useGlobalDrawer: useGlobalMyDrawer,
} = generateUseDrawerHook(MyDrawer);
```

### 通用 Overlay Hooks

#### `useOverlay<T>(Component, options?)`

通用覆盖层管理 Hook，适用于自定义覆盖层组件。

**参数：**
- `Component: React.FC<T>` - 覆盖层组件
- `options?: UseOverlayOptions<T>` - 配置选项
  - `animation?: boolean` - 是否启用动画，默认 `true`
  - `keyPrefix?: string` - React key 前缀
  - `propsAdapter?: (props, state) => T` - 属性适配器函数

```tsx
const [openOverlay, holder] = useOverlay(MyOverlay, {
  propsAdapter: (props, state) => ({
    ...props,
    visible: state.open,
    onClose: state.onClose,
    afterVisibleChange: (visible) => {
      if (!visible) state.onAnimationEnd();
    },
  }),
});
```

#### `useGlobalOverlay<T>(Component, options?)`

全局通用覆盖层管理 Hook。

#### `generateUseOverlayHook<T>(Component, defaultOptions?)`

为特定覆盖层组件生成专用 Hook 工厂函数。

### 类型定义

#### `CustomModalProps<T, R>`

Modal 组件属性接口，继承自 `antd` 的 `ModalProps`。

```typescript
interface CustomModalProps<T = any, R = void> extends ModalProps {
  open?: boolean;
  customClose: () => void;
  customOk?: (value: T) => R;
}
```

#### `CustomDrawerProps<T, R>`

Drawer 组件属性接口，继承自 `antd` 的 `DrawerProps`。

```typescript
interface CustomDrawerProps<T = any, R = void> extends DrawerProps {
  open?: boolean;
  customClose: () => void;
  customOk?: (value: T) => R;
}
```

#### `CustomOverlayProps<T, R>`

通用覆盖层组件属性接口。

```typescript
interface CustomOverlayProps<T = any, R = void> {
  open?: boolean;
  customClose: () => void;
  customOk?: (value: T) => R;
}
```

#### `OverlayController<T>`

覆盖层控制器，由 `openModal`/`openDrawer`/`openOverlay` 返回。

```typescript
interface OverlayController<T> {
  update: (props: Omit<T, 'customClose'>) => void;
  close: () => void;
}
```

## 完整示例

### 确认删除 Modal

```tsx
import { Modal, message } from 'antd';
import { CustomModalProps, useGlobalModal } from 'antd-overlay';

interface ConfirmDeleteModalProps extends CustomModalProps<void> {
  itemName: string;
  onConfirm: () => Promise<void>;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  customClose,
  customOk,
  itemName,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      await onConfirm();
      message.success('删除成功');
      customOk?.();
    } catch (error) {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认删除"
      open={open}
      onCancel={customClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="删除"
      okType="danger"
    >
      确定要删除 "{itemName}" 吗？此操作不可恢复。
    </Modal>
  );
};

// 使用
function ItemList() {
  const openConfirm = useGlobalModal(ConfirmDeleteModal);

  const handleDelete = (item: Item) => {
    openConfirm({
      itemName: item.name,
      onConfirm: () => deleteItem(item.id),
    });
  };

  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button danger onClick={() => handleDelete(item)}>
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
import { Drawer, Descriptions, Spin } from 'antd';
import { CustomDrawerProps, generateUseDrawerHook } from 'antd-overlay';

interface UserDetailDrawerProps extends CustomDrawerProps {
  userId: number;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  open,
  customClose,
  userId,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      fetchUser(userId)
        .then(setUser)
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  return (
    <Drawer
      title="用户详情"
      open={open}
      onClose={customClose}
      width={500}
    >
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

// 导出专用 Hook
export const {
  useDrawer: useUserDetailDrawer,
  useGlobalDrawer: useGlobalUserDetailDrawer,
} = generateUseDrawerHook(UserDetailDrawer);

// 使用
function UserCard({ userId }: { userId: number }) {
  const openDetail = useGlobalUserDetailDrawer();

  return (
    <Card onClick={() => openDetail({ userId })}>
      查看详情
    </Card>
  );
}
```

### 动态更新 Modal

```tsx
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
│                    useModal / useDrawer                 │  <- 业务层封装
├─────────────────────────────────────────────────────────┤
│              useOverlay / useGlobalOverlay              │  <- 核心逻辑层
├─────────────────────────────────────────────────────────┤
│                  AntdOverlayProvider                    │  <- 全局容器层
└─────────────────────────────────────────────────────────┘
```

## License

MIT © [RaineySpace](https://github.com/RaineySpace)
