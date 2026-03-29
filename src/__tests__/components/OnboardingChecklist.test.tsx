/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import OnboardingChecklist from "@/components/OnboardingChecklist";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function mockFetch(data: Record<string, unknown>) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

const allComplete = {
  onboardingStatus: "fully_onboarded",
  steps: {
    accountCreated: true,
    passwordSet: true,
    w9Submitted: true,
    contractSigned: true,
    bankConnected: true,
    fullyOnboarded: true,
  },
};

const partialSteps = {
  onboardingStatus: "applied",
  steps: {
    accountCreated: true,
    passwordSet: false,
    w9Submitted: false,
    contractSigned: false,
    bankConnected: false,
    fullyOnboarded: false,
  },
};

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while loading", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(<OnboardingChecklist />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when fully onboarded", async () => {
    mockFetch(allComplete);
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders checklist when not fully onboarded", async () => {
    mockFetch(partialSteps);
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeTruthy();
    });
    expect(screen.getByText(/1 of 6 complete/)).toBeTruthy();
  });

  it("shows step titles", async () => {
    mockFetch(partialSteps);
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText(/1\. Account Created/)).toBeTruthy();
      expect(screen.getByText(/2\. Set Password/)).toBeTruthy();
      expect(screen.getByText(/3\. W-9 Submitted/)).toBeTruthy();
      expect(screen.getByText(/4\. Contract Signed/)).toBeTruthy();
      expect(screen.getByText(/5\. Bank Account Connected/)).toBeTruthy();
      expect(screen.getByText(/6\. Fully Onboarded/)).toBeTruthy();
    });
  });

  it("shows action buttons for incomplete steps", async () => {
    mockFetch(partialSteps);
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("Set Password")).toBeTruthy();
      expect(screen.getByText("Complete your W-9")).toBeTruthy();
      expect(screen.getByText("Connect Bank Account")).toBeTruthy();
    });
  });

  it("renders nothing when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("shows 'View your W-9' link when W-9 step is completed", async () => {
    mockFetch({
      onboardingStatus: "applied",
      steps: {
        accountCreated: true,
        passwordSet: true,
        w9Submitted: true,
        contractSigned: false,
        bankConnected: false,
        fullyOnboarded: false,
      },
    });
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("View your W-9")).toBeTruthy();
    });
    const link = screen.getByText("View your W-9").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/dashboard/w9");
  });

  it("shows 'Sign your contract' link when contract has been sent but not signed", async () => {
    mockFetch({
      onboardingStatus: "applied",
      contractSent: true,
      steps: {
        accountCreated: true,
        passwordSet: true,
        w9Submitted: true,
        contractSigned: false,
        bankConnected: false,
        fullyOnboarded: false,
      },
    });
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("Sign your contract")).toBeTruthy();
    });
    const link = screen.getByText("Sign your contract").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/dashboard/contract");
  });

  it("shows 'Your admin will send this' when contract has not been sent", async () => {
    mockFetch({
      onboardingStatus: "applied",
      contractSent: false,
      steps: {
        accountCreated: true,
        passwordSet: true,
        w9Submitted: true,
        contractSigned: false,
        bankConnected: false,
        fullyOnboarded: false,
      },
    });
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("Your admin will send this")).toBeTruthy();
    });
  });

  it("has no accessibility violations when checklist is visible", async () => {
    mockFetch(partialSteps);
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
