import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { Post } from "../../models/post.model.js";

describe("Post model", () => {
  it("is registered under the name 'Post'", () => {
    expect(Post.modelName).toBe("Post");
  });

  it("enables timestamps", () => {
    expect((Post.schema as any).options.timestamps).toBe(true);
  });

  it("requires user, content and scheduledFor", () => {
    const doc = new Post({});
    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.user).toBeDefined();
    expect(err!.errors.content).toBeDefined();
    expect(err!.errors.scheduledFor).toBeDefined();
  });

  it("passes validation when only the required fields are provided", () => {
    const doc = new Post({
      user: new mongoose.Types.ObjectId(),
      content: "hello world",
      scheduledFor: new Date("2030-01-01"),
    });

    expect(doc.validateSync()).toBeUndefined();
  });

  it("defaults status to 'scheduled'", () => {
    const doc = new Post({
      user: new mongoose.Types.ObjectId(),
      content: "hello world",
      scheduledFor: new Date("2030-01-01"),
    });

    expect(doc.status).toBe("scheduled");
  });

  it("accepts every documented platform value", () => {
    for (const platform of ["twitter", "linkedin", "facebook", "instagram"]) {
      const doc = new Post({
        user: new mongoose.Types.ObjectId(),
        content: "hello world",
        scheduledFor: new Date("2030-01-01"),
        platform,
      });

      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("rejects platform values outside of the enum", () => {
    const doc = new Post({
      user: new mongoose.Types.ObjectId(),
      content: "hello world",
      scheduledFor: new Date("2030-01-01"),
      platform: "tiktok",
    });

    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.platform).toBeDefined();
  });

  it("rejects status values outside of the enum", () => {
    const doc = new Post({
      user: new mongoose.Types.ObjectId(),
      content: "hello world",
      scheduledFor: new Date("2030-01-01"),
      status: "archived",
    });

    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.status).toBeDefined();
  });

  it("rejects mediaType values outside of the enum", () => {
    const doc = new Post({
      user: new mongoose.Types.ObjectId(),
      content: "hello world",
      scheduledFor: new Date("2030-01-01"),
      mediaType: "audio",
    });

    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.mediaType).toBeDefined();
  });
});