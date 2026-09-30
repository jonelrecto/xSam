Markdown
# Ephemeral QR Code Mobile Upload Gateway — Engineering Plan

This document outlines the end-to-end design, communication flow, security controls, and implementation details for capturing physical paper drawings during a sandboxed exam session via an ephemeral QR code mobile gateway.

---

## 1. Executive Workflow & Lifecycle

The lifecycle spans three synchronized actors: the **Student Exam Terminal (Desktop)**, the **Mobile Capture Client (Smartphone)**, and the **Teacher Proctoring Dashboard**.

[Student Terminal (Desktop)]           [Backend Gateway (API + Redis + WS)]          [Mobile Client (Phone)]
│                                         │                                         │
├──────── 1. POST /api/qr/init ──────────►│                                         │
│         (Request Upload Ticket)         ├─ Generate short-lived JWT               │
│◄─────── 2. Return Ticket + Code ────────┤  (TTL: 90s, Token: T_upload)            │
│                                         │                                         │
├─ Render dynamic QR code on screen       │                                         │
├─ Display 3-digit security code          │                                         │
├─ Notify Teacher WS: "Upload in progress"│                                         │
│                                         │◄────── 3. Scan QR (GET /upload-ui) ─────┤
│                                         │         Verify token validity           │
│                                         ├─────── 4. Deliver Mobile Web UI ───────►│
│                                         │          (Direct Camera Capture Only)   │
│                                         │                                         │
│                                         │◄────── 5. POST /api/qr/upload ──────────┤
│                                         │         (Multipart/form-data Image)     │
│                                         ├─ Validate MIME & magic numbers          │
│                                         ├─ Push image to R2 / Supabase            │
│                                         ├─ Invalidate T_upload in Redis           │
│                                         │                                         │
│◄─────── 6. WebSocket: UPLOAD_SUCCESS ───┤                                         │
│         (Payload: image_url, id)        ├─────── 7. Self-Destruct UI Screen ─────►│
│                                         │          "Upload complete. Put phone"   │
├─ Embed image into Answer Canvas         │                                         │
├─ Close QR Modal; resume exam timer      │                                         │
▼                                         ▼                                         ▼


---

## 2. Security Threat Model & Countermeasures

| Threat Vector | Attack Scenario | Architectural Countermeasure |
| :--- | :--- | :--- |
| **Pre-Drawn Answer Swap** | Student uploads a diagram drafted prior to the exam or sent by an external accomplice. | **Dynamic Paper Watermark:** The desktop displays a random, short-lived 3-digit challenge code (e.g., `#B74`). The student must handwrite this code on their paper; teachers verify it in the grading rubric. |
| **Photo Gallery Injection** | Student opens their phone to pick an image saved from Google, ChatGPT, or Discord. | **Forced Camera Invocation:** Mobile HTML enforces `<input type="file" capture="environment" accept="image/*">`. Mobile browsers bypass gallery picker and directly launch the native camera view. |
| **Token Hijacking / Link Sharing** | Student sends the QR URL to an outside collaborator to upload answers remotely. | **Single-Use + Rapid TTL:** Tickets expire in **90 seconds** and are tracked as active in Redis. Once used, the token is instantly burned (atomic `DEL`). |
| **Browsing & Chatting on Phone** | Student leaves the upload page on mobile to query answers online. | **Desktop Face & Time Watchdog:** The desktop camera stays active. If the upload window exceeds 90s, the gateway revokes the ticket, flags an anomaly to the proctor console, and returns the desktop to the locked test. |

---

## 3. Data Flow & Communication Contracts

### A. Initialization Request (Desktop ➔ API)
* **Endpoint:** `POST /api/v1/exams/upload-ticket`
* **Headers:** `Authorization: Bearer <STUDENT_DESKTOP_JWT>`
* **Payload:**
```json
{
  "examSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "questionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
Gateway Action:

Generates uploadToken = nanoid(32)

Generates paperCode = generateShortCode() (e.g., "A39")

Writes state to Redis with 90s expiration:

Code snippet
SETEX upload_ticket:nanoid32 90 '{"sessionId":"...","questionId":"...","paperCode":"A39","status":"PENDING"}'
Response (200 OK):

JSON
{
  "qrPayloadUrl": "[https://exam.domain.com/capture?ticket=nanoid32](https://exam.domain.com/capture?ticket=nanoid32)",
  "paperCode": "A39",
  "expiresInSeconds": 90
}
B. Image Ingestion (Mobile Client ➔ API)
Endpoint: POST /api/v1/exams/upload-capture

Content-Type: multipart/form-data

Form Fields:

ticket: "nanoid32"

image: [Raw Binary Buffer (JPEG/PNG/WebP)]

Backend Validation Pipeline:

Retrieve upload_ticket:nanoid32 from Redis. If missing, return 401 Unauthorized: Expired or used ticket.

Inspect buffer magic numbers (reject disguised PDFs or executables).

Compress and convert to .webp via sharp (target max width: 1600px, 80% quality).

Stream file to S3/Cloudflare R2 storage bucket.

Atomically delete key from Redis (DEL upload_ticket:nanoid32).

Emit a real-time event through Redis Pub/Sub:

Code snippet
PUBLISH exam_channel:<sessionId> '{"event":"PAPER_UPLOADED","questionId":"...","imageUrl":"..."}'
4. Implementation Blueprint
Step 1: Server Gateway Handler (Fastify / Node.js)
TypeScript
// src/routes/uploadGateway.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { customAlphabet } from "nanoid";
import { redis } from "../lib/redis";
import { uploadToR2 } from "../lib/storage";
import sharp from "sharp";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);
const codeGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 3);

export async function uploadGatewayRoutes(app: FastifyInstance) {
  // 1. Desktop requests an upload ticket
  app.post("/api/v1/exams/upload-ticket", async (req: FastifyRequest, reply: FastifyReply) => {
    const { examSessionId, questionId } = req.body as { examSessionId: string; questionId: string };
    
    const ticket = nanoid();
    const paperCode = codeGen();

    const ticketData = {
      examSessionId,
      questionId,
      paperCode,
      createdAt: Date.now()
    };

    // 90-second hard TTL
    await redis.set(`upload_ticket:${ticket}`, JSON.stringify(ticketData), "EX", 90);

    return reply.send({
      qrPayloadUrl: `${process.env.APP_BASE_URL}/capture/${ticket}`,
      paperCode,
      expiresInSeconds: 90
    });
  });

  // 2. Mobile uploads captured drawing
  app.post("/api/v1/exams/upload-capture", async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No image file uploaded" });

    const ticket = (data.fields.ticket as any)?.value;
    const rawTicket = await redis.get(`upload_ticket:${ticket}`);

    if (!rawTicket) {
      return reply.status(410).send({ error: "Upload session expired or already completed." });
    }

    const { examSessionId, questionId } = JSON.parse(rawTicket);

    // Image optimization via Sharp
    const buffer = await data.toBuffer();
    const optimizedWebP = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const destinationKey = `answers/${examSessionId}/${questionId}_${Date.now()}.webp`;
    const publicUrl = await uploadToR2(destinationKey, optimizedWebP, "image/webp");

    // Burn ticket to prevent replay
    await redis.del(`upload_ticket:${ticket}`);

    // Notify Desktop Client via WebSocket / PubSub
    await redis.publish(
      `exam_room:${examSessionId}`,
      JSON.stringify({
        event: "DRAWING_UPLOAD_SUCCESS",
        payload: { questionId, imageUrl: publicUrl }
      })
    );

    return reply.send({ success: true, message: "Drawing synced successfully." });
  });
}
Step 2: Zero-Install Mobile Capture Client
Create a minimal, distraction-free HTML view rendered when the phone scans the QR code:

HTML
<!-- public/capture.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Exam Answer Capture</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #f8fafc; text-align: center; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
    .btn { display: inline-block; width: 100%; padding: 16px 0; background: #2563eb; color: #fff; font-size: 18px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; }
    #cameraInput { display: none; }
    .status { margin-top: 16px; font-size: 14px; color: #94a3b8; }
    .success { display: none; color: #4ade80; }
  </style>
</head>
<body>
  <div class="card" id="mainCard">
    <h2>Capture Paper Answer</h2>
    <p class="status">Ensure the handwritten 3-digit security code is visible on your paper before snapping the photo.</p>
    
    <label for="cameraInput" class="btn">Open Camera</label>
    <!-- capture="environment" invokes rear camera directly, blocking photo gallery selection -->
    <input type="file" id="cameraInput" accept="image/*" capture="environment">

    <p id="uploadingText" class="status" style="display:none;">Uploading drawing to your exam screen...</p>
  </div>

  <div class="card success" id="successCard">
    <h2>Drawing Synced!</h2>
    <p>Your paper has appeared on your desktop screen. Put your phone away immediately and continue your exam.</p>
  </div>

  <script>
    const ticket = window.location.pathname.split("/").pop();
    const input = document.getElementById("cameraInput");

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      document.getElementById("uploadingText").style.display = "block";

      const formData = new FormData();
      formData.append("ticket", ticket);
      formData.append("image", file);

      try {
        const res = await fetch("/api/v1/exams/upload-capture", {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          document.getElementById("mainCard").style.display = "none";
          document.getElementById("successCard").style.display = "block";
        } else {
          alert("Ticket expired or invalid. Please re-open the QR code on your computer.");
        }
      } catch (err) {
        alert("Upload failed. Check your internet connection.");
      }
    });
  </script>
</body>
</html>
Step 3: Desktop Student Terminal Component (React + Canvas Sync)
TypeScript
// components/QuestionDrawingUploader.tsx
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";

interface Props {
  examSessionId: string;
  questionId: string;
  socket: WebSocket;
  onImageSynced: (imageUrl: string) => void;
}

export const QuestionDrawingUploader: React.FC<Props> = ({
  examSessionId,
  questionId,
  socket,
  onImageSynced
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [paperCode, setPaperCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(90);

  const initUploadTicket = async () => {
    const res = await fetch("/api/v1/exams/upload-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examSessionId, questionId })
    });
    const data = await res.json();
    setQrUrl(data.qrPayloadUrl);
    setPaperCode(data.paperCode);
    setSecondsRemaining(data.expiresInSeconds);
    setModalOpen(true);
  };

  // Countdown timer for upload window
  useEffect(() => {
    if (!modalOpen || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setModalOpen(false); // Close modal on expiry
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [modalOpen, secondsRemaining]);

  // Listen to WebSocket for successful mobile sync
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.event === "DRAWING_UPLOAD_SUCCESS" && data.payload.questionId === questionId) {
        onImageSynced(data.payload.imageUrl);
        setModalOpen(false);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, questionId, onImageSynced]);

  return (
    <div className="drawing-container">
      <button 
        type="button"
        onClick={initUploadTicket} 
        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
      >
        Upload Paper Drawing via Phone QR
      </button>

      {modalOpen && qrUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl text-center max-w-sm">
            <h3 className="text-lg font-bold text-white mb-2">Scan with Phone Camera</h3>
            
            <div className="bg-white p-3 rounded-lg inline-block my-3">
              <QRCode size="{180}" value="{qrUrl}"/>
            </div>

            <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded my-2">
              <span className="text-xs text-amber-300 block">MANDATORY PAPER CODE</span>
              <span className="text-2xl font-black text-amber-400 tracking-widest">{paperCode}</span>
              <p className="text-[11px] text-amber-200/80 mt-1">Write this code on top of your paper.</p>
            </div>

            <p className="text-xs text-slate-400">
              Window closes in <strong className="text-white">{secondsRemaining}s</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
5. Teacher Proctoring & Grading Audit
Live Feed Notifications: When the QR code is generated, the teacher's dashboard displays a status pill: Juan Dela Cruz: Drawing Upload Active (84s).

Side-by-Side Grading Screen:

Left pane: Prompt instructions and rubrics.

Right pane: The uploaded student paper image with zoom, rotate, and pan controls.

Header overlay: Expected challenge code (e.g., #A39) alongside the image timestamp so the teacher can verify the paper code in under 3 seconds.