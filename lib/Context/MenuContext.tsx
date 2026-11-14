import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { isAllowedFor } from "../Common/isAllowedFor";
import { useQuery } from "../Hooks";
import type {
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
    if (!menu?.items?.length) {
      return [];
    }

    return menu.items.filter((item) => isAllowedFor(item, user));
  }, [menu?.items, user]);

  const subMenu: MenuSubItem[] | undefined = useMemo(() => {
    if (!menu?.subMenu) {
      return undefined;
    }

    const subMenuItems = menu?.subMenu.find(
      (item) => basePath === item.accessibleFrom,
    );

    return subMenuItems?.items || undefined;
  }, [menu?.subMenu, basePath]);

  const options: MenuOption[] = useMemo(() => {
    if (!menu?.options) {
      return [];
    }

    return menu?.options.filter(
      (item) => !item.accessibleFrom || basePath === item.accessibleFrom,
    );
  }, [menu?.options, basePath]);

  useEffect(() => {
    if (!isLoading && !isLoaded) {
      void loadData({});
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
