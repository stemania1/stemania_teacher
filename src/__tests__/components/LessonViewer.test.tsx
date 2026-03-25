/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import LessonViewer from "@/components/LessonViewer";

describe("LessonViewer", () => {
  const defaultProps = {
    lessonId: "lesson-1",
    renderedHtml: "<p>This is lesson content.</p>",
    lessonMeta: {
      title: "Introduction to Algebra",
      curriculumTitle: "Math 101",
      duration: 45,
    },
  };

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("renders lesson title and curriculum", () => {
    render(<LessonViewer {...defaultProps} />);
    expect(screen.getByText("Introduction to Algebra")).toBeTruthy();
    expect(screen.getByText("Math 101")).toBeTruthy();
    expect(screen.getByText("Estimated duration: 45 min")).toBeTruthy();
  });

  it("renders lesson HTML content", () => {
    render(<LessonViewer {...defaultProps} />);
    expect(screen.getByText("This is lesson content.")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<LessonViewer {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations without optional fields", async () => {
    const { container } = render(
      <LessonViewer
        lessonId="lesson-2"
        renderedHtml="<p>Content only.</p>"
        lessonMeta={{ title: "Basic Lesson" }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
