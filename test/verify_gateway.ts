import http from "http";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { exec } from "child_process";

const BASE_URL = "http://localhost:3000";

async function makePostRequest(urlPath: string, payload: any): Promise<any> {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request(
      BASE_URL + urlPath,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body || "{}") });
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function uploadMultipart(urlPath: string, ticket: string, imageBuffer: Buffer, filename: string): Promise<any> {
  const boundary = "--------------------------" + Math.random().toString(16).substring(2);
  
  let body = "";
  // Field 1: Ticket string MUST precede binary file payload
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="ticket"\r\n\r\n`;
  body += `${ticket}\r\n`;

  // Field 2: Image binary file
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n`;
  body += `Content-Type: image/jpeg\r\n\r\n`;

  const headerBuf = Buffer.from(body, "utf8");
  const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const fullBuffer = Buffer.concat([headerBuf, imageBuffer, footerBuf]);

  return new Promise((resolve, reject) => {
    const req = http.request(
      BASE_URL + urlPath,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": fullBuffer.length
        }
      },
      (res) => {
        let responseText = "";
        res.on("data", (chunk) => (responseText += chunk));
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: JSON.parse(responseText || "{}") });
        });
      }
    );
    req.on("error", reject);
    req.write(fullBuffer);
    req.end();
  });
}

async function runVerification() {
  console.log("🧪 Starting End-to-End Verification Test Suite...");

  // 1. Test Ticket Generation
  console.log("\n[Test 1] Requesting short-lived upload ticket...");
  const ticketRes = await makePostRequest("/api/v1/exams/upload-ticket", {
    examSessionId: "550e8400-e29b-41d4-a716-446655440000",
    questionId: "question-diagram-01",
    studentId: "STUDENT_101",
    studentName: "Juan Dela Cruz"
  });

  if (ticketRes.statusCode !== 200 || !ticketRes.body.ticket) {
    console.error("❌ Test 1 Failed:", ticketRes);
    process.exit(1);
  }

  const { ticket, paperCode, qrPayloadUrl } = ticketRes.body;
  console.log(`✅ Ticket Created Successfully: Ticket=${ticket.substring(0, 8)}... | Paper Code=${paperCode}`);
  console.log(`   QR Payload URL: ${qrPayloadUrl}`);

  // 2. Test Invalid File Magic Byte Rejection
  console.log("\n[Test 2] Requesting ticket for invalid payload test...");
  const invalidTicketRes = await makePostRequest("/api/v1/exams/upload-ticket", {
    examSessionId: "550e8400-e29b-41d4-a716-446655440000",
    questionId: "question-diagram-01"
  });
  const invalidTicket = invalidTicketRes.body.ticket;

  console.log("   Uploading invalid text file payload disguised as image...");
  const fakeBuffer = Buffer.from("NOT_AN_IMAGE_PAYLOAD_EXECUTABLE_TEXT", "utf8");
  const invalidRes = await uploadMultipart("/api/v1/exams/upload-capture", invalidTicket, fakeBuffer, "test.txt");

  if (invalidRes.statusCode === 415) {
    console.log("✅ Invalid file successfully rejected with 415 Unsupported Media Type.");
  } else {
    console.error("❌ Test 2 Failed: Expected 415 status code, got", invalidRes.statusCode);
    process.exit(1);
  }

  // 3. Generate sample test JPEG image with Sharp
  console.log("\n[Test 3] Generating valid test JPEG drawing image...");
  const sampleJpegBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="800" height="600">
            <rect x="50" y="50" width="700" height="500" fill="none" stroke="#38bdf8" stroke-width="4"/>
            <text x="400" y="250" font-family="sans-serif" font-size="36" fill="#fbbf24" text-anchor="middle" font-weight="bold">Paper Code: ${paperCode}</text>
            <text x="400" y="320" font-family="sans-serif" font-size="24" fill="#ffffff" text-anchor="middle">Student Answer Diagram</text>
          </svg>`
        )
      }
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // 4. Upload Valid Image
  console.log("[Test 4] Uploading valid JPEG drawing using ticket...");
  const uploadRes = await uploadMultipart("/api/v1/exams/upload-capture", ticket, sampleJpegBuffer, "drawing.jpg");

  if (uploadRes.statusCode === 200 && uploadRes.body.success) {
    console.log("✅ Image Upload & Compression Succeeded! Public URL:", uploadRes.body.imageUrl);
  } else {
    console.error("❌ Test 4 Failed:", uploadRes);
    process.exit(1);
  }

  // 5. Test Token Replay / Burn Prevention
  console.log("\n[Test 5] Re-submitting image with burned ticket (replay attack test)...");
  const replayRes = await uploadMultipart("/api/v1/exams/upload-capture", ticket, sampleJpegBuffer, "drawing.jpg");

  if (replayRes.statusCode === 410) {
    console.log("✅ Atomic Token Burn Verified! Replay attack blocked with 410 Gone.");
  } else {
    console.error("❌ Test 5 Failed: Expected 410 status code, got", replayRes.statusCode);
    process.exit(1);
  }

  console.log("\n🎉 ALL 5 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runVerification();
