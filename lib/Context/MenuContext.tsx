import { createContext, FC, ReactNode, useContext, useMemo } from "react";
import { Menu, MenuItem, MenuSubItem } from "../Model";
import { useRouter } from "./RouterContext";
import { useSession } from "./SessionsContext";

export interface MenuContext {
  items: MenuItem[];
  subMenu?: MenuSubItem[];
  options?: MenuSubItem[];
}

export const MenuContext = createContext<MenuContext>({ items: [] });

export interface MenuContextProviderProps {
  menu: Menu;
  children?: ReactNode;
}

export const MenuContextProvider: FC<MenuContextProviderProps> = ({
  menu,
  children,
}) => {
  const { user } = useSession();
  const { basePath } = useRouter();

  const menuItems = useMemo(() => {
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];

    if (!menu?.items?.length) {
      return [];
    }

    return menu.items.filter((subMenuItem) => {
      if (
        !subMenuItem?.allowedPermissions?.length &&
        !subMenuItem?.allowedRoles?.length
      ) {
        return true;
      }

      let allowed = true;

      if (subMenuItem.allowedRoles) {
        allowed =
          allowed &&
          subMenuItem.allowedRoles.some((role) => roles.includes(role));
      }

      if (subMenuItem.allowedPermissions) {
        allowed =
          allowed &&
          subMenuItem.allowedPermissions.some((permission) =>
            permissions.includes(permission)
          );
      }

      return allowed;
    });
  }, [menu.items, user]);

  const subMenu: MenuSubItem[] | undefined = useMemo(() => {
    if (!menu.subMenu) {
      return undefined;
    }

    const subMenuItems = menu.subMenu.find((item) => basePath === item.path);

    return subMenuItems?.items || undefined;
  }, [menu.subMenu, basePath]);

  return (
    <MenuContext.Provider
      value={{ items: menuItems, subMenu, options: menu.options }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
