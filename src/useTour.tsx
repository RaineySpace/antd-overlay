/**
 * @file useTour - Ant Design Tour 管理 Hook
 * @description
 * 基于 useOverlay 封装的 Tour 专用管理方案。
 * 提供命令式 API 来控制 Tour 的显示、隐藏和属性更新。
 *
 * Tour 没有类似 Modal afterClose / Drawer afterOpenChange 的关闭动画完成回调，
 * 因此本封装默认关闭时直接卸载，避免等待不存在的动画回调。
 */

import { TourProps } from 'antd';
import { useMemo } from 'react';

import { DefaultTourProps, useAntdOverlayContext } from './AntdOverlayContext';
import {
  CustomOverlayProps,
  OverlayOpener,
  UseOverlayOptions,
  useGlobalOverlay,
  useOverlay,
  wrapCustomOk,
} from './useOverlay';

/**
 * 自定义 Tour 组件的属性接口
 * 继承 Ant Design TourProps 并添加自定义属性
 *
 * @template T - customOk 回调的参数类型
 * @template R - customOk 回调的返回类型
 */
export interface CustomTourProps<T = any, R = void> extends TourProps, CustomOverlayProps<T, R> {}

/**
 * useTour Hook 的配置选项
 * 排除了 propsAdapter 和 keyPrefix，这些由内部自动处理。
 * 与 {@link UseOverlayOptions} 一致：可在顶层或 defaultProps 中传入默认 Tour 属性。
 */
export type UseTourOptions<T extends CustomTourProps = CustomTourProps> = Omit<
  UseOverlayOptions<T>,
  'propsAdapter' | 'keyPrefix'
>;

/**
 * 创建 Tour 专用的属性适配器
 *
 * 主要职责：
 * 1. 注入 open 和 customClose
 * 2. 包装 onClose 以接入内部关闭流程
 * 3. 包装 customOk 以实现自动关闭
 */
export const createTourPropsAdapter = <T extends CustomTourProps>(
  defaultProps?: DefaultTourProps,
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
      onClose: (current: number) => {
        props?.onClose?.(current);
        state.onClose();
      },
    } as unknown as T;

    if (result.customOk) {
      result.customOk = wrapCustomOk(result.customOk, state.onClose) as T['customOk'];
    }

    return result;
  };
};

/**
 * Tour 管理 Hook
 *
 * @returns 元组 [openTour, contextHolder]
 */
export function useTour<T extends CustomTourProps>(
  TourComponent: React.FC<T>,
  options?: UseTourOptions<T>,
): [OverlayOpener<T>, React.ReactNode] {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createTourPropsAdapter<T>(context?.defaultTourProps),
    [context?.defaultTourProps],
  );
  return useOverlay(TourComponent, {
    animation: false,
    ...options,
    keyPrefix: 'use-tour',
    propsAdapter,
  } as UseOverlayOptions<T>);
}

/**
 * 全局 Tour 管理 Hook
 *
 * 与 useTour 的区别：无需手动渲染 contextHolder，Tour 会自动挂载到全局容器。
 */
export function useGlobalTour<T extends CustomTourProps>(
  TourComponent: React.FC<T>,
  options?: UseTourOptions<T>,
): OverlayOpener<T> {
  const context = useAntdOverlayContext();
  const propsAdapter = useMemo(
    () => createTourPropsAdapter<T>(context?.defaultTourProps),
    [context?.defaultTourProps],
  );
  return useGlobalOverlay(TourComponent, {
    animation: false,
    ...options,
    keyPrefix: 'use-tour',
    propsAdapter,
  } as UseOverlayOptions<T>);
}

/**
 * 生成绑定了特定 Tour 组件的 Hook 工厂函数
 */
export function generateUseTourHook<T extends CustomTourProps>(TourComponent: React.FC<T>) {
  return {
    useTour: (options?: UseTourOptions<T>) => useTour(TourComponent, options),
    useGlobalTour: (options?: UseTourOptions<T>) => useGlobalTour(TourComponent, options),
  };
}

export default useTour;
