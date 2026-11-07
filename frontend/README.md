# InsightLens frontend

Next.js (App Router) client for InsightLens. See the root README for the full
setup.

## Run (cmd)

```bat
copy .env.example .env.local
npm install
npm run dev
```

The app runs on http://localhost:3000 and expects the API from `backend/` at
`NEXT_PUBLIC_API_URL`.

## Scripts

| Script                               | What it does                            |
| ------------------------------------ | --------------------------------------- |
| `npm run dev`                        | Development server                      |
| `npm run build` / `npm start`        | Production build and server             |
| `npm test`                           | Vitest unit and component tests         |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks            |
| `npm run format`                     | Prettier with the Tailwind class sorter |
