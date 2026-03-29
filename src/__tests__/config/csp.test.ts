describe("Content Security Policy", () => {
  const SUPABASE_URL = "https://mdhmwixyjsarvlmnymgi.supabase.co";

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function getCSPHeader(): Promise<string> {
    const mod = await import("../../../next.config");
    const config = mod.default;
    const headersFn = config.headers;
    if (!headersFn) throw new Error("No headers function in next.config");
    const headerGroups = await headersFn();
    const cspHeader = headerGroups[0]?.headers?.find(
      (h: { key: string }) => h.key === "Content-Security-Policy"
    );
    if (!cspHeader) throw new Error("No CSP header found");
    return cspHeader.value;
  }

  it("includes Supabase origin in frame-src for contract PDF iframe", async () => {
    const csp = await getCSPHeader();
    const frameSrc = csp
      .split(";")
      .map((d: string) => d.trim())
      .find((d: string) => d.startsWith("frame-src"));
    expect(frameSrc).toBeDefined();
    expect(frameSrc).toContain(SUPABASE_URL);
  });
});
