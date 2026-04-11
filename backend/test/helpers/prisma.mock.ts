type AnyFn = (...args: any[]) => any;

export type MockFn<T extends AnyFn = AnyFn> = T & {
  calls: Parameters<T>[];
};

export function createMockFn<T extends AnyFn = AnyFn>(implementation?: T): MockFn<T> {
  const fn = ((...args: Parameters<T>) => {
    fn.calls.push(args);
    return implementation?.(...args);
  }) as MockFn<T>;

  fn.calls = [];
  return fn;
}

export function resetMockCalls(target: unknown) {
  if (!target || typeof target !== 'object') {
    return;
  }

  for (const value of Object.values(target as Record<string, unknown>)) {
    if (typeof value === 'function' && 'calls' in value) {
      (value as MockFn).calls = [];
      continue;
    }

    resetMockCalls(value);
  }
}
