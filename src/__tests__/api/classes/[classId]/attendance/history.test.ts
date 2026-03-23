import { GET } from "@/app/api/classes/[classId]/attendance/history/route";
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

describe("GET /api/classes/[classId]/attendance/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance/history");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(401);
  });

  it("returns 403 when teacher is not assigned", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
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
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance/history");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(403);
  });

  it("returns sessions grouped by date with counts", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const records = [
      { id: "r1", student_id: "stu-1", session_date: "2026-03-23", status: "present", notes: null, recorded_at: "2026-03-23T10:00:00Z" },
      { id: "r2", student_id: "stu-2", session_date: "2026-03-23", status: "absent", notes: "Sick", recorded_at: "2026-03-23T10:00:00Z" },
      { id: "r3", student_id: "stu-1", session_date: "2026-03-22", status: "tardy", notes: null, recorded_at: "2026-03-22T10:00:00Z" },
    ];

    const students = [
      { id: "stu-1", name: "Alice" },
      { id: "stu-2", name: "Bob" },
    ];

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // assignment check
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
          // attendance_records
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: records,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // students
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: students,
              error: null,
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance/history");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.sessions).toHaveLength(2);
    // Sorted by date desc: 2026-03-23 first
    expect(body.sessions[0].date).toBe("2026-03-23");
    expect(body.sessions[0].counts).toEqual({ present: 1, absent: 1, tardy: 0 });
    expect(body.sessions[0].records).toHaveLength(2);
    expect(body.sessions[0].records[0].studentName).toBe("Alice");

    expect(body.sessions[1].date).toBe("2026-03-22");
    expect(body.sessions[1].counts).toEqual({ present: 0, absent: 0, tardy: 1 });
  });

  it("returns empty sessions when no records exist", async () => {
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
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance/history");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sessions).toEqual([]);
  });
});
