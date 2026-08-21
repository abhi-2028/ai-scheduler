import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { configMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: configMock,
    uploader: {},
  },
}));

const ORIGINAL_ENV = { ...process.env };

describe("config/cloudinary", () => {
  beforeEach(() => {
    vi.resetModules();
    configMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("configures cloudinary using the CLOUDINARY_* environment variables", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "my-cloud";
    process.env.CLOUDINARY_API_KEY = "my-key";
    process.env.CLOUDINARY_API_SECRET = "my-secret";

    const { cloudinary } = await import("../../config/cloudinary.js");

    expect(configMock).toHaveBeenCalledTimes(1);
    expect(configMock).toHaveBeenCalledWith({
      cloud_name: "my-cloud",
      api_key: "my-key",
      api_secret: "my-secret",
    });
    expect(cloudinary.config).toBe(configMock);
  });

  it("passes through undefined values when the environment variables are missing", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    await import("../../config/cloudinary.js");

    expect(configMock).toHaveBeenCalledWith({
      cloud_name: undefined,
      api_key: undefined,
      api_secret: undefined,
    });
  });

  it("only configures cloudinary once per module load", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "my-cloud";

    await import("../../config/cloudinary.js");
    // Re-importing without resetting modules should not re-trigger config,
    // since ES modules are cached after the first evaluation.
    await import("../../config/cloudinary.js");

    expect(configMock).toHaveBeenCalledTimes(1);
  });
});