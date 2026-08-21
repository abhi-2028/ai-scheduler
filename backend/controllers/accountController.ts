
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";  
import { ApiResponse } from "../utils/ApiResponse.js";
import zernio from "../config/zernio.js";
import { ApiError } from "../utils/ApiError.js";

// Get all accounts
// Get /api/accounts
export const getAccounts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const accounts = await Account.find({ user: req.user._id });
    res.json(new ApiResponse(200, accounts, "Accounts fetched successfully"));
});

// Add Account
// POST /api/accounts
export const addAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { platform, handle, avatarUrl } = req.body;
    const account = await Account.create({
        user: req.user._id,
        platform,
        handle,
        avatarUrl
    });
    res.status(201).json(new ApiResponse(201, account, "Account added successfully"));
});

// Disconnect Account
// DELETE /api/accounts/:id
export const disconnectAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) {
        res.status(404).json(new ApiResponse(404, null, "Account not found"));
        return;
    }
    if(account.zernioAccountId) {
        try {
            await zernio.accounts.deleteAccount({path: {accountId: account.zernioAccountId}});
        }catch (error: any) {
            res.status(500).json(new ApiError(500, "Failed to disconnect account from Zernio: " + error.message));
            return;
        }
    }
    await account.deleteOne();
    res.json(new ApiResponse(200, null, "Account disconnected successfully"));
});