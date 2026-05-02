import React, { useState } from 'react';
import { Button, Divider, Drawer, Modal, Space, Typography } from 'antd';

import type { CustomDrawerProps, CustomModalProps, CustomOverlayProps } from '../src';
import { usePromiseDrawer, usePromiseModal, usePromiseOverlay } from '../src';

type Mode = 'success' | 'failAsync';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface PromisePayload {
  scene: 'Overlay' | 'Modal' | 'Drawer';
  pickedAt: string;
}

const OverlayPanel: React.FC<
  CustomOverlayProps<PromisePayload> & { title: string; mode: Mode }
> = ({ open, customClose, customOk, title, mode }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={customClose}
    >
      <div
        style={{ width: 360, backgroundColor: '#fff', borderRadius: 8, padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          点击 Confirm 触发 customOk；mode={mode}。点击蒙层或 Cancel 触发关闭。
        </Typography.Paragraph>
        <Space>
          <Button onClick={customClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={() => {
              void customOk?.({ scene: 'Overlay', pickedAt: new Date().toISOString() });
            }}
          >
            Confirm
          </Button>
        </Space>
      </div>
    </div>
  );
};

const ModalPanel: React.FC<
  CustomModalProps<PromisePayload> & { titleText: string; mode: Mode }
> = ({ open, customClose, customOk, titleText, mode, ...rest }) => (
  <Modal
    open={open}
    title={titleText}
    onCancel={customClose}
    onOk={() => customOk?.({ scene: 'Modal', pickedAt: new Date().toISOString() })}
    {...rest}
  >
    <Typography.Paragraph style={{ marginBottom: 0 }}>
      点击 OK 触发 customOk；mode={mode}。点击 Cancel / 蒙层 / esc 触发取消。
    </Typography.Paragraph>
  </Modal>
);

const DrawerPanel: React.FC<
  CustomDrawerProps<PromisePayload> & { titleText: string; mode: Mode }
> = ({ open, customClose, customOk, titleText, mode, ...rest }) => (
  <Drawer open={open} title={titleText} onClose={customClose} {...rest}>
    <Typography.Paragraph>
      点击 Confirm 触发 customOk；mode={mode}。点击 X / 蒙层 触发取消。
    </Typography.Paragraph>
    <Space>
      <Button onClick={customClose}>Cancel</Button>
      <Button
        type="primary"
        onClick={() => {
          void customOk?.({ scene: 'Drawer', pickedAt: new Date().toISOString() });
        }}
      >
        Confirm
      </Button>
    </Space>
  </Drawer>
);

export const PromiseOverlayDemo: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (text: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} ${text}`, ...prev].slice(0, 16));
  };

  const [openPromiseOverlay, overlayHolder] = usePromiseOverlay(OverlayPanel, { animation: false });
  const [openPromiseModal, modalHolder] = usePromiseModal(ModalPanel);
  const [openPromiseDrawer, drawerHolder] = usePromiseDrawer(DrawerPanel);

  const buildCustomOk = (mode: Mode) =>
    mode === 'success'
      ? undefined
      : async () => {
          await wait(800);
          throw new Error('async customOk failed');
        };

  const runOverlay = async (mode: Mode) => {
    addLog(`Overlay open (${mode})`);
    try {
      const v = await openPromiseOverlay({
        title: `Overlay ${mode}`,
        mode,
        customOk: buildCustomOk(mode) as CustomOverlayProps<PromisePayload>['customOk'],
      });
      addLog(`Overlay resolve: ${v ? `value@${v.pickedAt}` : 'undefined (cancel)'}`);
    } catch (err) {
      addLog(`Overlay reject: ${(err as Error).message}`);
    }
  };

  const runModal = async (mode: Mode) => {
    addLog(`Modal open (${mode})`);
    try {
      const v = await openPromiseModal({
        titleText: `Modal ${mode}`,
        mode,
        customOk: buildCustomOk(mode) as CustomModalProps<PromisePayload>['customOk'],
      });
      addLog(`Modal resolve: ${v ? `value@${v.pickedAt}` : 'undefined (cancel)'}`);
    } catch (err) {
      addLog(`Modal reject: ${(err as Error).message}`);
    }
  };

  const runDrawer = async (mode: Mode) => {
    addLog(`Drawer open (${mode})`);
    try {
      const v = await openPromiseDrawer({
        titleText: `Drawer ${mode}`,
        mode,
        customOk: buildCustomOk(mode) as CustomDrawerProps<PromisePayload>['customOk'],
      });
      addLog(`Drawer resolve: ${v ? `value@${v.pickedAt}` : 'undefined (cancel)'}`);
    } catch (err) {
      addLog(`Drawer reject: ${(err as Error).message}`);
    }
  };

  const runReopenPreempt = async () => {
    addLog('Reopen test: open #1 (no await)');
    const p1 = openPromiseModal({ titleText: 'Reopen #1', mode: 'success' });
    p1.then((v) =>
      addLog(`Reopen #1 resolve: ${v ? `value@${v.pickedAt}` : 'undefined (preempted)'}`),
    );
    await wait(300);
    addLog('Reopen test: open #2 (will preempt #1)');
    const v2 = await openPromiseModal({ titleText: 'Reopen #2', mode: 'success' });
    addLog(`Reopen #2 resolve: ${v2 ? `value@${v2.pickedAt}` : 'undefined (cancel)'}`);
  };

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Promise overlay demo（usePromiseOverlay / usePromiseModal / usePromiseDrawer）
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        每行的两个按钮分别触发 success 与 async-fail；await 的解析值会写到下方 logs。
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <Typography.Text strong style={{ width: 80, display: 'inline-block' }}>
            Overlay
          </Typography.Text>
          <Button onClick={() => runOverlay('success')}>await success</Button>
          <Button danger onClick={() => runOverlay('failAsync')}>
            await async fail
          </Button>
        </Space>
        <Space>
          <Typography.Text strong style={{ width: 80, display: 'inline-block' }}>
            Modal
          </Typography.Text>
          <Button onClick={() => runModal('success')}>await success</Button>
          <Button danger onClick={() => runModal('failAsync')}>
            await async fail
          </Button>
        </Space>
        <Space>
          <Typography.Text strong style={{ width: 80, display: 'inline-block' }}>
            Drawer
          </Typography.Text>
          <Button onClick={() => runDrawer('success')}>await success</Button>
          <Button danger onClick={() => runDrawer('failAsync')}>
            await async fail
          </Button>
        </Space>
        <Space>
          <Typography.Text strong style={{ width: 80, display: 'inline-block' }}>
            Reopen
          </Typography.Text>
          <Button onClick={runReopenPreempt}>open Modal twice (preempt #1)</Button>
        </Space>
      </Space>

      <Divider style={{ margin: '16px 0' }} />
      <Typography.Text strong>Logs</Typography.Text>
      <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <Typography.Text type="secondary">No logs yet.</Typography.Text>
        ) : (
          logs.map((item, index) => (
            <div key={`${item}-${index}`} style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {item}
            </div>
          ))
        )}
      </div>

      {overlayHolder}
      {modalHolder}
      {drawerHolder}
    </div>
  );
};

export default PromiseOverlayDemo;
