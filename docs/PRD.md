# STEMania Teacher — Product Requirements Document

## 1. Overview

**Product:** STEMania Teacher (teacher.stemania.com)
**Purpose:** A web application for STEMania teachers to access lesson plans, manage classes, take attendance, and complete onboarding tasks.
**Tech Stack:** Next.js, Supabase, Tailwind CSS, TypeScript
**Related App:** STEMania Admin (admin.stemania.com) — shares the same Supabase project

---

## 2. User Roles

| Role | Description |
|------|-------------|
| Teacher | Assigned instructor who can view lessons, take attendance, and manage their profile |
| Admin | Administrative user managed via the separate admin app |

---

## 3. Authentication & Authorization

- Supabase Auth (email/password with magic link support)
- Teachers must exist in the `users` table to access the dashboard
- Class-level authorization via `class_teacher_assignments` — only assigned teachers can take attendance for a class
- Lesson-level authorization via `teacher_lesson_assignments` — only assigned teachers can view lesson content

---

## 4. Core Features

### 4.1 Onboarding

- Multi-step onboarding checklist displayed on the dashboard
- Steps include: profile completion, W-9 submission, document signing, etc.
- Checklist auto-hides once all steps are completed

### 4.2 My Lessons

- `/lessons` — list of assigned lessons grouped by curriculum
- Each lesson card shows title, description, estimated duration, and a "Slides" badge if the lesson contains a presentation
- Lesson viewer (`/lessons/[id]`) with rendered HTML content and signed asset URLs (5-minute expiration)
- Breadcrumb navigation: My Lessons → Curriculum → Lesson Title
- Watermark overlay — teacher name and employee number watermarked on all lesson content and slides
- Access logging — every lesson view is recorded in `lesson_access_log` with watermark hash

#### Presentation Viewer

- Inline slide viewer for lessons containing presentation blocks
- Fullscreen mode with keyboard navigation (← / → arrow keys)
- Thumbnail strip for quick slide navigation
- Signed URL auto-refresh — slide URLs refresh automatically before expiration to prevent broken images

#### Content Protection

- Copy/print/screenshot protection with action logging to `lesson_access_log`
- Right-click context menu disabled
- Keyboard shortcuts blocked: Ctrl+C, Ctrl+P, Ctrl+S, Ctrl+A, Ctrl+U, PrintScreen, F12, Ctrl+Shift+I
- `user-select: none` on all lesson content
- Print blocked via `beforeprint` event and `@media print` CSS rule
- Slide images rendered with `pointer-events: none` to block right-click → Save Image

### 4.3 Schedule

- View upcoming class schedule (placeholder/future feature)

---

## 5. Classes & Attendance

### 5.1 My Classes

- `/dashboard/classes` — lists the teacher's assigned classes from `class_teacher_assignments` joined with `bookeo_classes`
- Each class card shows name, description, and links to the attendance page

### 5.2 Taking Attendance

- `/dashboard/classes/[classId]/attendance` — the main attendance-taking interface
- Date picker defaulting to today
- Per-student rows with Present / Absent / Tardy toggle buttons
- Optional notes field per student
- "Mark All Present" / "Mark All Absent" quick actions
- Search/filter roster by student name
- Pre-fills from existing records if attendance was already taken for the selected date
- Save button upserts to the `attendance_records` table

### 5.3 Attendance History

- History tab on the attendance page
- Past attendance sessions grouped by date
- Present/absent/tardy counts per session
- Expandable rows showing individual student records with status badges

### 5.4 Data Model

The `attendance_records` table:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| class_id | TEXT | Foreign key to bookeo_classes |
| student_id | TEXT | Foreign key to students |
| session_date | DATE | Date of the class session |
| status | TEXT | 'present', 'absent', or 'tardy' |
| notes | TEXT (nullable) | Optional notes |
| recorded_by | INTEGER | FK to users.employee_number |
| recorded_at | TIMESTAMPTZ | When the record was saved |
| created_at | TIMESTAMPTZ | Row creation timestamp |
| updated_at | TIMESTAMPTZ | Row update timestamp |

Unique constraint on `(class_id, student_id, session_date)`.

---

## 6. Teacher Profile

- `/dashboard/my-information` — displays name and email
- Profile edits are managed through the admin portal

---

## 7. ADA Compliance

STEMania Teacher shall conform to **WCAG 2.1 Level AA** standards to ensure the application is accessible to users with disabilities. This is a cross-cutting requirement that applies to all features.

### 7.1 Perceivable

- All non-text content (icons, images) must have meaningful `alt` text or `aria-label` attributes
- Color must not be the sole means of conveying information — status indicators (present/absent/tardy) use both color and text labels
- Text must have a minimum contrast ratio of 4.5:1 against its background (3:1 for large text)
- Content must be readable and functional at up to 200% zoom without horizontal scrolling

### 7.2 Operable

- All interactive elements must be fully keyboard accessible with visible focus indicators
- Skip navigation links must be provided (skip-to-content)
- No keyboard traps — users can navigate away from any component using standard keys
- Focus order must follow a logical reading sequence
- Touch targets must be at least 44x44 CSS pixels on mobile

### 7.3 Understandable

- Form inputs must have associated `<label>` elements or `aria-label` attributes
- Error messages must clearly identify the field in error and describe how to fix it
- Navigation must be consistent across pages
- Language attribute must be set on the `<html>` element

### 7.4 Robust

- HTML must be valid and well-structured with proper semantic elements
- ARIA roles, states, and properties must be used correctly (e.g., `aria-expanded`, `aria-haspopup`, `role="menu"`)
- The application must work with common assistive technologies (screen readers, switch devices)
- Dynamic content updates must be announced to screen readers via live regions where appropriate

### 7.5 Testing & Compliance

- Automated accessibility testing should be integrated into the CI pipeline (e.g., axe-core, Lighthouse)
- Manual keyboard-only and screen reader testing should be performed for each new feature
- An accessibility audit should be conducted prior to each major release
- Any reported accessibility issues are treated as P1 bugs

---

## 8. Test-Driven Development (TDD)

This project follows a **test-driven development** methodology. All new features and bug fixes must adhere to the TDD cycle:

### 8.1 Process

1. **Red** — Write a failing test that defines the expected behavior before writing any implementation code
2. **Green** — Write the minimum code necessary to make the test pass
3. **Refactor** — Clean up the implementation while keeping all tests green

### 8.2 Testing Stack

- **Unit Tests:** Vitest with React Testing Library for component and utility testing
- **API Route Tests:** Vitest for handler logic, mocking Supabase clients
- **Accessibility Tests:** axe-core integrated into component tests

### 8.3 Requirements

- Every new feature must have tests written before the implementation
- Every bug fix must include a regression test that reproduces the bug before applying the fix
- Tests must be co-located with their source files or in a parallel `__tests__` directory
- All tests must pass before code is merged — CI enforces this gate
- Test coverage should trend upward; new code should not decrease overall coverage
- Tests should be deterministic — no flaky tests, no reliance on external services without mocking

### 8.4 What to Test

- **API routes:** Auth guards (unauthorized returns 401/403), valid responses, input validation, error handling
- **Components:** Rendering, user interactions, state changes, accessibility (keyboard navigation, ARIA)
- **Utilities/helpers:** Pure function behavior, edge cases, error conditions

---

## 9. Non-Functional Requirements

- **Security:** HTTPS-only, CSP headers, rate limiting, Sentry error tracking
- **Performance:** Server-side rendering for initial page loads, optimized image delivery
- **Browser Support:** Latest two versions of Chrome, Firefox, Safari, and Edge
- **Mobile:** Responsive design, mobile-first approach for attendance-taking
- **Dark Mode:** Full dark mode support across all pages
- **Legal Links:** Links to the Privacy Policy (`/privacy-policy`) and Terms of Service (`/terms`) must be visible and accessible on every page, via the global `SiteFooter` component

---

## 10. API Routes (Teacher App)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Current teacher info |
| GET | `/api/classes` | Teacher's assigned classes |
| GET | `/api/classes/[classId]/students` | Enrolled students |
| GET | `/api/classes/[classId]/attendance?date=` | Attendance for a date |
| POST | `/api/classes/[classId]/attendance` | Upsert attendance |
| GET | `/api/classes/[classId]/attendance/history` | Attendance history |
| GET | `/api/lessons` | Assigned lessons |
| GET | `/api/lessons/[id]` | Lesson content |
| POST | `/api/lessons/[id]/log-action` | Log blocked actions |
| GET | `/api/teacher/onboarding-status` | Onboarding progress |
