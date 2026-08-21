import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { protectMock, generateAuthUrlMock, syncAccountsMock } = vi.hoisted(() => ({
  protectMock: vi.fn((req: any, _res: any, next: any) => {
    req.protectCalled = true;
    next();
  }),
  generateAuthUrlMock: vi.fn((req: any, res: any) =>
    res.status(200).json({ handler: "generateAuthUrl", platform: req.params.platform, protected: !!req.protectCalled })
  ),
  syncAccountsMock: vi.fn((req: any, res: any) =>
    res.status(200).json({ handler: "syncAccounts", protected: !!req.protectCalled })
  ),
}));

vi.mock("../../middlewares/authMiddleware.js", () => ({ protect: protectMock }));
vi.mock("../../controllers/socialAuthController.js", () => ({
  generateAuthUrl: generateAuthUrlMock,
  syncAccounts: syncAccountsMock,
}));

import socialAuthRouter from "../../routes/socialAuthRoutes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/oauth", socialAuthRouter);
  return app;
}

describe("socialAuthRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies protect as router-level middleware before generateAuthUrl on GET /:platform/url", async () => {
    const res = await request(buildApp()).get("/api/oauth/twitter/url");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(generateAuthUrlMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "generateAuthUrl", platform: "twitter", protected: true });
  });

  it("applies protect as router-level middleware before syncAccounts on GET /sync", async () => {
    const res = await request(buildApp()).get("/api/oauth/sync");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(syncAccountsMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "syncAccounts", protected: true });
  });

  it("never reaches generateAuthUrl when protect blocks the request", async () => {
    protectMock.mockImplementationOnce((_req: any, res: any) => {
      res.status(401).json({ message: "Not authorized" });
    });

    const res = await request(buildApp()).get("/api/oauth/linkedin/url");

    expect(res.status).toBe(401);
    expect(generateAuthUrlMock).not.toHaveBeenCalled();
  });

  it("never reaches syncAccounts when protect blocks the request", async () => {
    protectMock.mockImplementationOnce((_req: any, res: any) => {
      res.status(401).json({ message: "Not authorized" });
    });

    const res = await request(buildApp()).get("/api/oauth/sync");

    expect(res.status).toBe(401);
    expect(syncAccountsMock).not.toHaveBeenCalled();
  });
});