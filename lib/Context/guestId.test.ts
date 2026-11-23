import { describe, expect, it, vi } from "vitest";
import { GUEST_ID_KEY, keepGuestId, readGuestId } from "./guestId";

const blocked = {
  getItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
  setItem: vi.fn(() => {
    throw new DOMException("denied", "SecurityError");
  }),
};

describe("guest id", () => {
  it("is read and kept in the storage", () => {
    const storage = new Map<string, string>();
    const fake = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    };

    keepGuestId("guest-7", fake);

    expect(storage.get(GUEST_ID_KEY)).toBe("guest-7");
    expect(readGuestId(fake)).toBe("guest-7");
  });

  it("is not kept when the answer has none", () => {
    const fake = { getItem: () => null, setItem: vi.fn() };

    keepGuestId(undefined, fake);

    expect(fake.setItem).not.toHaveBeenCalled();
  });

  it("does not stop a guest sign in when the storage is blocked", () => {
    expect(readGuestId(blocked)).toBeNull();
    expect(() => keepGuestId("guest-7", blocked)).not.toThrow();
  });
});
