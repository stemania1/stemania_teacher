import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

const BUCKET = "signed-documents";
const SIGNED_URL_EXPIRES_SEC = 3600; // 1 hour

interface FieldSchemaEntry {
  id: string;
  type: "signature" | "date" | "text" | "initials" | "checkbox";
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  assignee: "contractor" | "admin";
  fontSize?: number;
}

interface SigningRequestMetadata {
  template_type?: string;
  field_schema_snapshot?: FieldSchemaEntry[];
  [key: string]: unknown;
}

interface SigningRequest {
  id: string;
  status: string;
  pdf_storage_key: string | null;
  signed_document_key: string | null;
  contractor_signed_at: string | null;
  metadata: SigningRequestMetadata | null;
}

async function getActiveContract(employeeNumber: number): Promise<SigningRequest | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("signing_requests")
    .select("id, status, pdf_storage_key, signed_document_key, contractor_signed_at, metadata")
    .eq("user_id", employeeNumber)
    .eq("document_type", "contract")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as SigningRequest | null;
}

export async function GET() {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contract = await getActiveContract(teacher.employeeNumber);
    if (!contract?.pdf_storage_key) {
      return NextResponse.json(
        { error: "No contract found" },
        { status: 404 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: signedUrl, error: storageError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(contract.pdf_storage_key, SIGNED_URL_EXPIRES_SEC);

    if (storageError || !signedUrl?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate document URL" },
        { status: 500 }
      );
    }

    const metadata = contract.metadata ?? {};
    const templateType = metadata.template_type ?? "generated";
    const allFields = metadata.field_schema_snapshot ?? [];
    const contractorFields = allFields.filter(
      (f: FieldSchemaEntry) => f.assignee === "contractor"
    );

    return NextResponse.json({
      id: contract.id,
      status: contract.status,
      pdfUrl: signedUrl.signedUrl,
      needsContractorSignature: !contract.contractor_signed_at,
      templateType,
      fieldSchema: contractorFields,
    });
  } catch (error) {
    return handleApiError(error, "Failed to load contract");
  }
}

export async function POST(request: NextRequest) {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contract = await getActiveContract(teacher.employeeNumber);
    if (!contract) {
      return NextResponse.json({ error: "No contract found" }, { status: 404 });
    }

    if (contract.contractor_signed_at) {
      return NextResponse.json(
        { error: "Contract already signed" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { signatureMethod, signatureBase64, signatureText, fieldValues, signatures } = body;

    if (
      signatureMethod !== "draw" && signatureMethod !== "typed" ||
      (signatureMethod === "draw" && !signatureBase64) ||
      (signatureMethod === "typed" && !signatureText)
    ) {
      return NextResponse.json(
        { error: "Invalid signature data. Provide signatureMethod ('draw' or 'typed') with signatureBase64 or signatureText." },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const existingMetadata = contract.metadata ?? {};

    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      contractor_signature_method: signatureMethod,
      contractor_signature_base64: signatureMethod === "draw" ? signatureBase64 : null,
      contractor_signature_text: signatureMethod === "typed" ? signatureText : null,
      contractor_signature_ip: ip,
      contractor_signed_at: now,
      ...(fieldValues ? { field_values: fieldValues } : {}),
      ...(signatures ? { field_signatures: signatures } : {}),
    };

    const { error: updateError } = await admin
      .from("signing_requests")
      .update({
        status: "signed",
        contractor_signed_at: now,
        metadata: updatedMetadata,
      })
      .eq("id", contract.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to record signature" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: "signed" });
  } catch (error) {
    return handleApiError(error, "Failed to sign contract");
  }
}
