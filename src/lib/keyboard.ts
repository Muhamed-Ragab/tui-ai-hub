export type KeyEvent = { name: string; ctrl: boolean };
export type KeyMatcher = (key: KeyEvent) => boolean;
export type KeyRule = [matcher: KeyMatcher, handler: () => void];

export function key(name: string): KeyMatcher {
  return (k) => k.name === name;
}

export function ctrlKey(name: string): KeyMatcher {
  return (k) => k.ctrl && k.name === name;
}

export function any(...matchers: KeyMatcher[]): KeyMatcher {
  return (k) => matchers.some((m) => m(k));
}

export function matchKey(key: KeyEvent, ...rules: KeyRule[]): void {
  for (const [matcher, handler] of rules) {
    if (matcher(key)) {
      handler();
      return;
    }
  }
}
