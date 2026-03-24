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

## E2E Tests (TODO)

E2E tests should be added using Playwright for the following critical flows:

### Flows Requiring E2E Coverage

| Flow | Description |
|------|-------------|
| **Teacher login** | Email/password login, Google OAuth, redirect to dashboard |
| **Lesson viewing** | Navigate to lessons, open a lesson, verify content renders with watermark |
| **Attendance taking** | Navigate to class, select date, mark students, save, verify persistence |
| **Class management** | View assigned classes, navigate to attendance |
| **Onboarding** | Dashboard shows checklist for incomplete onboarding, hides when complete |
| **Schedule** | View weekly schedule, verify today highlighting |

### E2E Setup (TODO)

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create `playwright.config.ts` with base URL `http://localhost:3001`
- [ ] Add `e2e/` directory for E2E test files
- [ ] Add `npm run test:e2e` script to `package.json`
- [ ] Set up test fixtures for authenticated teacher sessions

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
