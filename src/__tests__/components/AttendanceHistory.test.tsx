/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceHistory from "@/app/dashboard/classes/[classId]/attendance/AttendanceHistory";

describe("AttendanceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<AttendanceHistory classId="cls-1" />);
    // Skeleton elements should be present
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no sessions exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [] }),
    });

    render(<AttendanceHistory classId="cls-1" />);
    await waitFor(() => {
      expect(screen.getByText(/no attendance records/i)).toBeTruthy();
    });
  });

  it("renders sessions with counts", async () => {
    const sessions = [
      {
        date: "2026-03-23",
        records: [
          { id: "r1", studentId: "s1", studentName: "Alice", status: "present", notes: null },
          { id: "r2", studentId: "s2", studentName: "Bob", status: "absent", notes: "Sick" },
        ],
        counts: { present: 1, absent: 1, tardy: 0 },
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions }),
    });

    render(<AttendanceHistory classId="cls-1" />);
    await waitFor(() => {
      expect(screen.getByText(/1 Present/)).toBeTruthy();
      expect(screen.getByText(/1 Absent/)).toBeTruthy();
    });
  });

  it("expands a session to show student records", async () => {
    const sessions = [
      {
        date: "2026-03-23",
        records: [
          { id: "r1", studentId: "s1", studentName: "Alice", status: "present", notes: null },
          { id: "r2", studentId: "s2", studentName: "Bob", status: "absent", notes: "Sick" },
        ],
        counts: { present: 1, absent: 1, tardy: 0 },
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions }),
    });

    render(<AttendanceHistory classId="cls-1" />);

    await waitFor(() => {
      expect(screen.getByText(/1 Present/)).toBeTruthy();
    });

    // Student names should not be visible before expanding
    expect(screen.queryByText("Alice")).toBeNull();

    // Click the session row to expand
    const user = userEvent.setup();
    const expandButton = screen.getByRole("button");
    await user.click(expandButton);

    // Now student names should be visible
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Sick")).toBeTruthy();
  });

  it("collapses an expanded session on second click", async () => {
    const sessions = [
      {
        date: "2026-03-23",
        records: [
          { id: "r1", studentId: "s1", studentName: "Alice", status: "present", notes: null },
        ],
        counts: { present: 1, absent: 0, tardy: 0 },
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions }),
    });

    render(<AttendanceHistory classId="cls-1" />);

    await waitFor(() => {
      expect(screen.getByText(/1 Present/)).toBeTruthy();
    });

    const user = userEvent.setup();
    const expandButton = screen.getByRole("button");

    // Expand
    await user.click(expandButton);
    expect(screen.getByText("Alice")).toBeTruthy();

    // Collapse
    await user.click(expandButton);
    expect(screen.queryByText("Alice")).toBeNull();
  });
});
