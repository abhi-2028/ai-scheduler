import { describe, it, expect, vi, beforeEach } from "vitest";

const { multerFactoryMock, memoryStorageMock, memoryStorageResult, uploadInstance } = vi.hoisted(() => {
  const memoryStorageResult = { kind: "memoryStorage" };
  const memoryStorageMock = vi.fn(() => memoryStorageResult);
  const uploadInstance = { single: vi.fn(), array: vi.fn(), fields: vi.fn() };
  const multerFactoryMock: any = vi.fn(() => uploadInstance);
  multerFactoryMock.memoryStorage = memoryStorageMock;
  return { multerFactoryMock, memoryStorageMock, memoryStorageResult, uploadInstance };
});

vi.mock("multer", () => ({ default: multerFactoryMock }));

describe("config/multer", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("builds an in-memory storage engine", async () => {
    await import("../../config/multer.js");

    expect(memoryStorageMock).toHaveBeenCalledTimes(1);
    expect(memoryStorageMock).toHaveBeenCalledWith();
  });

  it("creates the multer instance configured with the memory storage engine", async () => {
    await import("../../config/multer.js");

    expect(multerFactoryMock).toHaveBeenCalledTimes(1);
    expect(multerFactoryMock).toHaveBeenCalledWith({ storage: memoryStorageResult });
  });

  it("exports the configured multer instance as the default export", async () => {
    const upload = (await import("../../config/multer.js")).default;

    expect(upload).toBe(uploadInstance);
    expect(upload.single).toBeInstanceOf(Function);
  });
});