"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft } from "@/app/actions/exam";
import { useDraftStore } from "./use-draft-store";

export type SaveStatus =
  | "saved"
  | "dirty"
  | "saving"
  | "error"
  | "conflict"
  | "locked";

export function useAutosave(examId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const statusRef = useRef(status);
  statusRef.current = status;
  const inFlight = useRef<Promise<void> | null>(null);

  const save = useCallback(async () => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      setStatus("saving");
      const { questions, version, revision } = useDraftStore.getState();

      try {
        const res = await saveDraft(examId, version, questions);
        if (res.ok) {
          useDraftStore.getState().markSaved(res.version, revision);
          setStatus(
            useDraftStore.getState().revision === revision ? "saved" : "dirty"
          );
        } else {
          if (res.code === "CONFLICT") {
            setStatus("conflict");
          } else if (res.code === "LOCKED") {
            setStatus("locked");
          } else {
            setStatus("error");
          }
        }
      } catch (err) {
        console.error("Autosave failed:", err);
        setStatus("error");
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, [examId]);

  const revision = useDraftStore((s) => s.revision);
  const savedRevision = useDraftStore((s) => s.savedRevision);

  // Debounced 1500ms auto-save
  useEffect(() => {
    if (revision === savedRevision) return;
    if (statusRef.current === "conflict" || statusRef.current === "locked") return;
    if (statusRef.current !== "saving") setStatus("dirty");

    const timer = setTimeout(save, 1500);
    return () => clearTimeout(timer);
  }, [revision, savedRevision, save]);

  // Alert before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const s = useDraftStore.getState();
      if (s.revision !== s.savedRevision) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Flush pending changes immediately (e.g. before publish)
  const flush = useCallback(async () => {
    for (let i = 0; i < 3; i++) {
      await save();
      const s = useDraftStore.getState();
      if (s.revision === s.savedRevision) return true;
    }
    return false;
  }, [save]);

  return { status, save, flush, setStatus };
}
