import { Target } from "./Router";

export interface MenuSubItem {
  title: string;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  target?: Target;
  link: string;
}

export interface SubMenu {
  path: string;
  items: MenuSubItem[];
}

export interface MenuItem {
  title: string;
  type: "link" | "dropdown";
  allowedRoles?: string[];
  allowedPermissions?: string[];
  target?: Target;
  link?: string;
  children?: MenuSubItem[];
}

export interface Menu {
  items: MenuItem[];
  subMenu: SubMenu[];
  options: MenuSubItem[];
}
