import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle2, AlertTriangle, Upload, RefreshCw } from "lucide-react";

export function MobileUploadGatewayPage() {
  const { token } = useParams<{ token: string }>();
  const [ticketInfo, setTicketInfo] = useState<{ active: boolean; paperCode?: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/exams/upload-ticket/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active) {
          setTicketInfo(data);
        } else {
          setErrorMessage("This upload ticket is invalid or has expired.");
        }
      })
      .catch(() => setErrorMessage("Could not verify upload ticket."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ticket", token);

    try {
      const res = await fetch("/api/v1/exams/upload-capture", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(true);
      } else {
        setErrorMessage(data.error || "Failed to upload drawing.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error uploading drawing.");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Validating Upload Session...</p>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Upload Completed!</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Your paper drawing has been securely linked and synchronized with your exam session on your desktop.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Paper Drawing Capture</h2>
          <p className="text-xs text-slate-400">
            Snap a clear photo of your handwritten paper drawing.
          </p>
        </div>

        {ticketInfo?.paperCode && (
          <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl text-center">
            <span className="text-[10px] text-amber-300 font-bold uppercase block">
              Required Paper Code
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono tracking-widest">
              {ticketInfo.paperCode}
            </span>
            <p className="text-[11px] text-amber-200/70 mt-0.5">
              Confirm this code is visible on the top of your paper.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {previewUrl ? (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-800 max-h-64 flex items-center justify-center bg-black">
              <img src={previewUrl} alt="Drawing preview" className="max-h-64 object-contain" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Retake Photo
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleUpload}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Submit Drawing
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-950/40 transition-colors">
            <Camera className="w-10 h-10 text-indigo-400" />
            <span className="text-sm font-bold text-slate-200">Tap to Open Camera</span>
            <span className="text-[11px] text-slate-400">Capture your physical worksheet</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
