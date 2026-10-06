import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

interface Props {
  examSessionId: string;
  questionId: string;
  socket?: WebSocket | null;
  onImageSynced: (imageUrl: string) => void;
  onAnomalyDetected?: (reason: string) => void;
}

export const QuestionDrawingUploader: React.FC<Props> = ({
  examSessionId,
  questionId,
  socket,
  onImageSynced,
  onAnomalyDetected
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paperCode, setPaperCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(90);
  const [loading, setLoading] = useState(false);

  const initUploadTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/exams/upload-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSessionId, questionId })
      });
      const data = await res.json();
      const directUrl = `${window.location.origin}/upload-gateway/${data.ticket}`;
      const dataUrl = await QRCode.toDataURL(directUrl, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
      setPaperCode(data.paperCode);
      setSecondsRemaining(data.expiresInSeconds || 90);
      setModalOpen(true);
    } catch (e) {
      alert("Failed to generate upload ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for upload window
  useEffect(() => {
    if (!modalOpen || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setModalOpen(false); // Close modal on expiry
          if (onAnomalyDetected) {
            onAnomalyDetected("EXPIRED_TTL");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [modalOpen, secondsRemaining, onAnomalyDetected]);

  // Listen to WebSocket for successful mobile sync
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "DRAWING_UPLOAD_SUCCESS" && data.payload?.questionId === questionId) {
          onImageSynced(data.payload.imageUrl);
          setModalOpen(false);
        }
      } catch (e) {
        // Ignore unparseable socket messages
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, questionId, onImageSynced]);

  return (
    <div className="drawing-container font-sans">
      <button 
        type="button"
        disabled={loading}
        onClick={initUploadTicket} 
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        {loading ? "Generating Ticket..." : "Upload Paper Drawing via Phone QR"}
      </button>

      {modalOpen && qrDataUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-center max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold text-white mb-1">Scan with Phone Camera</h3>
            <p className="text-xs text-slate-400 mb-4">No app installation required. Uses native camera.</p>
            
            {/* Dynamic QR Code Container */}
            <div className="bg-white p-3 rounded-xl inline-block shadow-inner my-2">
              <img 
                src={qrDataUrl}
                alt="Upload QR Code"
                className="w-44 h-44 block"
              />
            </div>

            {/* Mandatory Paper Challenge Code Banner */}
            <div className="bg-amber-950/60 border border-amber-500/50 p-3.5 rounded-xl my-4 text-center">
              <span className="text-[10px] text-amber-300 block font-bold tracking-wider uppercase">MANDATORY PAPER CODE</span>
              <span className="text-3xl font-black text-amber-400 tracking-widest font-mono">{paperCode}</span>
              <p className="text-[11px] text-amber-200/80 mt-1 leading-tight">
                Handwrite this code at the top of your paper drawing before snapping the photo.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Upload Window:</span>
              <span className="font-bold text-amber-400 text-sm">{secondsRemaining}s remaining</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
