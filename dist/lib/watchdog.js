"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopWebcamWatchdog = void 0;
class DesktopWebcamWatchdog {
    config;
    active = false;
    mediaStream = null;
    checkInterval = null;
    constructor(config) {
        this.config = config;
    }
    async startMonitoring() {
        this.active = true;
        try {
            // Request webcam access if in browser context
            if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
        }
        catch (e) {
            console.warn("⚠️ Webcam access not granted or unavailable for proctor watchdog.");
        }
        // Monitor for presence / anomalies
        this.checkInterval = setInterval(() => {
            if (!this.active)
                return;
            // In browser runtime, HTML canvas pixel analysis or WebRTC video tracks can verify face presence
            // If stream active tracks are muted or ended, trigger absence anomaly
            if (this.mediaStream) {
                const videoTrack = this.mediaStream.getVideoTracks()[0];
                if (!videoTrack || !videoTrack.enabled || videoTrack.readyState === "ended") {
                    this.reportAnomaly("DESKTOP_FACE_ABSENT");
                }
            }
        }, 3000);
    }
    stopMonitoring() {
        this.active = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }
    }
    async reportAnomaly(reason) {
        this.config.onAnomalyDetected(reason);
        try {
            await fetch("/api/v1/exams/upload-anomaly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examSessionId: this.config.examSessionId,
                    studentId: this.config.studentId,
                    studentName: this.config.studentName,
                    reason
                })
            });
        }
        catch (e) {
            console.error("Failed to report anomaly to server gateway:", e);
        }
    }
}
exports.DesktopWebcamWatchdog = DesktopWebcamWatchdog;
