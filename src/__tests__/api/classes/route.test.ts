import { GET } from "@/app/api/classes/route";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const mockTeacher = {
  employeeNumber: 42,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  authUserId: "auth-123",
};

vi.mock("@/lib/lessonDeliveryAuth", () => ({
  getCurrentTeacherFromDb: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    ...overrides,
  };
  // Make all chain methods return the chain itself unless overridden
  for (const key of Object.keys(chain)) {
    if (!overrides[key] && typeof chain[key] === "function") {
      (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

describe("GET /api/classes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns empty array when teacher has no class assignments", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = createMockSupabase();
    // First call: class_teacher_assignments query resolves with empty data
    mockSb._chain.eq = vi.fn().mockReturnValue({
      data: [],
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.classes).toEqual([]);
  });

  it("returns classes when teacher has assignments", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockClasses = [
      { id: "cls-1", name: "Math 101", description: "Intro to math", start_time: null, end_time: null },
      { id: "cls-2", name: "Science 201", description: null, start_time: "09:00", end_time: "10:00" },
    ];

    let callCount = 0;
    const mockSb = createMockSupabase();
    mockSb.from = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // class_teacher_assignments
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [{ class_id: "cls-1" }, { class_id: "cls-2" }],
              error: null,
            }),
          }),
        };
      }
      // bookeo_classes
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            data: mockClasses,
            error: null,
          }),
        }),
      };
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.classes).toHaveLength(2);
    expect(body.classes[0]).toEqual({
      classId: "cls-1",
      name: "Math 101",
      description: "Intro to math",
      startTime: null,
      endTime: null,
      daysOfWeek: [],
    });
    expect(body.classes[1]).toEqual({
      classId: "cls-2",
      name: "Science 201",
      description: null,
      startTime: "09:00",
      endTime: "10:00",
      daysOfWeek: [],
    });
  });

  it("returns 500 when assignment query fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = createMockSupabase();
    mockSb.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: null,
          error: { message: "DB connection error" },
        }),
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
