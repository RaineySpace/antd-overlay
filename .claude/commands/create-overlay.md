# create-overlay

使用 `antd-overlay` 库为用户生成覆盖层组件代码。

## 交互流程

**第一步：收集需求**

向用户询问以下问题（通过 AskUserQuestion 工具一次性收集）：

1. **覆盖层类型**：Modal / Drawer / 自定义 Overlay
2. **组件名称**：例如 `ConfirmModal`、`EditDrawer`
3. **Hook 模式**：
   - 基础模式（`useModal` / `useDrawer` / `useOverlay`）— 返回 `[opener, holder]`，支持 `opener()` 拿到 controller（含 `update` / `close`）
   - Promise 模式（`usePromiseModal` / `usePromiseDrawer` / `usePromiseOverlay`）— 返回 `[openPromise, holder]`，可 `await openPromise()` 直接拿到 `customOk` 入参
4. **挂载方式**：局部（需要渲染 `{holder}`）/ 全局（需要 `AntdOverlayProvider`）
5. **`customOk` 数据类型**：用户确认时传递给 `customOk` 的值类型描述（如 `{ value: string }` / `void`）

如果用户在调用 `/create-overlay` 时已经在消息中提供了部分信息，跳过对应问题。

**第二步：生成代码**

根据收集到的信息，生成以下文件：

### 1. 覆盖层组件文件

遵循以下模式（以 Modal 类型为例）：

```tsx
import React from 'react';
import { Modal } from 'antd';
import type { CustomModalProps } from 'antd-overlay';

// T 为 customOk 接收的数据类型
interface <ComponentName>Props extends CustomModalProps<T> {
  // 用户自定义 props
}

const <ComponentName>: React.FC<<ComponentName>Props> = ({
  customClose,
  customOk,
  ...props,
}) => {
  return (
    <Modal
      title="标题"
      onCancel={customClose}
      onOk={() => customOk?.(/* value */)}
      {...props}
    >
      {/* 内容 */}
    </Modal>
  );
};

export default <ComponentName>;
```

对于 Drawer 类型，替换为：
- `CustomDrawerProps` 代替 `CustomModalProps`
- `Drawer` 代替 `Modal`
- `onClose={customClose}` 代替 `onCancel={customClose}`

对于自定义 Overlay 类型，使用 `CustomOverlayProps`，组件需自行管理显隐（通过 `open` prop），并设置 `animation: false`。

### 2. 使用示例

在同一文件或单独文件中生成使用示例（根据用户选择的 Hook 模式和挂载方式）。

**基础模式 + 局部挂载**：
```tsx
import { useModal } from 'antd-overlay';

function Page() {
  const [openModal, holder] = useModal(<ComponentName>, {
    // defaultProps
    customOk: (value) => {
      console.log(value);
    },
  });

  return (
    <>
      <button onClick={() => openModal()}>打开</button>
      {holder}
    </>
  );
}
```

**基础模式 + 全局挂载**：
```tsx
import { useGlobalModal } from 'antd-overlay';

function Page() {
  const openModal = useGlobalModal(<ComponentName>, {
    customOk: (value) => {
      console.log(value);
    },
  });

  return <button onClick={() => openModal()}>打开</button>;
}
```

**Promise 模式 + 局部挂载**：
```tsx
import { usePromiseModal } from 'antd-overlay';

function Page() {
  const [openModal, holder] = usePromiseModal(<ComponentName>);

  const handleOpen = async () => {
    const result = await openModal();
    if (result === undefined) return; // 用户取消
    console.log(result); // customOk 入参
  };

  return (
    <>
      <button onClick={handleOpen}>打开</button>
      {holder}
    </>
  );
}
```

**Promise 模式 + 全局挂载**：
```tsx
import { useGlobalPromiseModal } from 'antd-overlay';

function Page() {
  const openModal = useGlobalPromiseModal(<ComponentName>);

  const handleOpen = async () => {
    const result = await openModal();
    if (result === undefined) return;
    console.log(result);
  };

  return <button onClick={handleOpen}>打开</button>;
}
```

## 生成规则

- 根据覆盖层类型选择正确的类型接口：`CustomModalProps<T>` / `CustomDrawerProps<T>` / `CustomOverlayProps<T>`
- 根据覆盖层类型选择正确的 Hook：`useModal` / `useDrawer` / `useOverlay`（以及对应的 `useGlobal*`、`usePromise*`、`useGlobalPromise*`）
- 自定义 Overlay 需要手动处理显隐逻辑且默认设置 `animation: false`
- 使用 `customOk?.()` 调用（可选链），因为 `customOk` 可能为 `undefined`
- Modal 使用 `onCancel={customClose}`，Drawer 使用 `onClose={customClose}`
- 生成的代码直接写入用户指定的路径；如果用户未指定，询问文件路径
- 组件文件和使用示例默认写在同一个文件中，除非用户要求分开
- 如果用户描述了具体的业务逻辑（如表单字段、数据展示），在组件内填充对应的 UI 代码
- 在生成代码后运行 `pnpm typecheck` 验证类型正确性（仅当文件在 `src/` 或 `demo/` 下且 tsconfig 覆盖到时）
