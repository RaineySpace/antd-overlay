import React, { useState } from 'react';
import { Button, Divider, Drawer, Modal, Space, Typography } from 'antd';

import type { CustomDrawerProps, CustomModalProps, CustomOverlayProps } from '../src';
import { useDrawer, useModal, useOverlay } from '../src';

type VerifyMode = 'asyncSuccess' | 'asyncFail';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const OverlayPanel: React.FC<
  CustomOverlayProps<void> & {
    title: string;
  }
> = ({ open, customClose, customOk, title }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          点击 Confirm 会触发 async customOk。失败时应保持打开。
        </Typography.Paragraph>
        <Space>
          <Button onClick={customClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={() => {
              void customOk?.();
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
  CustomModalProps<void> & {
    title: string;
  }
> = ({ open, customClose, customOk, title, ...rest }) => {
  return (
    <Modal
      open={open}
      title={title}
      onCancel={customClose}
      onOk={() => customOk?.()}
      {...rest}
    >
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        点击 OK 会触发 async customOk。失败时应保持打开。
      </Typography.Paragraph>
    </Modal>
  );
};

const DrawerPanel: React.FC<
  CustomDrawerProps<void> & {
    title: string;
  }
> = ({ open, customClose, customOk, title, ...rest }) => {
  return (
    <Drawer open={open} title={title} onClose={customClose} {...rest}>
      <Typography.Paragraph>点击 Confirm 会触发 async customOk。失败时应保持打开。</Typography.Paragraph>
      <Space>
        <Button onClick={customClose}>Cancel</Button>
        <Button
          type="primary"
          onClick={() => {
            void customOk?.();
          }}
        >
          Confirm
        </Button>
      </Space>
    </Drawer>
  );
};

export const AsyncCustomOkDemo: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (text: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} ${text}`, ...prev].slice(0, 10));
  };

  const createAsyncOk = (scene: 'Overlay' | 'Modal' | 'Drawer', mode: VerifyMode) => async () => {
    addLog(`${scene} customOk start (${mode})`);
    await wait(800);
    if (mode === 'asyncFail') {
      addLog(`${scene} customOk reject (${mode})`);
      throw new Error(`${scene} customOk failed`);
    }
    addLog(`${scene} customOk resolve (${mode})`);
  };

  const [openOverlay, overlayHolder] = useOverlay(OverlayPanel, {
    animation: false,
    title: 'Overlay verify',
  });

  const [openModal, modalHolder] = useModal(ModalPanel, {
    title: 'Modal verify',
    afterClose: () => addLog('Modal closed'),
  });

  const [openDrawer, drawerHolder] = useDrawer(DrawerPanel, {
    title: 'Drawer verify',
    afterOpenChange: (open) => {
      if (!open) addLog('Drawer closed');
    },
  });

  const openByMode = (mode: VerifyMode) => {
    openOverlay({
      title: `Overlay ${mode}`,
      customOk: createAsyncOk('Overlay', mode),
    });
    openModal({
      title: `Modal ${mode}`,
      customOk: createAsyncOk('Modal', mode),
    });
    openDrawer({
      title: `Drawer ${mode}`,
      customOk: createAsyncOk('Drawer', mode),
    });
    addLog(`Opened all (${mode})`);
  };

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Async customOk verify demo
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        用法：点击按钮后会同时打开 Overlay/Modal/Drawer。分别在每个面板里点 Confirm 验证关闭行为。
      </Typography.Paragraph>
      <Space>
        <Button type="primary" onClick={() => openByMode('asyncSuccess')}>
          Open all (async success)
        </Button>
        <Button danger onClick={() => openByMode('asyncFail')}>
          Open all (async fail)
        </Button>
      </Space>
      <Divider style={{ margin: '16px 0' }} />
      <Typography.Text strong>Logs</Typography.Text>
      <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
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

export default AsyncCustomOkDemo;
