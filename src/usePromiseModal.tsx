/**
 * @file usePromiseModal - Promise 风格的 Modal 管理 Hook
 * @description
 * 在 usePromiseOverlay 上使用 Modal 专用的 propsAdapter，行为与 useModal 完全对齐：
 * - opener 返回 `Promise<V | undefined>`
 * - customOk(value) → resolve(value)；非 OK 关闭 → resolve(undefined)；customOk 抛错 / reject → reject 透传
 *
 * @example
 * const [openConfirm, holder] = usePromiseModal(ConfirmModal);
 * const result = await openConfirm({ title: 'Confirm?' });
 * if (result === undefined) return; // 用户取消
 */

import React, { useMemo } from 'react';

import { useAntdOverlayContext } from './AntdOverlayContext';
import { CustomModalProps, UseModalOptions, createModalPropsAdapter } from './useModal';
import { UseOverlayOptions } from './useOverlay';
import {
  PromiseOverlayOpener,
  UsePromiseOverlayOptions,
  useGlobalPromiseOverlay,
  usePromiseOverlay,
} from './usePromiseOverlay';

/**
 * usePromiseModal 的配置选项（与 useModal 一致：不含 propsAdapter / keyPrefix）
 */
export type UsePromiseModalOptions<T extends CustomModalProps = CustomModalProps> =
  UseModalOptions<T>;

export function usePromiseModal<T extends CustomModalProps>(
  ModalComponent: React.FC<T>,
  options?: UsePromiseModalOptions<T>,
): [PromiseOverlayOpener<T>, React.ReactNode] {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createModalPropsAdapter<T>(context?.defaultModalProps),
    [context?.defaultModalProps],
  );
  return usePromiseOverlay(ModalComponent, {
    ...options,
    keyPrefix: 'use-modal',
    propsAdapter,
  } as UsePromiseOverlayOptions<T>);
}

export function useGlobalPromiseModal<T extends CustomModalProps>(
  ModalComponent: React.FC<T>,
  options?: UsePromiseModalOptions<T>,
): PromiseOverlayOpener<T> {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createModalPropsAdapter<T>(context?.defaultModalProps),
    [context?.defaultModalProps],
  );
  return useGlobalPromiseOverlay(ModalComponent, {
    ...options,
    keyPrefix: 'use-modal',
    propsAdapter,
  } as UseOverlayOptions<T>);
}

/**
 * 生成绑定了特定 Modal 组件的 Promise Hook 工厂
 */
export function generateUsePromiseModalHook<T extends CustomModalProps>(
  ModalComponent: React.FC<T>,
) {
  return {
    usePromiseModal: (options?: UsePromiseModalOptions<T>) =>
      usePromiseModal(ModalComponent, options),
    useGlobalPromiseModal: (options?: UsePromiseModalOptions<T>) =>
      useGlobalPromiseModal(ModalComponent, options),
  };
}
