export interface WatchdogConfig {
  examSessionId: string;
  studentId: string;
  studentName: string;
  onAnomalyDetected: (reason: "EXPIRED_TTL" | "DESKTOP_FACE_ABSENT" | "MULTIPLE_SUBMISSIONS") => void;
}

export class DesktopWebcamWatchdog {
  private active = false;
  private mediaStream: MediaStream | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private config: WatchdogConfig) {}

  async startMonitoring() {
    this.active = true;
    try {
      // Request webcam access if in browser context
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
    } catch (e) {
      console.warn("⚠️ Webcam access not granted or unavailable for proctor watchdog.");
    }

    // Monitor for presence / anomalies
    this.checkInterval = setInterval(() => {
      if (!this.active) return;
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

  async reportAnomaly(reason: "EXPIRED_TTL" | "DESKTOP_FACE_ABSENT" | "MULTIPLE_SUBMISSIONS") {
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
    } catch (e) {
      console.error("Failed to report anomaly to server gateway:", e);
    }
  }
}
