
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import zernio from "../config/zernio.js";
import { User } from "../models/user.model.js";
import { Account } from "../models/account.model.js";
import { ApiError } from "../utils/ApiError.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";

// to Ensure user has a zernio profile
const getOrCreateZernioProfile = async (user: any): Promise<string> => {

    try{
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
    }catch(error: any) {
        console.error('Error in getOrCreateZernioProfile:', error);
        throw new ApiError(500, 'Failed to get or create Zernio profile');
    }
};

// Generate OAuth authorization Url
// GET /api/auth/:platform
export const generateAuthUrl = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { platform } = req.params;
    const profileId = await getOrCreateZernioProfile(req.user);

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


// Sync connected accounts from zernio into MongoDB
// GET /api/auth/sync

export const syncAccounts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const profileId = await getOrCreateZernioProfile(req.user);

    const result = await zernio.accounts.listAccounts({
        query: {
            profileId,
        } as any
    });

    const data = result.data as any;
    const zernioAccounts: any[] = Array.isArray(data) ? data : data?.accounts || data?.data || [];

    const supportedPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
    const syncedAccounts = [];

    for(const zAccount of zernioAccounts) {
        const zid = zAccount._id || zAccount.id;
        if(!zid) {
            console.warn('Skipping account with no ID:', zAccount);
            continue;
        }

        const rawPlatform = (zAccount.platform || zAccount.type || "").toLowerCase();

        const normalizedPlatform = supportedPlatforms.find(p => rawPlatform.includes(p));

        if(!normalizedPlatform) {
            console.log(`Skipping unsupported platform: "${rawPlatform}"`);
            continue;
        }

        const account = await Account.findOneAndUpdate(
            { zernioAccountId: zid },
            {
                user: req.user._id,
                platform: normalizedPlatform,
                handle: zAccount.handle || zAccount.username || zAccount.name || '',    
                zernioAccountId: zid,
                status: zAccount.status || 'connected',
                avatarUrl: zAccount.avatarUrl || zAccount.profile_image_url || zAccount.picture || '',
            },
            { upsert: true, returnDocument: 'after' }
        )
        syncedAccounts.push(account);
    }

    res.json({ accounts: syncedAccounts });
});