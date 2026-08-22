import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    mediaUrl: {
        type: String,
    },  
    mediaType: {
        type: String,
        enum: ['image', 'video'],
    },
    platform: {
        type: String,
        enum: ['twitter', 'linkedin', 'facebook', 'instagram'],
    },
    scheduledFor: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['scheduled', 'draft', 'failed', 'published'],
        default: 'scheduled',
    },
}, { timestamps: true });

export const Post = mongoose.model('Post', postSchema);