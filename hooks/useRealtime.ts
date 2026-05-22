import { useEffect, useRef } from "react";
import { ensureSocketConnected, NodeType, socket } from "../api/socket";

type BuildingId = string | number;

interface UseRealtimeRoomParams<T> {
  buildingId?: BuildingId | null;
  nodeType: NodeType;
  enabled?: boolean;
  onMessage: (payload: T) => void;
}

export function useRealtimeRoom<T = unknown>({
  buildingId,
  nodeType,
  enabled = true,
  onMessage,
}: UseRealtimeRoomParams<T>) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !buildingId) return;

    ensureSocketConnected();

    const joinPayload = {
      buildingId: String(buildingId),
      nodeType,
    };

    const handleConnect = () => {
      console.log("socket connected:", socket.id);
      socket.emit("join_realtime", joinPayload);
    };

    const handleRealtime = (payload: any) => {
      console.log("realtime-data:", payload);

      if (
        payload?.buildingId &&
        String(payload.buildingId) !== String(buildingId)
      ) {
        return;
      }

      onMessageRef.current(payload);
    };

    if (socket.connected) {
      socket.emit("join_realtime", joinPayload);
    }

    socket.on("connect", handleConnect);
    socket.on("realtime-data", handleRealtime);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("realtime-data", handleRealtime);
      socket.emit("leave_realtime");
    };
  }, [buildingId, nodeType, enabled]);
}