import { createContext, useContext } from 'react';
import type { ClientMessage } from '../types';

interface WebSocketContextValue {
  send: (msg: ClientMessage) => void;
  /** Most recent measured one-way latency in ms (RTT/2). */
  latencyMs: number;
}

const noop = () => {};

export const WebSocketContext = createContext<WebSocketContextValue>({
  send: noop,
  latencyMs: 0,
});

export function useWebSocketSend() {
  return useContext(WebSocketContext);
}
