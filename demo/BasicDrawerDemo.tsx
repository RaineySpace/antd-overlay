import React from 'react';
import { Button, Drawer } from 'antd';

import type { CustomDrawerProps } from '../src';
import { useDrawer } from '../src';

interface InfoDrawerProps extends CustomDrawerProps<void> {
  title?: string;
}

const InfoDrawer: React.FC<InfoDrawerProps> = ({ open, customClose, title }) => {
  return (
    <Drawer open={open} onClose={customClose} title={title ?? 'Basic useDrawer Demo'}>
      <p>This is a basic drawer demo based on useDrawer.</p>
    </Drawer>
  );
};

export const BasicDrawerDemo: React.FC = () => {
  const [openDrawer, holder] = useDrawer(InfoDrawer, {
    title: 'Default Drawer Title',
  });

  return (
    <>
      <Button
        onClick={() =>
          openDrawer({
            title: 'Title from open()',
          })
        }
      >
        Open Drawer
      </Button>
      {holder}
    </>
  );
};

export default BasicDrawerDemo;

