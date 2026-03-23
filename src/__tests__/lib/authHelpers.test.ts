import { getUserAuthMethods } from "@/lib/authHelpers";
import type { User } from "@supabase/supabase-js";

function makeUser(providers: string[]): User {
  return {
    app_metadata: { providers },
  } as User;
}

describe("getUserAuthMethods", () => {
  it("detects email (password) provider", () => {
    const result = getUserAuthMethods(makeUser(["email"]));
    expect(result.hasPassword).toBe(true);
    expect(result.hasGoogle).toBe(false);
    expect(result.isPasswordOnly).toBe(true);
    expect(result.isGoogleOnly).toBe(false);
  });

  it("detects google provider", () => {
    const result = getUserAuthMethods(makeUser(["google"]));
    expect(result.hasPassword).toBe(false);
    expect(result.hasGoogle).toBe(true);
    expect(result.isGoogleOnly).toBe(true);
    expect(result.isPasswordOnly).toBe(false);
  });

  it("detects both providers", () => {
    const result = getUserAuthMethods(makeUser(["email", "google"]));
    expect(result.hasPassword).toBe(true);
    expect(result.hasGoogle).toBe(true);
    expect(result.isGoogleOnly).toBe(false);
    expect(result.isPasswordOnly).toBe(false);
  });

  it("handles null user", () => {
    const result = getUserAuthMethods(null);
    expect(result.hasPassword).toBe(false);
    expect(result.hasGoogle).toBe(false);
  });

  it("handles undefined user", () => {
    const result = getUserAuthMethods(undefined);
    expect(result.hasPassword).toBe(false);
    expect(result.hasGoogle).toBe(false);
  });

  it("handles empty providers array", () => {
    const result = getUserAuthMethods(makeUser([]));
    expect(result.hasPassword).toBe(false);
    expect(result.hasGoogle).toBe(false);
  });
});
