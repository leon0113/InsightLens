# InsightLens frontend

Next.js (App Router) client for InsightLens. See the root README for the full
setup.

## Run (cmd)

```bat
copy .env.example .env.local
npm install
npm run dev
```

The app runs on http://localhost:3000. The browser sends every API request to
`/api/v1` on this same origin, and Next.js forwards it to the Express API at
`BACKEND_URL` (see `next.config.ts`). The URL is read at build time, so
rebuild after changing it.

## Scripts

| Script                               | What it does                            |
| ------------------------------------ | --------------------------------------- |
| `npm run dev`                        | Development server                      |
| `npm run build` / `npm start`        | Production build and server             |
| `npm test`                           | Vitest unit and component tests         |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks            |
| `npm run format`                     | Prettier with the Tailwind class sorter |
