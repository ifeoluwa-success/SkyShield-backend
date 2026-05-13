import { useEffect, useRef, useState, useCallback } from 'react';
import type { IncidentEvent, MissionPhase, MissionState } from '../types/incident';

interface UseMissionSocketOptions {
  runId: string;
  token: string;
  onPhaseChange?: (phase: MissionPhase) => void;
  onEscalation?: (event: IncidentEvent) => void;
  onTimeout?: () => void;
  onMissionComplete?: (score: number, passed: boolean) => void;
}

interface UseMissionSocketReturn {
  missionState: MissionState | null;
  isConnected: boolean;
  lastEvent: IncidentEvent | null;
  timerWarning: boolean;
  sendMessage: (type: string, data: Record<string, unknown>) => void;
  disconnect: () => void;
}

type MissionSocketMessage =
  | { type: 'state_snapshot'; data: MissionState }
  | { type: 'state_update'; data: MissionState }
  | { type: 'mission_event'; event: IncidentEvent }
  | { type: 'timer_warning' }
  | { type: string; [key: string]: unknown };

export const useMissionSocket = (options: UseMissionSocketOptions): UseMissionSocketReturn => {
  const { runId, token, onEscalation, onMissionComplete, onPhaseChange, onTimeout } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const timerWarningTimeoutRef = useRef<number | null>(null);

  const [missionState, setMissionState] = useState<MissionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<IncidentEvent | null>(null);
  const [timerWarning, setTimerWarning] = useState(false);

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const clearTimerWarningTimer = () => {
    if (timerWarningTimeoutRef.current) {
      window.clearTimeout(timerWarningTimeoutRef.current);
      timerWarningTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    clearTimerWarningTimer();
    reconnectAttemptsRef.current = 0;

    if (wsRef.current) {
      try {
        wsRef.current.close(1000);
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!runId || !token) return;

    clearReconnectTimer();

    const wsUrl = `wss://skyshield-backend.onrender.com/ws/mission/${encodeURIComponent(
      runId,
    )}/?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      try {
        ws.send(JSON.stringify({ type: 'get_state' }));
      } catch {
        // ignore
      }
    };

    ws.onmessage = evt => {
      let msg: MissionSocketMessage | null = null;
      try {
        msg = JSON.parse(evt.data as string) as MissionSocketMessage;
      } catch {
        return;
      }

      if (msg.type === 'state_snapshot' || msg.type === 'state_update') {
        if ('data' in msg) setMissionState(msg.data);
        return;
      }

      if (msg.type === 'mission_event') {
        if (!('event' in msg)) return;
        const event = msg.event;
        setLastEvent(event);

        if (event.event_type === 'phase_changed') {
          const to = (event.payload?.to as MissionPhase | undefined) ?? undefined;
          if (to) onPhaseChange?.(to);
          if (to === 'review') {
            const score = typeof event.payload?.score === 'number' ? event.payload.score : 0;
            const passed = typeof event.payload?.passed === 'boolean' ? event.payload.passed : false;
            onMissionComplete?.(score, passed);
          }
        } else if (event.event_type === 'escalation_triggered') {
          onEscalation?.(event);
        } else if (event.event_type === 'timeout_occurred') {
          onTimeout?.();
        }
        return;
      }

      if (msg.type === 'timer_warning') {
        setTimerWarning(true);
        clearTimerWarningTimer();
        timerWarningTimeoutRef.current = window.setTimeout(() => {
          setTimerWarning(false);
        }, 3000);
      }
    };

    ws.onclose = evt => {
      setIsConnected(false);

      // reconnect if unexpected close
      if (evt.code !== 1000 && reconnectAttemptsRef.current < 3) {
        const next = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = next;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectRef.current?.();
        }, 2000);
      }
    };

    ws.onerror = () => {
      // allow onclose to handle reconnect
    };
  }, [runId, token, onEscalation, onMissionComplete, onPhaseChange, onTimeout]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type, ...data }));
  }, []);

  return { missionState, isConnected, lastEvent, timerWarning, sendMessage, disconnect };
};

