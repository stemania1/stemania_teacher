import { z } from "zod";
import { NextResponse } from "next/server";

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: issues },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

export const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
}).refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
  message: "At least one of firstName or lastName must be provided",
});

export const logActionSchema = z.object({
  action: z.enum(["print_attempt", "copy_attempt", "download_attempt", "screenshot_attempt"]),
});

export const inventoryCheckSchema = z.object({
  check_type: z.enum(["pre_series", "post_series"]),
  items: z
    .array(
      z.object({
        bin_item_id: z.string().min(1),
        status: z.enum(["present", "missing", "damaged"]),
        quantity_found: z.number().int().min(0),
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one item is required"),
});
