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

const sampleFieldSchema = [
  {
    id: "sig-1",
    type: "signature",
    label: "Contractor Signature",
    page: 0,
    x: 60,
    y: 200,
    width: 220,
    height: 40,
    required: true,
    assignee: "contractor",
  },
  {
    id: "date-1",
    type: "date",
    label: "Date",
    page: 0,
    x: 60,
    y: 160,
    width: 140,
    height: 24,
    required: true,
    assignee: "contractor",
  },
  {
    id: "name-1",
    type: "text",
    label: "Full Name",
    page: 0,
    x: 60,
    y: 120,
    width: 200,
    height: 24,
    required: true,
    assignee: "contractor",
  },
  {
    id: "admin-sig",
    type: "signature",
    label: "Admin Signature",
    page: 1,
    x: 60,
    y: 200,
    width: 220,
    height: 40,
    required: true,
    assignee: "admin",
  },
];

function buildMockSb(contractData: Record<string, unknown> | null, storageOk = true) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: contractData,
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
        createSignedUrl: vi.fn().mockResolvedValue(
          storageOk
            ? { data: { signedUrl: "https://storage.example.com/signed-contract-url" }, error: null }
            : { data: null, error: new Error("not found") }
        ),
      }),
    },
  };
}

function buildMockSbWithUpdate(contractData: Record<string, unknown>) {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockSb = {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: contractData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
      update: mockUpdate,
    })),
    storage: { from: vi.fn() },
  };

  return { mockSb, mockUpdate };
}

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
    vi.mocked(getSupabaseAdmin).mockReturnValue(buildMockSb(null) as never);

    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns contract details with PDF URL", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const mockSb = buildMockSb({
      id: "req-uuid-1",
      status: "sent",
      pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
      signed_document_key: null,
      contractor_signed_at: null,
      metadata: { template_type: "generated" },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("req-uuid-1");
    expect(body.pdfUrl).toBe("https://storage.example.com/signed-contract-url");
    expect(body.needsContractorSignature).toBe(true);
    expect(body.templateType).toBe("generated");
    expect(body.fieldSchema).toEqual([]);
    expect(mockSb.storage.from).toHaveBeenCalledWith("signed-documents");
  });

  it("returns needsContractorSignature false when already signed", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      buildMockSb({
        id: "req-uuid-1",
        status: "signed",
        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
        signed_document_key: null,
        contractor_signed_at: "2026-03-27T10:00:00Z",
        metadata: { template_type: "generated" },
      }) as never
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.needsContractorSignature).toBe(false);
  });

  it("falls back to unsigned.pdf when corrupted contractor-signed.pdf key fails", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);

    const createSignedUrl = vi.fn()
      .mockResolvedValueOnce({ data: null, error: new Error("not found") }) // corrupted key fails
      .mockResolvedValueOnce({ data: { signedUrl: "https://storage.example.com/fallback-url" }, error: null }); // fallback succeeds

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSb = {
      from: vi.fn().mockImplementation(() => ({
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
                        metadata: { template_type: "generated" },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: mockUpdate,
      })),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrl }),
      },
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pdfUrl).toBe("https://storage.example.com/fallback-url");
    // Should have tried the fallback path
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(createSignedUrl.mock.calls[1][0]).toBe("contracts/req-uuid-1/unsigned.pdf");
  });

  it("returns contractor-assigned fields from custom_pdf template", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      buildMockSb({
        id: "req-uuid-1",
        status: "sent",
        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
        signed_document_key: null,
        contractor_signed_at: null,
        metadata: {
          template_type: "custom_pdf",
          field_schema_snapshot: sampleFieldSchema,
        },
      }) as never
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templateType).toBe("custom_pdf");
    expect(body.fieldSchema).toHaveLength(3); // only contractor fields
    expect(body.fieldSchema.every((f: { assignee: string }) => f.assignee === "contractor")).toBe(true);
    expect(body.fieldSchema.find((f: { id: string }) => f.id === "admin-sig")).toBeUndefined();
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
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      buildMockSb({
        id: "req-uuid-1",
        status: "sent",
        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
        signed_document_key: null,
        contractor_signed_at: null,
        metadata: { template_type: "generated" },
      }) as never
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("does not overwrite pdf_storage_key and merges metadata when signing", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({
        signatureMethod: "typed",
        signatureText: "Jane Doe",
        fieldValues: { "date-1": "2026-03-29", "name-1": "Jane Doe" },
      }),
    });

    const existingMetadata = {
      template_type: "custom_pdf",
      field_schema_snapshot: sampleFieldSchema,
    };

    const { mockSb, mockUpdate } = buildMockSbWithUpdate({
      id: "req-uuid-1",
      status: "sent",
      pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
      signed_document_key: null,
      contractor_signed_at: null,
      metadata: existingMetadata,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await POST(request);
    expect(response.status).toBe(200);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty("pdf_storage_key");
    expect(updatePayload.status).toBe("signed");
    // Existing metadata fields are preserved
    expect(updatePayload.metadata.template_type).toBe("custom_pdf");
    expect(updatePayload.metadata.field_schema_snapshot).toEqual(sampleFieldSchema);
    // Signature fields are added at top level per admin app convention
    expect(updatePayload.metadata.contractor_signature_method).toBe("typed");
    expect(updatePayload.metadata.contractor_signature_text).toBe("Jane Doe");
    expect(updatePayload.metadata.contractor_signed_at).toBeDefined();
    expect(updatePayload.metadata.contractor_signature_ip).toBeDefined();
    // Field values are stored
    expect(updatePayload.metadata.field_values).toEqual({
      "date-1": "2026-03-29",
      "name-1": "Jane Doe",
    });
  });

  it("stores drawn signature data in metadata", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const sigData = "data:image/png;base64,abc123";
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({
        signatureMethod: "draw",
        signatureBase64: sigData,
      }),
    });

    const { mockSb, mockUpdate } = buildMockSbWithUpdate({
      id: "req-uuid-1",
      status: "sent",
      pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
      signed_document_key: null,
      contractor_signed_at: null,
      metadata: { template_type: "generated" },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSb as never);

    const response = await POST(request);
    expect(response.status).toBe(200);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.metadata.contractor_signature_method).toBe("draw");
    expect(updatePayload.metadata.contractor_signature_base64).toBe(sigData);
    expect(updatePayload.metadata.contractor_signature_text).toBeNull();
  });

  it("returns 409 when contract already signed by contractor", async () => {
    vi.mocked(getCurrentTeacherFromDb).mockResolvedValue(mockTeacher);
    const request = new NextRequest("http://localhost/api/teacher/contract", {
      method: "POST",
      body: JSON.stringify({ signatureMethod: "typed", signatureText: "Jane Doe" }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      buildMockSb({
        id: "req-uuid-1",
        status: "signed",
        pdf_storage_key: "contracts/req-uuid-1/unsigned.pdf",
        signed_document_key: null,
        contractor_signed_at: "2026-03-27T10:00:00Z",
        metadata: { template_type: "generated" },
      }) as never
    );

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
