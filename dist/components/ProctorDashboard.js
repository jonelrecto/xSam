"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProctorDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ProctorDashboard = ({ examSessionId, socket }) => {
    const [activeUploads, setActiveUploads] = (0, react_1.useState)(new Map());
    const [submissions, setSubmissions] = (0, react_1.useState)([]);
    const [anomalies, setAnomalies] = (0, react_1.useState)([]);
    const [selectedSubmission, setSelectedSubmission] = (0, react_1.useState)(null);
    const [rotation, setRotation] = (0, react_1.useState)(0);
    const [zoom, setZoom] = (0, react_1.useState)(1);
    (0, react_1.useEffect)(() => {
        if (!socket)
            return;
        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === "DRAWING_UPLOAD_ACTIVE") {
                    setActiveUploads((prev) => {
                        const next = new Map(prev);
                        next.set(data.payload.studentId, data.payload.expiresInSeconds);
                        return next;
                    });
                }
                else if (data.event === "DRAWING_UPLOAD_SUCCESS") {
                    const sub = data.payload;
                    setSubmissions((prev) => [sub, ...prev]);
                    setSelectedSubmission(sub);
                    setActiveUploads((prev) => {
                        const next = new Map(prev);
                        next.delete(sub.studentId);
                        return next;
                    });
                }
                else if (data.event === "UPLOAD_ANOMALY_DETECTED") {
                    setAnomalies((prev) => [data.payload, ...prev]);
                }
            }
            catch (e) {
                // Handle websocket parse error
            }
        };
        socket.addEventListener("message", handleMessage);
        return () => socket.removeEventListener("message", handleMessage);
    }, [socket]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-screen bg-slate-950 text-slate-100 font-sans", children: [(0, jsx_runtime_1.jsxs)("header", { className: "px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-3 h-3 rounded-full bg-emerald-500 animate-pulse" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-bold tracking-tight text-white", children: "Teacher Proctor Console" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono", children: ["Session: ", examSessionId] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [Array.from(activeUploads.entries()).map(([studentId, ttl]) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-amber-950/80 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-amber-400" }), studentId, ": Drawing Upload Active (", ttl, "s)"] }, studentId))), activeUploads.size === 0 && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-500 italic", children: "No active drawing uploads" }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 grid grid-cols-12 overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "col-span-4 bg-slate-900/60 border-r border-slate-800 p-6 flex flex-col overflow-y-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-300 uppercase tracking-wider mb-2", children: "Scoring Rubric" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 leading-relaxed", children: "Verify that the handwritten 3-digit paper watermark challenge code match before awarding drawing points." })] }), anomalies.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-red-500" }), "Security Anomalies (", anomalies.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: anomalies.map((anom, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-300", children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-bold", children: [anom.studentName, " (", anom.studentId, ")"] }), ": ", anom.reason, (0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-red-400/70 mt-0.5", children: new Date(anom.timestamp).toLocaleTimeString() })] }, idx))) })] })), (0, jsx_runtime_1.jsxs)("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-3", children: ["Received Drawings (", submissions.length, ")"] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 flex-1 overflow-y-auto pr-1", children: [submissions.map((sub, idx) => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => {
                                            setSelectedSubmission(sub);
                                            setRotation(0);
                                            setZoom(1);
                                        }, className: `p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSubmission === sub
                                            ? "bg-blue-950/60 border-blue-500 text-white"
                                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold text-sm", children: sub.studentName }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-slate-400", children: ["ID: ", sub.studentId] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-mono font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 text-xs", children: ["#", sub.paperCode] }), (0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-500 mt-1", children: new Date(sub.timestamp).toLocaleTimeString() })] })] }, idx))), submissions.length === 0 && ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 text-center py-8", children: "Waiting for student submissions..." }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "col-span-8 bg-slate-950 p-6 flex flex-col items-center justify-center relative", children: selectedSubmission ? ((0, jsx_runtime_1.jsxs)("div", { className: "w-full h-full flex flex-col items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-full bg-slate-900 border border-slate-800 rounded-xl p-3 px-5 mb-4 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400 block", children: "Inspecting Student Answer:" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-white", children: selectedSubmission.studentName })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-amber-950/80 border border-amber-500/50 px-3 py-1 rounded-lg text-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-amber-300 block font-semibold", children: "EXPECTED WATERMARK" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-lg font-black text-amber-400 font-mono tracking-widest", children: ["#", selectedSubmission.paperCode] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setRotation((r) => (r - 90) % 360), className: "px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded", children: "\u21BA 90\u00B0" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setRotation((r) => (r + 90) % 360), className: "px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded", children: "\u21BB 90\u00B0" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setZoom((z) => Math.max(0.5, z - 0.25)), className: "px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded", children: "-" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-slate-300 font-mono px-1", children: [Math.round(zoom * 100), "%"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setZoom((z) => Math.min(3, z + 0.25)), className: "px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded", children: "+" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 w-full border border-slate-800 rounded-2xl bg-slate-900/50 flex items-center justify-center overflow-hidden relative", children: (0, jsx_runtime_1.jsx)("img", { src: selectedSubmission.imageUrl, alt: "Student paper drawing", style: {
                                            transform: `rotate(${rotation}deg) scale(${zoom})`,
                                            transition: "transform 0.2s ease",
                                            maxHeight: "80%",
                                            maxWidth: "80%",
                                            objectFit: "contain"
                                        }, className: "shadow-2xl rounded-lg" }) })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "text-center text-slate-600", children: [(0, jsx_runtime_1.jsx)("svg", { className: "w-16 h-16 mx-auto mb-3 opacity-40", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: "Select a student submission from the left panel to inspect" })] })) })] })] }));
};
exports.ProctorDashboard = ProctorDashboard;
