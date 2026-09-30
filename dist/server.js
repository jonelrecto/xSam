"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const uploadGateway_1 = require("./routes/uploadGateway");
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const app = (0, fastify_1.default)({
    logger: true
});
async function startServer() {
    // Register Plugins
    await app.register(cors_1.default, { origin: true });
    await app.register(multipart_1.default, {
        limits: {
            fileSize: 15 * 1024 * 1024 // 15MB max input upload limit
        }
    });
    await app.register(websocket_1.default);
    // Serve static assets from public/ directory
    const publicDir = path_1.default.join(process.cwd(), "public");
    if (!fs_1.default.existsSync(publicDir)) {
        fs_1.default.mkdirSync(publicDir, { recursive: true });
    }
    await app.register(static_1.default, {
        root: publicDir,
        prefix: "/"
    });
    // Mobile QR Capture UI Route
    app.get("/capture/:ticket", async (req, reply) => {
        return reply.sendFile("capture.html");
    });
    app.get("/capture", async (req, reply) => {
        return reply.sendFile("capture.html");
    });
    // WebSocket endpoint for real-time exam room & proctor pub/sub notifications
    app.get("/ws/:roomType/:roomId", { websocket: true }, (connection, req) => {
        const { roomType, roomId } = (req.params || {});
        const roomKey = `${roomType}:${roomId}`;
        if (!uploadGateway_1.activeSockets.has(roomKey)) {
            uploadGateway_1.activeSockets.set(roomKey, new Set());
        }
        uploadGateway_1.activeSockets.get(roomKey).add(connection.socket);
        connection.socket.on("close", () => {
            const roomSockets = uploadGateway_1.activeSockets.get(roomKey);
            if (roomSockets) {
                roomSockets.delete(connection.socket);
                if (roomSockets.size === 0) {
                    uploadGateway_1.activeSockets.delete(roomKey);
                }
            }
        });
    });
    // Register API Routes
    await app.register(uploadGateway_1.uploadGatewayRoutes);
    // Health Check
    app.get("/api/health", async () => {
        return { status: "ok", timestamp: new Date().toISOString() };
    });
    try {
        await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 Ephemeral QR Upload Gateway running at http://${HOST}:${PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
startServer();
