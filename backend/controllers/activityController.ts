
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


// Get all activities
// GET /api/activity
export const getActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const activity = await ActivityLog.find({user: req.user._id}).sort({ createdAt: -1 }).limit(10).populate("relatedPost", "content");
    res.status(200).json(new ApiResponse(200, activity, "Activities fetched successfully"));
});