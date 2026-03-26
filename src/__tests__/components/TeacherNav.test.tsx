/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import TeacherNav from "@/components/TeacherNav";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock ThemedLogo
vi.mock("@/components/ThemedLogo", () => ({
  ThemedLogo: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} src="/logo.png" {...props} />
  ),
}));

const mockUser = {
  email: "teacher@stemania.com",
  firstName: "Jane",
  lastName: "Doe",
  displayName: "Jane Doe",
};

const onboardedStatus = {
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

const notOnboardedStatus = {
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

function mockFetchUser(
  user: typeof mockUser | null = mockUser,
  onboarding: typeof onboardedStatus = onboardedStatus,
) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/teacher/onboarding-status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(onboarding),
      });
    }
    return Promise.resolve({
      ok: !!user,
      json: () => Promise.resolve(user),
    });
  });
}

describe("TeacherNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation links", async () => {
    mockFetchUser();
    render(<TeacherNav />);
    expect(screen.getByLabelText("Main navigation")).toBeTruthy();
    expect(screen.getByLabelText("Mobile navigation")).toBeTruthy();
    expect(screen.getByLabelText("Return to dashboard")).toBeTruthy();
  });

  it("renders user menu button with correct ARIA attributes", async () => {
    mockFetchUser();
    render(<TeacherNav />);
    const menuButton = screen.getByLabelText("Open user menu");
    expect(menuButton).toBeTruthy();
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(menuButton.getAttribute("aria-haspopup")).toBe("true");
  });

  it("toggles user menu and updates aria-expanded", async () => {
    mockFetchUser();
    render(<TeacherNav />);
    const user = userEvent.setup();
    const menuButton = screen.getByLabelText("Open user menu");

    await user.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();

    await user.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("marks the current page with aria-current", () => {
    mockFetchUser();
    render(<TeacherNav />);
    // Dashboard is the current pathname
    const dashboardLinks = screen.getAllByText("Dashboard");
    const activeLink = dashboardLinks.find(
      (el) => el.getAttribute("aria-current") === "page"
    );
    expect(activeLink).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    mockFetchUser();
    const { container } = render(<TeacherNav />);
    await waitFor(() => {
      expect(screen.getByLabelText("Open user menu")).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with menu open", async () => {
    mockFetchUser();
    const { container } = render(<TeacherNav />);
    await waitFor(() => {
      expect(screen.getByLabelText("Open user menu")).toBeTruthy();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Open user menu"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has sticky header class for mobile portrait mode", () => {
    mockFetchUser();
    const { container } = render(<TeacherNav />);
    const header = container.querySelector("header");
    expect(header?.className).toContain("sticky");
    expect(header?.className).toContain("top-0");
  });

  it("hides lessons, classes, and schedule nav when not onboarded", async () => {
    mockFetchUser(mockUser, notOnboardedStatus);
    render(<TeacherNav />);
    await waitFor(() => {
      expect(screen.queryAllByText("My Lessons")).toHaveLength(0);
      expect(screen.queryAllByText("My Classes")).toHaveLength(0);
      expect(screen.queryAllByText("Schedule")).toHaveLength(0);
    });
    // Dashboard should still be visible
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });

  it("shows all nav items when fully onboarded", async () => {
    mockFetchUser(mockUser, onboardedStatus);
    render(<TeacherNav />);
    await waitFor(() => {
      expect(screen.getAllByText("My Lessons").length).toBeGreaterThan(0);
      expect(screen.getAllByText("My Classes").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Schedule").length).toBeGreaterThan(0);
    });
  });
});
