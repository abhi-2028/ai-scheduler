# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    # AI Scheduler Client

    The client is a React 19 single-page application built with TypeScript, Vite, Tailwind CSS, and React Router. It provides the landing page, authentication entry point, dashboard, AI composer, account management, and scheduling views.

    ## Requirements and Commands

    Install Node.js and npm, then run:

    ```bash
    npm install
    npm run dev       # Start the Vite development server
    npm run build     # Type-check and create a production build
    npm run lint      # Run ESLint
    npm run preview   # Preview the production build
    ```

    The client currently uses mock data in some screens. API integration should use the backend documented in `../backend/README.md`.

    ## Routes

    | Path | Component | Purpose |
    | --- | --- | --- |
    | `/` | `Home` | Public landing page |
    | `/login` | `Login` | Sign in or register |
    | `/dashboard` | `Dashboard` | Post metrics and recent activity |
    | `/accounts` | `Accounts` | View and manage connected social accounts |
    | `/ai-composer` | `AIComposer` | Write and generate social posts |
    | `/schedule` | `Scheduler` | Select platforms and schedule content |

    The four application routes are rendered inside `Layout`, which provides the shared app shell and sidebar.

    ## Source Folders and Files

    ```text
    client/
    ├─ public/                 Static files copied as-is by Vite
    ├─ src/
    │  ├─ assets/              Shared image, icon, and asset definitions
    │  ├─ components/          Reusable UI components
    │  │  └─ Home/             Landing-page sections: hero, features, pricing, CTA, footer, and navigation
    │  ├─ pages/               Route-level screens for the public and authenticated workflows
    │  ├─ App.tsx              React Router route configuration
    │  ├─ index.css            Global styles and Tailwind entry styles
    │  └─ main.tsx             React bootstrap, StrictMode, and BrowserRouter setup
    ├─ index.html              Vite HTML entry document
    ├─ vite.config.ts          Vite and React plugin configuration
    ├─ eslint.config.js        ESLint configuration
    ├─ tsconfig*.json           TypeScript configurations for app, Node, and build references
    └─ package.json             Scripts and client dependencies
    ```

    Important reusable components include `Layout` (authenticated shell), `Sidebar` (application navigation), `AccountList` (account display), and `PlatformPickerModal` (platform selection).

    ## Backend Integration

    The backend defaults to `http://localhost:3000`. In development, start it separately from `../backend`, then call the API with the routes in the backend README. Store the JWT returned by login or registration and send it with protected requests:

    ```http
    Authorization: Bearer <token>
    Content-Type: application/json
    ```

    The scheduler upload endpoint uses `multipart/form-data` when attaching an image or video. The Vite development server is configured in `vite.config.ts`; add a proxy there if browser requests need to be forwarded to the backend without cross-origin URLs.

    ## Build Output

    `npm run build` writes the deployable static site to `dist/`. `dist/` is generated output and should not be edited manually.
