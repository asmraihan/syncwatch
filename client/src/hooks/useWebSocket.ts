import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '../types';

interface UseWebSocketOptions {
  /** Sent immediately after every (re)connect. */
  joinMessage: ClientMessage;
  /** Called for every parsed server message (and synthetic open/close). */
  onMessage: (msg: ServerMessage) => void;
  /** Called when the connection state changes. */
  onStatusChange?: (status: ConnectionStatus) => void;
}

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

const PING_INTERVAL_MS = 5000;
const RTT_SAMPLE_COUNT = 5;

/** WebSocket URL derived from the current location. Works in dev (Vite proxy) and prod. */
function defaultWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export function useWebSocket({
  joinMessage,
  onMessage,
  onStatusChange,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const rttSamplesRef = useRef<number[]>([]);

  // Keep stable refs so reconnect/dispatch never re-trigger the effect.
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const joinMessageRef = useRef(joinMessage);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;
  joinMessageRef.current = joinMessage;

  const [latencyMs, setLatencyMs] = useState(0);

  const setStatus = useCallback((status: ConnectionStatus) => {
    onStatusChangeRef.current?.(status);
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const sendPing = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'ping', clientTime: Date.now() }));
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');
      const url = defaultWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus('connected');
        // Re-join on every (re)connect so server state is restored.
        ws.send(JSON.stringify(joinMessageRef.current));
        // Start periodic latency probes.
        if (pingTimerRef.current !== null) {
          window.clearInterval(pingTimerRef.current);
        }
        pingTimerRef.current = window.setInterval(sendPing, PING_INTERVAL_MS);
        sendPing();
      };

      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type === 'pong') {
          const rtt = Date.now() - msg.clientTime;
          const samples = rttSamplesRef.current;
          samples.push(rtt);
          if (samples.length > RTT_SAMPLE_COUNT) samples.shift();
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          setLatencyMs(avg / 2);
          return;
        }
        onMessageRef.current(msg);
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        if (pingTimerRef.current !== null) {
          window.clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        if (disposed) return;
        setStatus('reconnecting');
        // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s.
        const delay = Math.min(
          1000 * 2 ** reconnectAttemptsRef.current,
          30_000,
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (pingTimerRef.current !== null) {
        window.clearInterval(pingTimerRef.current);
      }
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [sendPing, setStatus]);

  return { send, latencyMs };
}
