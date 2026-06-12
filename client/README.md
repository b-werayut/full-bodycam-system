# Bodycam Frontend System

Frontend for the body-worn camera monitoring system. The app is built with React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and Zustand.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

The Vite dev server is configured on port `3190`.

## Architecture

The frontend is organized around explicit app, service, store, feature, and shared boundaries.

```text
src/
  app/          app shell, providers, routes, authenticated layout
  services/     API client and endpoint-specific service modules
  stores/       global Zustand stores
  features/     feature-owned hooks, components, and types
  components/   existing shared layout, modal, and UI components
  pages/        route-level screens
  locales/      translation dictionaries
```

`src/App.tsx` is intentionally small and re-exports the app implementation from `src/app/App.tsx`.

## State Rules

- Use Zustand for state shared across routes/components, such as language, dark mode, and notification dedupe state.
- Keep modal-only form inputs and one-off UI toggles local with `useState`.
- Keep authentication in `AuthContext` for now because it owns refresh/logout behavior.

## API Rules

- Components and pages should call functions from `src/services/*`, not raw axios calls.
- `src/services/apiClient.ts` owns the axios instance, in-memory access token, refresh queue, and auth logout event.
- Endpoint paths and cache-busting timestamps belong in service modules.

Current service modules:

- `authService.ts`
- `deviceService.ts`
- `eventLogService.ts`
- `missionService.ts`
- `userService.ts`
- `videoService.ts`

## Mock Data Policy

Production pages should prefer backend data through service modules. Mock files under `src/data` may remain only when they still provide required types or an explicit fallback. Unused mock files should be deleted.

## Dev Proxy

`vite.config.ts` proxies local frontend requests to backend services:

- `/api`
- `/api_internal`
- `/ws`
- `/proxy`

Update proxy targets in `vite.config.ts` when backend hosts change.
