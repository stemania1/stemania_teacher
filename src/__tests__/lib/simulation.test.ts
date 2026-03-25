import { getSimulatedEmployeeNumber, isSimulationActive, isSuperAdmin } from "@/lib/simulation";

// Mock next/headers cookies
const mockCookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(() => ({
    get: (name: string) => {
      const value = mockCookieStore.get(name);
      return value ? { name, value } : undefined;
    },
  })),
}));

describe("simulation helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.clear();
  });

  describe("isSuperAdmin", () => {
    it("returns true when email matches SUPER_ADMIN_EMAIL", () => {
      process.env.SUPER_ADMIN_EMAIL = "admin@stemania.com";
      expect(isSuperAdmin("admin@stemania.com")).toBe(true);
    });

    it("returns true case-insensitively", () => {
      process.env.SUPER_ADMIN_EMAIL = "admin@stemania.com";
      expect(isSuperAdmin("Admin@STEMANIA.com")).toBe(true);
    });

    it("returns false for non-matching email", () => {
      process.env.SUPER_ADMIN_EMAIL = "admin@stemania.com";
      expect(isSuperAdmin("teacher@stemania.com")).toBe(false);
    });

    it("returns false when SUPER_ADMIN_EMAIL is not set", () => {
      delete process.env.SUPER_ADMIN_EMAIL;
      expect(isSuperAdmin("admin@stemania.com")).toBe(false);
    });

    it("returns false for null/undefined email", () => {
      process.env.SUPER_ADMIN_EMAIL = "admin@stemania.com";
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe("getSimulatedEmployeeNumber", () => {
    it("returns the employee number from the cookie", async () => {
      mockCookieStore.set("simulate_teacher", "42");
      expect(await getSimulatedEmployeeNumber()).toBe(42);
    });

    it("returns null when no cookie is set", async () => {
      expect(await getSimulatedEmployeeNumber()).toBeNull();
    });

    it("returns null for non-numeric cookie value", async () => {
      mockCookieStore.set("simulate_teacher", "abc");
      expect(await getSimulatedEmployeeNumber()).toBeNull();
    });
  });

  describe("isSimulationActive", () => {
    it("returns true when simulate_teacher cookie is set", async () => {
      mockCookieStore.set("simulate_teacher", "42");
      expect(await isSimulationActive()).toBe(true);
    });

    it("returns false when no cookie is set", async () => {
      expect(await isSimulationActive()).toBe(false);
    });
  });
});
