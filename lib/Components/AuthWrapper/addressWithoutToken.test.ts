import { describe, expect, it } from "vitest";
import { addressWithoutToken } from "./addressWithoutToken";

describe("addressWithoutToken", () => {
  it("removes the token and keeps the rest of the address", () => {
    expect(
      addressWithoutToken(
        "https://app.variamos.com/variamos_admin/?tab=2&authToken=abc#top",
      ),
    ).toBe("https://app.variamos.com/variamos_admin/?tab=2#top");
  });

  it("removes every copy of the token", () => {
    expect(
      addressWithoutToken("https://app.variamos.com/?authToken=a&authToken=b"),
    ).toBe("https://app.variamos.com/");
  });

  it("gives null when the address has no token", () => {
    expect(addressWithoutToken("https://app.variamos.com/?tab=2")).toBeNull();
  });
});
