import { GET } from "@/app/api/stripe/account-status/route";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const mockAccountRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    accounts: { retrieve: mockAccountRetrieve },
  })),
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

function mockUserQuery(data: Record<string, unknown> | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  };
}

describe("GET /api/stripe/account-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns not_started when no stripe_account_id", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      mockUserQuery({ stripe_account_id: null, stripe_onboarding_complete: false }) as never
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("not_started");
  });

  it("returns complete when stripe_onboarding_complete is already true", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      mockUserQuery({ stripe_account_id: "acct_123", stripe_onboarding_complete: true }) as never
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("complete");
    // Should not call Stripe API when DB already says complete
    expect(mockAccountRetrieve).not.toHaveBeenCalled();
  });

  it("checks Stripe API when DB says incomplete and returns complete if details_submitted", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      mockUserQuery({ stripe_account_id: "acct_123", stripe_onboarding_complete: false }) as never
    );
    mockAccountRetrieve.mockResolvedValue({
      details_submitted: true,
      charges_enabled: true,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("complete");
    expect(mockAccountRetrieve).toHaveBeenCalledWith("acct_123");
  });

  it("returns in_progress when Stripe account exists but details not submitted", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      mockUserQuery({ stripe_account_id: "acct_123", stripe_onboarding_complete: false }) as never
    );
    mockAccountRetrieve.mockResolvedValue({
      details_submitted: false,
      charges_enabled: false,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("in_progress");
  });
});
