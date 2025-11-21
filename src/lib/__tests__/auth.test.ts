import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockSignJWT = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: vi.fn(),
};

const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  SignJWT: vi.fn(function () {
    return mockSignJWT;
  }),
  jwtVerify: vi.fn((...args) => mockJwtVerify(...args)),
}));

import { createSession, getSession, deleteSession, verifySession } from "../auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("creates a JWT token with correct payload", async () => {
      const mockToken = "mock-jwt-token";
      mockSignJWT.sign.mockResolvedValue(mockToken);

      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({
        alg: "HS256",
      });
      expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith("7d");
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
      expect(mockSignJWT.sign).toHaveBeenCalled();
    });

    it("sets cookie with correct options", async () => {
      const mockToken = "mock-jwt-token";
      mockSignJWT.sign.mockResolvedValue(mockToken);

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    it("sets secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const mockToken = "mock-jwt-token";
      mockSignJWT.sign.mockResolvedValue(mockToken);

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        mockToken,
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("does not set secure flag in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const mockToken = "mock-jwt-token";
      mockSignJWT.sign.mockResolvedValue(mockToken);

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        mockToken,
        expect.objectContaining({
          secure: false,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getSession", () => {
    it("returns session payload when valid token exists", async () => {
      const mockToken = "valid-token";
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      mockCookieStore.get.mockReturnValue({ value: mockToken });
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await getSession();

      expect(result).toEqual(mockPayload);
      expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, expect.anything());
    });

    it("returns null when no token exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getSession();

      expect(result).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it("returns null when token is invalid", async () => {
      const mockToken = "invalid-token";
      mockCookieStore.get.mockReturnValue({ value: mockToken });
      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const result = await getSession();

      expect(result).toBeNull();
    });

    it("returns null when token is expired", async () => {
      const mockToken = "expired-token";
      mockCookieStore.get.mockReturnValue({ value: mockToken });
      mockJwtVerify.mockRejectedValue(new Error("Token expired"));

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("deletes the auth cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    it("returns session payload when valid token exists in request", async () => {
      const mockToken = "valid-token";
      const mockPayload = {
        userId: "user-456",
        email: "another@example.com",
        expiresAt: new Date(),
      };

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: mockToken }),
        },
      };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await verifySession(mockRequest as any);

      expect(result).toEqual(mockPayload);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalledWith(mockToken, expect.anything());
    });

    it("returns null when no token exists in request", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      };

      const result = await verifySession(mockRequest as any);

      expect(result).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it("returns null when token is invalid in request", async () => {
      const mockToken = "invalid-token";
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: mockToken }),
        },
      };

      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const result = await verifySession(mockRequest as any);

      expect(result).toBeNull();
    });

    it("returns null when token verification throws error", async () => {
      const mockToken = "malformed-token";
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: mockToken }),
        },
      };

      mockJwtVerify.mockRejectedValue(new Error("JWS verification failed"));

      const result = await verifySession(mockRequest as any);

      expect(result).toBeNull();
    });
  });
});
