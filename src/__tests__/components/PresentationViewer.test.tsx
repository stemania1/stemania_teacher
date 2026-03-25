/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import PresentationViewer from "@/components/PresentationViewer";

describe("PresentationViewer", () => {
  const defaultProps = {
    lessonId: "lesson-1",
    lessonTitle: "Intro to Chemistry",
    curriculumTitle: "Science 201",
    initialSlides: [
      { slideNumber: 1, url: "https://example.com/slide1.png", expiresIn: 300 },
      { slideNumber: 2, url: "https://example.com/slide2.png", expiresIn: 300 },
      { slideNumber: 3, url: "https://example.com/slide3.png", expiresIn: 300 },
    ],
    watermark: {
      teacherName: "Jane Doe",
      employeeNumber: 12345,
      hash: "abc123",
    },
    totalSlides: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders slide counter with live region", () => {
    render(<PresentationViewer {...defaultProps} />);
    const counter = screen.getByText(/Slide/);
    expect(counter.getAttribute("aria-live")).toBe("polite");
    expect(counter.getAttribute("aria-atomic")).toBe("true");
  });

  it("renders navigation buttons with aria-labels", () => {
    render(<PresentationViewer {...defaultProps} />);
    expect(screen.getByLabelText("Previous slide")).toBeTruthy();
    expect(screen.getByLabelText("Next slide")).toBeTruthy();
    expect(screen.getByLabelText("Enter fullscreen")).toBeTruthy();
  });

  it("disables previous button on first slide", () => {
    render(<PresentationViewer {...defaultProps} />);
    const prevButton = screen.getByLabelText("Previous slide");
    expect(prevButton.hasAttribute("disabled")).toBe(true);
  });

  it("renders thumbnail buttons with aria-labels", () => {
    render(<PresentationViewer {...defaultProps} />);
    expect(screen.getByLabelText("Go to slide 1")).toBeTruthy();
    expect(screen.getByLabelText("Go to slide 2")).toBeTruthy();
    expect(screen.getByLabelText("Go to slide 3")).toBeTruthy();
  });

  it("marks current thumbnail with aria-current", () => {
    render(<PresentationViewer {...defaultProps} />);
    const thumb1 = screen.getByLabelText("Go to slide 1");
    expect(thumb1.getAttribute("aria-current")).toBe("page");
    const thumb2 = screen.getByLabelText("Go to slide 2");
    expect(thumb2.getAttribute("aria-current")).toBeNull();
  });

  it("has region role with descriptive aria-label", () => {
    render(<PresentationViewer {...defaultProps} />);
    expect(
      screen.getByRole("region", { name: "Presentation viewer: Intro to Chemistry" })
    ).toBeTruthy();
  });

  it("navigates slides with next button", async () => {
    render(<PresentationViewer {...defaultProps} />);
    const user = userEvent.setup();

    // Slide counter shows "1" initially
    expect(screen.getByText("1")).toBeTruthy();
    await user.click(screen.getByLabelText("Next slide"));
    // After clicking next, slide 2 thumbnail becomes current
    const thumb2 = screen.getByLabelText("Go to slide 2");
    expect(thumb2.getAttribute("aria-current")).toBe("page");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PresentationViewer {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with no slides", async () => {
    const { container } = render(
      <PresentationViewer
        {...defaultProps}
        initialSlides={[]}
        totalSlides={0}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
