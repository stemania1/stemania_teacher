# Launch readiness checklist

Use this as you add features to keep the app safe for production.

---

## Before every merge / deploy

- [ ] **CI green** — Lint, typecheck, tests, and build pass (`npm run lint && npm run typecheck && npm test && npm run build`).
- [ ] **No new secrets in code** — Use env vars; add them to `.env.example` (with placeholders); set real values in Vercel if you deploy there.
- [ ] **Sentry still works** — If you changed error handling or APIs, confirm errors still flow to Sentry (or that you didn’t break the integration).

---

## When adding or changing API routes

1. **Auth** — Use the same auth pattern as existing routes (e.g. lesson delivery auth) so every route is explicitly protected.
2. **Errors** — Use `handleApiError(error)` in `catch` blocks (or `withErrorHandling`) so errors are consistent and Sentry can capture them.
3. **Input validation** — For POST/PUT/PATCH with a JSON body, use `parseBody(request, schema)` from `@/lib/validations` and a Zod schema; return the `error` response when validation fails.

---

## When adding env vars

1. Add the variable to **Vercel** (and any other deployment env).
2. Add a line to **`.env.example`** with a placeholder.
3. Optionally document what the var is for.

---

## When touching shared code

- **`shared/`** exists in both **stemania_admin** and **stemania_teacher**. If you change a file in one repo’s `shared/`, apply the same change in the other repo’s `shared/` so they don’t drift.
- Use **`@stemania/shared`** for logger, CSRF, rate limit, and API error handler instead of re-implementing.

---

## Optional over time

- **Tests** — When fixing a bug, add a test that would have caught it. When adding a new validation schema, add a test in `src/__tests__/lib/`.
- **Rate limiting** — New endpoints are covered by existing middleware; if you add a new class of route (e.g. webhooks), update `middleware.ts` if needed.

---

## Quick command

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Run this before opening a PR or deploying.
