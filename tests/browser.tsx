import React, { act, useLayoutEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer, Modal } from 'antd';

import {
  AntdOverlayProvider,
  useGlobalOverlay,
  useGlobalModal,
  useGlobalDrawer,
  useGlobalTour,
  useGlobalPromiseOverlay,
  useGlobalPromiseModal,
  useGlobalPromiseDrawer,
  useModal,
  useDrawer,
  useTour,
  usePromiseModal,
  usePromiseDrawer,
} from '../src';
import * as publicApi from '../src';
import { AntdOverlayContext, useAntdOverlayContext } from '../src/AntdOverlayContext';
import type {
  AntdOverlayProviderProps,
  CustomOverlayProps,
  InternalOverlayProps,
  OverlayController,
} from '../src';

// 使用真实浏览器 DOM 和 React act，无需另外引入测试运行器。
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface ProbeProps extends CustomOverlayProps<string> {
  owner?: number;
  title?: string;
  zIndex?: number;
  payload?: { first?: number; second?: number };
  afterClose?: () => void;
  afterOpenChange?: (open: boolean) => void;
}

type Result = OverlayController<ProbeProps> | Promise<string | undefined>;
type Opener = (props?: InternalOverlayProps<ProbeProps>) => Result;
interface Subject {
  name: string;
  useSubject: () => readonly [Opener, React.ReactNode];
  animated?: boolean;
  promise?: boolean;
}

let nextInstance = 0;
const probes = new Map<number, { props: ProbeProps; instance: number }>();

function Probe(props: ProbeProps) {
  const [instance] = useState(() => ++nextInstance);
  useLayoutEffect(() => {
    const owner = props.owner ?? 0;
    probes.set(owner, { props, instance });
    return () => {
      probes.delete(owner);
    };
  }, [props, instance]);
  return <span data-overlay={props.owner ?? 0}>{props.title}</span>;
}

const subjects: Subject[] = [
  {
    name: 'useGlobalOverlay',
    useSubject: () => [useGlobalOverlay(Probe, { animation: false }), null],
  },
  { name: 'useGlobalModal', useSubject: () => [useGlobalModal(Probe), null], animated: true },
  { name: 'useGlobalDrawer', useSubject: () => [useGlobalDrawer(Probe), null], animated: true },
  { name: 'useGlobalTour', useSubject: () => [useGlobalTour(Probe), null] },
  {
    name: 'useGlobalPromiseOverlay',
    useSubject: () => [useGlobalPromiseOverlay(Probe, { animation: false }), null],
    promise: true,
  },
  {
    name: 'useGlobalPromiseModal',
    useSubject: () => [useGlobalPromiseModal(Probe), null],
    animated: true,
    promise: true,
  },
  {
    name: 'useGlobalPromiseDrawer',
    useSubject: () => [useGlobalPromiseDrawer(Probe), null],
    animated: true,
    promise: true,
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string) {
  assert(
    Object.is(actual, expected),
    `${message}：预期 ${String(expected)}，实际 ${String(actual)}`,
  );
}

function probe(owner = 0) {
  const result = probes.get(owner);
  assert(result, `覆盖层 ${owner} 应已挂载`);
  return result;
}

async function finishAnimation(owner = 0) {
  const props = probe(owner).props;
  await act(() => {
    if (props.afterClose) props.afterClose();
    else props.afterOpenChange?.(false);
  });
}

async function fixture(subject: Subject, count = 1, strict = false) {
  const host = document.createElement('div');
  document.getElementById('fixtures')!.append(host);
  const root = createRoot(host);
  const renders = Array<number>(count).fill(0);
  const openers: Opener[] = [];
  const holderCounts: number[] = [];
  const holders = new Set<React.ReactNode>();
  let contextValue: ReturnType<typeof useAntdOverlayContext>;
  const { useSubject } = subject;

  function Row({ index }: { index: number }) {
    renders[index]++;
    const [open, holder] = useSubject();
    openers[index] = open;
    return (
      <div data-row={index}>
        {index}
        {holder}
      </div>
    );
  }

  // 仅在测试内包装内部注册方法，所有调用仍委托真实 Provider。
  // 不给生产 API 添加统计字段，也不依赖 React Fiber 等私有实现。
  function RegistrationObserver({ children }: { children: React.ReactNode }) {
    const context = useAntdOverlayContext();
    assert(context, '内部 Context 应可用');
    const observed = useMemo(
      () => ({
        ...context,
        addHolder(holder: React.ReactNode) {
          assert(!holders.has(holder), '同一 holder 不应重复注册');
          holders.add(holder);
          holderCounts.push(holders.size);
          context.addHolder(holder);
        },
        removeHolder(holder: React.ReactNode) {
          assert(holders.delete(holder), '只能注销已注册的 holder');
          holderCounts.push(holders.size);
          context.removeHolder(holder);
        },
      }),
      [context],
    );
    contextValue = observed;
    return <AntdOverlayContext.Provider value={observed}>{children}</AntdOverlayContext.Provider>;
  }

  // 保持 children 元素引用稳定，以区分 Provider 自身更新与父组件传入新 children。
  const rows = Array.from({ length: count }, (_, index) => <Row key={index} index={index} />);
  async function render(omit = -1, defaults: Omit<AntdOverlayProviderProps, 'children'> = {}) {
    const content = (
      <AntdOverlayProvider {...defaults}>
        <RegistrationObserver>{rows.filter((_, index) => index !== omit)}</RegistrationObserver>
      </AntdOverlayProvider>
    );
    await act(() => {
      root.render(strict ? <React.StrictMode>{content}</React.StrictMode> : content);
    });
  }

  await render();
  return {
    renders,
    openers,
    holderCounts,
    holders,
    render,
    context() {
      assert(contextValue, '内部 Context 应可用');
      return contextValue;
    },
    async open(props: InternalOverlayProps<ProbeProps> = {}, index = 0) {
      let result: Result | undefined;
      await act(() => {
        result = openers[index]({ owner: index, ...props });
      });
      assert(result, 'opener 应返回控制器或 Promise');
      // 包一层对象，避免 async 函数提前等待未结算的 Promise。
      return { result };
    },
    async close(index = 0) {
      await act(() => {
        probe(index).props.customClose();
      });
      if (subject.animated) await finishAnimation(index);
    },
    async dispose() {
      await act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

async function checkList(subject: Subject, count: number, strict: boolean) {
  const f = await fixture(subject, count, strict);
  try {
    const idleHolders = f.holders.size;
    equal(idleHolders, 0, '未打开时 holder 数量');
    equal(f.holderCounts.length, 0, '未打开时不应调用注册或注销方法');
    equal(probes.size, 0, '未打开时覆盖层组件数量');
    const baseline = [...f.renders];
    const opener = f.openers[0];
    const { result } = await f.open({ title: '初始', payload: { first: 1, second: 2 } });
    const openHolders = f.holders.size;
    equal(openHolders, 1, '打开后 holder 数量');
    const instance = probe().instance;
    if (!(result instanceof Promise)) {
      await act(() => {
        result.update({ title: '更新', payload: { second: 3 } });
      });
      equal(probe().props.title, '更新', 'controller.update 生效');
      equal(probe().props.payload?.first, undefined, 'update 继续使用浅合并');
      equal(probe().instance, instance, 'update 不应重新挂载覆盖层');
    }
    await act(() => {
      probe().props.customClose();
    });
    if (result instanceof Promise) equal(await result, undefined, '取消时 Promise 结算');
    if (subject.animated) {
      equal(f.holders.size, 1, '关闭动画期间保留 holder');
      equal(probe().props.open, false, '关闭动画期间 open=false');
      equal(probe().instance, instance, '关闭动画期间不重新挂载');
      if (probe().props.afterOpenChange) {
        await act(() => {
          probe().props.afterOpenChange?.(true);
        });
        equal(f.holders.size, 1, 'Drawer 打开动画回调不能移除 holder');
      }
      await finishAnimation();
    }
    const closedHolders = f.holders.size;
    equal(closedHolders, 0, '关闭结束后移除 holder');
    equal(probes.size, 0, '关闭结束后卸载组件');
    equal(f.openers[0], opener, 'opener 引用稳定');
    const otherRenders = f.renders
      .slice(1)
      .reduce((sum, value, index) => sum + value - baseline[index + 1], 0);
    equal(otherRenders, 0, '其他 Item 的额外渲染次数');

    await f.open();
    await f.open({}, 1);
    equal(f.holders.size, 2, '不同 Item 的实例互相独立');
    await f.render(0);
    equal(f.holders.size, 1, 'Item 卸载只清理自己的 holder');
    await f.close(1);
    equal(f.holders.size, 0, '剩余实例正常关闭');
    return { rows: count, strict, idleHolders, openHolders, closedHolders, otherRenders };
  } finally {
    await f.dispose();
  }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function checkPromise(subject: Subject) {
  const f = await fixture(subject);
  async function open(customOk?: ProbeProps['customOk']) {
    const { result } = await f.open({ customOk });
    assert(result instanceof Promise, 'Promise opener 返回 Promise');
    return { promise: result };
  }
  async function finishClose() {
    if (subject.animated) {
      equal(f.holders.size, 1, 'Promise 已结算时关闭动画仍保留 holder');
      await finishAnimation();
    }
    equal(f.holders.size, 0, '完成关闭后 holder 清零');
  }
  try {
    const returnsDifferentValue: () => void = () => '返回值不作为结果';
    for (const customOk of [undefined, returnsDifferentValue]) {
      const { promise } = await open(customOk);
      await act(() => {
        probe().props.customOk?.('用户入参');
      });
      equal(await promise, '用户入参', 'Promise 解析为 customOk 入参');
      await finishClose();
    }

    const pending = deferred();
    const asyncOk = await open(() => pending.promise);
    let okResult: void | Promise<void> = undefined;
    let settled = false;
    void asyncOk.promise.then(() => {
      settled = true;
    });
    await act(() => {
      okResult = probe().props.customOk?.('异步入参');
    });
    equal(settled, false, '异步 customOk 完成前不结算');
    equal(probe().props.open, true, '异步 customOk 完成前保持打开');
    await act(async () => {
      pending.resolve();
      await okResult;
    });
    equal(await asyncOk.promise, '异步入参', '异步成功解析为入参');
    await finishClose();

    for (const asynchronous of [false, true]) {
      const error = new Error('预期错误');
      const failed = await open(() => {
        if (asynchronous) return Promise.reject(error);
        throw error;
      });
      const caught = failed.promise.catch((reason: unknown) => reason);
      let forwarded: unknown;
      await act(async () => {
        try {
          await probe().props.customOk?.('失败入参');
        } catch (reason) {
          forwarded = reason;
        }
      });
      equal(await caught, error, '外层 Promise 透传同一错误');
      equal(forwarded, error, 'customOk 透传同一错误');
      equal(probe().props.open, true, '失败后保持打开');
      equal(f.holders.size, 1, '失败后保留 holder');
      await f.close();
    }

    const first = await open();
    const second = await open();
    equal(await first.promise, undefined, '重复打开抢占前一个 Promise');
    equal(f.holders.size, 1, '重复打开不重复注册');
    const callbacks = probe().props;
    await act(() => {
      callbacks.customOk?.('第二次');
      callbacks.customClose();
    });
    equal(await second.promise, '第二次', '同一 Promise 仅结算一次');
    await finishClose();

    const unmounted = await open();
    await f.render(0);
    equal(await unmounted.promise, undefined, '调用方卸载结算 undefined');
    equal(f.holders.size, 0, '卸载清理 holder');
  } finally {
    await f.dispose();
  }
}

async function checkContext(subject: Subject) {
  const f = await fixture(subject);
  try {
    const original = f.context();
    const baseline = f.renders[0];
    const manual = <span key="manual">内部注册观察</span>;
    await act(() => {
      original.addHolder(manual);
    });
    equal(f.holders.has(manual), true, '内部 addHolder 已执行');
    equal(f.renders[0], baseline, '其他 holder 更新不影响内部 Hook');
    await act(() => {
      original.removeHolder(manual);
    });
    equal(f.holders.size, 0, '内部 removeHolder 已执行');
    equal(f.context().addHolder, original.addHolder, 'addHolder 引用稳定');
    equal(f.context().removeHolder, original.removeHolder, 'removeHolder 引用稳定');
    await f.render(-1, {
      defaultModalProps: { zIndex: 2001 },
      defaultDrawerProps: { zIndex: 2002 },
      defaultTourProps: { zIndex: 2003 },
    });
    await f.open();
    const expected = subject.name.includes('Modal')
      ? 2001
      : subject.name.includes('Drawer')
        ? 2002
        : 2003;
    equal(probe().props.zIndex, expected, '默认配置变化仍传递给覆盖层');
    await f.render(-1, {
      defaultModalProps: { zIndex: 3001 },
      defaultDrawerProps: { zIndex: 3002 },
      defaultTourProps: { zIndex: 3003 },
    });
    equal(probe().props.zIndex, expected + 1000, '已打开覆盖层接收最新默认配置');
    await f.close();
  } finally {
    await f.dispose();
  }
}

function AnimatedModal(props: ProbeProps) {
  return (
    <>
      <Probe {...props} />
      <Modal
        open={props.open}
        onCancel={props.customClose}
        afterClose={props.afterClose}
        afterOpenChange={props.afterOpenChange}
      >
        真实 Modal 动画回归
      </Modal>
    </>
  );
}

function AnimatedDrawer(props: ProbeProps) {
  return (
    <>
      <Probe {...props} />
      <Drawer open={props.open} onClose={props.customClose} afterOpenChange={props.afterOpenChange}>
        真实 Drawer 动画回归
      </Drawer>
    </>
  );
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
  assert(check(), '等待真实动画回调超时');
}

async function checkAnimation(subject: Subject) {
  const f = await fixture(subject);
  try {
    let opened = false;
    let closed = false;
    const { result } = await f.open({
      afterOpenChange: (open) => {
        if (open) opened = true;
        else closed = true;
      },
      afterClose: () => {
        closed = true;
      },
    });
    await until(() => opened);
    await act(() => {
      probe().props.customClose();
    });
    if (result instanceof Promise) equal(await result, undefined, '真实弹窗取消时立即结算 Promise');
    equal(closed, false, '关闭决策时 CSS 动画尚未结束');
    equal(f.holders.size, 1, '真实 CSS 动画期间保留 holder');
    await until(() => f.holders.size === 0);
    equal(closed, true, '真实动画回调已经执行');
    equal(probes.size, 0, '真实动画结束后卸载覆盖层');
  } finally {
    await f.dispose();
  }
}

const output = document.getElementById('results')!;
const results: { name: string; passed: boolean; details?: unknown; error?: string }[] = [];
async function run(name: string, check: () => Promise<unknown>) {
  try {
    results.push({ name, passed: true, details: await check() });
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.stack : String(error),
    });
  }
  output.textContent = JSON.stringify(results, null, 2);
}

await run('公开 API 不暴露内部 Context', async () => {
  for (const name of ['useAntdOverlayContext', 'AntdOverlayContext']) {
    equal(name in publicApi, false, `${name} 不应出现在包入口`);
  }
});

for (const subject of subjects) {
  await run(`${subject.name}：10,000 个 Item`, () => checkList(subject, 10_000, false));
  await run(`${subject.name}：StrictMode`, () => checkList(subject, 3, true));
  if (subject.promise) await run(`${subject.name}：Promise 语义`, () => checkPromise(subject));
  if (!subject.name.endsWith('Overlay'))
    await run(`${subject.name}：Context 隔离和默认配置`, () => checkContext(subject));
}
for (const subject of [
  { name: 'useModal', useSubject: () => useModal(Probe), animated: true },
  { name: 'useDrawer', useSubject: () => useDrawer(Probe), animated: true },
  { name: 'useTour', useSubject: () => useTour(Probe) },
  { name: 'usePromiseModal', useSubject: () => usePromiseModal(Probe), animated: true },
  { name: 'usePromiseDrawer', useSubject: () => usePromiseDrawer(Probe), animated: true },
]) {
  await run(`${subject.name}：局部 Hook 的 Context 隔离`, () => checkContext(subject));
}
for (const subject of [
  { name: 'useGlobalModal', useSubject: () => [useGlobalModal(AnimatedModal), null] as const },
  { name: 'useGlobalDrawer', useSubject: () => [useGlobalDrawer(AnimatedDrawer), null] as const },
  {
    name: 'useGlobalPromiseModal',
    useSubject: () => [useGlobalPromiseModal(AnimatedModal), null] as const,
  },
  {
    name: 'useGlobalPromiseDrawer',
    useSubject: () => [useGlobalPromiseDrawer(AnimatedDrawer), null] as const,
  },
]) {
  await run(`${subject.name}：真实 Ant Design 关闭动画`, () => checkAnimation(subject));
}
output.dataset.status = results.every((result) => result.passed) ? 'passed' : 'failed';
