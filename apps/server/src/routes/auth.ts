import { FastifyInstance } from "fastify";
import { auth } from "../lib/auth";
import { toWebRequest, getSession } from "../lib/auth-middleware";

export async function authRoutes(app: FastifyInstance) {
  // Mount Better-Auth Catch-All Handler
  app.all("/api/auth/*", async (req, reply) => {
    try {
      const webReq = toWebRequest(req);
      const response = await auth.handler(webReq);

      reply.status(response.status);
      response.headers.forEach((val, key) => {
        reply.header(key, val);
      });

      const text = await response.text();
      return reply.send(text);
    } catch (err: any) {
      req.log.error(err, "Auth handler error");
      return reply.status(500).send({ error: err.message || "Internal auth error" });
    }
  });

  // Current session inspection route
  app.get("/api/auth/me", async (req, reply) => {
    const session = await getSession(req);
    if (!session) {
      return reply.status(401).send({ user: null, session: null });
    }
    return reply.send(session);
  });
}
