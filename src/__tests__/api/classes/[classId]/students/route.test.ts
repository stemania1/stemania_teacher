import { GET } from "@/app/api/classes/[classId]/students/route";
import { NextRequest } from "next/server";

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

const makeParams = (classId: string) => ({
  params: Promise.resolve({ classId }),
});

describe("GET /api/classes/[classId]/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/classes/cls-1/students");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(401);
  });

  it("returns 403 when teacher is not assigned to the class", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockReturnValue({
                    data: null,
                    error: { message: "not found" },
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/students");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("not assigned");
  });

  it("returns students when teacher is assigned", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // class_teacher_assignments check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockReturnValue({
                      data: { id: "assign-1" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          // class_enrollments
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                data: [{ student_id: "stu-1" }, { student_id: "stu-2" }],
                error: null,
              }),
            }),
          };
        }
        // students table
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: [
                  { id: "stu-1", name: "Alice", email: "alice@test.com" },
                  { id: "stu-2", name: "Bob", email: null },
                ],
                error: null,
              }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/students");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.students).toHaveLength(2);
    expect(body.students[0]).toEqual({ id: "stu-1", name: "Alice", email: "alice@test.com" });
    expect(body.students[1]).toEqual({ id: "stu-2", name: "Bob", email: null });
  });

  it("returns empty array when no students are enrolled", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockReturnValue({
                      data: { id: "assign-1" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/students");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.students).toEqual([]);
  });
});
