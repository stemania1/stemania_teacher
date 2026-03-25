/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { SiteFooter } from "@/components/SiteFooter";

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

describe("SiteFooter", () => {
  it("renders privacy policy and terms links", () => {
    render(<SiteFooter />);
    expect(screen.getByText("Privacy Policy")).toBeTruthy();
    expect(screen.getByText("Terms of Service")).toBeTruthy();
  });

  it("has footer navigation with aria-label", () => {
    render(<SiteFooter />);
    expect(screen.getByLabelText("Footer navigation")).toBeTruthy();
  });

  it("uses contentinfo role", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SiteFooter />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
