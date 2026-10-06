import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "./auth";
import type { Role } from "@xsam/shared";

export function toWebRequest(req: FastifyRequest): Request {
  const protocol = req.protocol;
  const host = req.hostname;
  const url = `${protocol}://${host}${req.raw.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  const method = req.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody && req.body !== undefined
    ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body))
    : undefined;

  return new Request(url, {
    method,
    headers,
    body,
  });
}

export async function getSession(req: FastifyRequest) {
  try {
    const webReq = toWebRequest(req);
    return await auth.api.getSession({ headers: webReq.headers });
  } catch (error) {
    return null;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const session = await getSession(req);
  if (!session || !session.user) {
    reply.status(401).send({ error: "Unauthorized: Please log in." });
    return null;
  }
  return session;
}

export function requireRole(allowed: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(req, reply);
    if (!session) return null;

    const userRole = ((session.user as Record<string, unknown>).role as Role) || "student";
    if (!allowed.includes(userRole)) {
      reply.status(403).send({ error: "Forbidden: Insufficient permissions." });
      return null;
    }

    return session;
  };
}
