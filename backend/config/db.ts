import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", async () => {
            console.log('MongoDB connected')
        })
        await mongoose.connect(process.env.MONGODB_URI!)
    }catch (err: any) {
        console.error(err)
        process.exit(1)
    }
}

export default connectDB