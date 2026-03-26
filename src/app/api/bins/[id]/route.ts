import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET(
  _request: NextRequest,
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

    const { id } = await params;
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

    // Get bin with items, scoped to franchise
    const { data: bin, error: binError } = await supabase
      .from("bins")
      .select(
        `
        id, franchise_id, series, label, status, notes,
        bin_items (id, item_name, expected_quantity, notes)
        `
      )
      .eq("id", id)
      .eq("franchise_id", userData.franchise_id)
      .single();

    if (binError || !bin) {
      return NextResponse.json(
        { error: "Bin not found or access denied" },
        { status: 403 }
      );
    }

    // Get recent check history with checker name and item details
    const { data: checks, error: checksError } = await supabase
      .from("bin_inventory_checks")
      .select(
        `
        id, check_type, status, notes, created_at, checked_by,
        users:checked_by (first_name, last_name),
        bin_inventory_check_items (
          id, bin_item_id, status, quantity_found, notes,
          bin_items (item_name)
        )
        `
      )
      .eq("bin_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (checksError) throw new Error(checksError.message);

    const items = (bin.bin_items || []).map(
      (item: {
        id: string;
        item_name: string;
        expected_quantity: number;
        notes: string | null;
      }) => ({
        id: item.id,
        itemName: item.item_name,
        expectedQuantity: item.expected_quantity,
        notes: item.notes,
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkHistory = (checks || []).map((check: any) => {
      // Supabase may return the joined user as an object or array
      const user = Array.isArray(check.users) ? check.users[0] : check.users;
      return {
        id: check.id,
        checkType: check.check_type,
        status: check.status,
        notes: check.notes,
        createdAt: check.created_at,
        checkedBy: check.checked_by,
        checkedByName: user
          ? `${user.first_name} ${user.last_name}`
          : "Unknown",
        items: (check.bin_inventory_check_items || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ci: any) => {
            const binItem = Array.isArray(ci.bin_items)
              ? ci.bin_items[0]
              : ci.bin_items;
            return {
              id: ci.id,
              binItemId: ci.bin_item_id,
              status: ci.status,
              quantityFound: ci.quantity_found,
              notes: ci.notes,
              itemName: binItem?.item_name || "Unknown",
            };
          }
        ),
      };
    });

    return NextResponse.json({
      bin: {
        id: bin.id,
        series: bin.series,
        label: bin.label,
        status: bin.status,
        notes: bin.notes,
        items,
      },
      checks: checkHistory,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch bin details");
  }
}
