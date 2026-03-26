import { GET } from "@/app/api/bins/route";

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

describe("GET /api/bins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 403 when teacher has no franchise", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { franchise_id: null },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns bins for teacher's franchise", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockBins = [
      {
        id: "bin-1",
        franchise_id: "fr-1",
        series: "Math 101",
        label: "Bin A",
        status: "ready",
        notes: null,
        bin_items: [
          { id: "item-1", item_name: "Calculator", expected_quantity: 10, notes: null },
        ],
        bin_inventory_checks: [
          {
            id: "check-1",
            check_type: "pre_series",
            status: "complete",
            created_at: "2026-03-25T10:00:00Z",
            checked_by: "auth-123",
          },
        ],
      },
    ];

    const mockSb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { franchise_id: "fr-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "bins") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockBins,
                  error: null,
                }),
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
    expect(body.bins).toHaveLength(1);
    expect(body.bins[0]).toMatchObject({
      id: "bin-1",
      series: "Math 101",
      label: "Bin A",
      status: "ready",
      itemCount: 1,
    });
  });

  it("returns 500 when query fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { franchise_id: "fr-1" },
              error: null,
            }),
          }),
        }),
      }),
    };
    mockSb.from = vi.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { franchise_id: "fr-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      };
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
