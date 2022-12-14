import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEvent } from 'react-use';
import { Button, List, Radio } from 'antd';
import { CheckCircleTwoTone, LoadingOutlined } from '@ant-design/icons';

import './DeviceLogs.css';

const { ipcRenderer } = window.electron;

const convert = (state?: string) => {
  switch (state) {
    case 'pending':
      return <LoadingOutlined style={{ fontSize: '16px' }} />;
    case 'success':
      return (
        <CheckCircleTwoTone
          twoToneColor="#52c41a"
          style={{ fontSize: '16px' }}
        />
      );
    case 'failed': // TODO
    default:
      return null;
  }
};

const Log = ({
  data,
}: {
  data: {
    step: string;
    state?: 'pending' | 'success' | 'failed';
    payload?: object;
  };
}) => {
  if (data.step === 'Done')
    return (
      <div style={{ flexDirection: 'row' }}>
        <span>Done&nbsp;&nbsp;</span>
        {convert('success')}
      </div>
    );
  if (data.payload) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <span>{data.step}:&nbsp;&nbsp;</span>
          {convert(data.state)}
        </div>
        <span>{JSON.stringify(data.payload)}</span>
      </div>
    );
  }
  if (data.state) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <span>{data.step}:&nbsp;&nbsp;</span>
        <div>{convert(data.state)}</div>
      </div>
    );
  }
  return <span>{data.step}</span>;
};

// TODO add distinct final conclusion
const DeviceLogs: React.FC = () => {
  const [logs, setLogs] = useState<
    {
      step: string;
      state?: 'pending' | 'success' | 'failed';
      payload?: object;
    }[]
  >([]);
  const handleUsbEvent = useCallback(
    (
      step: string,
      state?: 'pending' | 'success' | 'failed',
      payload?: object
    ) => {
      setLogs((prevLogs) => {
        if (prevLogs[prevLogs.length - 1]?.step === step) {
          prevLogs[prevLogs.length - 1] = { step, state, payload };
          return [...prevLogs];
        }
        if (prevLogs[prevLogs.length - 1]?.state === 'pending') {
          prevLogs[prevLogs.length - 1].state = 'success';
        }
        return [...prevLogs, { step, state, payload }];
      });
    },
    []
  );
  useEvent('usb', handleUsbEvent, ipcRenderer);

  const [loginState, setLoginState] = useState(0); // 0: failed; 1: pending; 2: success

  const [isConnected, setConnected] = useState(false);
  const handleConnectEvent = useCallback(
    (connected: boolean) => setConnected(connected),
    []
  );
  useEvent('connected', handleConnectEvent, ipcRenderer);

  useEvent(
    'login',
    useCallback((state: number) => setLoginState(state), []),
    ipcRenderer
  );

  const refs = useRef<HTMLElement[]>([]);
  useEffect(() => refs.current.at(logs.length - 1)?.scrollIntoView(), [logs]);

  return (
    <div id="log">
      <List
        size="small"
        header={
          <div id="header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                className="button"
                type="primary"
                onClick={() => ipcRenderer.sendMessage('login')}
              >
                Login
              </Button>
              &nbsp;
              {
                [
                  null,
                  <LoadingOutlined style={{ fontSize: '16px' }} />,
                  <CheckCircleTwoTone
                    twoToneColor="#52c41a"
                    style={{ fontSize: '16px' }}
                  />,
                ][loginState]
              }
            </div>
            <div>
              <Radio checked={isConnected}>USB Connected</Radio>
              <Button
                className="button"
                type="primary"
                disabled={loginState !== 2 || !isConnected}
                onClick={() => {
                  setLogs([]);
                  ipcRenderer.sendMessage('start');
                }}
              >
                Start
              </Button>
            </div>
          </div>
        }
        dataSource={logs}
        renderItem={(item, index) => {
          return (
            <List.Item
              ref={(elm) => {
                if (elm) {
                  refs.current[index] = elm;
                }
              }}
            >
              <Log data={item} />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

export default DeviceLogs;
