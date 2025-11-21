import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonWorkTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockSignIn = vi.mocked(actions.signIn);
  const mockSignUp = vi.mocked(actions.signUp);
  const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
  const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);
  const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
  const mockCreateProject = vi.mocked(createProjectAction.createProject);

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);

    mockSignIn.mockClear();
    mockSignUp.mockClear();
    mockGetAnonWorkData.mockClear();
    mockClearAnonWork.mockClear();
    mockGetProjects.mockClear();
    mockCreateProject.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("should successfully sign in and handle post-sign-in flow", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const authResult = await result.current.signIn("test@example.com", "password123");

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(authResult).toEqual({ success: true });
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign-in failure and not navigate", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials"
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn("test@example.com", "wrongpassword");

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "wrongpassword");
      expect(authResult).toEqual({
        success: false,
        error: "Invalid credentials"
      });
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should create project with anonymous work after successful sign-in", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a button" }],
        fileSystemData: { "/App.jsx": { content: "code" } },
      };
      const newProject = {
        id: "anon-project",
        name: "Design from 12:00:00 PM",
        userId: "user-1",
        messages: JSON.stringify(anonWork.messages),
        data: JSON.stringify(anonWork.fileSystemData),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("should ignore anonymous work with empty messages", async () => {
      const anonWork = {
        messages: [],
        fileSystemData: {},
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    it("should create new project when user has no existing projects", async () => {
      const newProject = {
        id: "new-project",
        name: "New Design #12345",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project");
    });

    it("should reset isLoading even if sign-in throws an error", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("should successfully sign up and handle post-sign-in flow", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project",
        name: "New Design #54321",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const authResult = await result.current.signUp("newuser@example.com", "password123");

      expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "password123");
      expect(authResult).toEqual({ success: true });
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-project");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign-up failure and not navigate", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered"
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signUp("existing@example.com", "password123");

      expect(mockSignUp).toHaveBeenCalledWith("existing@example.com", "password123");
      expect(authResult).toEqual({
        success: false,
        error: "Email already registered"
      });
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should create project with anonymous work after successful sign-up", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a form" }],
        fileSystemData: { "/App.jsx": { content: "form code" } },
      };
      const newProject = {
        id: "anon-signup-project",
        name: "Design from 3:45:00 PM",
        userId: "user-1",
        messages: JSON.stringify(anonWork.messages),
        data: JSON.stringify(anonWork.fileSystemData),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("newuser@example.com", "password123");

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-signup-project");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("should navigate to most recent project if user already has projects", async () => {
      const projects = [
        { id: "project-2", name: "Most Recent", createdAt: new Date(), updatedAt: new Date() },
        { id: "project-1", name: "Older Project", createdAt: new Date(), updatedAt: new Date() },
      ];

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(projects);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("newuser@example.com", "password123");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-2");
    });

    it("should reset isLoading even if sign-up throws an error", async () => {
      mockSignUp.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("newuser@example.com", "password123")
      ).rejects.toThrow("Database error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("isLoading state", () => {
    it("should start with isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it("should set isLoading to true during sign-in and back to false after", async () => {
      mockSignIn.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const promise = result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await promise;

      expect(result.current.isLoading).toBe(false);
    });

    it("should set isLoading to true during sign-up and back to false after", async () => {
      mockSignUp.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const promise = result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await promise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle createProject throwing an error during anonymous work save", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a button" }],
        fileSystemData: { "/App.jsx": { content: "code" } },
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Database error");

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle getProjects throwing an error", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("test@example.com", "password123")
      ).rejects.toThrow("Unauthorized");

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle router.push not throwing when called", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);
      mockPush.mockImplementation(() => {});

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle multiple concurrent sign-in attempts", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      const promise1 = result.current.signIn("test@example.com", "password123");
      const promise2 = result.current.signIn("test@example.com", "password123");

      await Promise.all([promise1, promise2]);

      expect(mockSignIn).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
