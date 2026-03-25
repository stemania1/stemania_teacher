/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import SimulationBanner from "@/components/SimulationBanner";

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

describe("SimulationBanner", () => {
  it("renders nothing when simulation is not active", () => {
    const { container } = render(
      <SimulationBanner simulatedTeacher={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders banner with teacher info when simulation is active", () => {
    render(
      <SimulationBanner
        simulatedTeacher={{
          employeeNumber: 42,
          firstName: "Jane",
          lastName: "Doe",
        }}
      />
    );
    expect(screen.getByText(/Simulating/)).toBeTruthy();
    expect(screen.getByText(/Jane Doe/)).toBeTruthy();
    expect(screen.getByText(/#42/)).toBeTruthy();
  });

  it("renders a stop simulation link", () => {
    render(
      <SimulationBanner
        simulatedTeacher={{
          employeeNumber: 42,
          firstName: "Jane",
          lastName: "Doe",
        }}
      />
    );
    const stopLink = screen.getByText("Stop Simulation");
    expect(stopLink).toBeTruthy();
    expect(stopLink.getAttribute("href")).toBe("/dashboard?simulate=stop");
  });

  it("uses alert role for visibility", () => {
    render(
      <SimulationBanner
        simulatedTeacher={{
          employeeNumber: 42,
          firstName: "Jane",
          lastName: "Doe",
        }}
      />
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SimulationBanner
        simulatedTeacher={{
          employeeNumber: 42,
          firstName: "Jane",
          lastName: "Doe",
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
