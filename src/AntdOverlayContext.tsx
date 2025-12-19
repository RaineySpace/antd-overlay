/**
 * @file AntdOverlayContext - 全局覆盖层容器 Context
 * @description
 * 提供全局覆盖层的挂载点管理。所有通过 useGlobalOverlay 系列 Hook
 * 创建的覆盖层都会被挂载到 AntdOverlayProvider 下。
 *
 * 工作原理：
 * 1. AntdOverlayProvider 维护一个 holders 数组
 * 2. useGlobalOverlay 通过 useAntdOverlayContext 获取注册方法
 * 3. 覆盖层的 contextHolder 被添加到 holders 数组
 * 4. Provider 在子节点之后统一渲染所有 holders
 *
 * 这种设计的优势：
 * - 覆盖层与业务组件解耦，可在任意位置调用
 * - 统一的挂载点，避免 z-index 混乱
 * - 组件卸载时自动清理对应的覆盖层
 *
 * @example
 * // 在应用入口包裹 Provider
 * function App() {
 *   return (
 *     <AntdOverlayProvider>
 *       <Router>
 *         <Routes />
 *       </Router>
 *     </AntdOverlayProvider>
 *   );
 * }
 */

import { DrawerProps, ModalProps } from 'antd';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

export type DefaultModalProps = Partial<ModalProps>;
export type DefaultDrawerProps = Partial<DrawerProps>;

/**
 * AntdOverlay Context 的值类型
 *
 * @property holders - 当前所有已注册的覆盖层 holder 节点
 * @property addHolder - 注册一个新的 holder 到全局容器
 * @property removeHolder - 从全局容器移除一个已注册的 holder
 */
interface AntdOverlayContextValue {
  /** 所有已注册的 holder 节点列表 */
  holders: React.ReactNode[];
  /** 添加 holder 到全局容器 */
  addHolder: (holder: React.ReactNode) => void;
  /** 从全局容器移除 holder */
  removeHolder: (holder: React.ReactNode) => void;
  /** 默认 Modal 属性 */
  defaultModalProps?: DefaultModalProps;
  /** 默认 Drawer 属性 */
  defaultDrawerProps?: DefaultDrawerProps;
}

// ============================================================================
// Context 定义
// ============================================================================

/**
 * AntdOverlay Context
 *
 * 默认值为 null，使用时必须在 AntdOverlayProvider 内部。
 * 如果在 Provider 外部调用 useAntdOverlayContext，会抛出明确的错误提示。
 */
const AntdOverlayContext = createContext<AntdOverlayContextValue | null>(null);

// ============================================================================
// Provider 组件
// ============================================================================

/**
 * AntdOverlay 容器提供者组件
 *
 * 用于管理全局覆盖层的挂载点。所有通过 useGlobalOverlay、useGlobalModal、
 * useGlobalDrawer 等 Hook 创建的覆盖层都会被挂载到这个 Provider 下。
 *
 * 渲染结构：
 * ```
 * <AntdOverlayContext.Provider>
 *   {children}           <- 应用的主要内容
 *   {holders[0]}         <- 全局覆盖层 1
 *   {holders[1]}         <- 全局覆盖层 2
 *   ...
 * </AntdOverlayContext.Provider>
 * ```
 *
 * @param children - 子节点，通常是整个应用
 *
 * @example
 * // 基础用法 - 在应用入口包裹
 * function App() {
 *   return (
 *     <AntdOverlayProvider>
 *       <Router>
 *         <Routes />
 *       </Router>
 *     </AntdOverlayProvider>
 *   );
 * }
 *
 * @example
 * // 与其他 Provider 配合使用
 * function App() {
 *   return (
 *     <ConfigProvider>
 *       <AntdOverlayProvider>
 *         <App />
 *       </AntdOverlayProvider>
 *     </ConfigProvider>
 *   );
 * }
 */
export interface AntdOverlayProviderProps {
  /** 子节点 */
  children: React.ReactNode;
  /** 默认 Modal 属性 */
  defaultModalProps?: DefaultModalProps;
  /** 默认 Drawer 属性 */
  defaultDrawerProps?: DefaultDrawerProps;
}


/**
 * AntdOverlayProvider 组件
 * @param children - 子节点
 * @param defaultModalProps - 默认 Modal 属性
 * @param defaultDrawerProps - 默认 Drawer 属性
 * @returns React.ReactNode
 */
export function AntdOverlayProvider({
  children,
  defaultModalProps,
  defaultDrawerProps,
}: AntdOverlayProviderProps) {
  // 存储所有已注册的 holder 节点
  const [holders, setHolders] = useState<React.ReactNode[]>([]);

  /**
   * 添加 holder 到全局容器
   *
   * 使用函数式更新确保并发安全，避免闭包陷阱。
   * 新的 holder 会被追加到数组末尾，因此后添加的覆盖层会显示在上层。
   */
  const addHolder = useCallback((holder: React.ReactNode) => {
    setHolders((prev) => [...prev, holder]);
  }, []);

  /**
   * 从全局容器移除 holder
   *
   * 通过引用比较（===）找到并移除对应的 holder。
   * 这要求每次传入的 holder 必须是同一个引用。
   */
  const removeHolder = useCallback((holder: React.ReactNode) => {
    setHolders((prev) => prev.filter((h) => h !== holder));
  }, []);

  // 使用 useMemo 优化 Context 值，避免不必要的重渲染
  // 只有当 holders、addHolder 或 removeHolder 变化时才会创建新的值对象
  const value = useMemo(
    () => ({ holders, addHolder, removeHolder, defaultModalProps, defaultDrawerProps }),
    [holders, addHolder, removeHolder, defaultModalProps, defaultDrawerProps],
  );

  return (
    <AntdOverlayContext.Provider value={value}>
      {children}
      {/* 在 children 之后渲染所有全局覆盖层 */}
      {holders}
    </AntdOverlayContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 获取 AntdOverlay Context 的 Hook
 *
 * 返回全局容器的注册和注销方法，供 useGlobalOverlay 系列 Hook 内部使用。
 *
 * 注意事项：
 * - 必须在 AntdOverlayProvider 内部使用
 * - 如果在 Provider 外部调用，会抛出明确的错误
 * - 主要供库内部使用，一般不需要在业务代码中直接调用
 *
 * @returns AntdOverlayContextValue 包含 holders、addHolder、removeHolder
 * @throws Error 如果不在 AntdOverlayProvider 内部使用
 *
 * @example
 * // 库内部使用示例（useGlobalOverlay 的实现）
 * function useGlobalOverlay(Component, options) {
 *   const context = useAntdOverlayContext();
 *   if (!context) {
 *     throw new Error('useGlobalOverlay must be used within an AntdOverlayProvider. Please wrap your application with <AntdOverlayProvider>.');
 *   }
 *   const { addHolder, removeHolder } = context;
 *   const [open, holder] = useOverlay(Component, options);
 *
 *   useEffect(() => {
 *     addHolder(holder);
 *     return () => removeHolder(holder);
 *   }, [holder]);
 *
 *   return open;
 * }
 */
export function useAntdOverlayContext() {
  return useContext(AntdOverlayContext);
}
