import { useCallback, useEffect, useRef, useState } from "react";
import { teacherApi } from "../lib/api";
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
  const [lastError, setLastError] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const inFlight = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      setStatus("saving");
      setLastError(null);
      const { questions, revision } = useDraftStore.getState();

      try {
        const res = await teacherApi.saveDraftQuestions(examId, questions);
        if (res.ok) {
          if (res.idMap && Array.isArray(res.idMap)) {
            useDraftStore.getState().updateIds(res.idMap);
          }
          useDraftStore.getState().markSaved(res.version, revision);
          const isLatest = useDraftStore.getState().revision === revision;
          setStatus(isLatest ? "saved" : "dirty");
          return true;
        } else {
          setStatus("error");
          setLastError("Failed to save draft.");
          return false;
        }
      } catch (err: any) {
        console.error("Autosave failed:", err);
        const msg = err?.data?.error || err?.message || "Autosave failed";
        setLastError(msg);
        if (err?.status === 409 || err?.data?.code === "CONFLICT") {
          setStatus("conflict");
        } else if (err?.data?.code === "LOCKED") {
          setStatus("locked");
        } else {
          setStatus("error");
        }
        return false;
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
  const flush = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    for (let i = 0; i < 3; i++) {
      const success = await save();
      const s = useDraftStore.getState();
      if (success && s.revision === s.savedRevision) {
        return { ok: true };
      }
      if (!success) {
        return { ok: false, error: lastError || "Failed to auto-save latest edits." };
      }
    }
    const finalState = useDraftStore.getState();
    if (finalState.revision === finalState.savedRevision) {
      return { ok: true };
    }
    return { ok: false, error: "Auto-save timed out. Please try again." };
  }, [save, lastError]);

  return { status, save, flush, setStatus, lastError };
}
