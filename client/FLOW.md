# Client Flow

This document describes how the AI Scheduler React client starts, resolves routes, manages authentication, and communicates with the backend.

## 1. Application Bootstrap

```text
index.html
  -> main.tsx
  -> import global CSS
  -> React StrictMode
  -> BrowserRouter
  -> AuthProvider
  -> App
```

`AuthProvider` wraps the route tree, so every page can read authentication state with `useAuth`. `App` adds the global toast container and defines the public and application routes.

## 2. Route Flow

```text
/
  -> Home

/login
  -> Login

/dashboard
/accounts
/ai-composer
/schedule
  -> Layout
       -> shared application shell and Sidebar
       -> selected page rendered through the outlet
```

The landing page and login page are public. The four application pages are grouped under `Layout`, which supplies the shared authenticated experience. Access protection should remain consistent with the authentication state exposed by `AuthProvider`.

## 3. Authentication State

On initialization, `AuthProvider` reads `user` and `token` from `localStorage`.

```text
Login or registration succeeds
  -> Receive user and JWT from backend
  -> AuthContext.login(user, token)
  -> Update React state
  -> Persist user and token in localStorage
  -> Subsequent renders see isAuthenticated = true
```

Logout clears both React state and the two local-storage entries. The provider also accepts older wrapped storage formats for backward compatibility.

## 4. API Request Flow

All feature requests should use the shared Axios instance in `src/api/axios.ts`.

```text
Component or page
  -> api.get/post/...()
  -> Axios request interceptor
  -> Read token from localStorage
  -> Add Authorization: Bearer <token> when available
  -> Send request to VITE_API_BASE_URL
     or http://localhost:3000 by default
  -> Resolve response or show page-level error feedback
```

The backend base URL is controlled by `VITE_API_BASE_URL`. Protected backend routes rely on the interceptor to receive the JWT.

## 5. Connected Accounts Flow

```text
Accounts page
  -> Load accounts from GET /api/accounts
  -> Display accounts with AccountList
  -> Start provider connection through the OAuth URL endpoint
  -> Synchronize accounts after authorization
  -> Refresh local account data
  -> Disconnect through DELETE /api/accounts/:id when requested
```

`PlatformPickerModal` is the reusable selection step when a workflow needs the user to choose a social platform.

## 6. AI Composer Flow

```text
AIComposer
  -> User enters a prompt and tone
  -> Optionally enables image generation
  -> POST /api/posts/generate
  -> Display returned content and media
  -> User edits the generated content
  -> PATCH /api/posts/generations/:id on blur
  -> Reload persisted generation history
  -> Continue to scheduling or save as a draft
```

The generated content is returned by the backend, which coordinates Gemini, optional Leonardo image generation, Cloudinary storage, and generation history.

## 7. Scheduling Flow

```text
Scheduler
  -> User enters post content
  -> Selects one or more platforms
  -> Chooses draft or scheduled status
  -> Chooses a future scheduled time when scheduling
  -> Optionally attaches media
  -> POST /api/posts
       JSON for text-only posts
       multipart/form-data for media uploads
  -> Show success or error toast
  -> Refresh the relevant dashboard or schedule data
```

The upload field for attached media is `media`. The selected platform list may be sent as an array in JSON or as a JSON-stringified array in form data.

## 8. Dashboard and Activity Flow

```text
Dashboard
  -> Request posts, connected accounts, and activity in parallel
  -> GET /api/posts
  -> GET /api/accounts
  -> GET /api/activity
  -> Read each resource from the response's data field
  -> Count scheduled and published posts
  -> Count accounts with status "connected"
  -> Render summary cards and recent activity
```

The dashboard uses the backend's standard response wrapper, so resource arrays are read from `response.data.data` in Axios responses. The posts endpoint is `/api/posts` (plural). Activity records are scoped to the logged-in user and displayed newest first by the backend.

If any dashboard request fails, the error is logged and the page keeps its initial empty-state values. The dashboard is the main read-oriented view of scheduling and publishing progress.

## 9. Main Client Ownership

- `main.tsx`: React bootstrap and provider composition.
- `App.tsx`: route configuration and global toast rendering.
- `context/AuthContext.tsx`: session state, persistence, login, and logout.
- `api/axios.ts`: shared backend client and JWT injection.
- `components/Layout.tsx`: shared application shell.
- `components/Sidebar.tsx`: application navigation.
- `components/AccountList.tsx`: connected account presentation.
- `components/PlatformPickerModal.tsx`: platform selection UI.
- `pages/`: route-level feature screens.
- `index.css`: global styling and Tailwind entry styles.
