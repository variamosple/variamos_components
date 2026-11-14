import { describe, expect, it } from "vitest";
import { bugFormErrors, TITLE_MAX_LENGTH } from "./bugFormErrors";

describe("bugFormErrors", () => {
  it("gives no message for a filled form", () => {
    expect(
      bugFormErrors({ title: "Build error", description: "Steps" }),
    ).toEqual({});
  });

  it("asks for a title and a description left empty or blank", () => {
    expect(bugFormErrors({ title: "  ", description: "" })).toEqual({
      title: "Title is required (max 100 characters)",
      description: "Description is required",
    });
  });

  it("refuses a title longer than the limit", () => {
    const title = "x".repeat(TITLE_MAX_LENGTH + 1);
    expect(bugFormErrors({ title, description: "Steps" })).toEqual({
      title: "Title is required (max 100 characters)",
    });
    expect(
      bugFormErrors({ title: "x".repeat(TITLE_MAX_LENGTH), description: "d" }),
    ).toEqual({});
  });
});
