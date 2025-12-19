/**
 * @file useDrawer - Ant Design Drawer 管理 Hook
 * @description
 * 基于 useOverlay 封装的 Drawer 专用管理方案。
 * 提供命令式 API 来控制 Drawer 的显示、隐藏和属性更新。
 *
 * 主要特性：
 * - 命令式调用，无需管理 open 状态
 * - 支持动态更新 Drawer 属性
 * - 支持全局挂载，跨组件调用
 * - 正确处理关闭动画（通过 afterOpenChange 回调）
 *
 * @example
 * // 基础用法
 * const [openDrawer, holder] = useDrawer(MyDrawer);
 *
 * // 全局用法
 * const openDrawer = useGlobalDrawer(MyDrawer);
 *
 * // 为特定组件生成专用 Hook
 * const { useGlobalDrawer: useGlobalMyDrawer } = generateUseDrawerHook(MyDrawer);
 */

import { DrawerProps } from 'antd';
import { useMemo } from 'react';

import {
  CustomOverlayProps,
  OverlayOpener,
  useGlobalOverlay,
  useOverlay,
  UseOverlayOptions,
} from './useOverlay';

/**
 * 自定义 Drawer 组件的属性接口
 * 继承 Ant Design DrawerProps 并添加自定义属性
 *
 * @template T - customOk 回调的参数类型
 * @template R - customOk 回调的返回类型
 *
 * @example
 * const MyDrawer: React.FC<CustomDrawerProps<{ id: number }>> = ({
 *   open,
 *   customClose,
 *   customOk,
 * }) => {
 *   return (
 *     <Drawer open={open} onClose={customClose}>
 *       <Button onClick={() => customOk?.({ id: 1 })}>确认</Button>
 *     </Drawer>
 *   );
 * };
 */
export interface CustomDrawerProps<T = any, R = void>
  extends DrawerProps, CustomOverlayProps<T, R> {}

/**
 * useDrawer Hook 的配置选项
 * 排除了 propsAdapter 和 keyPrefix，这些由内部自动处理
 */
export type UseDrawerOptions = Omit<
  UseOverlayOptions<CustomDrawerProps>,
  'propsAdapter' | 'keyPrefix'
>;

/**
 * 创建 Drawer 专用的属性适配器
 *
 * 主要职责：
 * 1. 注入 open 和 customClose
 * 2. 包装 afterOpenChange 以处理动画结束
 * 3. 包装 customOk 以实现自动关闭
 *
 * 与 Modal 的区别：
 * - Modal 使用 afterClose 回调（仅在关闭后触发）
 * - Drawer 使用 afterOpenChange 回调（打开和关闭都会触发，需要判断状态）
 *
 * @template T - Drawer 组件的属性类型
 * @returns 属性适配器函数
 */
const createDrawerPropsAdapter = <T extends CustomDrawerProps>() => {
  return (
    props: Omit<T, 'customClose'> | undefined,
    state: { open: boolean; onClose: () => void; onAnimationEnd: () => void },
  ): T => {
    const result = {
      maskClosable: false, // 默认禁止点击遮罩关闭
      ...props,
      open: state.open,
      customClose: state.onClose,
      // Drawer 的动画回调，打开和关闭时都会触发
      afterOpenChange: (open: boolean) => {
        props?.afterOpenChange?.(open);
        // 仅在关闭动画结束时触发卸载
        if (!open) {
          state.onAnimationEnd();
        }
      },
    } as unknown as T;

    // 包装 customOk，调用后自动关闭 Drawer
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
 * Drawer 管理 Hook
 *
 * @template T - Drawer 组件的属性类型，必须继承 CustomDrawerProps
 *
 * @param DrawerComponent - Drawer 组件
 * @param options - 配置选项
 *
 * @returns 元组 [openDrawer, contextHolder]
 * - openDrawer: 打开 Drawer 的函数
 * - contextHolder: 需要渲染到组件树中的 React 节点
 *
 * @example
 * function MyPage() {
 *   const [openDrawer, drawerHolder] = useDrawer(UserDetailDrawer);
 *
 *   const handleViewUser = (userId: number) => {
 *     openDrawer({ userId, title: '用户详情' });
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => handleViewUser(1)}>查看用户</button>
 *       {drawerHolder}
 *     </>
 *   );
 * }
 */
export function useDrawer<T extends CustomDrawerProps>(
  DrawerComponent: React.FC<T>,
  options?: UseDrawerOptions,
): [OverlayOpener<T>, React.ReactNode] {
  const propsAdapter = useMemo(() => createDrawerPropsAdapter<T>(), []);
  return useOverlay(DrawerComponent, {
    ...options,
    keyPrefix: 'use-drawer',
    propsAdapter,
  });
}

/**
 * 全局 Drawer 管理 Hook
 *
 * 与 useDrawer 的区别：
 * - 无需手动渲染 contextHolder
 * - Drawer 会自动挂载到全局容器
 * - 适合需要跨组件调用的场景
 *
 * @template T - Drawer 组件的属性类型
 *
 * @param DrawerComponent - Drawer 组件
 * @param options - 配置选项
 *
 * @returns 打开 Drawer 的函数
 *
 * @example
 * function UserCard({ userId }: { userId: number }) {
 *   const openDetail = useGlobalDrawer(UserDetailDrawer);
 *
 *   return (
 *     <Card onClick={() => openDetail({ userId })}>
 *       查看详情
 *     </Card>
 *   );
 * }
 */
export function useGlobalDrawer<T extends CustomDrawerProps>(
  DrawerComponent: React.FC<T>,
  options?: UseDrawerOptions,
): OverlayOpener<T> {
  const propsAdapter = useMemo(() => createDrawerPropsAdapter<T>(), []);
  return useGlobalOverlay(DrawerComponent, {
    ...options,
    keyPrefix: 'use-drawer',
    propsAdapter,
  });
}

/**
 * 生成绑定了特定 Drawer 组件的 Hook 工厂函数
 *
 * 适用场景：
 * - 某个 Drawer 在多处使用
 * - 希望简化调用代码
 * - 需要统一管理某个 Drawer 的默认配置
 *
 * @template T - Drawer 组件的属性类型
 *
 * @param DrawerComponent - Drawer 组件
 *
 * @returns 包含 useDrawer 和 useGlobalDrawer 的对象
 *
 * @example
 * // 在 Drawer 组件文件中导出专用 Hook
 * const ProjectMemberDrawer: React.FC<CustomDrawerProps> = (props) => {
 *   // ...
 * };
 *
 * export const {
 *   useDrawer: useProjectMemberDrawer,
 *   useGlobalDrawer: useGlobalProjectMemberDrawer,
 * } = generateUseDrawerHook(ProjectMemberDrawer);
 *
 * // 在其他组件中使用
 * function ProjectPage() {
 *   const openMemberDrawer = useGlobalProjectMemberDrawer();
 *   return <button onClick={() => openMemberDrawer()}>管理成员</button>;
 * }
 */
export function generateUseDrawerHook<T extends CustomDrawerProps>(DrawerComponent: React.FC<T>) {
  return {
    useDrawer: (options?: UseDrawerOptions) => useDrawer(DrawerComponent, options),
    useGlobalDrawer: (options?: UseDrawerOptions) => useGlobalDrawer(DrawerComponent, options),
  };
}

export default useDrawer;
