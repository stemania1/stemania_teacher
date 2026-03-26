import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET() {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized or user not found in directory" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get teacher's franchise
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("franchise_id")
      .eq("employee_number", teacher.employeeNumber)
      .single();

    if (userError || !userData?.franchise_id) {
      return NextResponse.json(
        { error: "No franchise assigned to your account" },
        { status: 403 }
      );
    }

    const franchiseId = userData.franchise_id;

    // Get bins with items and latest check
    const { data: bins, error: binsError } = await supabase
      .from("bins")
      .select(
        `
        id, franchise_id, series, label, status, notes,
        bin_items (id, item_name, expected_quantity, notes),
        bin_inventory_checks (id, check_type, status, created_at, checked_by)
        `
      )
      .eq("franchise_id", franchiseId)
      .order("label");

    if (binsError) throw new Error(binsError.message);

    const response = (bins || []).map((bin) => {
      const items = bin.bin_items || [];
      const checks = bin.bin_inventory_checks || [];
      // Latest check is the most recent by created_at
      const latestCheck = checks.length > 0
        ? checks.sort(
            (a: { created_at: string }, b: { created_at: string }) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        : null;

      return {
        id: bin.id,
        series: bin.series,
        label: bin.label,
        status: bin.status,
        notes: bin.notes,
        itemCount: items.length,
        latestCheck: latestCheck
          ? {
              id: latestCheck.id,
              checkType: latestCheck.check_type,
              status: latestCheck.status,
              createdAt: latestCheck.created_at,
            }
          : null,
      };
    });

    return NextResponse.json({ bins: response });
  } catch (error) {
    return handleApiError(error, "Failed to fetch bins");
  }
}
