import { useRef, useReducer, useCallback } from "react";

export function useOptimisticDebounce<T>(
  flush: (id: number, value: T) => void,
  delay = 2000,
) {
  const valuesRef = useRef<Map<number, T>>(new Map());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const set = useCallback(
    (id: number, value: T) => {
      valuesRef.current.set(id, value);
      forceUpdate();

      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        const finalValue = valuesRef.current.get(id);
        valuesRef.current.delete(id);
        timersRef.current.delete(id);
        forceUpdate();
        if (finalValue !== undefined) flush(id, finalValue);
      }, delay);

      timersRef.current.set(id, timer);
    },
    [flush, delay],
  );

  const get = useCallback(
    (id: number, fallback: T): T =>
      valuesRef.current.has(id) ? valuesRef.current.get(id)! : fallback,
    [],
  );

  const cleanup = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return { set, get, cleanup };
}
