"use client";

import React, { useState } from "react";
import { getDraftVersion } from "@/app/actions/exam";
import { useDraftStore } from "@/hooks/use-draft-store";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, UploadCloud } from "lucide-react";

interface ConflictDialogProps {
  examId: string;
  isOpen: boolean;
  onResolved: () => void;
  onSave: () => Promise<void>;
}

export function ConflictDialog({
  examId,
  isOpen,
  onResolved,
  onSave,
}: ConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handleLoadLatest = () => {
    window.location.reload();
  };

  const handleOverwrite = async () => {
    setIsResolving(true);
    try {
      const latestVersion = await getDraftVersion(examId);
      useDraftStore.setState({ version: latestVersion });
      onResolved();
      await onSave();
    } catch (err) {
      console.error("Failed to overwrite draft:", err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Save Conflict Detected</h4>
            <span className="text-xs text-amber-400">Concurrent Edits Occurred</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Another session or tab has saved edits to this draft since you loaded it. To prevent overwriting work, choose how you would like to proceed:
        </p>

        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-11 border-slate-700 hover:bg-slate-800"
            onClick={handleLoadLatest}
            disabled={isResolving}
          >
            <RefreshCw className="w-4 h-4 mr-2 text-indigo-400" />
            <div className="text-left">
              <span className="font-bold block">Load Latest Version</span>
              <span className="text-[10px] text-slate-400">Discard local draft and reload saved changes</span>
            </div>
          </Button>

          <Button
            className="w-full justify-start text-xs h-11 bg-amber-600/20 border border-amber-500/40 text-amber-200 hover:bg-amber-600/30"
            onClick={handleOverwrite}
            isLoading={isResolving}
          >
            <UploadCloud className="w-4 h-4 mr-2 text-amber-400" />
            <div className="text-left">
              <span className="font-bold block">Overwrite with My Version</span>
              <span className="text-[10px] text-amber-300/70">Force save your current editor state</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
