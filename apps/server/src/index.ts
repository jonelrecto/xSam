import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { client } from "@xsam/db";
import { authRoutes } from "./routes/auth";
import { teacherExamRoutes } from "./routes/teacherExams";
import { teacherBankRoutes } from "./routes/teacherBank";
import { teacherClassesRoutes } from "./routes/teacherClasses";
import { teacherGradingRoutes } from "./routes/teacherGrading";
import { teacherImportRoutes } from "./routes/teacherImport";
import { studentExamRoutes } from "./routes/studentExam";
import { uploadGatewayRoutes } from "./routes/uploadGateway";
import { handleExamWebSocket, activeProctorSockets } from "./websocket/examRoom";

dotenv.config();

const PORT = parseInt(
  process.env.SERVER_PORT || (process.env.PORT === "3000" ? "4000" : process.env.PORT) || "4000",
  10
);
const HOST = process.env.HOST || "0.0.0.0";

const app = Fastify({
  logger: process.env.NODE_ENV !== "production",
});

async function startServer() {
  // 1. Core Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Support empty or optional JSON bodies gracefully (e.g. DELETE / POST with no body)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    if (!body || (typeof body === "string" && body.trim() === "")) {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB max file upload limit
    },
  });

  await app.register(fastifyWebsocket);

  // 2. Static uploads directory
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
  });

  // 3. Health & Diagnostic Endpoints
  app.get("/api/health", async () => {
    return {
      status: "ok",
      service: "xsam-server",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/api/health/db", async () => {
    try {
      await client`SELECT 1`;
      return { status: "connected", database: "postgresql" };
    } catch (err: any) {
      return { status: "error", message: err?.message };
    }
  });

  // 4. Register API Routes
  await app.register(authRoutes);
  await app.register(teacherExamRoutes);
  await app.register(teacherBankRoutes);
  await app.register(teacherClassesRoutes);
  await app.register(teacherGradingRoutes);
  await app.register(teacherImportRoutes);
  await app.register(studentExamRoutes);
  await app.register(uploadGatewayRoutes);

  // 5. Duplex WebSocket Exam Room (High-Concurrency Student Sync)
  app.get("/ws/exam/:sessionId", { websocket: true }, (connection, req) => {
    const { sessionId } = req.params as { sessionId: string };
    handleExamWebSocket(connection, sessionId);
  });

  // 6. WebSocket Teacher Proctor Monitor Room
  app.get("/ws/proctor/:examId", { websocket: true }, (connection, req) => {
    const { examId } = req.params as { examId: string };
    const ws = connection.socket;

    if (!activeProctorSockets.has(examId)) {
      activeProctorSockets.set(examId, new Set());
    }
    activeProctorSockets.get(examId)!.add(ws);

    ws.on("close", () => {
      const set = activeProctorSockets.get(examId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) activeProctorSockets.delete(examId);
      }
    });
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 XSAM High-Throughput Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
