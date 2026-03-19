import React, { useState } from 'react';
import { Button, Input, Modal, Space } from 'antd';

import type { CustomModalProps } from '../src';
import { useModal, useGlobalModal } from '../src';

interface ConfirmModalProps extends CustomModalProps<{ value: string }> {
  placeholder?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  customClose,
  customOk,
  placeholder,
  ...props
}) => {
  const [value, setValue] = useState('');

  return (
    <Modal
      open={open}
      title="Basic useModal Demo"
      onCancel={customClose}
      onOk={() => customOk?.({ value })}
      {...props}
    >
      <Input
        placeholder={placeholder ?? 'input something'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  );
};

export const BasicModalDemo: React.FC = () => {
  const [result, setResult] = useState<string | null>(null);

  const [openModal, holder] = useModal(ConfirmModal, {
    title: 'Title',
    customOk: ({ value }) => {
      setResult(value);
    },
  });

  const openGlobalModal = useGlobalModal(ConfirmModal, {
    title: 'Global Title',
    customOk: ({ value }) => {
      setResult(value);
    },
  });

  return (
    <Space>
      <Button
        onClick={() =>
          openModal({
            placeholder: 'This placeholder comes from open()',
          })
        }
      >
        Open Local Modal
      </Button>
      <Button
        onClick={() =>
          openGlobalModal({
            placeholder: 'This placeholder comes from open()',
          })
        }
      >
        Open Global Modal
      </Button>
      {holder}
      {result && <div style={{ marginTop: 8 }}>Result: {result}</div>}
    </Space>
  );
};

export default BasicModalDemo;

