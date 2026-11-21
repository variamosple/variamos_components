import { describe, expect, it } from "vitest";
import { ResponseModel } from "../Model";
import {
  readSessionAnswer,
  retryDelay,
  SESSION_CHECK_INTERVAL_MS,
} from "./sessionAnswer";

const sessionUser = {
  id: "42",
  user: "ada",
  name: "Ada",
  email: "ada@example.org",
  roles: ["Admin"],
  permissions: ["users::query"],
};

describe("readSessionAnswer", () => {
  it("reads a signed-in user and the redirection", () => {
    const answer = readSessionAnswer(
      new ResponseModel().withData({
        user: sessionUser,
        redirect: "https://example.org/next",
      }),
    );
    expect(answer).toEqual({
      kind: "signed-in",
      user: sessionUser,
      redirect: "https://example.org/next",
    });
  });

  it("keeps a guest whose name, address and lists are missing", () => {
    const answer = readSessionAnswer({ data: { user: { id: "guest-1" } } });
    expect(answer).toEqual({
      kind: "signed-in",
      user: {
        id: "guest-1",
        user: "",
        name: "",
        email: "",
        roles: [],
        permissions: [],
      },
      redirect: undefined,
    });
  });

  it.each([401, 403])("reads %i from the admin as signed out", (code) => {
    expect(
      readSessionAnswer(new ResponseModel().withError(code, "Please log in.")),
    ).toEqual({ kind: "signed-out" });
  });

  it("reads a success without a user as signed out", () => {
    expect(readSessionAnswer({ data: { user: null } })).toEqual({
      kind: "signed-out",
    });
  });

  it.each([
    ["a 5xx while the admin restarts", { errorCode: 500, message: "Error" }],
    ["the 503 of an unreachable admin", { errorCode: 503 }],
    ["a gateway error", { errorCode: 502 }],
    // The PLE and the Laboratory parse the axios code "ERR_NETWORK"
    ["an error code that is not a number", { errorCode: Number.NaN }],
    ["an error code given as text", { errorCode: "401" }],
    ["an error code of zero", { errorCode: 0 }],
  ])("reads %s as unavailable", (_case, result) => {
    expect(readSessionAnswer(result)).toEqual({ kind: "unavailable" });
  });

  it.each([
    ["a proxy error page", "<html>502 Bad Gateway</html>"],
    ["no answer", undefined],
    ["null", null],
    ["a body without data", {}],
    ["a user without an id", { data: { user: { name: "Ada" } } }],
    ["a user that is not an object", { data: { user: "ada" } }],
  ])("reads %s as unavailable", (_case, result) => {
    expect(readSessionAnswer(result)).toEqual({ kind: "unavailable" });
  });

  it("keeps only the roles and permissions given as text", () => {
    const answer = readSessionAnswer({
      data: { user: { ...sessionUser, roles: ["Admin", 3, null] } },
    });
    expect(answer).toMatchObject({ user: { roles: ["Admin"] } });
  });
});

describe("retryDelay", () => {
  it("doubles from 5 s, then waits a minute", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(retryDelay)).toEqual([
      5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000,
    ]);
    expect(SESSION_CHECK_INTERVAL_MS).toBe(60_000);
  });

  it("starts at 5 s before any failure", () => {
    expect(retryDelay(0)).toBe(5_000);
  });
});
