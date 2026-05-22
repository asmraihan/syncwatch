import { useCallback, useEffect, useRef } from 'react';
import type { ClientMessage, ServerMessage } from '../types';

/**
 * Manages the WebSocket connection to the SyncWatch server.
 *
 * Responsibilities (to be implemented in the sync phase):
 *  - Connect to `/ws`, send the initial `join` message
 *  - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
 *  - Dispatch incoming `ServerMessage`s to the provided handler
 *  - Expose a `send` function for outgoing `ClientMessage`s
 */
export function useWebSocket(
  url: string,
  onMessage: (msg: ServerMessage) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    // TODO(sync phase): open connection + reconnect/backoff logic.
    // const ws = new WebSocket(url);
    // wsRef.current = ws;
    // ws.onmessage = (e) => onMessageRef.current(JSON.parse(e.data));
    // return () => ws.close();
    void url;
  }, [url]);

  return { send };
}
