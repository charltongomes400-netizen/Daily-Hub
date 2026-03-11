import { useRef, useReducer, useCallback } from "react";

export function useOptimisticDebounce<T>(
  flush: (id: number, value: T) => void,
  delay = 2000,
) {
  const valuesRef   = useRef<Map<number, T>>(new Map());
  const inflightRef = useRef<Map<number, T>>(new Map());
  const timersRef   = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
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
        if (finalValue !== undefined) {
          inflightRef.current.set(id, finalValue);
          flush(id, finalValue);
          setTimeout(() => {
            if (inflightRef.current.get(id) === finalValue) {
              inflightRef.current.delete(id);
              forceUpdate();
            }
          }, 10000);
        }
      }, delay);

      timersRef.current.set(id, timer);
    },
    [flush, delay],
  );

  const get = useCallback(
    (id: number, fallback: T): T => {
      if (valuesRef.current.has(id)) return valuesRef.current.get(id)!;
      if (inflightRef.current.has(id)) {
        const inflight = inflightRef.current.get(id)!;
        if (fallback === inflight) inflightRef.current.delete(id);
        return inflight;
      }
      return fallback;
    },
    [],
  );

  const cleanup = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    inflightRef.current.clear();
  }, []);

  return { set, get, cleanup };
}
