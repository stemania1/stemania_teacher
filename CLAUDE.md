# STEMania Teacher

## Project Identity
- App: STEMania Teacher (teacher.stemania.com)
- Repo path: ~/Projects/STEMania Admin/stemania_teacher
- Port: 3001

## Related Apps
- Admin app is a SEPARATE repository at:
  ~/Projects/STEMania Admin/stemania_admin
- Do NOT make changes to the admin app from this repo
- If a task requires admin app changes, stop and ask
  the user to run Claude Code from the admin repo instead

## Tech Stack
- Next.js, Supabase, Tailwind, TypeScript
- Auth: Supabase Auth
- Testing: Vitest + React Testing Library
- Shares same Supabase project as stemania_admin

## Key Docs
- `docs/architecture.md` — Codebase reference (routes, auth, DB tables, integrations)
- `docs/tests.md` — Testing reference (stack, conventions, CI rules)
- `docs/PRD.md` — Product requirements document

## Shared Docs
- Style guide, backlog, and other shared docs live in the admin repo:
  ~/Projects/STEMania Admin/stemania_admin/docs/

## Rules
- Always run `npm run build` after making changes
- Always run `npm test` after making changes
- Never modify files outside this repository
- **TDD-01:** All new user-facing features and bug fixes must follow the
  TDD cycle — write a failing test first, then implement, then refactor.
  This applies to both unit tests and E2E tests for the relevant flow.
