import { describe, expect, it, vi } from "vitest";
import { bugReportUrl, submitBugReport } from "./submitBugReport";

const report = { title: "Crash", description: "It fails", category: "Model" };

const answer = (ok: boolean, body: unknown) =>
  vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), { status: ok ? 201 : 400 }),
    ),
  );

describe("bugReportUrl", () => {
  it.each([
    "https://app.variamos.com/variamos_ms_admin/v1",
    "https://app.variamos.com/variamos_ms_admin/",
    "https://app.variamos.com/variamos_ms_admin",
  ])("puts the route next to the API of %s", (base) => {
    expect(bugReportUrl(base)).toBe(
      "https://app.variamos.com/variamos_ms_admin/bugs",
    );
  });
});

describe("submitBugReport", () => {
  it("sends the form with the session cookie and resolves to null", async () => {
    const fetchImpl = answer(true, { data: {} });

    const result = await submitBugReport(report, undefined, {
      adminApiUrl: "/v1",
      reporterEmail: "someone@example.com",
      fetchImpl,
    });

    expect(result).toBeNull();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("/bugs");
    expect(init?.credentials).toBe("include");
    expect(init?.headers).toBeUndefined();
    const form = init?.body;
    if (!(form instanceof FormData)) throw new Error("No form was sent");
    expect(form.get("category")).toBe("Model");
    expect(form.get("reporterEmail")).toBe("someone@example.com");
  });

  it("gives the message of the server when it refuses", async () => {
    const result = await submitBugReport(report, undefined, {
      adminApiUrl: "/v1",
      fetchImpl: answer(false, { errorCode: 400, message: "Title too long" }),
    });
    expect(result).toBe("Title too long");
  });

  it("gives a default message for an error code without message", async () => {
    const result = await submitBugReport(report, undefined, {
      adminApiUrl: "/v1",
      fetchImpl: answer(true, { errorCode: 500 }),
    });
    expect(result).toBe("Failed to submit bug. Please try again.");
  });

  it("gives a default message when the request fails", async () => {
    const errors = vi.spyOn(console, "error").mockReturnValue(undefined);
    const result = await submitBugReport(report, undefined, {
      adminApiUrl: "/v1",
      fetchImpl: vi.fn<typeof fetch>(() =>
        Promise.reject(new TypeError("offline")),
      ),
    });
    expect(result).toBe("Failed to submit bug. Please try again.");
    expect(errors).toHaveBeenCalledOnce();
    errors.mockRestore();
  });
});
