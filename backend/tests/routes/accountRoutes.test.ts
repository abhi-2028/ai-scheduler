import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { protectMock, getAccountsMock, addAccountMock, disconnectAccountMock } = vi.hoisted(() => ({
  protectMock: vi.fn((req: any, _res: any, next: any) => {
    req.protectCalled = true;
    next();
  }),
  getAccountsMock: vi.fn((req: any, res: any) =>
    res.status(200).json({ handler: "getAccounts", protected: !!req.protectCalled })
  ),
  addAccountMock: vi.fn((req: any, res: any) =>
    res.status(201).json({ handler: "addAccount", protected: !!req.protectCalled, body: req.body })
  ),
  disconnectAccountMock: vi.fn((req: any, res: any) =>
    res.status(200).json({ handler: "disconnectAccount", id: req.params.id, protected: !!req.protectCalled })
  ),
}));

vi.mock("../../middlewares/authMiddleware.js", () => ({ protect: protectMock }));
vi.mock("../../controllers/accountController.js", () => ({
  getAccounts: getAccountsMock,
  addAccount: addAccountMock,
  disconnectAccount: disconnectAccountMock,
}));

import accountRouter from "../../routes/accountRoutes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/accounts", accountRouter);
  return app;
}

describe("accountRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes GET / through protect and getAccounts", async () => {
    const res = await request(buildApp()).get("/api/accounts");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(getAccountsMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "getAccounts", protected: true });
  });

  it("routes POST / through protect and addAccount", async () => {
    const res = await request(buildApp())
      .post("/api/accounts")
      .send({ platform: "twitter", handle: "@me" });

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(addAccountMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ handler: "addAccount", protected: true });
  });

  it("routes DELETE /:id through protect and disconnectAccount", async () => {
    const res = await request(buildApp()).delete("/api/accounts/abc123");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(disconnectAccountMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "disconnectAccount", id: "abc123", protected: true });
  });

  it("never reaches the controller when protect blocks the request", async () => {
    protectMock.mockImplementationOnce((_req: any, res: any) => {
      res.status(401).json({ message: "Not authorized" });
    });

    const res = await request(buildApp()).get("/api/accounts");

    expect(res.status).toBe(401);
    expect(getAccountsMock).not.toHaveBeenCalled();
  });
});