import React, { useState } from 'react';

import type { CustomOverlayProps } from '../src';
import { useOverlay } from '../src';

interface SimpleOverlayProps extends CustomOverlayProps<void> {
  message?: string;
}

const SimpleOverlay: React.FC<SimpleOverlayProps> = ({ open, customClose, message }) => {
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
        style={{ padding: 16, backgroundColor: '#fff', minWidth: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 8 }}>{message ?? 'Basic useOverlay Demo'}</div>
        <button type="button" onClick={customClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export const BasicOverlayDemo: React.FC = () => {
  const [count, setCount] = useState(0);
  const [openOverlay, holder] = useOverlay(SimpleOverlay, {
    message: 'Default message from defaultProps',
    animation: false,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCount((c) => c + 1);
          openOverlay({ message: `Clicked ${count + 1} times` });
        }}
      >
        Open Overlay
      </button>
      {holder}
    </>
  );
};

export default BasicOverlayDemo;

