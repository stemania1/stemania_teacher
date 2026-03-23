import { parseBody, logActionSchema } from "@/lib/validations";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createBadRequest(): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json",
  });
}

describe("parseBody", () => {
  it("parses valid body against schema", async () => {
    const request = createRequest({ action: "print_attempt" });
    const result = await parseBody(request, logActionSchema);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.action).toBe("print_attempt");
    }
  });

  it("returns error for invalid JSON", async () => {
    const request = createBadRequest();
    const result = await parseBody(request, logActionSchema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.error).toBe("Invalid JSON body");
    }
  });

  it("returns validation error for invalid data", async () => {
    const request = createRequest({ action: "invalid_action" });
    const result = await parseBody(request, logActionSchema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    }
  });

  it("returns validation error for missing fields", async () => {
    const request = createRequest({});
    const result = await parseBody(request, logActionSchema);
    expect("error" in result).toBe(true);
  });
});

describe("logActionSchema", () => {
  it.each([
    "print_attempt",
    "copy_attempt",
    "download_attempt",
    "screenshot_attempt",
  ])("accepts valid action: %s", (action) => {
    const result = logActionSchema.safeParse({ action });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = logActionSchema.safeParse({ action: "hack_attempt" });
    expect(result.success).toBe(false);
  });
});
