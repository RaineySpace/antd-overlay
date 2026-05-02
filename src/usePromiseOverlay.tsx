/**
 * @file usePromiseOverlay - 命令式 Promise 风格的覆盖层管理 Hook
 * @description
 * 在 useOverlay / useGlobalOverlay 之上叠加 Promise 语义：
 * - opener 返回 `Promise<V | undefined>`
 * - customOk(value) 成功 → resolve(value)（解析值为入参，非 customOk 返回值）
 * - 任意非 OK 关闭路径（customClose / 蒙层 / antd 取消按钮 / 组件卸载 / 再次 open 抢占）→ resolve(undefined)
 * - customOk 抛错 / Promise reject → reject(error)，覆盖层保持打开
 *
 * 实现思路：通过包装 propsAdapter 拦截 customOk 与 customClose；
 * 让内层适配器（默认 / Modal / Drawer）先完成 defaultProps 合并与 wrapCustomOk 的
 * 自动关闭链路，再在外层包一层用于结算 Promise。这样 Provider 上的
 * defaultModalProps.customOk / defaultDrawerProps.customOk 也能被正常消费。
 */

import React, { useEffect, useMemo, useRef } from 'react';

import {
  CustomOverlayProps,
  InternalOverlayProps,
  UseOverlayOptions,
  useGlobalOverlay,
  useOverlay,
  wrapCustomOk,
} from './useOverlay';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 从覆盖层组件 props 推断 customOk 入参类型
 *
 * - 若 `T['customOk']` 为 `(value: V) => any`，则 `V`
 * - 若组件未声明 `customOk`，则 `never`（外层 Promise 实际类型为 `Promise<undefined>`）
 */
export type CustomOkValue<T extends CustomOverlayProps> = T['customOk'] extends
  | ((value: infer V) => unknown)
  | undefined
  ? V
  : never;

/**
 * usePromiseOverlay 系列的 opener 类型
 *
 * 调用 opener 即打开覆盖层并返回 Promise<V | undefined>。
 */
export type PromiseOverlayOpener<T extends CustomOverlayProps, V = CustomOkValue<T>> = (
  initialize?: InternalOverlayProps<T>,
) => Promise<V | undefined>;

/**
 * usePromiseOverlay 的配置选项（与 useOverlay 完全一致）
 */
export type UsePromiseOverlayOptions<T extends CustomOverlayProps> = UseOverlayOptions<T>;

/**
 * @internal propsAdapter 的函数签名
 *
 * 与 UseOverlayOptions<T>['propsAdapter'] 等价，但避免在泛型 T 上做属性查找时
 * TS 把 T 自身可能定义的同名字段视作约束（导致类型不兼容报错）。
 */
type PropsAdapterFn<T extends CustomOverlayProps> = (
  props: InternalOverlayProps<T> | undefined,
  state: { open: boolean; onClose: () => void; onAnimationEnd: () => void },
) => T;

// ============================================================================
// 内部辅助
// ============================================================================

/**
 * @internal 单次 open 的解析器（幂等）
 */
type Settler<V> = {
  resolve: (value: V | undefined) => void;
  reject: (err: unknown) => void;
};

/**
 * @internal 创建幂等 settler：resolve/reject 仅生效一次
 */
const createSettler = <V,>(
  rawResolve: (value: V | undefined) => void,
  rawReject: (err: unknown) => void,
): Settler<V> => {
  let settled = false;
  return {
    resolve: (value) => {
      if (settled) return;
      settled = true;
      rawResolve(value);
    },
    reject: (err) => {
      if (settled) return;
      settled = true;
      rawReject(err);
    },
  };
};

/**
 * @internal 默认 propsAdapter：注入 open/customClose，并用 wrapCustomOk 接通关闭链路，不处理动画
 *
 * 与 useOverlay 内部的 defaultPropsAdapter 行为一致；
 * 这里复制一份是为了避免改动 useOverlay 的导出表面。
 */
const passthroughAdapter = <T extends CustomOverlayProps>(
  props: InternalOverlayProps<T> | undefined,
  state: { open: boolean; onClose: () => void; onAnimationEnd: () => void },
): T => {
  const result = {
    ...props,
    open: state.open,
    customClose: state.onClose,
  } as unknown as T;

  if (result.customOk) {
    result.customOk = wrapCustomOk(result.customOk, state.onClose) as T['customOk'];
  }

  return result;
};

/**
 * @internal 给定底层 propsAdapter，返回拦截 customOk 与 customClose 的新 adapter
 *
 * 顺序：先让 innerAdapter 跑完 —— 它会合并 defaultProps（含 Provider 的
 * defaultModalProps / defaultDrawerProps）与用户 props，并对最终的 customOk
 * 套一层 wrapCustomOk 接通自动关闭链路。然后在外层再包一层用于结算 Promise：
 *
 * 1. customOk(value)：调用内层 wrapped 函数（成功时它会自动 onClose）。
 *    - 同步 / Promise resolve → settleRef.resolve(value)（入参，非 customOk 返回值）。
 *    - 抛错 / Promise reject → settleRef.reject(err) 后透传，覆盖层保持打开。
 *    - 内层全无 customOk（用户与 defaultProps 都未声明）→ 仍 resolve(value) 并主动
 *      触发 state.onClose，与 wrapCustomOk 的关闭语义保持一致。
 * 2. customClose（cancel / 蒙层 / X / esc）→ settleRef.resolve(undefined) 再调内层 customClose。
 *
 * 不拦截 state.onClose：内层 wrapCustomOk 在成功路径会调用 state.onClose，
 * settleRef 已被 OK 路径结算（idempotent），不会被 cancel 分支误触。
 */
const withPromiseAdapter = <T extends CustomOverlayProps>(
  innerAdapter: PropsAdapterFn<T>,
  settleRef: React.RefObject<Settler<CustomOkValue<T>> | null>,
): PropsAdapterFn<T> => {
  return (props, state) => {
    const inner = innerAdapter(props, state);

    const innerCustomOk = inner.customOk as
      | ((value: CustomOkValue<T>) => unknown)
      | undefined;
    const innerCustomClose = inner.customClose;

    return {
      ...inner,
      customOk: ((value: CustomOkValue<T>) => {
        if (innerCustomOk) {
          try {
            const result = innerCustomOk(value);
            if (result instanceof Promise) {
              return result.then(
                (resolved) => {
                  settleRef.current?.resolve(value);
                  return resolved;
                },
                (err) => {
                  settleRef.current?.reject(err);
                  throw err;
                },
              );
            }
            settleRef.current?.resolve(value);
            return result;
          } catch (err) {
            settleRef.current?.reject(err);
            throw err;
          }
        }
        // 内层完全没有 customOk：手动模拟 wrapCustomOk 的关闭行为
        settleRef.current?.resolve(value);
        state.onClose();
        return undefined;
      }) as T['customOk'],
      customClose: () => {
        settleRef.current?.resolve(undefined);
        innerCustomClose();
      },
    };
  };
};

/**
 * @internal 把 OverlayOpener<T> 升级为 PromiseOverlayOpener<T>
 *
 * - 每次调用：先抢占式 resolve(undefined) 前一个未结算 Promise，再创建新 Promise + settler，
 *   最后委托底层 openOverlay 完成实际打开。
 * - 不暴露 controller.update / close（按用户需求纯 Promise）；如需取消，再调 opener 即可。
 */
const makePromiseOpener = <T extends CustomOverlayProps>(
  openOverlay: (initialize?: InternalOverlayProps<T>) => unknown,
  settleRef: React.RefObject<Settler<CustomOkValue<T>> | null>,
): PromiseOverlayOpener<T> => {
  return (initialize) => {
    // 1. 抢占前一个 pending Promise
    settleRef.current?.resolve(undefined);

    // 2. 创建新 Promise 与幂等 settler
    let rawResolve: (value: CustomOkValue<T> | undefined) => void = () => undefined;
    let rawReject: (err: unknown) => void = () => undefined;
    const promise = new Promise<CustomOkValue<T> | undefined>((resolve, reject) => {
      rawResolve = resolve;
      rawReject = reject;
    });
    settleRef.current = createSettler<CustomOkValue<T>>(rawResolve, rawReject);

    // 3. 委托底层打开覆盖层
    openOverlay(initialize);

    return promise;
  };
};

// ============================================================================
// 公共 Hook
// ============================================================================

/**
 * usePromiseOverlay
 *
 * @returns `[openPromise, holder]`
 * @example
 * const [openPromise, holder] = usePromiseOverlay(MyOverlay, {
 *   propsAdapter: (props, state) => ({ ...props, open: state.open, customClose: state.onClose }),
 * });
 * const value = await openPromise({ ...props });
 */
export function usePromiseOverlay<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  options: UsePromiseOverlayOptions<T> = {},
): [PromiseOverlayOpener<T>, React.ReactNode] {
  const settleRef = useRef<Settler<CustomOkValue<T>> | null>(null);

  const { propsAdapter: userAdapter, ...rest } = options;

  const wrappedAdapter = useMemo(
    () =>
      withPromiseAdapter<T>(
        (userAdapter as PropsAdapterFn<T> | undefined) ?? passthroughAdapter,
        settleRef,
      ),
    [userAdapter],
  );

  const [openOverlay, holder] = useOverlay<T>(OverlayComponent, {
    ...rest,
    propsAdapter: wrappedAdapter,
  } as UseOverlayOptions<T>);

  // 卸载兜底：未结算的 Promise 以 undefined resolve，避免 await 悬挂。
  // 此处刻意在 cleanup 时读取 settleRef.current 的最新值（不是 mount 时的快照），
  // 因为我们要结算的是组件卸载时仍 pending 的那一次 open。
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      settleRef.current?.resolve(undefined);
    };
  }, []);

  const openPromise = useMemo(() => makePromiseOpener<T>(openOverlay, settleRef), [openOverlay]);

  return [openPromise, holder];
}

/**
 * useGlobalPromiseOverlay
 *
 * 与 usePromiseOverlay 等价，但 holder 自动挂载到 AntdOverlayProvider。
 * 必须在 AntdOverlayProvider 内部使用。
 */
export function useGlobalPromiseOverlay<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  options: UsePromiseOverlayOptions<T> = {},
): PromiseOverlayOpener<T> {
  const settleRef = useRef<Settler<CustomOkValue<T>> | null>(null);

  const { propsAdapter: userAdapter, ...rest } = options;

  const wrappedAdapter = useMemo(
    () =>
      withPromiseAdapter<T>(
        (userAdapter as PropsAdapterFn<T> | undefined) ?? passthroughAdapter,
        settleRef,
      ),
    [userAdapter],
  );

  // useGlobalOverlay 内部会校验 AntdOverlayProvider，缺失时抛 PROVIDER_REQUIRED。
  const openOverlay = useGlobalOverlay<T>(OverlayComponent, {
    ...rest,
    propsAdapter: wrappedAdapter,
  } as UseOverlayOptions<T>);

  // 卸载兜底，同 usePromiseOverlay：刻意读取 settleRef.current 的最新值。
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      settleRef.current?.resolve(undefined);
    };
  }, []);

  return useMemo(() => makePromiseOpener<T>(openOverlay, settleRef), [openOverlay]);
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 生成绑定特定组件的 Promise 版 Hook 工厂
 *
 * @example
 * export const {
 *   usePromiseOverlay: useMyPromiseOverlay,
 *   useGlobalPromiseOverlay: useGlobalMyPromiseOverlay,
 * } = generateUsePromiseOverlayHook(MyOverlay, { propsAdapter });
 */
export function generateUsePromiseOverlayHook<T extends CustomOverlayProps>(
  OverlayComponent: React.FC<T>,
  defaultOptions?: UsePromiseOverlayOptions<T>,
) {
  return {
    usePromiseOverlay: (options?: UsePromiseOverlayOptions<T>) =>
      usePromiseOverlay(OverlayComponent, {
        ...defaultOptions,
        ...options,
      } as UsePromiseOverlayOptions<T>),
    useGlobalPromiseOverlay: (options?: UsePromiseOverlayOptions<T>) =>
      useGlobalPromiseOverlay(OverlayComponent, {
        ...defaultOptions,
        ...options,
      } as UsePromiseOverlayOptions<T>),
  };
}

