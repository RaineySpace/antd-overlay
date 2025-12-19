/**
 * @file antd-overlay 入口文件
 * @description
 * Ant Design 覆盖层（Modal/Drawer）的命令式调用方案。
 *
 * 本库提供了一套与具体 UI 组件解耦的覆盖层管理方案，支持：
 * - 命令式打开/关闭覆盖层
 * - 动态更新覆盖层属性
 * - 正确处理关闭动画
 * - 全局挂载，跨组件调用
 *
 * 快速开始：
 *
 * 1. 在应用入口包裹 AntdOverlayProvider（如需使用全局 Hook）
 * ```tsx
 * import { AntdOverlayProvider } from 'antd-overlay';
 *
 * function App() {
 *   return (
 *     <AntdOverlayProvider>
 *       <YourApp />
 *     </AntdOverlayProvider>
 *   );
 * }
 * ```
 *
 * 2. 创建符合接口的覆盖层组件
 * ```tsx
 * import { Modal } from 'antd';
 * import { CustomModalProps } from 'antd-overlay';
 *
 * interface MyModalProps extends CustomModalProps<{ result: string }> {
 *   initialValue?: string;
 * }
 *
 * const MyModal: React.FC<MyModalProps> = ({
 *   open,
 *   customClose,
 *   customOk,
 *   initialValue,
 * }) => {
 *   const [value, setValue] = useState(initialValue);
 *
 *   return (
 *     <Modal
 *       open={open}
 *       onCancel={customClose}
 *       onOk={() => customOk?.({ result: value })}
 *     >
 *       <Input value={value} onChange={(e) => setValue(e.target.value)} />
 *     </Modal>
 *   );
 * };
 * ```
 *
 * 3. 使用 Hook 调用
 * ```tsx
 * import { useModal, useGlobalModal } from 'antd-overlay';
 *
 * // 局部使用（需要渲染 holder）
 * function LocalUsage() {
 *   const [openModal, holder] = useModal(MyModal);
 *
 *   return (
 *     <>
 *       <button onClick={() => openModal({ initialValue: 'hello' })}>
 *         打开
 *       </button>
 *       {holder}
 *     </>
 *   );
 * }
 *
 * // 全局使用（无需渲染 holder）
 * function GlobalUsage() {
 *   const openModal = useGlobalModal(MyModal);
 *
 *   return (
 *     <button onClick={() => openModal({ initialValue: 'world' })}>
 *       打开
 *     </button>
 *   );
 * }
 * ```
 *
 * @module antd-overlay
 */

// ============================================================================
// 全局容器层 - Context 管理
// ============================================================================

export { AntdOverlayProvider, useAntdOverlayContext } from './AntdOverlayContext';

// ============================================================================
// 核心层 - 通用覆盖层管理
// ============================================================================

export type {
  CustomOverlayProps,
  OverlayController,
  OverlayOpener,
  UseOverlayOptions,
} from './useOverlay';

export { useOverlay, useGlobalOverlay, generateUseOverlayHook } from './useOverlay';

// ============================================================================
// Modal 层 - Ant Design Modal 封装
// ============================================================================

export type { CustomModalProps, UseModalOptions } from './useModal';

export { useModal, useGlobalModal, generateUseModalHook } from './useModal';

// ============================================================================
// Drawer 层 - Ant Design Drawer 封装
// ============================================================================

export type { CustomDrawerProps, UseDrawerOptions } from './useDrawer';

export { useDrawer, useGlobalDrawer, generateUseDrawerHook } from './useDrawer';
