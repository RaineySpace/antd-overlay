/**
 * @file usePromiseDrawer - Promise 风格的 Drawer 管理 Hook
 * @description
 * 在 usePromiseOverlay 上使用 Drawer 专用的 propsAdapter，行为与 useDrawer 完全对齐：
 * - opener 返回 `Promise<V | undefined>`
 * - customOk(value) → resolve(value)；非 OK 关闭 → resolve(undefined)；customOk 抛错 / reject → reject 透传
 *
 * @example
 * const [openPromiseDrawer, holder] = usePromiseDrawer(MyDrawer);
 * const result = await openPromiseDrawer({ title: 'Edit' });
 * if (result === undefined) return; // 用户取消
 */

import React, { useMemo } from 'react';

import { useAntdOverlayContext } from './AntdOverlayContext';
import { CustomDrawerProps, UseDrawerOptions, createDrawerPropsAdapter } from './useDrawer';
import { UseOverlayOptions } from './useOverlay';
import {
  PromiseOverlayOpener,
  UsePromiseOverlayOptions,
  useGlobalPromiseOverlay,
  usePromiseOverlay,
} from './usePromiseOverlay';

/**
 * usePromiseDrawer 的配置选项（与 useDrawer 一致：不含 propsAdapter / keyPrefix）
 */
export type UsePromiseDrawerOptions<T extends CustomDrawerProps = CustomDrawerProps> =
  UseDrawerOptions<T>;

export function usePromiseDrawer<T extends CustomDrawerProps>(
  DrawerComponent: React.FC<T>,
  options?: UsePromiseDrawerOptions<T>,
): [PromiseOverlayOpener<T>, React.ReactNode] {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createDrawerPropsAdapter<T>(context?.defaultDrawerProps),
    [context?.defaultDrawerProps],
  );
  return usePromiseOverlay(DrawerComponent, {
    ...options,
    keyPrefix: 'use-drawer',
    propsAdapter,
  } as UsePromiseOverlayOptions<T>);
}

export function useGlobalPromiseDrawer<T extends CustomDrawerProps>(
  DrawerComponent: React.FC<T>,
  options?: UsePromiseDrawerOptions<T>,
): PromiseOverlayOpener<T> {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createDrawerPropsAdapter<T>(context?.defaultDrawerProps),
    [context?.defaultDrawerProps],
  );
  return useGlobalPromiseOverlay(DrawerComponent, {
    ...options,
    keyPrefix: 'use-drawer',
    propsAdapter,
  } as UseOverlayOptions<T>);
}

/**
 * 生成绑定了特定 Drawer 组件的 Promise Hook 工厂
 */
export function generateUsePromiseDrawerHook<T extends CustomDrawerProps>(
  DrawerComponent: React.FC<T>,
) {
  return {
    usePromiseDrawer: (options?: UsePromiseDrawerOptions<T>) =>
      usePromiseDrawer(DrawerComponent, options),
    useGlobalPromiseDrawer: (options?: UsePromiseDrawerOptions<T>) =>
      useGlobalPromiseDrawer(DrawerComponent, options),
  };
}
