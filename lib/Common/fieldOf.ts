/** A field of a JSON value read from the network; undefined if absent. */
export const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null && key in value
    ? Object.entries(value).find(([name]) => name === key)?.[1]
    : undefined;
