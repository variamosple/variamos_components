import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQuery } from "../Hooks";
import {
  Menu,
  MenuItem,
  MenuOption,
  MenuSubItem,
  ResponseModel,
} from "../Model";
import { useRouter } from "./RouterContext";
import { useSession } from "./SessionContext";

export interface MenuContext {
  items: MenuItem[];
  subMenu?: MenuSubItem[];
  options?: MenuSubItem[];
  isLoading: boolean;
}

export const MenuContext = createContext<MenuContext>({
  items: [],
  isLoading: true,
});

export interface MenuContextProviderProps {
  requestMenu: () => Promise<ResponseModel<Menu>>;
  children?: ReactNode;
}

export const MenuContextProvider: FC<MenuContextProviderProps> = ({
  requestMenu,
  children,
}) => {
  const { user } = useSession();
  const { basePath } = useRouter();
  const {
    data: menu,
    loadData,
    isLoading,
    isLoaded,
  } = useQuery<unknown, Menu>({
    queryFunction: requestMenu,
    initialFilter: {},
  });

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
  }, [menu?.items, user]);

  const subMenu: MenuSubItem[] | undefined = useMemo(() => {
    if (!menu?.subMenu) {
      return undefined;
    }

    const subMenuItems = menu?.subMenu.find(
      (item) => basePath === item.accessibleFrom
    );

    return subMenuItems?.items || undefined;
  }, [menu?.subMenu, basePath]);

  const options: MenuOption[] = useMemo(() => {
    if (!menu?.options) {
      return [];
    }

    return menu?.options.filter(
      (item) => !item.accessibleFrom || basePath === item.accessibleFrom
    );
  }, [menu?.options, basePath]);

  useEffect(() => {
    if (!isLoading && !isLoaded) {
      loadData({});
    }
  }, [isLoading, isLoaded, loadData]);

  return (
    <MenuContext.Provider
      value={{ items: menuItems, subMenu, options: options, isLoading }}
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
