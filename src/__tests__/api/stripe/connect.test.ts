import { POST } from "@/app/api/stripe/connect/route";
import { NextRequest } from "next/server";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const mockAccountsCreate = vi.fn().mockResolvedValue({ id: "acct_new_123" });
const mockAccountLinksCreate = vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/abc" });

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    accounts: { create: mockAccountsCreate },
    accountLinks: { create: mockAccountLinksCreate },
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

function makeRequest() {
  return new NextRequest("http://localhost/api/stripe/connect", { method: "POST" });
}

function mockUserWithUpdate(data: Record<string, unknown>) {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  return {
    sb: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        }),
        update: mockUpdate,
      }),
    },
    mockUpdate,
  };
}

describe("POST /api/stripe/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("creates a new account and returns onboarding URL when no stripe_account_id", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const { sb } = mockUserWithUpdate({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://connect.stripe.com/setup/abc");
    expect(mockAccountsCreate).toHaveBeenCalledTimes(1);
    expect(mockAccountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "express",
        individual: expect.objectContaining({
          first_name: "Jane",
          last_name: "Doe",
        }),
      })
    );
  });

  it("skips account creation when stripe_account_id already exists", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const { sb } = mockUserWithUpdate({
      stripe_account_id: "acct_existing",
      stripe_onboarding_complete: false,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://connect.stripe.com/setup/abc");
    expect(mockAccountsCreate).not.toHaveBeenCalled();
    expect(mockAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_existing" })
    );
  });

  it("returns 409 when onboarding is already complete", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const { sb } = mockUserWithUpdate({
      stripe_account_id: "acct_done",
      stripe_onboarding_complete: true,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const response = await POST(makeRequest());
    expect(response.status).toBe(409);
  });
});
