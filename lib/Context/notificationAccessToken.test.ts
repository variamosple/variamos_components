import { describe, expect, it, vi } from "vitest";
import {
  accessTokenUrl,
  createAccessTokenProvider,
} from "./notificationAccessToken";

const okResponse = (token: string, expiresAt: string) =>
  ({
    ok: true,
    json: async () => ({ data: { token, expiresAt } }),
  }) as Response;

describe("accessTokenUrl", () => {
  it.each([
    "https://app.variamos.com/variamos_ms_admin/",
    "https://app.variamos.com/variamos_ms_admin",
    "https://app.variamos.com/variamos_ms_admin/v1",
    "https://app.variamos.com/variamos_ms_admin/v1/",
  ])("builds the token route from %s", (base) => {
    expect(accessTokenUrl(base)).toBe(
      "https://app.variamos.com/variamos_ms_admin/v1/notifications/access-token",
    );
  });
});

describe("createAccessTokenProvider", () => {
  const url = "https://admin.example/v1/notifications/access-token";
  const start = Date.parse("2026-10-17T10:00:00Z");

  it("asks the admin service with the session token and credentials", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse("tok-1", "2026-10-17T10:15:00Z"));
    const provider = createAccessTokenProvider({
      url,
      fetchImpl,
      getSessionToken: () => "session-jwt",
      now: () => start,
    });

    await expect(provider.get()).resolves.toBe("tok-1");
    expect(fetchImpl).toHaveBeenCalledWith(url, {
      credentials: "include",
      headers: { Authorization: "Bearer session-jwt" },
    });
  });

  it("reuses the token until shortly before it expires, then renews it", async () => {
    let clock = start;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse("tok-1", "2026-10-17T10:15:00Z"))
      .mockResolvedValueOnce(okResponse("tok-2", "2026-10-17T10:30:00Z"));
    const provider = createAccessTokenProvider({
      url,
      fetchImpl,
      getSessionToken: () => null,
      now: () => clock,
    });

    await provider.get();
    clock = start + 13 * 60_000;
    await expect(provider.get()).resolves.toBe("tok-1");
    clock = start + 14 * 60_000 + 1;
    await expect(provider.get()).resolves.toBe("tok-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent callers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse("tok-1", "2026-10-17T10:15:00Z"));
    const provider = createAccessTokenProvider({
      url,
      fetchImpl,
      getSessionToken: () => null,
      now: () => start,
    });

    const tokens = await Promise.all([provider.get(), provider.get()]);

    expect(tokens).toEqual(["tok-1", "tok-1"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an error status", async () => ({ ok: false }) as Response],
    ["a network error", async () => Promise.reject(new Error("offline"))],
    [
      "an unexpected body",
      async () =>
        ({ ok: true, json: async () => ({ data: {} }) }) as Response,
    ],
  ])("returns null for %s", async (_label, respond) => {
    const provider = createAccessTokenProvider({
      url,
      fetchImpl: vi.fn().mockImplementation(respond),
      getSessionToken: () => null,
    });

    await expect(provider.get()).resolves.toBeNull();
  });

  it("asks again after clear()", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse("tok-1", "2026-10-17T10:15:00Z"));
    const provider = createAccessTokenProvider({
      url,
      fetchImpl,
      getSessionToken: () => null,
      now: () => start,
    });

    await provider.get();
    provider.clear();
    await provider.get();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
