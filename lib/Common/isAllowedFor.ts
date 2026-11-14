import type { MenuItemBase, SessionUser } from "../Model";

/**
 * Whether the user may see a menu entry: an entry without roles nor
 * permissions is for everyone; otherwise the user needs one of the roles
 * listed and one of the permissions listed.
 */
export function isAllowedFor(
  item: Pick<MenuItemBase, "allowedRoles" | "allowedPermissions">,
  user: Pick<SessionUser, "roles" | "permissions"> | null | undefined,
): boolean {
  const { allowedRoles, allowedPermissions } = item;
  if (!allowedRoles?.length && !allowedPermissions?.length) return true;

  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const hasRole =
    !allowedRoles || allowedRoles.some((role) => roles.includes(role));
  const hasPermission =
    !allowedPermissions ||
    allowedPermissions.some((permission) => permissions.includes(permission));
  return hasRole && hasPermission;
}
