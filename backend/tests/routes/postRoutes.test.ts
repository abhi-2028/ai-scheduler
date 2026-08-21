import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  protectMock,
  generatePostMock,
  getGenerationsMock,
  getPostsMock,
  schedulePostMock,
  uploadSingleMiddlewareMock,
  uploadSingleFactoryMock,
} = vi.hoisted(() => {
  const uploadSingleMiddlewareMock = vi.fn((req: any, _res: any, next: any) => {
    req.uploadCalled = true;
    next();
  });
  const uploadSingleFactoryMock = vi.fn(() => uploadSingleMiddlewareMock);

  return {
    protectMock: vi.fn((req: any, _res: any, next: any) => {
      req.protectCalled = true;
      next();
    }),
    generatePostMock: vi.fn((req: any, res: any) =>
      res.status(201).json({ handler: "generatePost", protected: !!req.protectCalled })
    ),
    getGenerationsMock: vi.fn((req: any, res: any) =>
      res.status(200).json({ handler: "getGenerations", protected: !!req.protectCalled })
    ),
    getPostsMock: vi.fn((req: any, res: any) =>
      res.status(200).json({ handler: "getPosts", protected: !!req.protectCalled })
    ),
    schedulePostMock: vi.fn((req: any, res: any) =>
      res
        .status(201)
        .json({ handler: "schedulePost", protected: !!req.protectCalled, uploaded: !!req.uploadCalled })
    ),
    uploadSingleMiddlewareMock,
    uploadSingleFactoryMock,
  };
});

vi.mock("../../middlewares/authMiddleware.js", () => ({ protect: protectMock }));
vi.mock("../../controllers/postController.js", () => ({
  generatePost: generatePostMock,
  getGenerations: getGenerationsMock,
  getPosts: getPostsMock,
  schedulePost: schedulePostMock,
}));
vi.mock("../../config/multer.js", () => ({ default: { single: uploadSingleFactoryMock } }));

import postRouter from "../../routes/postRoutes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/posts", postRouter);
  return app;
}

describe("postRoutes", () => {
  // uploadSingleFactoryMock (config/multer's `upload.single`) is invoked once,
  // synchronously, when the router module is first loaded above - it must not
  // be cleared per-test, otherwise its call history would already be wiped by
  // the time any test runs.
  beforeEach(() => {
    protectMock.mockClear();
    generatePostMock.mockClear();
    getGenerationsMock.mockClear();
    getPostsMock.mockClear();
    schedulePostMock.mockClear();
    uploadSingleMiddlewareMock.mockClear();
  });

  it("configures the upload middleware for a single 'image' field", () => {
    expect(uploadSingleFactoryMock).toHaveBeenCalledWith("image");
    expect(uploadSingleFactoryMock).toHaveBeenCalledTimes(1);
  });

  it("routes GET / through protect and getPosts", async () => {
    const res = await request(buildApp()).get("/api/posts");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(getPostsMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "getPosts", protected: true });
  });

  it("routes GET /generations through protect and getGenerations", async () => {
    const res = await request(buildApp()).get("/api/posts/generations");

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(getGenerationsMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "getGenerations", protected: true });
  });

  it("routes POST /generate through protect and generatePost without the upload middleware", async () => {
    const res = await request(buildApp()).post("/api/posts/generate").send({ prompt: "a cat" });

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(generatePostMock).toHaveBeenCalledTimes(1);
    expect(uploadSingleMiddlewareMock).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ handler: "generatePost", protected: true });
  });

  it("routes POST / through protect, the upload middleware, and then schedulePost", async () => {
    const res = await request(buildApp()).post("/api/posts").send({ content: "hello" });

    expect(protectMock).toHaveBeenCalledTimes(1);
    expect(uploadSingleMiddlewareMock).toHaveBeenCalledTimes(1);
    expect(schedulePostMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ handler: "schedulePost", protected: true, uploaded: true });
  });

  it("never reaches the controller when protect blocks the request", async () => {
    protectMock.mockImplementationOnce((_req: any, res: any) => {
      res.status(401).json({ message: "Not authorized" });
    });

    const res = await request(buildApp()).get("/api/posts");

    expect(res.status).toBe(401);
    expect(getPostsMock).not.toHaveBeenCalled();
  });
});