import mongoose from 'mongoose';

const generationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    prompt: {
        type: String,
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
    tone: {
        type: String,
    },
}, { timestamps: true });

export const Generation = mongoose.model('Generation', generationSchema);