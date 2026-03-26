import { POST } from "@/app/api/bins/[id]/inventory-check/route";
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

function makeRequest(
  id: string,
  body: Record<string, unknown>
) {
  const request = new NextRequest(`http://localhost:3001/api/bins/${id}/inventory-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const context = { params: Promise.resolve({ id }) };
  return { request, context };
}

describe("POST /api/bins/[id]/inventory-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const { request, context } = makeRequest("bin-1", {
      check_type: "pre_series",
      items: [],
    });
    const response = await POST(request, context);
    expect(response.status).toBe(401);
  });

  it("returns 400 with invalid check_type", async () => {
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
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1", {
      check_type: "invalid",
      items: [],
    });
    const response = await POST(request, context);
    expect(response.status).toBe(400);
  });

  it("returns 400 when items array is empty", async () => {
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
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1", {
      check_type: "pre_series",
      items: [],
    });
    const response = await POST(request, context);
    expect(response.status).toBe(400);
  });

  it("creates inventory check and updates bin status", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockInsertCheck = vi.fn().mockResolvedValue({
      data: { id: "check-new" },
      error: null,
    });
    const mockInsertItems = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockUpdateBin = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

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
                    data: { id: "bin-1", franchise_id: "fr-1" },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(mockUpdateBin),
            }),
          };
        }
        if (table === "bin_inventory_checks") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockInsertCheck,
              }),
            }),
          };
        }
        if (table === "bin_inventory_check_items") {
          return {
            insert: mockInsertItems,
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1", {
      check_type: "pre_series",
      items: [
        {
          bin_item_id: "item-1",
          status: "present",
          quantity_found: 10,
          notes: "",
        },
      ],
    });
    const response = await POST(request, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.checkId).toBe("check-new");
  });

  it("sets bin status to needs_restock when item is missing", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    let updatedStatus: string | null = null;

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
                    data: { id: "bin-1", franchise_id: "fr-1" },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation((val: { status: string }) => {
              updatedStatus = val.status;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }),
          };
        }
        if (table === "bin_inventory_checks") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "check-new" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "bin_inventory_check_items") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const { request, context } = makeRequest("bin-1", {
      check_type: "pre_series",
      items: [
        {
          bin_item_id: "item-1",
          status: "missing",
          quantity_found: 0,
        },
      ],
    });
    const response = await POST(request, context);
    expect(response.status).toBe(200);
    expect(updatedStatus).toBe("needs_restock");
  });
});
