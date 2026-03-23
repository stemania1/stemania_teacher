import { GET } from "@/app/api/teacher/onboarding-status/route";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const mockTeacher = {
  employeeNumber: 42,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  authUserId: "auth-123",
};

describe("GET /api/teacher/onboarding-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 404 when user record not found", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns fully onboarded status with all steps complete", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    let fromCallCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { requires_password_change: false, onboarding_status: "fully_onboarded" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "w9_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { status: "completed" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "signing_requests") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [{ document_type: "contract", status: "completed" }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.onboardingStatus).toBe("fully_onboarded");
    expect(body.steps).toEqual({
      accountCreated: true,
      passwordSet: true,
      w9Submitted: true,
      contractSigned: true,
      bankConnected: true,
      fullyOnboarded: true,
    });
  });

  it("returns partial onboarding status", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { requires_password_change: true, onboarding_status: "applied" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "w9_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "signing_requests") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.onboardingStatus).toBe("applied");
    expect(body.steps.passwordSet).toBe(false);
    expect(body.steps.w9Submitted).toBe(false);
    expect(body.steps.contractSigned).toBe(false);
    expect(body.steps.bankConnected).toBe(false);
    expect(body.steps.fullyOnboarded).toBe(false);
    expect(body.steps.accountCreated).toBe(true);
  });
});
