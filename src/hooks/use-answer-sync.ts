"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { localDb, type LocalAnswer } from "@/lib/exam/local-db";
import { saveAnswers } from "@/app/actions/session";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface UseAnswerSyncProps {
  sessionId: string;
  initialAnswers?: { questionId: string; answerText: string; clientTs?: number }[];
}

export function useAnswerSync({ sessionId, initialAnswers = [] }: UseAnswerSyncProps) {
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

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Initialize Dexie cache with initial answers if empty
  useEffect(() => {
    isMountedRef.current = true;
    if (!localDb) return;

    let isSubscribed = true;

    async function initLocalStore() {
      try {
        const cached = await localDb.answers
          .where("sessionId")
          .equals(sessionId)
          .toArray();

        if (!isSubscribed) return;

        if (cached.length === 0 && initialAnswers.length > 0) {
          // Pre-populate local DB with server answers
          const toPut: LocalAnswer[] = initialAnswers.map((a) => ({
            sessionId,
            questionId: a.questionId,
            answerText: a.answerText,
            clientTs: a.clientTs || Date.now(),
            synced: 1,
          }));
          await localDb.answers.bulkPut(toPut);
        } else if (cached.length > 0) {
          // Load newest answers from local DB
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
        console.error("Failed to initialize local exam store:", err);
      }
    }

    initLocalStore();

    return () => {
      isSubscribed = false;
    };
  }, [sessionId, initialAnswers]);

  // Core flush function to push unsynced answers to server
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

      // Send payload to server
      const payload = unsynced.map((item: LocalAnswer) => ({
        questionId: item.questionId,
        answerText: item.answerText,
        clientTs: item.clientTs,
      }));

      const res = await saveAnswers(sessionId, payload);

      if (res.ok) {
        // Mark items as synced in Dexie
        const idsToUpdate = unsynced.map((u: LocalAnswer) => u.id).filter(Boolean) as number[];
        if (idsToUpdate.length > 0) {
          await localDb.answers
            .where("id")
            .anyOf(idsToUpdate)
            .modify({ synced: 1 });
        }

        const remainingUnsynced = await localDb.answers
          .where("sessionId")
          .equals(sessionId)
          .and((item: LocalAnswer) => item.synced === 0)
          .count();

        if (isMountedRef.current) {
          setPendingCount(remainingUnsynced);
          setSyncStatus(remainingUnsynced > 0 ? "syncing" : "synced");
          setLastSyncedAt(new Date());
        }
      } else {
        if (isMountedRef.current) {
          setSyncStatus("error");
        }
      }
    } catch (err) {
      console.warn("Background answer sync error:", err);
      if (isMountedRef.current) {
        setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [sessionId]);

  // Set an answer locally and queue sync
  const setAnswer = useCallback(
    async (questionId: string, text: string) => {
      const clientTs = Date.now();

      // 1. Immediate in-memory update for 60fps UX
      setAnswers((prev) => ({ ...prev, [questionId]: text }));

      // 2. Local durable write to IndexedDB
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

      // 3. Debounced server sync (600ms)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        flushSync();
      }, 600);
    },
    [sessionId, flushSync]
  );

  // Lifecycle listeners for network recovery and tab visibility
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus("syncing");
      flushSync();
    };

    const handleOffline = () => {
      setSyncStatus("offline");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSync();
      }
    };

    const handleBeforeUnload = () => {
      flushSync();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flushSync]);

  return {
    answers,
    setAnswer,
    syncStatus,
    pendingCount,
    lastSyncedAt,
    flushSync,
  };
}
