# AI Scheduler

AI Scheduler is a social content planning tool that helps creators turn ideas into ready-to-schedule posts. It combines AI-assisted writing, media generation, connected social accounts, scheduling, and activity tracking in one workflow.

## Features

- Generate social media captions from a prompt and selected tone.
- Optionally generate and persist an AI image for a post.
- Connect and manage supported social accounts through Zernio.
- Schedule posts with optional image or video uploads.
- Review generated content, scheduled posts, dashboard metrics, and recent activity.

## Project Documentation

The project is split into two independently runnable applications:

- [Client documentation](client/README.md): React routes, components, setup commands, and frontend integration notes.
- [Backend documentation](backend/README.md): Express structure, environment variables, authentication, and API reference.

Read the backend README before starting the API because it contains the required environment variables and third-party service configuration.

## Quick Start

### Prerequisites

- Node.js and npm
- MongoDB connection
- Backend API keys listed in [backend/README.md](backend/README.md)

### Install dependencies

Open two terminals from the repository root:

```bash
cd backend
npm install
```

```bash
cd client
npm install
```

### Start the applications

Start the backend:

```bash
cd backend
npm run start
```

Start the client in a second terminal:

```bash
cd client
npm run dev
```

Open the local Vite URL shown in the client terminal. The backend health check is available at `http://localhost:3000/` unless `PORT` is changed.

## Typical Workflow

1. Open the landing page and sign in or register.
2. Enter an idea in the AI Composer and choose a tone.
3. Generate and review a post, optionally including an image.
4. Select connected platforms, a date, and a time.
5. Review scheduled content and activity from the dashboard.

## Repository Structure

```text
ai-scheduler/
├─ backend/       Express API, MongoDB models, integrations, and scheduler
├─ client/        React and TypeScript frontend built with Vite
└─ README.md      Project overview and quick start guide
```

## Development Notes

- The client still uses mock data in some screens while backend integration is being expanded.
- The backend starts its scheduled publishing service when the server starts and checks for due posts every minute.
- Do not commit backend `.env` files, API keys, JWT secrets, or other credentials.
