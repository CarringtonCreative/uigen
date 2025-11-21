import { render, screen } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import { describe, it, expect, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className: string }) => (
    <div className={className} data-testid="loader-icon" />
  ),
}));

describe("ToolInvocationBadge", () => {
  describe("str_replace_editor tool", () => {
    it("displays 'Creating' for create command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/components/Button.jsx" }}
        />
      );

      expect(screen.getByText("Creating Button.jsx")).toBeDefined();
    });

    it("displays 'Editing' for str_replace command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "str_replace", path: "/App.jsx" }}
        />
      );

      expect(screen.getByText("Editing App.jsx")).toBeDefined();
    });

    it("displays 'Inserting' for insert command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "insert", path: "/utils/helper.ts" }}
        />
      );

      expect(screen.getByText("Inserting into helper.ts")).toBeDefined();
    });

    it("displays 'Viewing' for view command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "view", path: "/config.json" }}
        />
      );

      expect(screen.getByText("Viewing config.json")).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    it("displays 'Renaming' with old and new filenames", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          state="call"
          args={{
            command: "rename",
            path: "/old-name.jsx",
            new_path: "/new-name.jsx",
          }}
        />
      );

      expect(
        screen.getByText("Renaming old-name.jsx to new-name.jsx")
      ).toBeDefined();
    });

    it("displays 'Deleting' for delete command", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          state="call"
          args={{ command: "delete", path: "/unwanted.jsx" }}
        />
      );

      expect(screen.getByText("Deleting unwanted.jsx")).toBeDefined();
    });
  });

  describe("loading and completion states", () => {
    it("shows loading spinner when state is not result", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/test.jsx" }}
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    it("shows green dot when state is result", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/test.jsx" }}
          result={{ success: true }}
        />
      );

      const greenDot = container.querySelector(".bg-emerald-500");
      expect(greenDot).toBeDefined();
    });
  });

  describe("fallback behavior", () => {
    it("displays tool name when no args provided", () => {
      render(
        <ToolInvocationBadge toolName="unknown_tool" state="call" />
      );

      expect(screen.getByText("unknown_tool")).toBeDefined();
    });

    it("handles missing path gracefully", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create" }}
        />
      );

      expect(screen.getByText("Creating file")).toBeDefined();
    });
  });
});
