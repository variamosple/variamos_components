import { describe, expect, it, vi } from "vitest";
import {
  forgetStoredSessionToken,
  STORED_TOKEN_KEY,
} from "./storedSessionToken";

describe("forgetStoredSessionToken", () => {
  it("removes the token kept by versions before 0.4.0", () => {
    const removeItem = vi.fn();
    forgetStoredSessionToken({ removeItem });
    expect(removeItem).toHaveBeenCalledWith(STORED_TOKEN_KEY);
    expect(STORED_TOKEN_KEY).toBe("authToken");
  });

  it("does nothing when the storage is blocked or absent", () => {
    const removeItem = vi.fn(() => {
      throw new Error("SecurityError");
    });
    expect(() => forgetStoredSessionToken({ removeItem })).not.toThrow();
    expect(removeItem).toHaveBeenCalledOnce();
    expect(() => forgetStoredSessionToken(undefined)).not.toThrow();
  });
});
