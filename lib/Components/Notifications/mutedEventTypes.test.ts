import { describe, expect, it } from "vitest";
import {
  isEventMuted,
  MUTABLE_EVENT_TYPES,
  toggleMuted,
} from "./mutedEventTypes";

describe("muted event types (EV-99)", () => {
  it("offers the template key the administration sends", () => {
    expect(MUTABLE_EVENT_TYPES.map((event) => event.key)).toContain(
      "admin_alert",
    );
    expect(MUTABLE_EVENT_TYPES.map((event) => event.key)).not.toContain(
      "system_alert",
    );
  });

  it("shows a type muted under its former key as muted", () => {
    expect(isEventMuted(["system_alert"], "admin_alert")).toBe(true);
    expect(isEventMuted(["admin_alert"], "admin_alert")).toBe(true);
    expect(isEventMuted(["review_assigned"], "admin_alert")).toBe(false);
  });

  it("mutes a type under its current key", () => {
    expect(toggleMuted(["review_assigned"], "admin_alert")).toEqual([
      "review_assigned",
      "admin_alert",
    ]);
  });

  it("unmutes a type saved under its former key", () => {
    expect(toggleMuted(["system_alert", "review_assigned"], "admin_alert"))
      .toEqual(["review_assigned"]);
  });

  it("unmutes a type that has no former key", () => {
    expect(toggleMuted(["review_assigned"], "review_assigned")).toEqual([]);
  });
});
