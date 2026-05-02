import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Space, Typography } from 'antd';

import { BasicModalDemo } from './BasicModalDemo';
import { BasicDrawerDemo } from './BasicDrawerDemo';
import { BasicOverlayDemo } from './BasicOverlayDemo';
import { AsyncCustomOkDemo } from './AsyncCustomOkDemo';
import { PromiseOverlayDemo } from './PromiseOverlayDemo';

import { AntdOverlayProvider } from '../src';

const App: React.FC = () => {
  return (
    <ConfigProvider>
      <AntdOverlayProvider>
        <div style={{ padding: 24 }}>
          <Typography.Title level={3}>antd-overlay demos</Typography.Title>
          <Space vertical size="large">
            <BasicModalDemo />
            <BasicDrawerDemo />
            <BasicOverlayDemo />
            <AsyncCustomOkDemo />
            <PromiseOverlayDemo />
          </Space>
        </div>
      </AntdOverlayProvider>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
