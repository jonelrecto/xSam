"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeSockets = void 0;
exports.broadcastToRoom = broadcastToRoom;
exports.uploadGatewayRoutes = uploadGatewayRoutes;
const nanoid_1 = require("nanoid");
const redis_1 = require("../lib/redis");
const storage_1 = require("../lib/storage");
const sharp_1 = __importDefault(require("sharp"));
const nanoid = (0, nanoid_1.customAlphabet)("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);
const codeGen = (0, nanoid_1.customAlphabet)("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 3);
// Magic byte verification helper
function isValidImageHeader(buffer) {
    if (buffer.length < 4)
        return false;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.length >= 12 && buffer.toString("utf8", 8, 12) === "WEBP";
    return isJpeg || isPng || isWebp;
}
// In-memory active WebSocket connection registry for real-time pub/sub
exports.activeSockets = new Map();
function broadcastToRoom(room, payload) {
    const roomSockets = exports.activeSockets.get(room);
    if (roomSockets) {
        const jsonStr = JSON.stringify(payload);
        roomSockets.forEach((ws) => {
            if (ws.readyState === 1 /* OPEN */) {
                ws.send(jsonStr);
            }
        });
    }
}
async function uploadGatewayRoutes(app) {
    // 1. Desktop requests an upload ticket
    app.post("/api/v1/exams/upload-ticket", async (req, reply) => {
        const { examSessionId, questionId, studentId, studentName } = (req.body || {});
        if (!examSessionId || !questionId) {
            return reply.status(400).send({ error: "Missing required fields: examSessionId and questionId are required." });
        }
        const ticket = nanoid();
        const paperCode = codeGen();
        const ticketData = {
            examSessionId,
            questionId,
            paperCode,
            studentId: studentId || "STUDENT_001",
            studentName: studentName || "Juan Dela Cruz",
            createdAt: Date.now()
        };
        // 90-second hard TTL
        await redis_1.redis.set(`upload_ticket:${ticket}`, JSON.stringify(ticketData), "EX", 90);
        const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        const qrPayloadUrl = `${baseUrl}/capture/${ticket}`;
        // Notify Teacher Proctor room that a drawing upload session has been initiated
        const proctorNotification = {
            event: "DRAWING_UPLOAD_ACTIVE",
            payload: {
                examSessionId,
                studentId: ticketData.studentId,
                studentName: ticketData.studentName,
                paperCode,
                expiresInSeconds: 90,
                timestamp: Date.now()
            }
        };
        await redis_1.redis.publish(`proctor_room:${examSessionId}`, JSON.stringify(proctorNotification));
        broadcastToRoom(`proctor_room:${examSessionId}`, proctorNotification);
        return reply.send({
            qrPayloadUrl,
            paperCode,
            expiresInSeconds: 90,
            ticket
        });
    });
    // 2. Mobile uploads captured drawing
    app.post("/api/v1/exams/upload-capture", async (req, reply) => {
        let data;
        try {
            data = await req.file();
        }
        catch (e) {
            return reply.status(400).send({ error: "Invalid multipart payload." });
        }
        if (!data) {
            return reply.status(400).send({ error: "No image file uploaded." });
        }
        const ticket = data.fields.ticket?.value;
        if (!ticket) {
            return reply.status(400).send({ error: "Missing upload ticket parameter." });
        }
        // Atomic lookup & burn using GETDEL (Redis 6.2+ / Lua script fallback)
        const rawTicket = await redis_1.redis.getdel(`upload_ticket:${ticket}`);
        if (!rawTicket) {
            return reply.status(410).send({ error: "Upload session expired or already completed." });
        }
        const { examSessionId, questionId, paperCode, studentId, studentName } = JSON.parse(rawTicket);
        const buffer = await data.toBuffer();
        // Verify buffer magic bytes
        if (!isValidImageHeader(buffer)) {
            return reply.status(415).send({ error: "Invalid file type. Only JPEG, PNG, and WebP images are permitted." });
        }
        // Image optimization via Sharp (with EXIF auto-rotation)
        const optimizedWebP = await (0, sharp_1.default)(buffer)
            .rotate() // Auto-rotate portrait/landscape based on EXIF
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        const destinationKey = `answers/${examSessionId}/${questionId}_${Date.now()}.webp`;
        const publicUrl = await (0, storage_1.uploadToStorage)(destinationKey, optimizedWebP, "image/webp");
        // Event payload to broadcast to Desktop Exam Room & Proctor Room
        const successEventPayload = {
            event: "DRAWING_UPLOAD_SUCCESS",
            payload: {
                questionId,
                imageUrl: publicUrl,
                paperCode,
                studentId,
                studentName,
                timestamp: Date.now()
            }
        };
        // Notify Desktop Client via WebSocket / PubSub
        await redis_1.redis.publish(`exam_room:${examSessionId}`, JSON.stringify(successEventPayload));
        broadcastToRoom(`exam_room:${examSessionId}`, successEventPayload);
        // Notify Proctor Dashboard as well
        await redis_1.redis.publish(`proctor_room:${examSessionId}`, JSON.stringify(successEventPayload));
        broadcastToRoom(`proctor_room:${examSessionId}`, successEventPayload);
        return reply.send({
            success: true,
            message: "Drawing synced successfully.",
            imageUrl: publicUrl
        });
    });
    // 3. Automated Anomaly Event Endpoint (Proctoring Watchdog)
    app.post("/api/v1/exams/upload-anomaly", async (req, reply) => {
        const { examSessionId, studentId, studentName, reason } = (req.body || {});
        if (!examSessionId || !reason) {
            return reply.status(400).send({ error: "Missing examSessionId or reason parameter." });
        }
        const anomalyPayload = {
            event: "UPLOAD_ANOMALY_DETECTED",
            payload: {
                examSessionId,
                studentId: studentId || "UNKNOWN_STUDENT",
                studentName: studentName || "Student",
                reason,
                timestamp: Date.now()
            }
        };
        await redis_1.redis.publish(`proctor_room:${examSessionId}`, JSON.stringify(anomalyPayload));
        broadcastToRoom(`proctor_room:${examSessionId}`, anomalyPayload);
        return reply.send({ success: true, reported: true });
    });
    // 4. Verification Endpoint for Ticket Status
    app.get("/api/v1/exams/upload-ticket/:ticket", async (req, reply) => {
        const { ticket } = req.params;
        const rawTicket = await redis_1.redis.get(`upload_ticket:${ticket}`);
        if (!rawTicket) {
            return reply.status(404).send({ active: false, message: "Ticket invalid or expired." });
        }
        const ticketData = JSON.parse(rawTicket);
        return reply.send({
            active: true,
            paperCode: ticketData.paperCode,
            questionId: ticketData.questionId
        });
    });
}
