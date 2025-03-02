import { useCallback, useEffect, useState } from "react";

let timeout: NodeJS.Timeout;

export function useDebouncedValue<T>(
  value: T,
  delay: number
): [T, (value: T) => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  const setValue = useCallback((value: T) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, []);

  return [debouncedValue, setValue];
}
