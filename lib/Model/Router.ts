export type Target = "_blank" | "_self" | "_parent" | "_top";

export type NavigationTarget =
  | "newWindow"
  | "sameWindow"
  | "parentContainer"
  | "rootContainer";

const mapping: Record<
  NavigationTarget,
  "_blank" | "_self" | "_parent" | "_top"
> = {
  newWindow: "_blank",
  sameWindow: "_self",
  parentContainer: "_parent",
  rootContainer: "_top",
};

export const mapToWebTarget = (
  target?: NavigationTarget
): "_blank" | "_self" | "_parent" | "_top" => {
  if (!target) {
    return "_self";
  }

  return mapping[target] || "_self";
};
