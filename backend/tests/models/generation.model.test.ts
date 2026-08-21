import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { Generation } from "../../models/generation.model.js";

describe("Generation model", () => {
  it("is registered under the name 'Generation'", () => {
    expect(Generation.modelName).toBe("Generation");
  });

  it("enables timestamps", () => {
    expect((Generation.schema as any).options.timestamps).toBe(true);
  });

  it("requires user, prompt and content", () => {
    const doc = new Generation({});
    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.user).toBeDefined();
    expect(err!.errors.prompt).toBeDefined();
    expect(err!.errors.content).toBeDefined();
  });

  it("passes validation when only the required fields are provided", () => {
    const doc = new Generation({
      user: new mongoose.Types.ObjectId(),
      prompt: "a sunset",
      content: "Check out this sunset! #sunset",
    });

    expect(doc.validateSync()).toBeUndefined();
  });

  it("accepts 'image' and 'video' as valid mediaType values", () => {
    for (const mediaType of ["image", "video"]) {
      const doc = new Generation({
        user: new mongoose.Types.ObjectId(),
        prompt: "a sunset",
        content: "text",
        mediaType,
      });

      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("rejects mediaType values outside of the enum", () => {
    const doc = new Generation({
      user: new mongoose.Types.ObjectId(),
      prompt: "a sunset",
      content: "text",
      mediaType: "audio",
    });

    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.mediaType).toBeDefined();
  });

  it("allows mediaUrl and tone to be omitted", () => {
    const doc = new Generation({
      user: new mongoose.Types.ObjectId(),
      prompt: "a sunset",
      content: "text",
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.mediaUrl).toBeUndefined();
    expect(doc.tone).toBeUndefined();
  });
});