import "dotenv/config";

const requiredEnv = (name: string): string => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

export const getJwtSecret = (): string => requiredEnv("JWT_SECRET");

export const validateEnvironment = (): void => {
    requiredEnv("JWT_SECRET");
    requiredEnv("MONGODB_URI");
};
