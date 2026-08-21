import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/generation.model.js";
import { Post } from "../models/post.model.js";

// Helper to poll Leonardo API for image generation status
const pollLeonardoJob = async (generationId: string, apiKey: string): Promise<string> => {
    const maxRetries = 20;
    const delay = 5000;

    for(let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                headers: {
                    accept: "application/json",
                    authorization: `Bearer ${apiKey}`,
            }})

            const generation = response.data.generations_by_pk;
            if(generation.status === "COMPLETE") {
                if(generation.generated_images && generation.generated_images.length > 0) {
                    return generation.generated_images[0].url;
                }

                throw new ApiError(500, "Image generation completed but no images were returned");
            }

            if(generation.status === "FAILED") {
                throw new ApiError(500, "Image generation failed");
            }
        }catch (error: any) {
            console.error("Polling error:", error?.response?.data || error.message || error);
            throw new ApiError(500, "Error occurred while polling Leonardo API");
        }

        await new Promise(resolve => setTimeout(resolve, delay));

    }

    throw new ApiError(500, "Image generation timed out");
}

// Generate Post
// POST /api/posts/generate
export const generatePost = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { prompt, tone, generateImage } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if(!apiKey){
        res.status(400).json(new ApiError(400, "GEMINI_API_KEY is not set in environment variables"));
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const textResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a social media post based on the following prompt: "${prompt}". The tone of the post should be "${tone}".
        Include relevant hashtags and emojis. The post should be engaging and suitable for social media platforms.
        Format the response as JSON with "content" and "imagePrompt" fields. The "content" field should contain the generated post text, and the "imagePrompt" field should contain a prompt for generating an image if "generateImage" is true. If "generateImage" is false, set "imagePrompt" to null.`,
    });

    let content = "";
    let imagePrompt = prompt;

    try {
        const rawText = textResponse.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {content: rawText, imagePrompt: prompt};
        content = data.content;
        imagePrompt = data.imagePrompt
    } catch (error) {
        content = textResponse.text || "";
    }

    let mediaUrl = "";
    if(generateImage) {
        try {
            const leonardoKey = process.env.LEONARDO_API_KEY;
            if(leonardoKey){
                const imageResponse = await axios.post("https://cloud.leonardo.ai/api/rest/v2/generations",
                    {
                        "public": false,
                        "model": "gpt-image-2",
                        "parameters": {
                            "quality": "LOW",
                            "prompt": imagePrompt,
                            "quantity": 1,
                            "width": 1024,
                            "height": 1024,
                            "prompt_enhance": "OFF",
                        }
                    }, {
                        headers: {
                            accept: "application/json",
                            authorization: `Bearer ${leonardoKey}`,
                            "content-type": "application/json",
                        }
                    }
                );

                const generationId = imageResponse.data.generate.generationId;
                const tempUrl = await pollLeonardoJob(generationId, leonardoKey);

                // Upload to Cloudinary for persistence
                const uploadResult = await cloudinary.uploader.upload(tempUrl, {
                    folder: "ai-generations",
                })
                mediaUrl = uploadResult.secure_url;
            }
        }catch (error: any) {
            throw new ApiError(500, "Error occurred while generating image");
        }
    }

    // Save generation to database
    const generation = await Generation.create({
        user: req.user?._id,
        prompt,
        content,
        mediaUrl,
        mediaType: mediaUrl ? "image" : undefined,
        tone,
    });

    res.status(201).json(new ApiResponse(201, generation, "Post generated successfully"));
});

// Get generations
// GET /api/posts/generations
export const getGenerations = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const generations = await Generation.find({ user: req.user?._id }).sort({ createdAt: -1 });
    res.json(new ApiResponse(200, generations, "Generations fetched successfully"));
});

// Get Posts
// GET /api/posts
export const getPosts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const posts = await Post.find({ user: req.user?._id });
    res.json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

// Schedule Post
// POST /api/posts
export const schedulePost = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { content, platform, scheduledFor, status } = req.body;

    // Parse platforms if it comes as a stringified array from FormData
    let parsedPlatforms = platform;
    if( typeof platform === "string") {
        try {
            parsedPlatforms = JSON.parse(platform);
        } catch (error) {
            throw new ApiError(400, "Invalid platform format. Expected an array or a stringified array.");
        }
    }

    let mediaUrl: string | undefined = req.body.mediaUrl;
    let mediaType: "image" | "video" | undefined = req.body.mediaType;

    if(req.file) {
        const result = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                    resource_type: "auto",
                    folder: "social-scheduler", 
                }, (error, result) => {
                    if(error) reject(error);
                    else resolve(result);
                });
            stream.end(req.file!.buffer);
        })
        mediaUrl = result.secure_url;
        mediaType = result.resource_type === "image" ? "image" : "video";
    }

    const post = await Post.create({
        user: req.user?._id,
        content,
        platform: parsedPlatforms,
        mediaUrl,
        mediaType,
        scheduledFor,
        status
    });

    res.status(201).json(new ApiResponse(201, post, "Post scheduled successfully"));
}); 