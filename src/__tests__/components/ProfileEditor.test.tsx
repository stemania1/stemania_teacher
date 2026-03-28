/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import ProfileEditor from "@/components/ProfileEditor";

describe("ProfileEditor", () => {
  const defaultProps = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name and email in read mode", () => {
    render(<ProfileEditor {...defaultProps} />);
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("jane@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
  });

  it("shows fallback name when both names are empty", () => {
    render(<ProfileEditor firstName="" lastName="" email="test@example.com" />);
    expect(screen.getByText("Teacher")).toBeTruthy();
  });

  it("switches to edit mode when Edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe("Jane");
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe("Doe");
    expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
  });

  it("cancels edit and restores original values", async () => {
    const user = userEvent.setup();
    render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Modified");

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
  });

  it("submits updated name via PATCH and returns to read mode", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          firstName: "Janet",
          lastName: "Doe",
          email: "jane@example.com",
          displayName: "Janet Doe",
        }),
    });

    render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Janet");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Janet Doe")).toBeTruthy();
    });
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("/api/users/me", expect.objectContaining({
      method: "PATCH",
    }));
  });

  it("shows error message when save fails", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to update profile" }),
    });

    render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Janet");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    // Should stay in edit mode
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
  });

  it("email is displayed but not editable in edit mode", async () => {
    const user = userEvent.setup();
    render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    // Email should be visible but not in an input
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.getByText("jane@example.com")).toBeTruthy();
  });

  it("has no accessibility violations in read mode", async () => {
    const { container } = render(<ProfileEditor {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in edit mode", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileEditor {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
