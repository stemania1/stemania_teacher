import { GET, POST } from "@/app/api/classes/[classId]/attendance/route";
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

function mockAssignedSupabase(extraFromCalls?: ((callCount: number) => unknown)[]) {
  let callCount = 0;
  return {
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
      if (extraFromCalls && extraFromCalls[callCount - 2]) {
        return extraFromCalls[callCount - 2](callCount);
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    }),
  };
}

function mockUnassignedSupabase() {
  return {
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
}

describe("GET /api/classes/[classId]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance?date=2026-03-23");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when date parameter is missing", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("date");
  });

  it("returns 403 when teacher is not assigned", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockUnassignedSupabase() as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance?date=2026-03-23");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(403);
  });

  it("returns attendance records for a given date", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const records = [
      { id: "rec-1", student_id: "stu-1", status: "present", notes: null, recorded_at: "2026-03-23T10:00:00Z" },
      { id: "rec-2", student_id: "stu-2", status: "absent", notes: "Sick", recorded_at: "2026-03-23T10:00:00Z" },
    ];

    const mockSb = mockAssignedSupabase([
      () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: records,
              error: null,
            }),
          }),
        }),
      }),
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance?date=2026-03-23");
    const response = await GET(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.records).toHaveLength(2);
    expect(body.records[0].status).toBe("present");
    expect(body.records[1].notes).toBe("Sick");
  });
});

describe("POST /api/classes/[classId]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({ date: "2026-03-23", records: [] }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when date is missing", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({ records: [{ studentId: "stu-1", status: "present" }] }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when records is not an array", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({ date: "2026-03-23", records: "invalid" }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid status values", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({
        date: "2026-03-23",
        records: [{ studentId: "stu-1", status: "late" }],
      }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid record");
  });

  it("returns 403 when teacher is not assigned", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockUnassignedSupabase() as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({
        date: "2026-03-23",
        records: [{ studentId: "stu-1", status: "present" }],
      }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(403);
  });

  it("successfully upserts attendance records", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = mockAssignedSupabase([
      () => ({
        upsert: vi.fn().mockReturnValue({ error: null }),
      }),
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({
        date: "2026-03-23",
        records: [
          { studentId: "stu-1", status: "present" },
          { studentId: "stu-2", status: "absent", notes: "Sick" },
        ],
      }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });

  it("returns 500 when upsert fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = mockAssignedSupabase([
      () => ({
        upsert: vi.fn().mockReturnValue({
          error: { message: "Unique constraint violation" },
        }),
      }),
    ]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const req = new NextRequest("http://localhost/api/classes/cls-1/attendance", {
      method: "POST",
      body: JSON.stringify({
        date: "2026-03-23",
        records: [{ studentId: "stu-1", status: "present" }],
      }),
    });
    const response = await POST(req, makeParams("cls-1"));
    expect(response.status).toBe(500);
  });
});
