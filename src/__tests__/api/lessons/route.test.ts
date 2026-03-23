import { GET } from "@/app/api/lessons/route";

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

describe("GET /api/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns empty array when teacher has no assignments", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.lessons).toEqual([]);
  });

  it("returns lessons with curriculum data", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "teacher_lesson_assignments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  or: vi.fn().mockResolvedValue({
                    data: [{ lesson_id: "les-1" }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "lessons") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{
                    id: "les-1",
                    title: "Intro to Math",
                    description: "Basic math",
                    estimated_duration_minutes: 45,
                    curriculum_id: "cur-1",
                  }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "curricula") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "cur-1", title: "Mathematics", subject: "Math", grade_level: "3rd" }],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.lessons).toHaveLength(1);
    expect(body.lessons[0]).toEqual({
      lessonId: "les-1",
      title: "Intro to Math",
      description: "Basic math",
      curriculumTitle: "Mathematics",
      subject: "Math",
      gradeLevel: "3rd",
      estimatedDuration: 45,
    });
  });

  it("returns 500 when assignment query fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
