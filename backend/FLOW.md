# Backend Flow

This document describes how a request moves through the AI Scheduler backend and how the background scheduler fits into the application.

## 1. Server Startup

```text
server.ts
  |
  +-- Load environment variables
  +-- Create Express app
  +-- Enable CORS and JSON parsing
  +-- Register health endpoint: GET /
  +-- Mount API routers
  |     +-- /api/auth
  |     +-- /api/oauth
  |     +-- /api/accounts
  |     +-- /api/posts
  |     +-- /api/activity
  +-- Register global error handler
  +-- Connect to MongoDB
  +-- Start the minute-based post scheduler
  +-- Listen on PORT or 3000
```

The server does not begin listening until the MongoDB connection succeeds. A database connection failure logs an error and exits the process.

## 2. Request Lifecycle

```text
Client request
  -> CORS and JSON middleware
  -> Router selected by URL prefix
  -> Authentication middleware for protected routes
  -> Controller
  -> Service or external provider, when needed
  -> Mongoose model read/write
  -> ApiResponse or error response
```

Protected requests must include:

```http
Authorization: Bearer <jwt>
```

The authentication middleware verifies the JWT and makes the authenticated user available to downstream handlers. Controllers scope user-owned records by that user ID.

Successful API responses generally use:

```json
{
  "statusCode": 200,
  "data": {},
  "success": true,
  "message": "Request successful"
}
```

Unhandled errors reach the global error handler, which logs the error and returns `{ "success": false, "message": "..." }` with the error status or `500`.

## 3. Authentication Flow

```text
POST /api/auth/register or /api/auth/login
  -> Validate credentials
  -> Read or create User document
  -> Hash/check password
  -> Create JWT
  -> Return user and token

Protected request
  -> Read Bearer token
  -> Verify JWT
  -> Attach user identity
  -> Execute controller
```

Registration and login are the public entry points. The client stores the returned token and sends it with later protected requests.

## 4. Connected Social Accounts

```text
Client requests OAuth URL
  -> GET /api/oauth/:platform/url
  -> Find or create the user's Zernio profile
  -> Return provider authorization URL
  -> User completes provider authorization

Client synchronizes accounts
  -> GET /api/oauth/sync
  -> Fetch accounts from Zernio
  -> Normalize supported platforms
  -> Upsert local Account documents
  -> Return connected accounts
```

Removing an account deletes the remote Zernio account first when a remote account ID exists, then removes the local account record.

## 5. AI Generation Flow

```text
POST /api/posts/generate
  -> Authenticate user
  -> Send prompt and tone to Gemini
  -> Optionally request an image from Leonardo
  -> Upload generated image to Cloudinary when present
  -> Save Generation document
  -> Return generated content and optional media URL
```

Generation history is read through `GET /api/posts/generations` and is scoped to the authenticated user. Edited content is persisted through `PATCH /api/posts/generations/:id`, which updates only a generation owned by the authenticated user.

## 6. Post Scheduling Flow

```text
POST /api/posts
  -> Authenticate user
  -> Parse JSON or multipart form data
  -> Parse platforms and scheduling fields
  -> Upload attached media through the configured provider flow
  -> Create Post document
  -> Return the saved post
```

Text-only posts use JSON. Posts with an uploaded image or video use `multipart/form-data` with the upload field named `media`.

## 7. Background Publishing Flow

```text
Server startup
  -> initScheduler()
  -> Run once per minute
  -> Find due scheduled posts
  -> Publish through connected social platforms
  -> Update post status and activity records
```

The scheduler is started once during server startup. Its implementation is the integration point for publishing due posts through the connected platform provider.

## 8. Main Backend Ownership

- `server.ts`: application bootstrap, middleware, route mounting, startup, and global errors.
- `routes/`: URL-to-controller mapping.
- `middlewares/authMiddleware.ts`: JWT verification and request identity.
- `controllers/`: request validation, orchestration, and response creation.
- `models/`: MongoDB schemas and persistence.
- `config/`: database and external provider clients.
- `services/scheduler.service.ts`: periodic due-post processing.
- `utils/`: shared response, error, and async-handler helpers.
