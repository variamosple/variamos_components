import { describe, expect, it, vi } from "vitest";
import type { AccessTokenProvider } from "./notificationAccessToken";
import { notificationSocketOptions } from "./notificationSocket";

const providerOf = (token: string | null): AccessTokenProvider => ({
  get: () => Promise.resolve(token),
  clear: vi.fn(),
});

const authOf = async (provider: AccessTokenProvider | null) => {
  const callback = vi.fn();
  notificationSocketOptions(provider).auth(callback);
  await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
  return callback.mock.calls[0]?.[0];
};

describe("notificationSocketOptions", () => {
  it("sends the access token, and no user id", async () => {
    const options = notificationSocketOptions(providerOf("t-1"));

    expect(await authOf(providerOf("t-1"))).toEqual({ token: "t-1" });
    expect(options).not.toHaveProperty("query");
    expect(options.transports).toEqual(["websocket"]);
  });

  it("sends an empty handshake without a token", async () => {
    expect(await authOf(providerOf(null))).toEqual({});
    expect(await authOf(null)).toEqual({});
  });
});
