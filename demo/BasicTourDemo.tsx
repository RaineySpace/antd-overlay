import React, { useRef } from 'react';
import { Button, Space, Tour } from 'antd';

import type { CustomTourProps } from '../src';
import { useGlobalTour, useTour } from '../src';

const GuidedTour: React.FC<CustomTourProps> = ({ customClose, customOk, ...props }) => {
  void customClose;
  void customOk;
  return <Tour {...props} />;
};

export const BasicTourDemo: React.FC = () => {
  const localTargetRef = useRef<HTMLButtonElement>(null);
  const globalTargetRef = useRef<HTMLButtonElement>(null);

  const [openTour, holder] = useTour(GuidedTour, {
    mask: true,
    placement: 'bottom',
  });

  const openGlobalTour = useGlobalTour(GuidedTour, {
    mask: true,
    placement: 'bottom',
  });

  return (
    <Space>
      <Button
        ref={localTargetRef}
        onClick={() =>
          openTour({
            steps: [
              {
                title: 'Basic useTour Demo',
                description: 'This Tour is mounted by the local holder.',
                target: () => localTargetRef.current as HTMLButtonElement,
              },
            ],
          })
        }
      >
        Open Local Tour
      </Button>
      <Button
        ref={globalTargetRef}
        onClick={() =>
          openGlobalTour({
            steps: [
              {
                title: 'Basic useGlobalTour Demo',
                description: 'This Tour is mounted by AntdOverlayProvider.',
                target: () => globalTargetRef.current as HTMLButtonElement,
              },
            ],
          })
        }
      >
        Open Global Tour
      </Button>
      {holder}
    </Space>
  );
};

export default BasicTourDemo;
