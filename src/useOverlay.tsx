/**
 * @file useOverlay - 通用覆盖层管理 Hook
 * @description
 * 提供一个与具体 UI 组件无关的覆盖层（Overlay）管理方案。
 * 支持任意满足 CustomOverlayProps 接口的组件，如 Modal、Drawer、Popover 等。
 *
 * 核心设计理念：
 * 1. 命令式调用 - 通过函数调用打开覆盖层，而非声明式管理 open 状态
 * 2. 动画支持 - 正确处理打开/关闭动画，避免动画未完成就卸载组件
 * 3. 全局挂载 - 支持将覆盖层挂载到全局容器，实现跨组件调用
 * 4. 类型安全 - 完整的 TypeScript 类型支持
 *
 * 架构层次：
 * ┌─────────────────────────────────────────────────────────┐
 * │                    useModal / useDrawer                 │  <- 业务层封装
 * ├─────────────────────────────────────────────────────────┤
 * │              useOverlay / useGlobalOverlay              │  <- 核心逻辑层
 * ├─────────────────────────────────────────────────────────┤
 * │                  GlobalHolderProvider                   │  <- 全局容器层
 * └─────────────────────────────────────────────────────────┘
 *
 * @example
 * // 直接使用 useOverlay（不推荐，建议使用 useModal/useDrawer）
 * const [openOverlay, holder] = useOverlay(MyOverlayComponent, {
 *   propsAdapter: (props, state) => ({ ...props, visible: state.open }),
 * });
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAntdOverlayContext } from './AntdOverlayContext';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 自定义覆盖层组件必须实现的属性接口
 *
 * 这是所有覆盖层组件的基础接口，定义了控制覆盖层所需的最小属性集。
 * 具体的 UI 组件（如 Modal、Drawer）应该扩展此接口。
 *
 * @template T - customOk 回调接收的参数类型，用于传递确认操作的数据
 * @template R - customOk 回调的返回类型，通常为 void
 *
 * @property open - 控制覆盖层的显示/隐藏状态
 * @property customClose - 关闭覆盖层的回调函数，由 useOverlay 注入
 * @property customOk - 确认操作的回调函数，调用后会自动关闭覆盖层
 *
 * @example
 * interface MyOverlayProps extends CustomOverlayProps<{ id: number }> {
 *   title: string;
 *   data: SomeData;
 * }
 *
 * const MyOverlay: React.FC<MyOverlayProps> = ({
 *   open,
 *   customClose,
 *   customOk,
 *   title,
 *   data,
 * }) => {
 *   const handleConfirm = () => {
 *     // 调用 customOk 会自动关闭覆盖层
 *     customOk?.({ id: data.id });
 *   };
 *   return (
 *     <Modal open={open} onCancel={customClose} onOk={handleConfirm}>
 *       {title}
 *     </Modal>
 *   );
 * };
 */
export interface CustomOverlayProps<T = any, R = void> {
  /** 覆盖层的显示状态 */
  open?: boolean;
  /** 关闭覆盖层的回调，由 useOverlay 自动注入 */
  customClose: () => void;
  /** 确认操作回调，调用后自动关闭覆盖层 */
  customOk?: (value: T) => R;
}

/**
 * 内部使用的属性类型
 * 排除 customClose，因为它由 useOverlay 自动注入，用户无需传递
 */
type InternalProps<T extends CustomOverlayProps> = Omit<T, 'customClose'>;

/**
 * 覆盖层控制器接口
 *
 * 打开覆盖层后返回的控制器对象，用于后续操作（更新属性或关闭）。
 * 使用 readonly 确保方法引用稳定，不会被意外修改。
 *
 * @template T - 覆盖层组件的属性类型
 *
 * @example
 * const controller = openModal({ title: '初始标题' });
 *
 * // 动态更新属性
 * controller.update({ title: '新标题', loading: true });
 *
 * // 编程式关闭
 * controller.close();
 */
export interface OverlayController<T extends CustomOverlayProps> {
  /**
   * 更新覆盖层的属性
   * @param props - 新的属性对象，会完全替换之前的属性
   */
  readonly update: (props: InternalProps<T>) => void;
  /**
   * 关闭覆盖层
   * 如果启用了动画，会等待动画结束后再卸载组件
   */
  readonly close: () => void;
}

/**
 * 覆盖层打开函数的类型定义
 *
 * @template T - 覆盖层组件的属性类型
 * @param initialize - 初始化属性，可选
 * @returns 覆盖层控制器，用于后续的更新和关闭操作
 *
 * @example
 * const openModal: OverlayOpener<MyModalProps> = (props) => {
 *   // 返回控制器
 * };
 *
 * // 无参数调用
 * const ctrl1 = openModal();
 *
 * // 带初始属性调用
 * const ctrl2 = openModal({ title: '标题', data: someData });
 */
export type OverlayOpener<T extends CustomOverlayProps> = (
  initialize?: InternalProps<T>,
) => OverlayController<T>;

/**
 * useOverlay Hook 的配置选项
 *
 * @template T - 覆盖层组件的属性类型
 *
 * @property animation - 是否启用动画支持，默认 true
 *   - true: 关闭时先设置 open=false，等待动画结束后再卸载组件
 *   - false: 关闭时直接卸载组件，适用于无动画的覆盖层
 *
 * @property keyPrefix - React key 的前缀，用于区分不同类型的覆盖层
 *   - 默认值: 'use-overlay'
 *   - useModal 使用 'use-modal'
 *   - useDrawer 使用 'use-drawer'
 *
 * @property propsAdapter - 属性适配器函数
 *   用于将内部状态转换为组件实际需要的属性。
 *   不同的 UI 组件（Modal、Drawer）有不同的动画回调机制，
 *   通过适配器实现统一的接口。
 */
export interface UseOverlayOptions<T extends CustomOverlayProps> {
  /** 是否启用关闭动画，默认 true */
  animation?: boolean;
  /** React key 前缀，用于标识覆盖层类型 */
  keyPrefix?: string;
  /**
   * 属性适配器函数
   * @param props - 用户传入的属性
   * @param state - 内部状态，包含 open、onClose、onAnimationEnd
   * @returns 传递给组件的最终属性
   */
  propsAdapter?: (
    props: InternalProps<T> | undefined,
    state: {
      /** 当前的打开状态 */
      open: boolean;
      /** 触发关闭的回调 */
      onClose: () => void;
      /** 动画结束后的回调，用于卸载组件 */
      onAnimationEnd: () => void;
    },
  ) => T;
}

// ============================================================================
// 默认属性适配器
// ============================================================================

/**
 * 默认的属性适配器
 *
 * 提供基本的属性转换逻辑：
 * 1. 将用户传入的 props 与内部状态合并
 * 2. 注入 open 和 customClose
 * 3. 包装 customOk 使其调用后自动关闭覆盖层
 *
 * 注意：这是一个简化的适配器，不处理动画。
 * 对于 Modal 和 Drawer，应该使用各自的专用适配器来处理动画回调。
 *
 * @template T - 覆盖层组件的属性类型
 * @param props - 用户传入的属性
 * @param state - 内部状态
 * @returns 最终传递给组件的属性
 */
const defaultPropsAdapter = <T extends CustomOverlayProps>(
  props: InternalProps<T> | undefined,
  state: { open: boolean; onClose: () => void; onAnimationEnd: () => void },
): T => {
  const result = {
    ...props,
    open: state.open,
    customClose: state.onClose,
  } as unknown as T;

  // 包装 customOk，使其调用后自动触发关闭
  if (result.customOk) {
    const originalCustomOk = result?.customOk;
    result.customOk = ((value: unknown) => {
      originalCustomOk?.(value);
      state.onClose();
    }) as T['customOk'];
  }

  return result;
};

// ============================================================================
// 核心 Hook 实现
// ============================================================================

/**
 * 覆盖层管理核心 Hook
 *
 * 这是整个库的核心，提供覆盖层的生命周期管理：
 * - 挂载/卸载控制
 * - 打开/关闭状态管理
 * - 动画支持
 * - 属性更新
 *
 * 状态机说明：
 * ```
 * [未挂载] --open()--> [已挂载, open=true] --close()--> [已挂载, open=false] --动画结束--> [未挂载]
 *                                                            │
 *                                                            └── (animation=false) --> [未挂载]
 * ```
 *
 * @template T - 覆盖层组件的属性类型，必须继承 CustomOverlayProps
 *
 * @param OverlayComponent - 覆盖层组件
 * @param options - 配置选项
 *
 * @returns 元组 [openOverlay, contextHolder]
 * - openOverlay: 打开覆盖层的函数，返回控制器
 * - contextHolder: 需要渲染到组件树中的 React 节点
 *
 * @example
 * function MyComponent() {
 *   const [openOverlay, holder] = useOverlay(MyOverlay, {
 *     animation: true,
 *     propsAdapter: (props, state) => ({
 *       ...props,
 *       visible: state.open,
 *       onClose: state.onClose,
 *       afterVisibleChange: (visible) => {
 *         if (!visible) state.onAnimationEnd();
 *       },
 *     }),
 *   });
 *
 *   return (
 *     <>
 *       <button onClick={() => openOverlay({ title: '标题' })}>打开</button>
 *       {holder}
 *     </>
 *   );
 * }
 */
export function useOverlay<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  options: UseOverlayOptions<T> = {},
): [OverlayOpener<T>, React.ReactNode] {
  // 解构配置选项，设置默认值
  const {
    animation = true,
    keyPrefix = 'use-overlay',
    propsAdapter = defaultPropsAdapter,
  } = options;

  // 生成唯一 ID，用于 React key
  const id = useId();
  const key = `${keyPrefix}-${id}`;

  // ========== 状态管理 ==========

  /**
   * open: 控制覆盖层的显示状态（用于动画）
   * - true: 覆盖层显示
   * - false: 覆盖层隐藏（但可能还在播放关闭动画）
   */
  const [open, setOpen] = useState(false);

  /**
   * renderEnable: 控制组件是否挂载到 DOM
   * - true: 组件已挂载
   * - false: 组件已卸载
   *
   * 与 open 分离是为了支持关闭动画：
   * 关闭时先设置 open=false 触发动画，动画结束后再设置 renderEnable=false 卸载组件
   */
  const [renderEnable, setRenderEnable] = useState(false);

  /**
   * props: 用户传入的属性
   * 存储最近一次 open 或 update 调用时传入的属性
   */
  const [props, setProps] = useState<InternalProps<T> | undefined>();

  /**
   * 使用 ref 存储 animation 配置
   * 避免 animation 变化时重新创建回调函数
   */
  const animationRef = useRef(animation);
  animationRef.current = animation;

  // ========== 回调函数 ==========

  /**
   * 处理关闭操作
   *
   * 根据是否启用动画采取不同策略：
   * - 启用动画: 仅设置 open=false，等待动画结束后再卸载
   * - 禁用动画: 直接卸载组件
   */
  const handleClose = useCallback(() => {
    if (animationRef.current) {
      // 启用动画时，先触发关闭动画
      setOpen(false);
    } else {
      // 禁用动画时，直接卸载
      setRenderEnable(false);
    }
  }, []);

  /**
   * 处理动画结束
   *
   * 由属性适配器在关闭动画结束时调用。
   * 仅在启用动画时执行实际的卸载操作。
   */
  const handleAnimationEnd = useCallback(() => {
    if (animationRef.current) {
      setRenderEnable(false);
    }
  }, []);

  // ========== 渲染逻辑 ==========

  /**
   * contextHolder: 需要渲染到组件树中的节点
   *
   * 使用 useMemo 优化性能：
   * - 未挂载时返回空 Fragment（保持 key 稳定）
   * - 已挂载时渲染实际组件，通过 propsAdapter 转换属性
   */
  const contextHolder = useMemo(() => {
    // 未挂载时返回带 key 的空 Fragment
    // 保持 key 稳定可以避免不必要的 DOM 操作
    if (!renderEnable) return <React.Fragment key={key} />;

    // 通过适配器转换属性
    const realProps = propsAdapter(props, {
      open,
      onClose: handleClose,
      onAnimationEnd: handleAnimationEnd,
    });

    return <OverlayComponent key={key} {...realProps} />;
  }, [
    renderEnable,
    open,
    props,
    key,
    propsAdapter,
    handleClose,
    handleAnimationEnd,
    OverlayComponent,
  ]);

  // ========== 打开函数 ==========

  /**
   * 打开覆盖层的函数
   *
   * @param initializeProps - 初始化属性
   * @returns 控制器对象，包含 update 和 close 方法
   */
  const openOverlay = useCallback(
    (initializeProps?: InternalProps<T>) => {
      // 1. 挂载组件
      setRenderEnable(true);
      // 2. 设置为打开状态（触发打开动画）
      setOpen(true);
      // 3. 存储初始属性
      setProps(initializeProps);

      // 返回控制器
      return {
        /**
         * 更新覆盖层属性
         * 注意：这是完全替换，不是合并
         */
        update: (newProps: InternalProps<T>) => setProps(newProps),
        /**
         * 关闭覆盖层
         */
        close: handleClose,
      } as const;
    },
    [handleClose],
  );

  return [openOverlay, contextHolder];
}

/**
 * 全局覆盖层管理 Hook
 *
 * 与 useOverlay 的区别：
 * - useOverlay: 需要手动渲染 contextHolder
 * - useGlobalOverlay: 自动挂载到 AntdOverlayProvider
 *
 * 实现原理：
 * 1. 内部调用 useOverlay 获取 openOverlay 和 contextHolder
 * 2. 使用 useEffect 将 contextHolder 注册到全局容器
 * 3. 组件卸载时自动从全局容器移除
 *
 * 使用前提：
 * - 必须在组件树的上层包裹 AntdOverlayProvider
 *
 * @template T - 覆盖层组件的属性类型
 *
 * @param OverlayComponent - 覆盖层组件
 * @param options - 配置选项
 *
 * @returns 打开覆盖层的函数（无需再渲染 holder）
 *
 * @example
 * // 1. 先在应用入口包裹 Provider
 * function App() {
 *   return (
 *     <AntdOverlayProvider>
 *       <YourApp />
 *     </AntdOverlayProvider>
 *   );
 * }
 *
 * // 2. 在任意组件中使用
 * function AnyComponent() {
 *   const openOverlay = useGlobalOverlay(MyOverlay);
 *
 *   return (
 *     <button onClick={() => openOverlay({ data: someData })}>
 *       打开全局覆盖层
 *     </button>
 *   );
 * }
 */
export function useGlobalOverlay<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  options?: UseOverlayOptions<T>,
): OverlayOpener<T> {
  // 获取全局容器的注册/注销方法
  const context = useAntdOverlayContext();

  if (!context) {
    throw new Error(
      'useGlobalOverlay must be used within an AntdOverlayProvider. ' +
      'Please wrap your application with <AntdOverlayProvider>.'
    );
  }

  const { addHolder, removeHolder } = context;

  // 使用基础 useOverlay 获取功能
  const [openOverlay, contextHolder] = useOverlay<T>(OverlayComponent, options);

  // 将 contextHolder 注册到全局容器
  useEffect(() => {
    addHolder(contextHolder);
    // 清理函数：组件卸载时从全局容器移除
    return () => removeHolder(contextHolder);
  }, [contextHolder, addHolder, removeHolder]);

  // 仅返回 openOverlay，holder 已自动挂载
  return openOverlay;
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 生成绑定了特定组件的 Hook 工厂函数
 *
 * 当某个覆盖层组件在多处使用时，可以使用此函数生成专用 Hook，
 * 避免每次使用都需要传入组件引用。
 *
 * @template T - 覆盖层组件的属性类型
 *
 * @param OverlayComponent - 覆盖层组件
 * @param defaultOptions - 默认配置选项，会与调用时的选项合并
 *
 * @returns 包含 useOverlay 和 useGlobalOverlay 的对象
 *
 * @example
 * // 创建专用 Hook
 * const {
 *   useOverlay: useMyOverlay,
 *   useGlobalOverlay: useGlobalMyOverlay,
 * } = generateUseOverlayHook(MyOverlayComponent, {
 *   animation: true,
 *   propsAdapter: myAdapter,
 * });
 *
 * // 使用专用 Hook（无需再传组件）
 * function SomeComponent() {
 *   const openOverlay = useGlobalMyOverlay();
 *   return <button onClick={() => openOverlay()}>打开</button>;
 * }
 */
export function generateUseOverlayHook<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  defaultOptions?: UseOverlayOptions<T>,
) {
  return {
    /**
     * 绑定了特定组件的 useOverlay
     * @param options - 配置选项，会与 defaultOptions 合并
     */
    useOverlay: (options?: UseOverlayOptions<T>) =>
      useOverlay(OverlayComponent, { ...defaultOptions, ...options }),

    /**
     * 绑定了特定组件的 useGlobalOverlay
     * @param options - 配置选项，会与 defaultOptions 合并
     */
    useGlobalOverlay: (options?: UseOverlayOptions<T>) =>
      useGlobalOverlay(OverlayComponent, { ...defaultOptions, ...options }),
  };
}
