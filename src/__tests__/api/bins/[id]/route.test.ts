import { GET } from "@/app/api/bins/[id]/route";
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

function makeRequest(id: string) {
  const request = new NextRequest(`http://localhost:3001/api/bins/${id}`);
  const context = { params: Promise.resolve({ id }) };
  return { request, context };
}

describe("GET /api/bins/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const { request, context } = makeRequest("bin-1");
    const response = await GET(request, context);
    expect(response.status).toBe(401);
  });

  it("returns 403 when bin belongs to another franchise", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

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
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "not found", code: "PGRST116" },
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1");
    const response = await GET(request, context);
    expect(response.status).toBe(403);
  });

  it("returns bin detail with items and check history", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockBin = {
      id: "bin-1",
      franchise_id: "fr-1",
      series: "Math 101",
      label: "Bin A",
      status: "ready",
      notes: "Handle with care",
      bin_items: [
        { id: "item-1", item_name: "Calculator", expected_quantity: 10, notes: null },
        { id: "item-2", item_name: "Ruler", expected_quantity: 15, notes: "30cm rulers" },
      ],
    };

    const mockChecks = [
      {
        id: "check-1",
        check_type: "pre_series",
        status: "complete",
        notes: null,
        created_at: "2026-03-25T10:00:00Z",
        checked_by: "auth-123",
        users: { first_name: "Jane", last_name: "Doe" },
        bin_inventory_check_items: [
          {
            id: "ci-1",
            bin_item_id: "item-1",
            status: "present",
            quantity_found: 10,
            notes: null,
            bin_items: { item_name: "Calculator" },
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
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBin,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "bin_inventory_checks") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockChecks,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1");
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bin.id).toBe("bin-1");
    expect(body.bin.items).toHaveLength(2);
    expect(body.bin.items[0]).toMatchObject({
      id: "item-1",
      itemName: "Calculator",
      expectedQuantity: 10,
    });
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0]).toMatchObject({
      id: "check-1",
      checkType: "pre_series",
      checkedByName: "Jane Doe",
    });
  });
});
