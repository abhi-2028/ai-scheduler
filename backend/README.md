# AI Scheduler Backend

The backend is a TypeScript Express API backed by MongoDB. It handles authentication, connected social accounts, AI post generation, scheduling, activity history, media uploads, and the scheduled publishing worker.

## Requirements and Commands

Install Node.js and npm. Create a `.env` file in this folder, install dependencies, then run:

```bash
npm install
npm run start     # Start the API with tsx
npm run server    # Start with nodemon for development
npm run build     # Compile TypeScript to dist/
```

The server listens on `PORT` or port `3000`. It connects to MongoDB before listening. The root health response is available at `GET /` and returns `Server is Live!`.

## Environment Variables

The following variables are read by the application:

```env
PORT=3000
MONGODB_URI=<mongodb connection string>
JWT_SECRET=<jwt signing secret>
GEMINI_API_KEY=<Google Gemini API key>
LEONARDO_API_KEY=<optional Leonardo image API key>
CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
ZERNIO_API_KEY=<Zernio API key>
```

`GEMINI_API_KEY` is required for post generation. Leonardo and Cloudinary are required when image generation or media upload is used. Never commit `.env` or secret values.

## Folder and File Guide

```text
backend/
├─ config/                 External service and upload configuration
│  ├─ cloudinary.ts        Cloudinary client configuration
│  ├─ db.ts                MongoDB/Mongoose connection
│  ├─ multer.ts            In-memory multipart upload middleware
│  └─ zernio.ts            Zernio client configuration
├─ controllers/            Request handlers and business operations for each resource
├─ middlewares/            Express middleware, including JWT authentication
├─ models/                 Mongoose schemas for users, accounts, posts, generations, and activity logs
├─ routes/                 Express routers mounted by server.ts
├─ services/               Background services; scheduler.service.ts checks due posts every minute
├─ utils/                  Shared ApiError, ApiResponse, and asyncHandler helpers
├─ server.ts               Express app setup, route mounting, database startup, and error handling
├─ package.json             Scripts and dependencies
└─ tsconfig.json            TypeScript compiler configuration
```

## Authentication

`POST /api/auth/register` and `POST /api/auth/login` return a JWT. All other API groups require that token in the request header:

```http
Authorization: Bearer <token>
```

Most successful responses use this shape:

```json
{
  "statusCode": 200,
  "data": {},
  "success": true,
  "message": "Request successful"
}
```

Errors are returned as `{ "success": false, "message": "..." }`, with the relevant HTTP status code.

## API Reference

Base URL: `http://localhost:3000`

### Authentication

#### `POST /api/auth/register`

Public. Creates a user and returns the user without its password plus a 30-day JWT.

Request body:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "strong-password"
}
```

Returns `201` with `data.user` and `data.token`. Returns `409` when the email already exists.

#### `POST /api/auth/login`

Public. Authenticates a user.

```json
{
  "email": "ada@example.com",
  "password": "strong-password"
}
```

Returns `200` with `data.user` and `data.token`. Invalid credentials return `401`; an unknown email returns `404`.

### Social OAuth

All endpoints in this section require authentication.

#### `GET /api/oauth/:platform/url`

Creates or finds the user's Zernio profile and returns an OAuth URL:

```json
{ "url": "https://..." }
```

Use a supported platform such as `twitter`, `linkedin`, `facebook`, or `instagram`.

#### `GET /api/oauth/sync`

Fetches accounts from Zernio, normalizes supported platforms, and upserts them into MongoDB. Returns `{ "accounts": [...] }`.

### Connected Accounts

All endpoints in this section require authentication.

#### `GET /api/accounts`

Returns the authenticated user's connected accounts in `data`.

#### `POST /api/accounts`

Adds a local account record.

```json
{
  "platform": "instagram",
  "handle": "@ada",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

Returns `201` with the created account in `data`.

#### `DELETE /api/accounts/:id`

Disconnects the account. If it has a Zernio account ID, the remote account is deleted first. Returns `200` with `data: null`.

### Posts and AI Generations

All endpoints in this section require authentication.

#### `GET /api/posts`

Returns the authenticated user's scheduled, draft, failed, or published posts.

#### `GET /api/posts/generations`

Returns the user's saved AI generations, newest first.

#### `POST /api/posts/generate`

Generates text with Gemini and optionally an image with Leonardo, then saves the generation.

```json
{
  "prompt": "Announce our new product launch",
  "tone": "friendly",
  "generateImage": false
}
```

Returns `201` with the saved generation in `data`. The generation includes `prompt`, `content`, `tone`, and optional `mediaUrl` and `mediaType`.

#### `POST /api/posts`

Schedules a post. Use `application/json` for text or `multipart/form-data` when uploading media. The upload field name is `image`.

JSON fields:

```json
{
  "content": "Our new product is live!",
  "platform": ["instagram", "linkedin"],
  "scheduledFor": "2026-08-30T14:00:00.000Z",
  "status": "scheduled",
  "mediaUrl": "https://example.com/optional-media.jpg",
  "mediaType": "image"
}
```

`platform` may also be a JSON-stringified array in form data. Accepted post statuses are `scheduled`, `draft`, `failed`, and `published`. Returns `201` with the saved post in `data`.

### Activity

#### `GET /api/activity`

Authenticated. Returns the latest 10 activity records for the user, newest first. Related posts are populated with their `content`.

## Scheduled Publishing

`services/scheduler.service.ts` starts a minute-based job when the server starts. It checks for due posts and is the integration point for publishing through the connected social platforms.

## API Notes

- CORS is enabled globally and JSON request parsing is enabled globally.
- User data is scoped by the authenticated user's ID.
- Media uploads are sent to Cloudinary; generated images are stored in the `ai-generations` folder and uploaded post media in `social-scheduler`.
- `dist/` is generated by `npm run build` and should not be edited manually.
