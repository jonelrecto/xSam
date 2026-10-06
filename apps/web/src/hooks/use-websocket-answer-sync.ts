import { useEffect, useRef, useState, useCallback } from "react";
import { localDb, type LocalAnswer } from "../lib/exam/local-db";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface UseWebSocketAnswerSyncProps {
  sessionId: string;
  initialAnswers?: { questionId: string; answerText: string; clientTs?: number }[];
}

export function useWebSocketAnswerSync({
  sessionId,
  initialAnswers = [],
}: UseWebSocketAnswerSyncProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    for (const a of initialAnswers) {
      initialMap[a.questionId] = a.answerText;
    }
    return initialMap;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // 1. Establish WebSocket Connection
  useEffect(() => {
    isMountedRef.current = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    function connectWs() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/exam/${sessionId}`;

      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isMountedRef.current) {
          setSyncStatus("synced");
        }
        // Flush any offline answers on reconnect
        flushSync();
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "SYNC_ACK") {
            if (localDb) {
              const unsynced = await localDb.answers
                .where("sessionId")
                .equals(sessionId)
                .and((item: LocalAnswer) => item.synced === 0)
                .toArray();

              const ids = unsynced.map((u) => u.id).filter(Boolean) as number[];
              if (ids.length > 0) {
                await localDb.answers.where("id").anyOf(ids).modify({ synced: 1 });
              }

              const remaining = await localDb.answers
                .where("sessionId")
                .equals(sessionId)
                .and((item: LocalAnswer) => item.synced === 0)
                .count();

              if (isMountedRef.current) {
                setPendingCount(remaining);
                setSyncStatus(remaining > 0 ? "syncing" : "synced");
                setLastSyncedAt(new Date());
              }
            }
          }
        } catch (err) {
          console.warn("WebSocket message parse error:", err);
        }
      };

      ws.onerror = () => {
        if (isMountedRef.current) {
          setSyncStatus(navigator.onLine ? "error" : "offline");
        }
      };

      ws.onclose = () => {
        if (isMountedRef.current) {
          setSyncStatus(navigator.onLine ? "error" : "offline");
          // Attempt reconnection after 3 seconds
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      };
    }

    connectWs();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [sessionId]);

  // 2. Initialize Dexie DB with initial answers
  useEffect(() => {
    if (!localDb) return;
    let isSubscribed = true;

    async function initStore() {
      try {
        const cached = await localDb!.answers
          .where("sessionId")
          .equals(sessionId)
          .toArray();

        if (!isSubscribed) return;

        if (cached.length === 0 && initialAnswers.length > 0) {
          const toPut: LocalAnswer[] = initialAnswers.map((a) => ({
            sessionId,
            questionId: a.questionId,
            answerText: a.answerText,
            clientTs: a.clientTs || Date.now(),
            synced: 1,
          }));
          await localDb!.answers.bulkPut(toPut);
        } else if (cached.length > 0) {
          const localMap: Record<string, string> = {};
          let unsynced = 0;
          for (const item of cached) {
            localMap[item.questionId] = item.answerText;
            if (item.synced === 0) unsynced++;
          }
          setAnswers((prev) => ({ ...prev, ...localMap }));
          setPendingCount(unsynced);
        }
      } catch (err) {
        console.error("Dexie store initialization error:", err);
      }
    }

    initStore();
    return () => {
      isSubscribed = false;
    };
  }, [sessionId, initialAnswers]);

  // 3. Core Flush Sync Function
  const flushSync = useCallback(async () => {
    if (!localDb || isSyncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus("syncing");

      const unsynced = await localDb.answers
        .where("sessionId")
        .equals(sessionId)
        .and((item: LocalAnswer) => item.synced === 0)
        .toArray();

      if (unsynced.length === 0) {
        if (isMountedRef.current) {
          setSyncStatus("synced");
          setPendingCount(0);
        }
        isSyncingRef.current = false;
        return;
      }

      const payload = {
        type: "ANSWER_SYNC",
        answers: unsynced.map((item) => ({
          questionId: item.questionId,
          answerText: item.answerText,
          clientTs: item.clientTs,
        })),
      };

      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      } else {
        setSyncStatus("offline");
      }
    } catch (err) {
      console.warn("Flush sync error:", err);
      if (isMountedRef.current) {
        setSyncStatus(navigator.onLine ? "error" : "offline");
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [sessionId]);

  // 4. Set Answer locally with debounced server push
  const setAnswer = useCallback(
    async (questionId: string, text: string) => {
      const clientTs = Date.now();

      // Instant optimistic in-memory update
      setAnswers((prev) => ({ ...prev, [questionId]: text }));

      // Local write to IndexedDB
      if (localDb) {
        try {
          const existing = await localDb.answers
            .where({ sessionId, questionId })
            .first();

          if (existing && existing.id) {
            await localDb.answers.update(existing.id, {
              answerText: text,
              clientTs,
              synced: 0,
            });
          } else {
            await localDb.answers.put({
              sessionId,
              questionId,
              answerText: text,
              clientTs,
              synced: 0,
            });
          }
          setPendingCount((c) => c + 1);
        } catch (err) {
          console.error("Dexie write error:", err);
        }
      }

      // Debounce server push (500ms)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        flushSync();
      }, 500);
    },
    [sessionId, flushSync]
  );

  // 5. Send Proctoring & Integrity Telemetry
  const sendIntegrityEvent = useCallback(
    (event: string, examId?: string, studentName?: string) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "INTEGRITY_EVENT",
            event,
            examId,
            studentName,
            timestamp: Date.now(),
          })
        );
      }
    },
    []
  );

  return {
    answers,
    setAnswer,
    syncStatus,
    pendingCount,
    lastSyncedAt,
    flushSync,
    sendIntegrityEvent,
  };
}
