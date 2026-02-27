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

export const logActionSchema = z.object({
  action: z.enum(["print_attempt", "copy_attempt", "download_attempt", "screenshot_attempt"]),
});
