import request from "supertest";
import { describe, it, expect, vi, beforeAll } from "vitest";

// `server.ts` creates the Express app, mounts every router, and immediately
// calls `startServer()` (which connects to MongoDB and calls `app.listen`).
// To exercise the routing wiring added in this PR (accountRouter/postRouter)
// without touching a real database or binding a real port, we:
//   1. Mock `connectDB` so no real Mongo connection is attempted.
//   2. Mock every router module with a minimal stub router so we can assert
//      on *where* each router is mounted, independent of its own internals
//      (which are covered by their dedicated route/controller tests).
//   3. Wrap the real `express` factory so we can capture the created `app`
//      instance and stub out `app.listen` to avoid binding a real port.
let capturedApp: any;

const { connectDBMock } = vi.hoisted(() => ({
  connectDBMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../config/db.js", () => ({ default: connectDBMock }));

vi.mock("../routes/authRoutes.js", async () => {
  const actualExpress: any = await vi.importActual("express");
  const router = actualExpress.default.Router();
  router.get("/ping", (_req: any, res: any) => res.json({ router: "auth" }));
  return { default: router };
});

vi.mock("../routes/socialAuthRoutes.js", async () => {
  const actualExpress: any = await vi.importActual("express");
  const router = actualExpress.default.Router();
  router.get("/ping", (_req: any, res: any) => res.json({ router: "oauth" }));
  return { default: router };
});

vi.mock("../routes/accountRoutes.js", async () => {
  const actualExpress: any = await vi.importActual("express");
  const router = actualExpress.default.Router();
  router.get("/ping", (_req: any, res: any) => res.json({ router: "accounts" }));
  return { default: router };
});

vi.mock("../routes/postRoutes.js", async () => {
  const actualExpress: any = await vi.importActual("express");
  const router = actualExpress.default.Router();
  router.get("/ping", (_req: any, res: any) => res.json({ router: "posts" }));
  return { default: router };
});

vi.mock("express", async () => {
  const actual: any = await vi.importActual("express");
  const wrapped: any = (...args: any[]) => {
    const app = actual.default(...args);
    app.listen = vi.fn((..._listenArgs: any[]) => {
      const cb = _listenArgs.find((a) => typeof a === "function");
      if (cb) cb();
      return { close: vi.fn() };
    });
    capturedApp = app;
    return app;
  };
  wrapped.Router = actual.default.Router;
  wrapped.json = actual.default.json;
  wrapped.static = actual.default.static;
  return { ...actual, default: wrapped };
});

describe("server.ts route mounting", () => {
  beforeAll(async () => {
    await import("../server.js");
    await vi.waitFor(() => expect(capturedApp).toBeDefined());
    await vi.waitFor(() => expect(connectDBMock).toHaveBeenCalled());
  });

  it("mounts accountRouter at /api/accounts", async () => {
    const res = await request(capturedApp).get("/api/accounts/ping");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ router: "accounts" });
  });

  it("mounts postRouter at /api/posts", async () => {
    const res = await request(capturedApp).get("/api/posts/ping");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ router: "posts" });
  });

  it("still mounts the pre-existing auth and oauth routers", async () => {
    const authRes = await request(capturedApp).get("/api/auth/ping");
    expect(authRes.body).toEqual({ router: "auth" });

    const oauthRes = await request(capturedApp).get("/api/oauth/ping");
    expect(oauthRes.body).toEqual({ router: "oauth" });
  });

  it("responds on the root health-check path", async () => {
    const res = await request(capturedApp).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toBe("Server is Live!");
  });

  it("starts the server only after connecting to the database", () => {
    expect(connectDBMock).toHaveBeenCalledTimes(1);
    expect(capturedApp.listen).toHaveBeenCalled();
  });
});