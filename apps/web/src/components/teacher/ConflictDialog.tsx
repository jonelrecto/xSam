import React, { useState } from "react";
import { teacherApi } from "../../lib/api";
import { useDraftStore } from "../../hooks/use-draft-store";
import { Button } from "../ui/button";
import { AlertTriangle, RefreshCw, UploadCloud } from "lucide-react";

interface ConflictDialogProps {
  examId: string;
  isOpen: boolean;
  onResolved: () => void;
  onSave: () => Promise<any>;
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
      const examData = await teacherApi.getExam(examId);
      useDraftStore.setState({ version: examData.exam.draftVersion || 0 });
      onResolved();
      await onSave();
    } catch (err) {
      console.error("Failed to overwrite draft:", err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-amber-500/40 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="text-base font-bold text-card-foreground">Save Conflict Detected</h4>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Concurrent Edits Occurred</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Another session or tab has saved edits to this draft since you loaded it. To prevent overwriting work, choose how you would like to proceed:
        </p>

        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-11 border-border hover:bg-muted"
            onClick={handleLoadLatest}
            disabled={isResolving}
          >
            <RefreshCw className="w-4 h-4 mr-2 text-primary" />
            <div className="text-left">
              <span className="font-bold block text-foreground">Load Latest Version</span>
              <span className="text-[10px] text-muted-foreground">Discard local draft and reload saved changes</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-xs h-11 bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            onClick={handleOverwrite}
            isLoading={isResolving}
          >
            <UploadCloud className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
            <div className="text-left">
              <span className="font-bold block">Overwrite with My Version</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300/80">Force save your current editor state</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
