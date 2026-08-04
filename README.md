# AI Scheduler

AI Scheduler is a social content planning tool that helps creators turn ideas into ready-to-schedule posts faster. It combines an AI composer, a dashboard, connected accounts, and a scheduling workflow in one place.

## Problem Statement

Content creators often spend too much time switching between tools to brainstorm ideas, write captions, adapt content for different platforms, and plan when posts should go live. That extra effort makes it harder to stay consistent, post on time, and keep a clear view of what has already been created or scheduled.

AI Scheduler is meant to reduce that friction by giving creators one workflow for:

- generating post ideas and captions
- previewing recent content drafts
- managing connected social accounts
- scheduling content for a later time
- tracking activity from one dashboard

## Why This Helps Content Creators

This project is especially useful for content creators, social media managers, and small teams that need to publish regularly without building a large operations process.

It helps by:

- saving time on drafting content
- making it easier to stay consistent across platforms
- reducing context switching between writing, planning, and scheduling tools
- giving a simple view of scheduled and published posts
- helping creators move from idea to published post with fewer steps

## How It Works

The app is split into two main parts:

- `client/` contains the React front end built with Vite.
- `backend/` contains a small Express server that can be extended for APIs, persistence, or AI integrations.

The current flow is:

1. Open the landing page and sign in or continue into the app.
2. Use the AI Composer to enter a prompt, choose a tone, and generate content.
3. Review recent generations and select one to schedule.
4. Choose the platforms, date, and time for publishing.
5. Check the dashboard for post counts, connected accounts, and recent activity.

## Quick Guide

### Prerequisites

- Node.js installed
- npm installed

### 1. Install dependencies

Install packages for both the client and backend.

```bash
cd client
npm install

cd ../backend
npm install
```

### 2. Start the backend

From the `backend/` folder:

```bash
npm run start
```

This starts the Express server and serves a simple health response at the root route.

### 3. Start the client

From the `client/` folder:

```bash
npm run dev
```

Open the local Vite URL shown in the terminal to view the app.

### 4. Explore the main pages

- Home: landing page and product overview
- Login: entry point for authenticated use
- Dashboard: post metrics and recent activity
- Accounts: connected social accounts
- AI Composer: content generation and scheduling flow
- Scheduler: planning and scheduling interface

### 5. Typical usage flow

1. Write a short idea in the AI Composer.
2. Pick a tone that matches your brand voice.
3. Generate a post draft.
4. Choose whether to attach an AI image.
5. Send the draft into the scheduler.
6. Select the social platforms, date, and time.
7. Review the dashboard to track progress.

## Project Structure

```text
ai-scheduler/
├─ backend/
│  └─ server.ts
├─ client/
│  └─ src/
│     ├─ components/
│     └─ pages/
└─ README.md
```

## Notes

- The backend is currently minimal and ready for future API expansion.
- The client uses mock data in parts of the UI, so it can be developed without a full production backend yet.
- This makes the project a good base for building a more complete AI-assisted content scheduling platform.
