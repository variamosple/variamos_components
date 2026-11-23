import { useCallback, useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(
  value: T,
  delay: number,
): [T, (value: T) => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  // One timer per hook: a module-wide one let two inputs cancel each other
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The value already scheduled or shown: on mounting, the initial value is
  // not scheduled again, which overwrote a value set by the setter meanwhile
  // (a page visit published by a child was lost)
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (Object.is(lastValueRef.current, value)) return;
    lastValueRef.current = value;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [value, delay]);

  // Nothing is set after the component is gone
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const setValue = useCallback(
    (next: T) => {
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(next);
      }, delay);
    },
    [delay],
  );

  return [debouncedValue, setValue];
}
