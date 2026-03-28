import { GET, PATCH } from "@/app/api/users/me/route";

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns user info when authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue({
      employeeNumber: 42,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      authUserId: "auth-123",
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
    });
  });

  it("uses 'Teacher' as fallback display name", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue({
      employeeNumber: 1,
      firstName: "",
      lastName: "",
      email: "anon@example.com",
      authUserId: "auth-456",
    });

    const response = await GET();
    const body = await response.json();
    expect(body.displayName).toBe("Teacher");
  });
});

describe("PATCH /api/users/me", () => {
  const mockTeacher = {
    employeeNumber: 42,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    authUserId: "auth-123",
  };

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await PATCH(makeRequest({ firstName: "New" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when no valid fields provided", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const response = await PATCH(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when firstName is too long", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const response = await PATCH(makeRequest({ firstName: "A".repeat(101) }));
    expect(response.status).toBe(400);
  });

  it("updates firstName successfully", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const response = await PATCH(makeRequest({ firstName: "Janet" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.firstName).toBe("Janet");
    expect(body.lastName).toBe("Doe");
  });

  it("updates lastName successfully", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const response = await PATCH(makeRequest({ lastName: "Smith" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.firstName).toBe("Jane");
    expect(body.lastName).toBe("Smith");
  });

  it("updates both firstName and lastName", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const response = await PATCH(makeRequest({ firstName: "Janet", lastName: "Smith" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.firstName).toBe("Janet");
    expect(body.lastName).toBe("Smith");
    expect(body.displayName).toBe("Janet Smith");
  });

  it("trims whitespace from names", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const response = await PATCH(makeRequest({ firstName: "  Janet  " }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.firstName).toBe("Janet");
  });

  it("returns 500 when database update fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as never);

    const response = await PATCH(makeRequest({ firstName: "Janet" }));
    expect(response.status).toBe(500);
  });

  it("ignores non-allowed fields", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: mockFrom } as never);

    const response = await PATCH(
      makeRequest({ firstName: "Janet", email: "hack@evil.com", employee_number: 999 })
    );
    expect(response.status).toBe(200);
    // Verify only allowed fields were sent to DB
    expect(mockUpdate).toHaveBeenCalledWith({ first_name: "Janet" });
  });
});
