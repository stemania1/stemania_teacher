import { handleApiError, ApiError, withErrorHandling } from "@/lib/apiErrorHandler";
import { NextResponse } from "next/server";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("handleApiError", () => {
  it("returns 401 for Unauthorized errors", async () => {
    const response = handleApiError(new Error("Unauthorized"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for Forbidden errors", async () => {
    const response = handleApiError(new Error("Forbidden"));
    expect(response.status).toBe(403);
  });

  it("returns 500 for generic errors", async () => {
    const response = handleApiError(new Error("Something broke"));
    expect(response.status).toBe(500);
  });

  it("uses default message for unknown errors", async () => {
    const response = handleApiError(null);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});

describe("withErrorHandling", () => {
  it("passes through successful responses", async () => {
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ data: "ok" });
    });
    const response = await handler();
    expect(response.status).toBe(200);
  });

  it("catches thrown errors", async () => {
    const handler = withErrorHandling(async (): Promise<NextResponse> => {
      throw new Error("Unauthorized");
    });
    const response = await handler();
    expect(response.status).toBe(401);
  });
});
