
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import zernio from "../config/zernio.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

// to Ensure user has a zernio profile
const getORCreateZernioProfile = asyncHandler(async (user: any): Promise<string> => {
    const result = await zernio.profiles.listProfiles();

    const data = result.data as any;

    const profiles: any[] = Array.isArray(data) ? data : data?.profiles || data?.data || [];

    if(profiles.length > 0) {
        const pid = profiles[0]._id || profiles[0].id;
        await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
        return pid; 
    }

    const createResult = await zernio.profiles.createProfile({
        body: {
            name: `${user.name || user.email}'s workspace` as any,
        }
    });

    const created = (createResult.data as any)?.profile || createResult.data;

    const pid = created?._id || created?.id;

    if(!pid) {
        throw new ApiError(500, 'Failed to create Zernio profile - no ID returned');
    }

    await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
    return pid;
});

// Generate OAuth authorization Url
// GET /api/auth/:platform
export const generateAuthUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { platform } = req.params;
    const profileId = await getORCreateZernioProfile(req.user);

    const origin = req.headers.origin;

    const redirectUri = `${origin}/accounts`;

    const result = await zernio.connect.getConnectUrl({
        path: {platform: platform as any},
        query: {
            profileId,
            redirect_url: redirectUri,
        }
    })

    const data = result.data as any;
    console.log('getConnectUrl response:', JSON.stringify(data, null, 2));

    const authUrl = data.authUrl;

    if(!authUrl) {
        throw new ApiError(500, `Failed to generate auth URL - no authUrl returned : ${JSON.stringify(data)}`);
    }

    res.json({ url: authUrl });
});