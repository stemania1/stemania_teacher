import { POST } from "@/app/api/lessons/[id]/log-action/route";
import { NextRequest } from "next/server";

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

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/lessons/les-1/log-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lessons/[id]/log-action", () => {
  const params = Promise.resolve({ id: "les-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await POST(
      createRequest({ action: "print_attempt" }),
      { params }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const response = await POST(
      createRequest({ action: "invalid" }),
      { params }
    );
    expect(response.status).toBe(400);
  });

  it("logs action and returns ok for valid request", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const mockSb = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await POST(
      createRequest({ action: "print_attempt" }),
      { params }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect(mockSb.from).toHaveBeenCalledWith("lesson_access_log");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 42,
        lesson_id: "les-1",
        action: "print_attempt",
        ip_address: "1.2.3.4",
        user_agent: "TestBrowser/1.0",
      })
    );
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new NextRequest("http://localhost/api/lessons/les-1/log-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(request, { params });
    expect(response.status).toBe(400);
  });
});
