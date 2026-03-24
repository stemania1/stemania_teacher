# STEMania Teacher — Testing Reference

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit / Integration | **Vitest** + **React Testing Library** | Component rendering, API route handlers, utility functions |
| Accessibility | **axe-core** (via Testing Library) | Automated a11y checks in component tests |
| E2E | **Playwright** (TODO) | End-to-end browser tests for critical user flows |

### Configuration

- **Config file:** `vitest.config.ts`
- **Test pattern:** `src/**/*.{test,spec}.{ts,tsx}`
- **Coverage:** v8 provider, reporters: text, json, html
- **Path alias:** `@/` → `./src/`
- **Globals:** enabled (no explicit imports for `describe`, `it`, `expect`)

### Scripts

```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

---

## Test File Locations

Tests live in `src/__tests__/` mirroring the source directory structure:

```
src/__tests__/
├── api/
│   ├── classes/[classId]/attendance/
│   │   ├── history.test.ts       # Attendance history API
│   │   └── route.test.ts         # Attendance CRUD API
│   ├── classes/[classId]/students/
│   │   └── route.test.ts         # Student roster API
│   ├── classes/
│   │   └── route.test.ts         # Classes list API
│   ├── lessons/[id]/log-action/
│   │   └── route.test.ts         # Action logging API
│   ├── lessons/
│   │   └── route.test.ts         # Lessons list API
│   ├── teacher/onboarding-status/
│   │   └── route.test.ts         # Onboarding status API
│   └── users/me/
│       └── route.test.ts         # Current user API
├── components/
│   ├── AttendanceHistory.test.tsx # Attendance history component
│   └── OnboardingChecklist.test.tsx # Onboarding checklist component
└── lib/
    ├── apiErrorHandler.test.ts   # Error handling utility
    ├── authHelpers.test.ts       # Auth provider detection
    ├── lessonRenderer.test.ts    # Lesson block rendering
    ├── validations.test.ts       # Zod schema validation
    └── watermark.test.ts         # Watermark encoding/decoding
```

### Naming Conventions

- Test files use `.test.ts` or `.test.tsx` extension
- API route tests mirror the route path: `src/__tests__/api/classes/route.test.ts` tests `src/app/api/classes/route.ts`
- Component tests mirror the component name: `OnboardingChecklist.test.tsx`
- Lib tests mirror the utility name: `watermark.test.ts`

---

## What to Test

### API Routes

Every API route test should cover:

- **Auth guard:** Unauthenticated requests return 401
- **Authorization:** Unauthorized access returns 403 (e.g., teacher not assigned to a class)
- **Happy path:** Valid request returns expected data
- **Input validation:** Invalid params/body return 400 with descriptive errors
- **Error handling:** Server errors return 500 with standardized error response

### Components

- **Rendering:** Component renders correctly with given props
- **User interactions:** Click handlers, form submissions, toggle states
- **State changes:** Loading states, error states, empty states
- **Accessibility:** Keyboard navigation, ARIA attributes, axe-core checks

### Utilities / Helpers

- **Pure function behavior:** Expected outputs for given inputs
- **Edge cases:** Null/undefined inputs, empty arrays, boundary values
- **Error conditions:** Invalid inputs throw or return expected errors

---

## E2E Tests (Playwright)

### Configuration

- **Config file:** `playwright.config.ts`
- **Test directory:** `e2e/`
- **Base URL:** `http://localhost:3001`
- **Browsers:** Chromium, Firefox, WebKit
- **Auth:** Storage state saved in `e2e/.auth/teacher.json` (gitignored)

### Scripts

```bash
npm run test:e2e          # Run all E2E tests (headless)
npm run test:e2e:headed   # Run with visible browser
npm run test:e2e:ui       # Interactive Playwright UI mode
```

### Setup

1. Install Playwright browsers: `npx playwright install`
2. Set E2E credentials in `.env`:
   ```
   E2E_TEACHER_EMAIL=your-test-teacher@example.com
   E2E_TEACHER_PASSWORD=your-test-teacher-password
   ```
3. The dev server starts automatically via `playwright.config.ts` webServer

### Auth Fixture

The `e2e/auth.setup.ts` file logs in a test teacher before all tests and saves
the browser session. All spec files run as an authenticated teacher by default.

Tests that need unauthenticated state (e.g., login tests) override this:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });
```

### Test Files

```
e2e/
├── auth.setup.ts        # Authenticates test teacher, saves session
├── auth.teardown.ts     # Cleans up auth state file
├── login.spec.ts        # Login flow (unauthenticated)
├── dashboard.spec.ts    # Dashboard, nav, quick access cards
├── lessons.spec.ts      # Lesson list and navigation
├── classes.spec.ts      # Class list and navigation to attendance
├── attendance.spec.ts   # Attendance taking, tabs, student toggling
└── schedule.spec.ts     # Schedule page and navigation
```

### Flows Covered

| Flow | Spec File | Key Tests |
|------|-----------|-----------|
| **Teacher login** | `login.spec.ts` | Sign-in form, auth redirect, email/password login |
| **Dashboard** | `dashboard.spec.ts` | Welcome heading, nav links, user menu, quick access |
| **Lesson viewing** | `lessons.spec.ts` | Lesson list, empty state, navigation to lesson |
| **Class management** | `classes.spec.ts` | Class list, empty state, navigation to attendance |
| **Attendance taking** | `attendance.spec.ts` | Tabs, date picker, student toggling, mark all, history |
| **Schedule** | `schedule.spec.ts` | Schedule page, today/weekly sections, empty state |

### Writing New E2E Tests

- Place test files in `e2e/` with the `.spec.ts` extension
- Tests run as an authenticated teacher by default (via storage state)
- Use `test.skip()` for tests that depend on test data that may not exist
- Prefer accessible selectors: `getByRole()`, `getByLabel()`, `getByText()`

---

## CI Enforcement Rules

| Test Type | CI Behavior |
|-----------|-------------|
| **E2E tests** | Block merge — PR cannot be merged if E2E tests fail |
| **Unit tests** | Advisory — failures are reported but do not block merge |

### TDD-01 Rule

All new user-facing features and bug fixes must follow the TDD cycle:

1. **Red:** Write a failing test that defines the expected behavior
2. **Green:** Write the minimum code to make the test pass
3. **Refactor:** Clean up while keeping tests green

This applies to both unit tests and E2E tests for the relevant flow.

---

## Mocking Patterns

### Supabase Client Mocking

API route tests mock the Supabase admin client. Common pattern:

```typescript
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabaseAdmin),
}));

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));
```

### Test Isolation

- Each test file mocks its own dependencies
- No shared global state between test files
- Supabase calls are always mocked — tests never hit a real database
- Tests are deterministic and can run in any order
