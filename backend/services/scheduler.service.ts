import cron from "node-cron";
import { Post } from "../models/post.model.js";
import { Account } from "../models/account.model.js";
import zernio from "../config/zernio.js";
import { ApiError } from "../utils/ApiError.js";
import { ActivityLog } from "../models/activityLog.model.js";

export const initScheduler = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            const postsToPublish = await Post.find({
                status: "scheduled",
                scheduledFor: { 
                    $lte: now  // lte -> less than or equal to
                }
            })

            for (const post of postsToPublish) {
                try {
                    const accounts = await Account.find({
                        user: post.user,
                        platforms: { $in: post.platform },
                        status: "connected",
                        zernioAccountId: { $exists: true }
                    })

                    if (accounts.length === 0) {
                        console.log(`No connected Zernio accounts found for post ${post._id}. Skipping...`);
                        continue;
                    }

                    const zernioPlatforms = accounts.map((acc) => ({
                        tform: acc.platform as any,
                        accountId: acc.zernioAccountId!
                    }))

                    const payload = {
                        content: post.content,
                        publishNow: true,
                        ...(post.mediaUrl ? { mediaItems: [{ type: post.mediaType || "image", url: post.mediaUrl }] } : {}),
                        platforms: zernioPlatforms,
                    }

                    console.log(`Publishing post ${post._id} to Zernio with media: ${post.mediaUrl || "none"}`);

                    const response = await zernio.posts.createPost({
                        body: payload
                    }) 

                    const publishedPost = (response.data as any).post || response.data;

                    if(!publishedPost) {
                        throw new ApiError(500, "Failed to publish post via Zernio");
                    }

                    console.log(`Zernio post created: ${publishedPost._id || publishedPost.id}`);

                    post.status = "published";
                    await post.save();

                    await ActivityLog.create({
                        user: post.user,
                        actionType: "POST_PUBLISHED",
                        description: `Published post to ${accounts.map((a) => a.platform).join(", ")}`,
                        relatedPost: post._id,
                    }) 
                } catch (error: any) {
                    console.error(`Failed to publish post ${post._id}: `, error?.response?.data || error?.message || error);
                    post.status = "failed";
                    await post.save();
                }
            }

            if(postsToPublish.length > 0) {
                console.log(`Evaluated ${postsToPublish.length} posts at ${now.toISOString()}`);
            }
        } catch (error: any) {
            console.error("Error in scheduler:", error);
        }
    })

    console.log("Scheduler initialized and running every minute.");
}