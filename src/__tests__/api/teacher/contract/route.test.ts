import { GET, POST } from "@/app/api/teacher/contract/route";
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

describe("GET /api/teacher/contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 404 when no contract signing request exists", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      storage: { from: vi.fn() },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns contract details with PDF URL", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "req-uuid-1",
                        status: "sent",
                        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
                        signed_document_key: null,
                        contractor_signed_at: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://storage.example.com/signed-contract-url" },
            error: null,
          }),
        }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("req-uuid-1");
    expect(body.status).toBe("sent");
    expect(body.pdfUrl).toBe("https://storage.example.com/signed-contract-url");
    expect(body.needsContractorSignature).toBe(true);
    expect(mockSb.storage.from).toHaveBeenCalledWith("signed-documents");
  });

  it("returns needsContractorSignature false when already signed", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "req-uuid-1",
                        status: "signed",
                        pdf_storage_key: "contracts/req-uuid-1/contractor-signed.pdf",
                        signed_document_key: null,
                        contractor_signed_at: "2026-03-27T10:00:00Z",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://storage.example.com/signed-contract-url" },
            error: null,
          }),
        }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.needsContractorSignature).toBe(false);
  });
});

describe("POST /api/teacher/contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({ signatureMethod: "typed", signatureText: "Jane Doe" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 with invalid signature data", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "req-uuid-1",
                        status: "sent",
                        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
                        signed_document_key: null,
                        contractor_signed_at: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      storage: { from: vi.fn() },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 409 when contract already signed by contractor", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({ signatureMethod: "typed", signatureText: "Jane Doe" }),
    });

    const mockSb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "req-uuid-1",
                        status: "signed",
                        pdf_storage_key: "contracts/req-uuid-1/contractor-signed.pdf",
                        signed_document_key: null,
                        contractor_signed_at: "2026-03-27T10:00:00Z",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      storage: { from: vi.fn() },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
