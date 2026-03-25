/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import AttendancePage from "@/app/dashboard/classes/[classId]/attendance/page";

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
  useParams: () => ({ classId: "cls-1" }),
}));

// Mock AttendanceHistory to keep test focused
vi.mock(
  "@/app/dashboard/classes/[classId]/attendance/AttendanceHistory",
  () => ({
    default: () => <div data-testid="attendance-history">History</div>,
  })
);

const mockStudents = [
  { id: "s1", name: "Alice Smith", email: "alice@example.com" },
  { id: "s2", name: "Bob Jones", email: null },
];

const mockClasses = {
  classes: [{ classId: "cls-1", name: "Math 101", description: "Algebra" }],
};

function setupFetch() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/students")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ students: mockStudents }),
      });
    }
    if (url.includes("/attendance?date=")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ records: [] }),
      });
    }
    if (url.includes("/api/classes") && !url.includes("/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockClasses),
      });
    }
    // Default for /api/classes (class list)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockClasses),
    });
  });
}

describe("AttendancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it("renders attendance form with labeled inputs", async () => {
    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });
    expect(screen.getByLabelText("Date")).toBeTruthy();
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });

  it("renders tabs with correct ARIA roles", async () => {
    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });
    expect(screen.getByRole("tablist")).toBeTruthy();
    const takeTab = screen.getByRole("tab", { name: "Take Attendance" });
    expect(takeTab.getAttribute("aria-selected")).toBe("true");
    const historyTab = screen.getByRole("tab", { name: "History" });
    expect(historyTab.getAttribute("aria-selected")).toBe("false");
  });

  it("status buttons have aria-pressed and aria-label", async () => {
    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });
    const presentBtn = screen.getByLabelText("Mark Alice Smith as Present");
    expect(presentBtn.getAttribute("aria-pressed")).toBe("true");
    const absentBtn = screen.getByLabelText("Mark Alice Smith as Absent");
    expect(absentBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("notes inputs have aria-labels", async () => {
    render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });
    expect(screen.getByLabelText("Notes for Alice Smith")).toBeTruthy();
    expect(screen.getByLabelText("Notes for Bob Jones")).toBeTruthy();
  });

  it("has no accessibility violations with students loaded", async () => {
    const { container } = render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations on history tab", async () => {
    const { container } = render(<AttendancePage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "History" }));

    await waitFor(() => {
      expect(screen.getByTestId("attendance-history")).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
