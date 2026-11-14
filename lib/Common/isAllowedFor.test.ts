import { describe, expect, it } from "vitest";
import { isAllowedFor } from "./isAllowedFor";

const user = { roles: ["admin"], permissions: ["projects::query"] };

describe("isAllowedFor", () => {
  it("shows an entry without roles nor permissions to everyone", () => {
    expect(isAllowedFor({}, undefined)).toBe(true);
    expect(
      isAllowedFor({ allowedRoles: [], allowedPermissions: [] }, null),
    ).toBe(true);
  });

  it("needs one of the roles listed", () => {
    expect(isAllowedFor({ allowedRoles: ["guest", "admin"] }, user)).toBe(true);
    expect(isAllowedFor({ allowedRoles: ["guest"] }, user)).toBe(false);
  });

  it("needs one of the permissions listed", () => {
    expect(
      isAllowedFor({ allowedPermissions: ["projects::query"] }, user),
    ).toBe(true);
    expect(isAllowedFor({ allowedPermissions: ["users::delete"] }, user)).toBe(
      false,
    );
  });

  it("needs both when both are listed", () => {
    expect(
      isAllowedFor(
        { allowedRoles: ["admin"], allowedPermissions: ["users::delete"] },
        user,
      ),
    ).toBe(false);
  });

  it("hides a restricted entry from a visitor without a session", () => {
    expect(isAllowedFor({ allowedRoles: ["admin"] }, undefined)).toBe(false);
  });

  it("keeps the earlier rule for an empty list next to a filled one", () => {
    expect(
      isAllowedFor(
        { allowedRoles: [], allowedPermissions: ["projects::query"] },
        user,
      ),
    ).toBe(false);
  });
});
