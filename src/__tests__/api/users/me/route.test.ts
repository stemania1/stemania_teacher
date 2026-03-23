import { GET } from "@/app/api/users/me/route";

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";

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
