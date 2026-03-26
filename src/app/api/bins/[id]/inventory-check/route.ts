import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";
import { parseBody } from "@/lib/validations";
import { inventoryCheckSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized or user not found in directory" },
        { status: 401 }
      );
    }

    const { id: binId } = await params;
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

    // Validate body
    const parsed = await parseBody(request, inventoryCheckSchema);
    if ("error" in parsed) return parsed.error;
    const { check_type, items } = parsed.data;

    // Verify bin belongs to teacher's franchise
    const { data: bin, error: binError } = await supabase
      .from("bins")
      .select("id, franchise_id")
      .eq("id", binId)
      .eq("franchise_id", userData.franchise_id)
      .single();

    if (binError || !bin) {
      return NextResponse.json(
        { error: "Bin not found or access denied" },
        { status: 403 }
      );
    }

    // Create the inventory check record
    const { data: check, error: checkError } = await supabase
      .from("bin_inventory_checks")
      .insert({
        bin_id: binId,
        checked_by: teacher.authUserId,
        check_type,
        status: "complete",
      })
      .select("id")
      .single();

    if (checkError || !check) {
      throw new Error(checkError?.message || "Failed to create check");
    }

    // Insert check items
    const checkItems = items.map(
      (item: {
        bin_item_id: string;
        status: string;
        quantity_found: number;
        notes?: string;
      }) => ({
        check_id: check.id,
        bin_item_id: item.bin_item_id,
        status: item.status,
        quantity_found: item.quantity_found,
        notes: item.notes || null,
      })
    );

    const { error: itemsError } = await supabase
      .from("bin_inventory_check_items")
      .insert(checkItems);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    // Determine new bin status
    const hasMissingOrDamaged = items.some(
      (item: { status: string }) =>
        item.status === "missing" || item.status === "damaged"
    );

    let newBinStatus: string;
    if (hasMissingOrDamaged) {
      newBinStatus = "needs_restock";
    } else if (check_type === "pre_series") {
      newBinStatus = "checked_out";
    } else {
      // post_series, all present
      newBinStatus = "ready";
    }

    // Update bin status
    const { error: updateError } = await supabase
      .from("bins")
      .update({ status: newBinStatus })
      .eq("id", binId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      checkId: check.id,
      binStatus: newBinStatus,
    });
  } catch (error) {
    return handleApiError(error, "Failed to create inventory check");
  }
}
