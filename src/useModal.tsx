/**
 * @file useModal - Ant Design Modal 管理 Hook
 * @description
 * 基于 useOverlay 封装的 Modal 专用管理方案。
 * 提供命令式 API 来控制 Modal 的显示、隐藏和属性更新。
 *
 * 主要特性：
 * - 命令式调用，无需管理 visible 状态
 * - 支持动态更新 Modal 属性
 * - 支持全局挂载，跨组件调用
 * - 正确处理关闭动画（通过 afterClose 回调）
 *
 * @example
 * // 基础用法
 * const [openModal, holder] = useModal(MyModal);
 *
 * // 全局用法
 * const openModal = useGlobalModal(MyModal);
 *
 * // 为特定组件生成专用 Hook
 * const { useGlobalModal: useGlobalMyModal } = generateUseModalHook(MyModal);
 */

import { ModalProps } from 'antd';
import { useMemo } from 'react';

import { useAntdOverlayContext, DefaultModalProps } from './AntdOverlayContext';
import {
  CustomOverlayProps,
  OverlayOpener,
  useGlobalOverlay,
  useOverlay,
  UseOverlayOptions,
} from './useOverlay';

/**
 * 自定义 Modal 组件的属性接口
 * 继承 Ant Design ModalProps 并添加自定义属性
 *
 * @template T - customOk 回调的参数类型
 * @template R - customOk 回调的返回类型
 *
 * @example
 * const MyModal: React.FC<CustomModalProps<{ name: string }>> = ({
 *   open,
 *   customClose,
 *   customOk,
 * }) => {
 *   return (
 *     <Modal open={open} onCancel={customClose} onOk={() => customOk?.({ name: 'test' })}>
 *       内容
 *     </Modal>
 *   );
 * };
 */
export interface CustomModalProps<T = any, R = void> extends ModalProps, CustomOverlayProps<T, R> {}

/**
 * useModal Hook 的配置选项
 * 排除了 propsAdapter 和 keyPrefix，这些由内部自动处理
 */
export type UseModalOptions = Omit<
  UseOverlayOptions<CustomModalProps>,
  'propsAdapter' | 'keyPrefix'
>;

/**
 * 创建 Modal 专用的属性适配器
 *
 * 主要职责：
 * 1. 注入 open 和 customClose
 * 2. 包装 afterClose 以处理动画结束
 * 3. 包装 customOk 以实现自动关闭
 *
 * @template T - Modal 组件的属性类型
 * @param defaultProps - 默认 Modal 属性
 * @returns 属性适配器函数
 */
const createModalPropsAdapter = <T extends CustomModalProps>(
  defaultProps?: DefaultModalProps,
) => {
  return (
    props: Omit<T, 'customClose'> | undefined,
    state: { open: boolean; onClose: () => void; onAnimationEnd: () => void },
  ): T => {
    const result = {
      ...defaultProps,
      ...props,
      open: state.open,
      customClose: state.onClose,
      // 在 Modal 关闭动画结束后触发，用于卸载组件
      afterClose: () => {
        props?.afterClose?.();
        state.onAnimationEnd();
      },
    } as unknown as T;

    // 包装 customOk，调用后自动关闭 Modal
    if (result.customOk) {
      const originalCustomOk = result?.customOk;
      result.customOk = ((value: unknown) => {
        originalCustomOk?.(value);
        state.onClose();
      }) as T['customOk'];
    }

    return result;
  };
};

/**
 * Modal 管理 Hook
 *
 * @template T - Modal 组件的属性类型，必须继承 CustomModalProps
 *
 * @param ModalComponent - Modal 组件
 * @param options - 配置选项
 *
 * @returns 元组 [openModal, contextHolder]
 * - openModal: 打开 Modal 的函数
 * - contextHolder: 需要渲染到组件树中的 React 节点
 *
 * @example
 * function MyPage() {
 *   const [openModal, modalHolder] = useModal(ConfirmModal);
 *
 *   const handleDelete = () => {
 *     openModal({
 *       title: '确认删除',
 *       content: '删除后无法恢复',
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleDelete}>删除</button>
 *       {modalHolder}
 *     </>
 *   );
 * }
 */
export function useModal<T extends CustomModalProps>(
  ModalComponent: React.FC<T>,
  options?: UseModalOptions,
): [OverlayOpener<T>, React.ReactNode] {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createModalPropsAdapter<T>(context?.defaultModalProps),
    [context?.defaultModalProps],
  );
  return useOverlay(ModalComponent, {
    ...options,
    keyPrefix: 'use-modal',
    propsAdapter,
  });
}

/**
 * 全局 Modal 管理 Hook
 *
 * 与 useModal 的区别：
 * - 无需手动渲染 contextHolder
 * - Modal 会自动挂载到全局容器
 * - 适合需要跨组件调用的场景
 *
 * @template T - Modal 组件的属性类型
 *
 * @param ModalComponent - Modal 组件
 * @param options - 配置选项
 *
 * @returns 打开 Modal 的函数
 *
 * @example
 * function DeleteButton() {
 *   const openConfirm = useGlobalModal(ConfirmModal);
 *
 *   return (
 *     <button onClick={() => openConfirm({ title: '确认删除？' })}>
 *       删除
 *     </button>
 *   );
 * }
 */
export function useGlobalModal<T extends CustomModalProps>(
  ModalComponent: React.FC<T>,
  options?: UseModalOptions,
): OverlayOpener<T> {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createModalPropsAdapter<T>(context?.defaultModalProps),
    [context?.defaultModalProps],
  );
  return useGlobalOverlay(ModalComponent, {
    ...options,
    keyPrefix: 'use-modal',
    propsAdapter,
  });
}

/**
 * 生成绑定了特定 Modal 组件的 Hook 工厂函数
 *
 * 适用场景：
 * - 某个 Modal 在多处使用
 * - 希望简化调用代码
 * - 需要统一管理某个 Modal 的默认配置
 *
 * @template T - Modal 组件的属性类型
 *
 * @param ModalComponent - Modal 组件
 *
 * @returns 包含 useModal 和 useGlobalModal 的对象
 *
 * @example
 * // 在 Modal 组件文件中导出专用 Hook
 * const ConfirmModal: React.FC<CustomModalProps> = (props) => {
 *   // ...
 * };
 *
 * export const {
 *   useModal: useConfirmModal,
 *   useGlobalModal: useGlobalConfirmModal,
 * } = generateUseModalHook(ConfirmModal);
 *
 * // 在其他组件中使用
 * function MyPage() {
 *   const openConfirm = useGlobalConfirmModal();
 *   return <button onClick={() => openConfirm()}>确认</button>;
 * }
 */
export function generateUseModalHook<T extends CustomModalProps>(ModalComponent: React.FC<T>) {
  return {
    useModal: (options?: UseModalOptions) => useModal(ModalComponent, options),
    useGlobalModal: (options?: UseModalOptions) => useGlobalModal(ModalComponent, options),
  };
}

export default useModal;
