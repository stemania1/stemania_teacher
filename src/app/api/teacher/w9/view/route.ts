import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

const BUCKET = "w9-documents";
const SIGNED_URL_EXPIRES_SEC = 3600; // 1 hour

export async function GET() {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: w9 } = await admin
      .from("w9_submissions")
      .select("generated_pdf_key, status")
      .eq("user_id", teacher.employeeNumber)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!w9?.generated_pdf_key) {
      return NextResponse.json(
        { error: "No completed W-9 found" },
        { status: 404 }
      );
    }

    const { data: signedUrl, error: storageError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(w9.generated_pdf_key, SIGNED_URL_EXPIRES_SEC);

    if (storageError || !signedUrl?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate document URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    return handleApiError(error, "Failed to load W-9");
  }
}
