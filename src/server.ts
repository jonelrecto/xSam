import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { uploadGatewayRoutes, activeSockets } from "./routes/uploadGateway";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = Fastify({
  logger: true
});

async function startServer() {
  // Register Plugins
  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024 // 15MB max input upload limit
    }
  });
  await app.register(fastifyWebsocket);

  // Serve static assets from public/ directory
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  await app.register(fastifyStatic, {
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
    const { roomType, roomId } = (req.params || {}) as { roomType: string; roomId: string };
    const roomKey = `${roomType}:${roomId}`;

    if (!activeSockets.has(roomKey)) {
      activeSockets.set(roomKey, new Set());
    }
    activeSockets.get(roomKey)!.add(connection.socket);

    connection.socket.on("close", () => {
      const roomSockets = activeSockets.get(roomKey);
      if (roomSockets) {
        roomSockets.delete(connection.socket);
        if (roomSockets.size === 0) {
          activeSockets.delete(roomKey);
        }
      }
    });
  });

  // Register API Routes
  await app.register(uploadGatewayRoutes);

  // Health Check
  app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Ephemeral QR Upload Gateway running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
