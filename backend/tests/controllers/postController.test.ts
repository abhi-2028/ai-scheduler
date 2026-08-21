import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockRes, createMockNext } from "../testUtils.js";

const { generateContentMock, GoogleGenAIMock, axiosMock, cloudinaryMock, GenerationMock, PostMock } = vi.hoisted(
  () => {
    const generateContentMock = vi.fn();
    const GoogleGenAIMock = vi.fn().mockImplementation(() => ({
      models: { generateContent: generateContentMock },
    }));
    const axiosMock = { get: vi.fn(), post: vi.fn() };
    const cloudinaryMock = {
      uploader: {
        upload: vi.fn(),
        upload_stream: vi.fn(),
      },
    };
    const GenerationMock = { create: vi.fn(), find: vi.fn() };
    const PostMock = { create: vi.fn(), find: vi.fn() };
    return { generateContentMock, GoogleGenAIMock, axiosMock, cloudinaryMock, GenerationMock, PostMock };
  }
);

vi.mock("@google/genai", () => ({ GoogleGenAI: GoogleGenAIMock }));
vi.mock("axios", () => ({ default: axiosMock }));
vi.mock("../../config/cloudinary.js", () => ({ cloudinary: cloudinaryMock }));
vi.mock("../../models/generation.model.js", () => ({ Generation: GenerationMock }));
vi.mock("../../models/post.model.js", () => ({ Post: PostMock }));

import { generatePost, getGenerations, getPosts, schedulePost } from "../../controllers/postController.js";

const ORIGINAL_ENV = { ...process.env };

describe("postController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
  });

  describe("generatePost", () => {
    it("returns a 400 ApiError when GEMINI_API_KEY is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun" } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("GEMINI_API_KEY is not set in environment variables");
      expect(GoogleGenAIMock).not.toHaveBeenCalled();
    });

    it("creates a text-only generation when generateImage is false", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ content: "A lovely cat post! #cat", imagePrompt: "a cat" }),
      });
      GenerationMock.create.mockResolvedValue({ _id: "gen1", content: "A lovely cat post! #cat" });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: false } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(GenerationMock.create).toHaveBeenCalledWith({
        user: "user1",
        prompt: "a cat",
        content: "A lovely cat post! #cat",
        mediaUrl: "",
        mediaType: undefined,
        tone: "fun",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Post generated successfully");
      expect(next).not.toHaveBeenCalled();
      expect(axiosMock.post).not.toHaveBeenCalled();
    });

    it("falls back to the raw text when the model response contains no JSON braces", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      generateContentMock.mockResolvedValue({ text: "just plain text, no json here" });
      GenerationMock.create.mockResolvedValue({ _id: "gen2" });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: false } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(GenerationMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: "just plain text, no json here" })
      );
    });

    it("falls back to the full raw text when the matched JSON fails to parse", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      const rawText = "{content: unquoted, this is not valid json}";
      generateContentMock.mockResolvedValue({ text: rawText });
      GenerationMock.create.mockResolvedValue({ _id: "gen5" });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: false } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(GenerationMock.create).toHaveBeenCalledWith(expect.objectContaining({ content: rawText }));
    });

    it("uploads the generated image to cloudinary when generateImage is true and the job completes immediately", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.LEONARDO_API_KEY = "leo-key";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ content: "Cats are great", imagePrompt: "a fluffy cat" }),
      });
      axiosMock.post.mockResolvedValue({ data: { generate: { generationId: "gen-123" } } });
      axiosMock.get.mockResolvedValue({
        data: {
          generations_by_pk: {
            status: "COMPLETE",
            generated_images: [{ url: "https://leonardo.ai/tmp-image.png" }],
          },
        },
      });
      cloudinaryMock.uploader.upload.mockResolvedValue({ secure_url: "https://cdn/ai-generations/final.png" });
      GenerationMock.create.mockResolvedValue({ _id: "gen3" });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: true } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(axiosMock.post).toHaveBeenCalledWith(
        "https://cloud.leonardo.ai/api/rest/v2/generations",
        expect.objectContaining({ parameters: expect.objectContaining({ prompt: "a fluffy cat" }) }),
        expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer leo-key" }) })
      );
      expect(cloudinaryMock.uploader.upload).toHaveBeenCalledWith("https://leonardo.ai/tmp-image.png", {
        folder: "ai-generations",
      });
      expect(GenerationMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrl: "https://cdn/ai-generations/final.png", mediaType: "image" })
      );
      expect(res.statusCode).toBe(201);
    });

    it("skips image generation entirely when LEONARDO_API_KEY is not configured", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      delete process.env.LEONARDO_API_KEY;
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ content: "Cats are great", imagePrompt: "a fluffy cat" }),
      });
      GenerationMock.create.mockResolvedValue({ _id: "gen4" });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: true } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(GenerationMock.create).toHaveBeenCalledWith(expect.objectContaining({ mediaUrl: "" }));
    });

    it("forwards an ApiError to next when the Leonardo generation status is FAILED", async () => {
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.LEONARDO_API_KEY = "leo-key";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ content: "Cats are great", imagePrompt: "a fluffy cat" }),
      });
      axiosMock.post.mockResolvedValue({ data: { generate: { generationId: "gen-fail" } } });
      axiosMock.get.mockResolvedValue({ data: { generations_by_pk: { status: "FAILED" } } });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: true } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next.mock.calls[0][0]).toMatchObject({
        statusCode: 500,
        message: "Error occurred while generating image",
      });
      expect(GenerationMock.create).not.toHaveBeenCalled();
    });

    it("times out with an ApiError after exhausting retries when the job never completes", async () => {
      vi.useFakeTimers();
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.LEONARDO_API_KEY = "leo-key";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ content: "Cats are great", imagePrompt: "a fluffy cat" }),
      });
      axiosMock.post.mockResolvedValue({ data: { generate: { generationId: "gen-pending" } } });
      axiosMock.get.mockResolvedValue({ data: { generations_by_pk: { status: "PENDING" } } });

      const req: any = { user: { _id: "user1" }, body: { prompt: "a cat", tone: "fun", generateImage: true } };
      const res = createMockRes();
      const next = createMockNext();

      generatePost(req, res as any, next);
      await vi.runAllTimersAsync();
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next.mock.calls[0][0]).toMatchObject({
        statusCode: 500,
        message: "Error occurred while generating image",
      });
    }, 15000);
  });

  describe("getGenerations", () => {
    it("returns generations for the current user sorted by creation date descending", async () => {
      const generations = [{ _id: "g1" }, { _id: "g2" }];
      const sortMock = vi.fn().mockResolvedValue(generations);
      GenerationMock.find.mockReturnValue({ sort: sortMock });

      const req: any = { user: { _id: "user1" } };
      const res = createMockRes();
      const next = createMockNext();

      getGenerations(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(GenerationMock.find).toHaveBeenCalledWith({ user: "user1" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.body).toMatchObject({ statusCode: 200, data: generations });
    });
  });

  describe("getPosts", () => {
    it("returns posts scoped to the current user", async () => {
      const posts = [{ _id: "p1" }];
      PostMock.find.mockResolvedValue(posts);

      const req: any = { user: { _id: "user1" } };
      const res = createMockRes();
      const next = createMockNext();

      getPosts(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(PostMock.find).toHaveBeenCalledWith({ user: "user1" });
      expect(res.body).toMatchObject({ statusCode: 200, data: posts });
    });
  });

  describe("schedulePost", () => {
    it("creates a post using an already-parsed platform array", async () => {
      const created = { _id: "post1" };
      PostMock.create.mockResolvedValue(created);

      const req: any = {
        user: { _id: "user1" },
        body: { content: "hello", platform: ["twitter", "linkedin"], scheduledFor: "2030-01-01", status: "draft" },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(PostMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ platform: ["twitter", "linkedin"], content: "hello", status: "draft" })
      );
      expect(res.statusCode).toBe(201);
    });

    it("parses a stringified platform array coming from FormData", async () => {
      PostMock.create.mockResolvedValue({ _id: "post2" });

      const req: any = {
        user: { _id: "user1" },
        body: {
          content: "hello",
          platform: JSON.stringify(["facebook"]),
          scheduledFor: "2030-01-01",
          status: "scheduled",
        },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(PostMock.create).toHaveBeenCalledWith(expect.objectContaining({ platform: ["facebook"] }));
    });

    it("forwards a 400 ApiError to next when the platform string is not valid JSON", async () => {
      const req: any = {
        user: { _id: "user1" },
        body: { content: "hello", platform: "not-json", scheduledFor: "2030-01-01" },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next.mock.calls[0][0]).toMatchObject({
        statusCode: 400,
        message: "Invalid platform format. Expected an array or a stringified array.",
      });
      expect(PostMock.create).not.toHaveBeenCalled();
    });

    it("uploads an attached file to cloudinary and stores the resulting image media info", async () => {
      cloudinaryMock.uploader.upload_stream.mockImplementation((_options: any, callback: any) => ({
        end: () => callback(null, { secure_url: "https://cdn/social-scheduler/image.png", resource_type: "image" }),
      }));
      PostMock.create.mockResolvedValue({ _id: "post3" });

      const req: any = {
        user: { _id: "user1" },
        body: { content: "hello", platform: ["instagram"], scheduledFor: "2030-01-01" },
        file: { buffer: Buffer.from("fake-image-bytes") },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(cloudinaryMock.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({ resource_type: "auto", folder: "social-scheduler" }),
        expect.any(Function)
      );
      expect(PostMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrl: "https://cdn/social-scheduler/image.png", mediaType: "image" })
      );
    });

    it("falls back to video mediaType when cloudinary reports a non-image resource type", async () => {
      cloudinaryMock.uploader.upload_stream.mockImplementation((_options: any, callback: any) => ({
        end: () => callback(null, { secure_url: "https://cdn/social-scheduler/video.mp4", resource_type: "video" }),
      }));
      PostMock.create.mockResolvedValue({ _id: "post4" });

      const req: any = {
        user: { _id: "user1" },
        body: { content: "hello", platform: ["twitter"], scheduledFor: "2030-01-01" },
        file: { buffer: Buffer.from("fake-video-bytes") },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(PostMock.create).toHaveBeenCalledWith(expect.objectContaining({ mediaType: "video" }));
    });

    it("forwards the upload error to next when the cloudinary upload_stream fails", async () => {
      const uploadError = new Error("cloudinary is down");
      cloudinaryMock.uploader.upload_stream.mockImplementation((_options: any, callback: any) => ({
        end: () => callback(uploadError),
      }));

      const req: any = {
        user: { _id: "user1" },
        body: { content: "hello", platform: ["instagram"], scheduledFor: "2030-01-01" },
        file: { buffer: Buffer.from("fake-image-bytes") },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next).toHaveBeenCalledWith(uploadError);
      expect(PostMock.create).not.toHaveBeenCalled();
    });

    it("uses mediaUrl/mediaType passed directly in the body when no file is attached", async () => {
      PostMock.create.mockResolvedValue({ _id: "post5" });

      const req: any = {
        user: { _id: "user1" },
        body: {
          content: "hello",
          platform: ["twitter"],
          scheduledFor: "2030-01-01",
          mediaUrl: "https://cdn/already-uploaded.png",
          mediaType: "image",
        },
      };
      const res = createMockRes();
      const next = createMockNext();

      schedulePost(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(cloudinaryMock.uploader.upload_stream).not.toHaveBeenCalled();
      expect(PostMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrl: "https://cdn/already-uploaded.png", mediaType: "image" })
      );
    });
  });
});