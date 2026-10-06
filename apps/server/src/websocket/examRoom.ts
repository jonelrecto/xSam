import { WebSocket } from "ws";
import { sql } from "drizzle-orm";
import { db, examSessions, studentAnswers } from "@xsam/db";
import { redis } from "../lib/redis";

// Active in-memory WebSocket registry
export const activeExamSockets = new Map<string, Set<WebSocket>>();
export const activeProctorSockets = new Map<string, Set<WebSocket>>();

export function broadcastToExamSession(sessionId: string, payload: any) {
  const sockets = activeExamSockets.get(sessionId);
  if (sockets) {
    const msg = JSON.stringify(payload);
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }
}

export function broadcastToProctor(examId: string, payload: any) {
  const sockets = activeProctorSockets.get(examId);
  if (sockets) {
    const msg = JSON.stringify(payload);
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }
}

export function handleExamWebSocket(connection: any, sessionId: string) {
  const ws: WebSocket = connection.socket;

  if (!activeExamSockets.has(sessionId)) {
    activeExamSockets.set(sessionId, new Set());
  }
  activeExamSockets.get(sessionId)!.add(ws);

  ws.send(JSON.stringify({ type: "CONNECTED", sessionId, timestamp: Date.now() }));

  ws.on("message", async (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        // 1. High-Throughput Atomic Batch Answer Upsert
        case "ANSWER_SYNC": {
          const incoming: Array<{ questionId: string; answerText: string; clientTs: number }> =
            data.answers || [];

          if (incoming.length === 0) {
            ws.send(JSON.stringify({ type: "SYNC_ACK", savedCount: 0, timestamp: Date.now() }));
            return;
          }

          const valueTuples = incoming.map(
            (a) =>
              sql`(${sessionId}::uuid, ${a.questionId}::uuid, ${a.answerText || ""}, ${a.clientTs || Date.now()}, NOW())`
          );

          // Atomic Multi-Row SQL Batch Upsert with stale-write timestamp guard
          await db.execute(sql`
            INSERT INTO student_answers (session_id, question_id, answer_text, client_ts, updated_at)
            VALUES ${sql.join(valueTuples, sql`, `)}
            ON CONFLICT (session_id, question_id)
            DO UPDATE SET
              answer_text = EXCLUDED.answer_text,
              client_ts = EXCLUDED.client_ts,
              updated_at = NOW()
            WHERE student_answers.client_ts < EXCLUDED.client_ts;
          `);

          ws.send(
            JSON.stringify({
              type: "SYNC_ACK",
              savedCount: incoming.length,
              timestamp: Date.now(),
            })
          );
          break;
        }

        // 2. Student Heartbeat & Activity State
        case "HEARTBEAT": {
          const state = data.state || {};
          await db.execute(sql`
            UPDATE exam_sessions
            SET last_heartbeat_at = NOW(), last_state = ${JSON.stringify(state)}::jsonb
            WHERE id = ${sessionId}::uuid;
          `);

          ws.send(JSON.stringify({ type: "HEARTBEAT_ACK", timestamp: Date.now() }));
          break;
        }

        // 3. Integrity & Anti-Cheat Telemetry
        case "INTEGRITY_EVENT": {
          const eventType = data.event || "unknown_violation";
          const examId = data.examId;

          // Increment violation summary atomically in session
          await db.execute(sql`
            UPDATE exam_sessions
            SET violation_summary = jsonb_set(
              COALESCE(violation_summary, '{}'::jsonb),
              ARRAY[${eventType}],
              (COALESCE(violation_summary->>${eventType}, '0')::int + 1)::text::jsonb,
              true
            )
            WHERE id = ${sessionId}::uuid;
          `);

          // Relay to teacher proctor dashboard
          if (examId) {
            broadcastToProctor(examId, {
              type: "VIOLATION_ALERT",
              sessionId,
              studentName: data.studentName || "Student",
              event: eventType,
              timestamp: Date.now(),
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.warn(`[WS Error in session ${sessionId}]:`, err);
      ws.send(JSON.stringify({ type: "ERROR", message: "Failed to process message" }));
    }
  });

  ws.on("close", () => {
    const sessionSockets = activeExamSockets.get(sessionId);
    if (sessionSockets) {
      sessionSockets.delete(ws);
      if (sessionSockets.size === 0) {
        activeExamSockets.delete(sessionId);
      }
    }
  });
}
