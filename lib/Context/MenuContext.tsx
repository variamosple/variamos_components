import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

/**
 * Waits before asking the menu again after a failure: the menu stayed empty
 * until the page was reloaded (ADM-N13). Three tries more, then the page
 * keeps no menu.
 */
export const MENU_RETRY_DELAYS_MS = [2_000, 5_000, 15_000];

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

  // The last loadData: a new requestMenu at each render does not ask again
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tryAgainLater = () => {
      const delay = MENU_RETRY_DELAYS_MS[failures];
      if (!active || delay === undefined) return;
      timer = setTimeout(() => setFailures(failures + 1), delay);
    };
    loadDataRef.current({}).then((response) => {
      if (response.errorCode) tryAgainLater();
    }, tryAgainLater);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [failures]);

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
