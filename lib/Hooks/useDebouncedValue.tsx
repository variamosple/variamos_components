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

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

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
