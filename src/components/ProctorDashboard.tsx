import React, { useState, useEffect } from "react";

export interface DrawingSubmission {
  studentId: string;
  studentName: string;
  paperCode: string;
  imageUrl: string;
  timestamp: number;
  questionId: string;
}

export interface AnomalyReport {
  studentId: string;
  studentName: string;
  reason: "EXPIRED_TTL" | "DESKTOP_FACE_ABSENT" | "MULTIPLE_SUBMISSIONS";
  timestamp: number;
}

interface Props {
  examSessionId: string;
  socket?: WebSocket | null;
}

export const ProctorDashboard: React.FC<Props> = ({ examSessionId, socket }) => {
  const [activeUploads, setActiveUploads] = useState<Map<string, number>>(new Map());
  const [submissions, setSubmissions] = useState<DrawingSubmission[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DrawingSubmission | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "DRAWING_UPLOAD_ACTIVE") {
          setActiveUploads((prev) => {
            const next = new Map(prev);
            next.set(data.payload.studentId, data.payload.expiresInSeconds);
            return next;
          });
        } else if (data.event === "DRAWING_UPLOAD_SUCCESS") {
          const sub: DrawingSubmission = data.payload;
          setSubmissions((prev) => [sub, ...prev]);
          setSelectedSubmission(sub);
          setActiveUploads((prev) => {
            const next = new Map(prev);
            next.delete(sub.studentId);
            return next;
          });
        } else if (data.event === "UPLOAD_ANOMALY_DETECTED") {
          setAnomalies((prev) => [data.payload, ...prev]);
        }
      } catch (e) {
        // Handle websocket parse error
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Proctor Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-tight text-white">Teacher Proctor Console</h1>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">
            Session: {examSessionId}
          </span>
        </div>

        {/* Live Feed Status Pills */}
        <div className="flex items-center gap-2">
          {Array.from(activeUploads.entries()).map(([studentId, ttl]) => (
            <div key={studentId} className="bg-amber-950/80 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {studentId}: Drawing Upload Active ({ttl}s)
            </div>
          ))}
          {activeUploads.size === 0 && (
            <span className="text-xs text-slate-500 italic">No active drawing uploads</span>
          )}
        </div>
      </header>

      {/* Main Grid: Left Side Rubric + Anomaly Feed, Right Side High-Res Canvas */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Column (Rubric & Submissions List) */}
        <div className="col-span-4 bg-slate-900/60 border-r border-slate-800 p-6 flex flex-col overflow-y-auto">
          {/* Question Rubric Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Scoring Rubric</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify that the handwritten 3-digit paper watermark challenge code match before awarding drawing points.
            </p>
          </div>

          {/* Anomaly Alerts List */}
          {anomalies.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Security Anomalies ({anomalies.length})
              </h3>
              <div className="space-y-2">
                {anomalies.map((anom, idx) => (
                  <div key={idx} className="bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-300">
                    <span className="font-bold">{anom.studentName} ({anom.studentId})</span>: {anom.reason}
                    <span className="block text-[10px] text-red-400/70 mt-0.5">
                      {new Date(anom.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Received Submissions List */}
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Received Drawings ({submissions.length})
          </h3>

          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {submissions.map((sub, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedSubmission(sub);
                  setRotation(0);
                  setZoom(1);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedSubmission === sub
                    ? "bg-blue-950/60 border-blue-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">{sub.studentName}</div>
                  <div className="text-xs text-slate-400">ID: {sub.studentId}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 text-xs">
                    #{sub.paperCode}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-1">
                    {new Date(sub.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">Waiting for student submissions...</p>
            )}
          </div>
        </div>

        {/* Right Column (Side-by-Side High-Res Drawing Viewer with Rotation & Zoom) */}
        <div className="col-span-8 bg-slate-950 p-6 flex flex-col items-center justify-center relative">
          {selectedSubmission ? (
            <div className="w-full h-full flex flex-col items-center">
              {/* Header Overlay showing expected paper watermark */}
              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 px-5 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Inspecting Student Answer:</span>
                  <span className="text-sm font-bold text-white">{selectedSubmission.studentName}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-amber-950/80 border border-amber-500/50 px-3 py-1 rounded-lg text-center">
                    <span className="text-[10px] text-amber-300 block font-semibold">EXPECTED WATERMARK</span>
                    <span className="text-lg font-black text-amber-400 font-mono tracking-widest">
                      #{selectedSubmission.paperCode}
                    </span>
                  </div>

                  {/* Zoom & Rotate Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                    <button
                      onClick={() => setRotation((r) => (r - 90) % 360)}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      ↺ 90°
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      ↻ 90°
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      -
                    </button>
                    <span className="text-xs text-slate-300 font-mono px-1">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Image Canvas */}
              <div className="flex-1 w-full border border-slate-800 rounded-2xl bg-slate-900/50 flex items-center justify-center overflow-hidden relative">
                <img
                  src={selectedSubmission.imageUrl}
                  alt="Student paper drawing"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    transition: "transform 0.2s ease",
                    maxHeight: "80%",
                    maxWidth: "80%",
                    objectFit: "contain"
                  }}
                  className="shadow-2xl rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">Select a student submission from the left panel to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
