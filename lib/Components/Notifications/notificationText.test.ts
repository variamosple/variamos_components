import { describe, expect, it } from "vitest";
import { notificationTextOf, renderTemplateText } from "./notificationText";

const item = (templateKey: string, variables: Record<string, unknown>) => ({
  id: "n-1",
  templateKey,
  variables,
  metadata: {},
  isRead: false,
  createdAt: "2026-11-14T10:00:00.000Z",
});

describe("renderTemplateText", () => {
  it("replaces every occurrence of each variable", () => {
    expect(renderTemplateText("{{a}} and {{a}}, {{b}}", { a: 1, b: "x" })).toBe(
      "1 and 1, x",
    );
  });

  it("leaves unknown placeholders and takes keys literally", () => {
    expect(renderTemplateText("{{missing}} {{a.b}}", { "a.b": "ok" })).toBe(
      "{{missing}} ok",
    );
  });
});

describe("notificationTextOf", () => {
  it("fills a known template", () => {
    expect(
      notificationTextOf(item("project_created", { projectName: "Demo" })),
    ).toEqual({
      title: "Project Created",
      body: "The project 'Demo' has been created successfully.",
    });
  });

  it("shows an announcement as written by the administrator", () => {
    expect(
      notificationTextOf(
        item("admin_alert", { title: "Maintenance", body: "At 10:00" }),
      ),
    ).toEqual({ title: "Maintenance", body: "At 10:00" });
  });

  it("names an unknown template", () => {
    expect(notificationTextOf(item("other", {}))).toEqual({
      title: "New Alert",
      body: "Notification template: other",
    });
  });
});
