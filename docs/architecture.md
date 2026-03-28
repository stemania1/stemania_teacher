# STEMania Teacher — Architecture Reference

## App Purpose

**STEMania Teacher** (`teacher.stemania.com`, port 3001) is a web application for STEMania teachers to access lesson plans, manage classes, take attendance, and complete onboarding tasks.

---

## Repo Structure

```
stemania_teacher/
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, API routes)
│   │   ├── api/                # API route handlers
│   │   │   ├── auth/check-email/
│   │   │   ├── classes/[classId]/attendance/
│   │   │   ├── classes/[classId]/attendance/history/
│   │   │   ├── classes/[classId]/students/
│   │   │   ├── classes/
│   │   │   ├── lessons/[id]/log-action/
│   │   │   ├── lessons/[id]/slides/
│   │   │   ├── lessons/[id]/slides/refresh/
│   │   │   ├── lessons/[id]/
│   │   │   ├── lessons/
│   │   │   ├── teacher/onboarding-status/
│   │   │   └── users/me/
│   │   ├── auth/callback/      # OAuth callback
│   │   ├── dashboard/          # Main dashboard + classes + attendance
│   │   ├── lessons/            # Lesson list + viewer
│   │   ├── login/              # Login page
│   │   ├── schedule/           # Weekly class schedule
│   │   ├── sign-up/            # Invitation-only signup
│   │   ├── sign-out/           # Sign-out handler
│   │   ├── reset-password/     # Password reset
│   │   ├── privacy-policy/     # Legal
│   │   └── terms/              # Legal
│   ├── components/             # Shared React components
│   ├── lib/                    # Utilities, auth helpers, Supabase clients
│   └── __tests__/              # Test files (mirrors src/ structure)
├── shared/                     # @stemania/shared monorepo package
├── public/                     # Static assets (icons, logos, images)
├── supabase/                   # Supabase migrations
├── docs/                       # Project documentation
└── scripts/                    # Utility scripts
```

### Key Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth checks, rate limiting, CSRF validation |
| `src/lib/lessonDeliveryAuth.ts` | Core auth: `getCurrentTeacherFromDb()`, `hasAssignment()` |
| `src/lib/supabaseServer.ts` | `createServerSupabaseClient()` for SSR |
| `src/lib/supabaseBrowser.ts` | `createSupabaseBrowserClient()` for client-side |
| `src/lib/supabaseAdmin.ts` | `getSupabaseAdmin()` with service role key |
| `src/lib/supabaseUsers.ts` | User lookup and auth ID linking |
| `src/lib/lessonRenderer.ts` | Converts lesson blocks to HTML with signed media URLs |
| `src/lib/watermark.ts` | Invisible + visible watermark encoding/injection |
| `src/lib/validations.ts` | Zod schemas for request validation |
| `next.config.ts` | Redirects `/app` → `/dashboard`, security headers, transpiles shared |
| `vitest.config.ts` | Test configuration |

---

## Auth Pattern

### Server-Side Auth Flow

1. **Middleware** (`src/middleware.ts`) runs on every request:
   - Refreshes Supabase session via cookies
   - Redirects unauthenticated users to `/login` (except public routes)
   - Applies rate limiting (separate limits for auth vs general API)
   - Validates CSRF tokens on non-auth API mutations

2. **`getCurrentTeacherFromDb()`** (`src/lib/lessonDeliveryAuth.ts`):
   - Called by API routes to get the authenticated teacher
   - Gets Supabase auth user from session
   - Looks up the `users` table by `supabase_user_id`
   - Falls back to email matching and auto-links auth ID if needed
   - Returns `{ employeeNumber, firstName, lastName, email, authUserId }`

3. **`hasAssignment()`** (`src/lib/lessonDeliveryAuth.ts`):
   - Checks `teacher_lesson_assignments` for active, non-expired assignments

### Client Creation

| Function | File | Use Case |
|----------|------|----------|
| `createServerSupabaseClient()` | `supabaseServer.ts` | Server components, API routes (uses cookies) |
| `createSupabaseBrowserClient()` | `supabaseBrowser.ts` | Client components |
| `getSupabaseAdmin()` | `supabaseAdmin.ts` | Backend operations with service role key |

### Login Methods

- Email + password via `supabase.auth.signInWithPassword()`
- Google OAuth via redirect → `/auth/callback`
- `/api/auth/check-email` detects which provider to use
- Auth helper (`src/lib/authHelpers.ts`) parses `app_metadata.providers`

---

## Routes

### Authenticated Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard with onboarding checklist |
| `/dashboard/classes` | Teacher's assigned classes |
| `/dashboard/classes/[classId]/attendance` | Attendance taking + history |
| `/dashboard/my-information` | Teacher profile (editable name) |
| `/lessons` | Assigned lessons grouped by curriculum |
| `/lessons/[id]` | Lesson viewer with content protection |
| `/schedule` | Weekly class schedule grid |

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/login` | Sign-in (email/password or Google) |
| `/sign-up` | Invitation-only signup |
| `/reset-password` | Password reset |
| `/privacy-policy` | Privacy policy |
| `/terms` | Terms of service |

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/check-email` | Detect auth provider for an email |
| GET | `/api/users/me` | Current teacher info |
| PATCH | `/api/users/me` | Update teacher name |
| GET | `/api/teacher/onboarding-status` | Onboarding step completion |
| GET | `/api/lessons` | Assigned lessons with curriculum details |
| GET | `/api/lessons/[id]` | Full lesson HTML with watermark + signed URLs |
| POST | `/api/lessons/[id]/log-action` | Log blocked user actions |
| GET | `/api/lessons/[id]/slides` | Signed slide URLs for presentations |
| POST | `/api/lessons/[id]/slides/refresh` | Refresh expired signed URLs |
| GET | `/api/classes` | Teacher's assigned classes |
| GET | `/api/classes/[classId]/students` | Students enrolled in a class |
| GET | `/api/classes/[classId]/attendance` | Attendance records for a date |
| POST | `/api/classes/[classId]/attendance` | Save attendance records |
| GET | `/api/classes/[classId]/attendance/history` | All attendance history |

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `TeacherNav` | `src/components/TeacherNav.tsx` | Header nav with logo, links, user menu |
| `OnboardingChecklist` | `src/components/OnboardingChecklist.tsx` | Multi-step onboarding progress tracker |
| `LessonViewer` | `src/components/LessonViewer.tsx` | Renders lesson HTML with copy/print/screenshot protection |
| `PresentationViewer` | `src/components/PresentationViewer.tsx` | Slide viewer with fullscreen, keyboard nav, watermark overlay |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Global footer with legal links |
| `ThemedLogo` | `src/components/ThemedLogo.tsx` | Logo with dark mode support |

---

## Database Tables

This app shares a Supabase project with the admin app (`admin.stemania.com`). The tables below are the ones accessed by the teacher app.

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Teacher profiles and auth linking | `employee_number`, `supabase_user_id`, `email`, `first_name`, `last_name`, `login_status`, `contract_signed`, `onboarding_status` |
| `teacher_lesson_assignments` | Lessons assigned to teachers | `teacher_id`, `lesson_id`, `status`, `expires_at` |
| `lessons` | Lesson metadata | `id`, `title`, `description`, `estimated_duration_minutes`, `curriculum_id`, `status` |
| `lesson_blocks` | Content blocks within lessons | `id`, `lesson_id`, `block_type` (`text`, `image`, `video`, `activity`, `quiz`, `presentation`), `content`, `sort_order` |
| `curricula` | Curriculum metadata | `id`, `title`, `subject`, `grade_level` |
| `lesson_access_log` | Audit trail for lesson views and blocked actions | `user_id`, `lesson_id`, `action`, `ip_address`, `user_agent`, `watermark_hash` |
| `class_teacher_assignments` | Classes assigned to teachers | `class_id`, `teacher_id` |
| `bookeo_classes` | Class metadata (from Bookeo integration) | `id`, `name`, `description`, `start_time`, `end_time`, `days_of_week` |
| `attendance_records` | Student attendance | `id`, `class_id`, `student_id`, `session_date`, `status` (`present`/`absent`/`tardy`), `notes`, `recorded_by` |
| `students` | Student data | `id`, `name` |
| `w9_submissions` | W-9 form submissions (onboarding) | `user_id`, `status` |
| `signing_requests` | Document signing (onboarding) | `user_id`, `document_type`, `status` |

---

## External Integrations

| Service | Usage | Config |
|---------|-------|--------|
| **Supabase** | Auth, database, storage (signed URLs for lesson assets) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Upstash Redis** | Rate limiting (falls back to in-memory if not configured) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Sentry** | Error tracking and monitoring | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| **Bookeo** | Class data originates from Bookeo (synced to `bookeo_classes` table) | No direct API calls from teacher app |

---

## Environment Variables

See `.env.example` for the full list:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (backend only) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://teacher.stemania.com` |
| `NEXT_PUBLIC_ADMIN_URL` | No | `https://admin.stemania.com` |
| `SUPER_ADMIN_EMAIL` | No | Email address of the super admin |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source maps |

---

## Shared Package (`@stemania/shared`)

Located at `./shared/`, this is a monorepo package shared between the teacher and admin apps. It provides:

- `createRateLimitMiddleware()` — Rate limiting with Redis or in-memory fallback
- `validateCsrf()` — CSRF token validation
- Logger factory — Structured logging via Pino
- Error handling utilities — Standardized API error responses
- User role definitions

---

## Relationship to the Admin App

- The admin app (`admin.stemania.com`) is a **separate repository** at `~/Projects/STEMania Admin/stemania_admin`
- Both apps share the **same Supabase project** (same database, auth, storage)
- Teacher onboarding configuration, user management, lesson authoring, and curriculum management live in the admin app
- The teacher app is read-only for most data — it reads lessons, classes, and user info but writes attendance records, access logs, and teacher profile updates (name only)
- Shared docs (style guide, backlog, etc.) live in the admin repo at `~/Projects/STEMania Admin/stemania_admin/docs/`

---

## Security

- **Content protection:** Lessons are watermarked (invisible zero-width characters + visible overlay). Copy, print, screenshot, and save-image actions are blocked and logged.
- **Auth:** Middleware enforces authentication on all non-public routes. API routes verify teacher assignment before serving content.
- **Rate limiting:** Separate limits for auth routes and general API. Uses Upstash Redis in production, in-memory fallback in dev.
- **CSRF:** Validated on non-auth API mutations.
- **Headers:** Strict-Transport-Security, X-Frame-Options, Content-Security-Policy, and other security headers configured in `next.config.ts`.
